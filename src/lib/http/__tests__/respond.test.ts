import { describe, expect, it } from "vitest";

import {
  RepositoryConflictError,
  RepositoryNotFoundError,
  RepositoryStorageError,
  RepositoryValidationError,
} from "@/features/fichas/domain/errors";

import { errorResponse } from "../respond";

describe("errorResponse — repository errors", () => {
  it("maps RepositoryNotFoundError to 404 NO_ENCONTRADO", async () => {
    const response = errorResponse(new RepositoryNotFoundError(42));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "NO_ENCONTRADO" });
  });

  it("maps RepositoryConflictError to 409 CONFLICTO and keeps its message", async () => {
    const response = errorResponse(new RepositoryConflictError("Ya existe una ficha con el N° 7."));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "CONFLICTO",
      message: "Ya existe una ficha con el N° 7.",
    });
  });

  it("maps RepositoryStorageError to 503 without leaking the internal message", async () => {
    const response = errorResponse(new RepositoryStorageError("disk path /secret is corrupt"));
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: string; message: string };
    expect(body.error).toBe("ALMACENAMIENTO_NO_DISPONIBLE");
    expect(body.message).not.toContain("/secret");
  });

  it("maps RepositoryValidationError to 400 VALIDACION_INVALIDA with details", async () => {
    const issues = [{ path: "nombre", message: "Requerido" }];
    const response = errorResponse(new RepositoryValidationError(issues));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "VALIDACION_INVALIDA",
      message: "Los datos enviados no son válidos.",
      details: issues,
    });
  });
});
