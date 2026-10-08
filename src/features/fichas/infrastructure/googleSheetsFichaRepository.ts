import "server-only";

/**
 * Google Sheets implementation of `FichaRepository`.
 *
 * Talks to the Apps Script web app (`apps-script/optica-backend.md`) with
 * `POST { token, action, payload }`. The script always answers HTTP 200 with
 * `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`.
 * This adapter knows nothing about sheet columns: it exchanges domain-shaped
 * `Ficha` objects and validates every response with Zod.
 *
 * Error mapping:
 * - NO_ENCONTRADO -> `null` in `getByNumber`, `RepositoryNotFoundError` in `update`/`anular`.
 * - CONFLICTO -> `RepositoryConflictError` (its message is safe and user-facing).
 * - VALIDACION_INVALIDA -> `RepositoryValidationError`.
 * - Everything else (bad token, misconfiguration, network, timeout, non-2xx,
 *   non-JSON body, malformed shape) -> `RepositoryStorageError`.
 *
 * The token and payloads are never logged or included in error messages.
 * Server-only: the URL and token must never reach the browser.
 */

import { z } from "zod";

import {
  RepositoryConflictError,
  RepositoryNotFoundError,
  RepositoryStorageError,
  RepositoryValidationError,
} from "../domain/errors";
import type { RepositoryValidationIssue } from "../domain/errors";
import { FichaRecordSchema, ListFichasResultSchema } from "../domain/ficha.schema";
import type {
  AnularFichaOptions,
  CreateFichaInput,
  Ficha,
  FichaPdf,
  ListFichasParams,
  ListFichasResult,
  UpdateFichaInput,
  UpdateFichaOptions,
} from "../domain/ficha.types";
import type { FichaRepository } from "../domain/repository";

export const DEFAULT_TIMEOUT_MS = 15_000;

export interface GoogleSheetsFichaRepositoryOptions {
  /** Apps Script web app URL (ends with `/exec`). */
  url: string;
  token: string;
  /** Injectable for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

type Action = "list" | "get" | "create" | "update" | "anular" | "pdf";

const ErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string().default(""),
    details: z.unknown().optional(),
  }),
});

const OkEnvelopeSchema = z.object({ ok: z.literal(true), data: z.unknown() });

const EnvelopeSchema = z.union([OkEnvelopeSchema, ErrorEnvelopeSchema]);

const PdfResponseSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  base64: z.string(),
});

/** Only safe characters reach the Content-Disposition header. */
const SAFE_PDF_FILE_NAME = /^[\w.-]+\.pdf$/;

const IssuesSchema = z.array(z.object({ path: z.string(), message: z.string() }));

/** Backend failure carrying its stable error code. Internal to this module. */
class BackendError extends Error {
  public constructor(
    public readonly backendCode: string,
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

function storageError(action: Action, kind: string): RepositoryStorageError {
  // Only the action and a coarse kind: never payloads, personal data or the token.
  console.error(`[sheets] action=${action} failed: ${kind}`);
  return new RepositoryStorageError(`Google Sheets no disponible (${kind}).`);
}

export class GoogleSheetsFichaRepository implements FichaRepository {
  private readonly url: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  public constructor(options: GoogleSheetsFichaRepositoryOptions) {
    this.url = options.url;
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public async list(params: ListFichasParams): Promise<ListFichasResult> {
    const data = await this.callOrThrow("list", { ...params });
    return this.parse("list", ListFichasResultSchema, data);
  }

  public async getByNumber(numero: number): Promise<Ficha | null> {
    try {
      const data = await this.callOrThrow("get", { nroFicha: numero });
      return this.parse("get", FichaRecordSchema, data);
    } catch (error) {
      if (error instanceof RepositoryNotFoundError) return null;
      throw error;
    }
  }

  public async create(input: CreateFichaInput): Promise<Ficha> {
    const data = await this.callOrThrow("create", { ficha: input });
    return this.parse("create", FichaRecordSchema, data);
  }

  public async update(
    numero: number,
    input: UpdateFichaInput,
    options?: UpdateFichaOptions,
  ): Promise<Ficha> {
    const payload: Record<string, unknown> = { nroFicha: numero, patch: input };
    if (options?.expectedUpdatedAt !== undefined) {
      payload["expectedUpdatedAt"] = options.expectedUpdatedAt;
    }
    const data = await this.callOrThrow("update", payload);
    return this.parse("update", FichaRecordSchema, data);
  }

  public async anular(numero: number, options?: AnularFichaOptions): Promise<Ficha> {
    const payload: Record<string, unknown> = { nroFicha: numero };
    if (options?.expectedUpdatedAt !== undefined) {
      payload["expectedUpdatedAt"] = options.expectedUpdatedAt;
    }
    const data = await this.callOrThrow("anular", payload);
    return this.parse("anular", FichaRecordSchema, data);
  }

  public async getPdf(numero: number): Promise<FichaPdf | null> {
    try {
      const data = await this.callOrThrow("pdf", { nroFicha: numero });
      const pdf = this.parse("pdf", PdfResponseSchema, data);
      if (pdf.mimeType !== "application/pdf") throw storageError("pdf", "unexpected mime type");
      return {
        fileName: SAFE_PDF_FILE_NAME.test(pdf.fileName) ? pdf.fileName : `ficha-${numero}.pdf`,
        mimeType: pdf.mimeType,
        content: new Uint8Array(Buffer.from(pdf.base64, "base64")),
      };
    } catch (error) {
      if (error instanceof RepositoryNotFoundError) return null;
      throw error;
    }
  }

  /**
   * Calls the gateway and maps backend error codes to domain errors.
   * `NO_ENCONTRADO` becomes `RepositoryNotFoundError` with the requested N°.
   */
  private async callOrThrow(action: Action, payload: Record<string, unknown>): Promise<unknown> {
    try {
      return await this.call(action, payload);
    } catch (error) {
      if (!(error instanceof BackendError)) throw error;
      switch (error.backendCode) {
        case "NO_ENCONTRADO": {
          const numero = payload["nroFicha"];
          throw new RepositoryNotFoundError(typeof numero === "number" ? numero : 0);
        }
        case "CONFLICTO":
          throw new RepositoryConflictError(error.message);
        case "VALIDACION_INVALIDA": {
          const issues = IssuesSchema.safeParse(error.details);
          const list: RepositoryValidationIssue[] = issues.success ? issues.data : [];
          throw new RepositoryValidationError(list);
        }
        default:
          throw storageError(action, `code ${error.backendCode}`);
      }
    }
  }

  /** Sends one request and unwraps the envelope. Throws `BackendError` for `ok: false`. */
  private async call(action: Action, payload: Record<string, unknown>): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token: this.token, action, payload }),
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw storageError(action, timedOut ? "timeout" : "network error");
    }

    if (!response.ok) throw storageError(action, `http ${response.status}`);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw storageError(action, "non-JSON response");
    }

    const envelope = EnvelopeSchema.safeParse(body);
    if (!envelope.success) throw storageError(action, "invalid envelope");
    if (envelope.data.ok) return envelope.data.data;

    const { code, message, details } = envelope.data.error;
    throw new BackendError(code, message, details);
  }

  private parse<S extends z.ZodTypeAny>(action: Action, schema: S, data: unknown): z.output<S> {
    const result = schema.safeParse(data);
    if (!result.success) throw storageError(action, "invalid data shape");
    return result.data;
  }
}
