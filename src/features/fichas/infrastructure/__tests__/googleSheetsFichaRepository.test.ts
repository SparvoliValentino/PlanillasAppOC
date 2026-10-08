import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RepositoryConflictError,
  RepositoryNotFoundError,
  RepositoryStorageError,
  RepositoryValidationError,
} from "../../domain/errors";
import type { ListFichasParams } from "../../domain/ficha.types";
import { sampleFichas } from "@/test/inMemoryFichaRepository";
import { GoogleSheetsFichaRepository } from "../googleSheetsFichaRepository";

const URL_ = "https://script.example/macros/s/abc/exec";
const TOKEN = "super-secret-token-123";
const ficha = sampleFichas()[0]!;

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), { status: 200, ...init });
}
const okBody = (data: unknown) => ({ ok: true, data });
const errBody = (code: string, message = "msg", details?: unknown) => ({
  ok: false,
  error: { code, message, ...(details === undefined ? {} : { details }) },
});

function make(fetchImpl: typeof fetch, timeoutMs?: number): GoogleSheetsFichaRepository {
  return new GoogleSheetsFichaRepository({
    url: URL_,
    token: TOKEN,
    fetchImpl,
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
}
function stub(impl: () => Promise<Response>) {
  return vi.fn<typeof fetch>(impl);
}

const listParams: ListFichasParams = {
  page: 1,
  pageSize: 50,
  q: "",
  nombre: "ju",
  telefono: "",
  incluirAnuladas: false,
  sortBy: "fechaCarga",
  sortDir: "desc",
};
const listData = {
  items: [
    {
      nroFicha: 1,
      nombre: "Juan Pérez",
      fechaEntrada: "2026-09-01",
      telefono: "123",
      fechaCarga: ficha.createdAt,
      anuladaAt: "",
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
  totalPages: 1,
  sortBy: "fechaCarga",
  sortDir: "desc",
};

function sentBody(fetchMock: ReturnType<typeof stub>): {
  token: string;
  action: string;
  payload: Record<string, unknown>;
} {
  const init = fetchMock.mock.calls[0]![1]!;
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("GoogleSheetsFichaRepository — requests", () => {
  it("sends list as a text/plain POST with token/action/payload", async () => {
    const fetchMock = stub(async () => jsonResponse(okBody(listData)));
    await make(fetchMock).list(listParams);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(URL_);
    expect(init?.method).toBe("POST");
    expect(init?.redirect).toBe("follow");
    expect(init?.cache).toBe("no-store");
    expect(init?.headers).toEqual({ "Content-Type": "text/plain;charset=utf-8" });
    expect(sentBody(fetchMock)).toEqual({ token: TOKEN, action: "list", payload: listParams });
  });

  it("sends get with nroFicha", async () => {
    const fetchMock = stub(async () => jsonResponse(okBody(ficha)));
    await make(fetchMock).getByNumber(1);
    expect(sentBody(fetchMock)).toEqual({ token: TOKEN, action: "get", payload: { nroFicha: 1 } });
  });

  it("sends create with the ficha", async () => {
    const fetchMock = stub(async () => jsonResponse(okBody(ficha)));
    const { createdAt: _c, updatedAt: _u, anuladaAt: _a, ...input } = ficha;
    void _c;
    void _u;
    void _a;
    await make(fetchMock).create(input);
    const body = sentBody(fetchMock);
    expect(body.action).toBe("create");
    expect((body.payload["ficha"] as { nroFicha: number }).nroFicha).toBe(1);
  });

  it("sends incluirAnuladas as part of the list payload", async () => {
    const fetchMock = stub(async () => jsonResponse(okBody(listData)));
    await make(fetchMock).list({ ...listParams, incluirAnuladas: true });
    expect(sentBody(fetchMock).payload["incluirAnuladas"]).toBe(true);
  });

  it("sends anular with nroFicha and expectedUpdatedAt only when defined", async () => {
    const withIt = stub(async () => jsonResponse(okBody(ficha)));
    await make(withIt).anular(1, { expectedUpdatedAt: "2026-01-01T00:00:00.000Z" });
    expect(sentBody(withIt)).toEqual({
      token: TOKEN,
      action: "anular",
      payload: { nroFicha: 1, expectedUpdatedAt: "2026-01-01T00:00:00.000Z" },
    });

    const without = stub(async () => jsonResponse(okBody(ficha)));
    await make(without).anular(1);
    expect(sentBody(without).payload).toEqual({ nroFicha: 1 });
  });

  it("sends expectedUpdatedAt only when defined", async () => {
    const withIt = stub(async () => jsonResponse(okBody(ficha)));
    await make(withIt).update(1, { nombre: "X" }, { expectedUpdatedAt: "2026-01-01T00:00:00.000Z" });
    expect(sentBody(withIt).payload).toEqual({
      nroFicha: 1,
      patch: { nombre: "X" },
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
    });

    const without = stub(async () => jsonResponse(okBody(ficha)));
    await make(without).update(1, { nombre: "X" });
    expect(sentBody(without).payload).toEqual({ nroFicha: 1, patch: { nombre: "X" } });
    expect("expectedUpdatedAt" in sentBody(without).payload).toBe(false);
  });
});

describe("GoogleSheetsFichaRepository — success", () => {
  it("unwraps list", async () => {
    const result = await make(stub(async () => jsonResponse(okBody(listData)))).list(listParams);
    expect(result).toEqual(listData);
  });

  it("unwraps get, create and update into full Fichas with timestamps", async () => {
    const repo = make(stub(async () => jsonResponse(okBody(ficha))));
    const got = await repo.getByNumber(1);
    expect(got?.nroFicha).toBe(1);
    expect(got?.createdAt).toBe(ficha.createdAt);
    expect(got?.updatedAt).toBe(ficha.updatedAt);
    expect((await repo.update(1, { nombre: "X" }))?.nombre).toBe(ficha.nombre);
    const { createdAt: _c, updatedAt: _u, anuladaAt: _a, ...input } = ficha;
    void _c;
    void _u;
    void _a;
    expect((await repo.create(input)).nroFicha).toBe(1);
  });
});

describe("GoogleSheetsFichaRepository — error mapping", () => {
  it("getByNumber returns null on NO_ENCONTRADO", async () => {
    const repo = make(stub(async () => jsonResponse(errBody("NO_ENCONTRADO"))));
    expect(await repo.getByNumber(9)).toBeNull();
  });

  it("anular returns the voided ficha", async () => {
    const voided = { ...ficha, anuladaAt: "2026-09-02T10:00:00.000Z" };
    const repo = make(stub(async () => jsonResponse(okBody(voided))));
    expect((await repo.anular(1)).anuladaAt).toBe("2026-09-02T10:00:00.000Z");
  });

  it("anular throws RepositoryNotFoundError on NO_ENCONTRADO", async () => {
    const repo = make(stub(async () => jsonResponse(errBody("NO_ENCONTRADO"))));
    await expect(repo.anular(9)).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("anular maps CONFLICTO to RepositoryConflictError keeping the message", async () => {
    const repo = make(stub(async () => jsonResponse(errBody("CONFLICTO", "La ficha ya está anulada."))));
    const error = await repo.anular(1).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RepositoryConflictError);
    expect((error as Error).message).toBe("La ficha ya está anulada.");
  });

  it("anular maps an unknown backend code to RepositoryStorageError", async () => {
    const repo = make(stub(async () => jsonResponse(errBody("ERROR_INTERNO"))));
    await expect(repo.anular(1)).rejects.toBeInstanceOf(RepositoryStorageError);
  });

  it("update throws RepositoryNotFoundError on NO_ENCONTRADO", async () => {
    const repo = make(stub(async () => jsonResponse(errBody("NO_ENCONTRADO"))));
    await expect(repo.update(9, {})).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("maps CONFLICTO to RepositoryConflictError keeping the message", async () => {
    const repo = make(stub(async () => jsonResponse(errBody("CONFLICTO", "Ya existe una ficha con el N° 1."))));
    const { createdAt: _c, updatedAt: _u, anuladaAt: _a, ...input } = ficha;
    void _c;
    void _u;
    void _a;
    const error = await repo.create(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RepositoryConflictError);
    expect((error as Error).message).toBe("Ya existe una ficha con el N° 1.");
  });

  it("maps VALIDACION_INVALIDA to RepositoryValidationError with issues", async () => {
    const issues = [{ path: "nombre", message: "Requerido" }];
    const repo = make(stub(async () => jsonResponse(errBody("VALIDACION_INVALIDA", "x", issues))));
    const error = await repo.update(1, {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RepositoryValidationError);
    expect((error as RepositoryValidationError).issues).toEqual(issues);
  });

  it.each([
    "NO_AUTORIZADO",
    "NO_CONFIGURADO",
    "ESQUEMA_INVALIDO",
    "DATOS_INCONSISTENTES",
    "ALMACENAMIENTO_NO_DISPONIBLE",
    "ACCION_DESCONOCIDA",
    "SOLICITUD_INVALIDA",
    "ERROR_INTERNO",
    "ALGO_NUEVO",
  ])("maps %s to RepositoryStorageError", async (code) => {
    const repo = make(stub(async () => jsonResponse(errBody(code))));
    await expect(repo.list(listParams)).rejects.toBeInstanceOf(RepositoryStorageError);
  });

  it("maps an HTML body to RepositoryStorageError", async () => {
    const repo = make(stub(async () => new Response("<html>login</html>", { status: 200 })));
    await expect(repo.getByNumber(1)).rejects.toBeInstanceOf(RepositoryStorageError);
  });

  it("maps a network rejection to RepositoryStorageError", async () => {
    const repo = make(stub(async () => Promise.reject(new TypeError("fetch failed"))));
    await expect(repo.list(listParams)).rejects.toBeInstanceOf(RepositoryStorageError);
  });

  it("maps a non-2xx status to RepositoryStorageError", async () => {
    const repo = make(stub(async () => new Response("nope", { status: 500 })));
    await expect(repo.list(listParams)).rejects.toBeInstanceOf(RepositoryStorageError);
  });

  it("maps a malformed data shape to RepositoryStorageError", async () => {
    const repo = make(stub(async () => jsonResponse(okBody({ items: "nope" }))));
    await expect(repo.list(listParams)).rejects.toBeInstanceOf(RepositoryStorageError);
    const repo2 = make(stub(async () => jsonResponse(okBody({ nroFicha: "x" }))));
    await expect(repo2.getByNumber(1)).rejects.toBeInstanceOf(RepositoryStorageError);
  });

  it("maps a malformed envelope to RepositoryStorageError", async () => {
    const repo = make(stub(async () => jsonResponse({ hello: "world" })));
    await expect(repo.list(listParams)).rejects.toBeInstanceOf(RepositoryStorageError);
  });

  it("maps a timeout to RepositoryStorageError", async () => {
    const hanging = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    await expect(make(hanging, 20).list(listParams)).rejects.toBeInstanceOf(RepositoryStorageError);
  });

  it("never leaks the token in errors or logs", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const cases: Array<() => Promise<Response>> = [
      async () => jsonResponse(errBody("NO_AUTORIZADO", `bad token ${TOKEN}`)),
      async () => Promise.reject(new TypeError(`failed ${TOKEN}`)),
      async () => new Response("x", { status: 502 }),
    ];
    for (const impl of cases) {
      const error = await make(stub(impl)).list(listParams).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(RepositoryStorageError);
      expect((error as Error).message).not.toContain(TOKEN);
    }
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(TOKEN);
  });
});

describe("GoogleSheetsFichaRepository — pdf", () => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x00, 0xff]);
  const base64 = Buffer.from(bytes).toString("base64");
  const pdfData = (over: Record<string, unknown> = {}) => ({
    fileName: "ficha-1.pdf",
    mimeType: "application/pdf",
    base64,
    ...over,
  });

  it("sends pdf with nroFicha", async () => {
    const fetchMock = stub(async () => jsonResponse(okBody(pdfData())));
    await make(fetchMock).getPdf(1);
    expect(sentBody(fetchMock)).toEqual({ token: TOKEN, action: "pdf", payload: { nroFicha: 1 } });
  });

  it("decodes base64 into the original bytes", async () => {
    const pdf = await make(stub(async () => jsonResponse(okBody(pdfData())))).getPdf(1);
    expect(pdf?.fileName).toBe("ficha-1.pdf");
    expect(pdf?.mimeType).toBe("application/pdf");
    expect(Array.from(pdf!.content)).toEqual(Array.from(bytes));
  });

  it("returns null on NO_ENCONTRADO", async () => {
    const repo = make(stub(async () => jsonResponse(errBody("NO_ENCONTRADO"))));
    expect(await repo.getPdf(99)).toBeNull();
  });

  it("rejects a non-PDF mimeType as a storage error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = make(stub(async () => jsonResponse(okBody(pdfData({ mimeType: "text/html" })))));
    await expect(repo.getPdf(1)).rejects.toBeInstanceOf(RepositoryStorageError);
  });

  it("rejects a malformed pdf payload as a storage error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = make(stub(async () => jsonResponse(okBody({ fileName: "x.pdf" }))));
    await expect(repo.getPdf(1)).rejects.toBeInstanceOf(RepositoryStorageError);
  });

  it.each(['a"; rm.pdf', "../x.pdf", "x.pdf\r\nSet-Cookie: a=b", "evil.html"])(
    "falls back to a safe file name for %j",
    async (fileName) => {
      const repo = make(stub(async () => jsonResponse(okBody(pdfData({ fileName })))));
      expect((await repo.getPdf(7))?.fileName).toBe("ficha-7.pdf");
    },
  );
});
