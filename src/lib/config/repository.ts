/**
 * Singleton factory for the Ficha repository. The only runtime backend is
 * `GoogleSheetsFichaRepository` (Apps Script gateway), which requires
 * `APPS_SCRIPT_URL` and `APPS_SCRIPT_TOKEN`. Optional `APPS_SCRIPT_TIMEOUT_MS`
 * overrides the request timeout.
 *
 * Missing or invalid configuration throws; there is no local fallback.
 * `FICHA_REPOSITORY`, if set, must be `sheets` (the mock repository was removed).
 *
 * Server-only. Tests construct their own repositories, so they bypass the
 * singleton; `resolveRepositoryConfig` is pure and tested directly.
 */

import "server-only";

import type { FichaRepository } from "@/features/fichas/domain/repository";
import { GoogleSheetsFichaRepository } from "@/features/fichas/infrastructure/googleSheetsFichaRepository";

export interface RepositoryConfig {
  url: string;
  token: string;
  timeoutMs?: number;
}

type Env = Record<string, string | undefined>;

function requireVar(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable ${name}.`);
  }
  return value;
}

/** Pure env parsing. Error messages name variables, never their values. */
export function resolveRepositoryConfig(env: Env): RepositoryConfig {
  const legacyKind = env["FICHA_REPOSITORY"]?.trim();
  if (legacyKind && legacyKind !== "sheets") {
    throw new Error(
      "FICHA_REPOSITORY is set to an unsupported value: the mock repository was removed and Google Sheets is the only backend. Unset FICHA_REPOSITORY or set it to \"sheets\".",
    );
  }
  const url = requireVar(env, "APPS_SCRIPT_URL");
  const token = requireVar(env, "APPS_SCRIPT_TOKEN");
  const rawTimeout = env["APPS_SCRIPT_TIMEOUT_MS"]?.trim();
  const timeoutMs = rawTimeout ? Number(rawTimeout) : undefined;
  if (timeoutMs !== undefined && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
    throw new Error("Invalid APPS_SCRIPT_TIMEOUT_MS: expected a positive number of milliseconds.");
  }
  return timeoutMs === undefined ? { url, token } : { url, token, timeoutMs };
}

let cached: FichaRepository | null = null;

export function getFichaRepository(): FichaRepository {
  if (cached) return cached;
  const config = resolveRepositoryConfig(process.env);
  cached = new GoogleSheetsFichaRepository({
    url: config.url,
    token: config.token,
    ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
  });
  return cached;
}

/**
 * Test-only helper to clear the cached singleton. Never call from app code.
 */
export function __resetFichaRepositoryForTests(): void {
  cached = null;
}
