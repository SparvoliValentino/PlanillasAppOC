import { NotFoundError } from "@/lib/http/errors";

import type { FichaRepository } from "../domain/repository";
import type { Ficha } from "../domain/ficha.types";
import { RepositoryNotFoundError } from "../domain/errors";
import { AnularFichaRequestSchema } from "../domain/ficha.schema";

/**
 * Use case: void (soft delete) a ficha.
 *
 * Body shape: `{ expectedUpdatedAt? }`. Translates the repository's not-found
 * signal into a domain-level `NotFoundError` (404); an already voided ficha or
 * a stale `expectedUpdatedAt` propagates as `RepositoryConflictError` (409).
 */
export async function anularFicha(
  repo: FichaRepository,
  numero: number,
  rawBody: unknown,
): Promise<Ficha> {
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new NotFoundError("la ficha", numero);
  }
  const { expectedUpdatedAt } = AnularFichaRequestSchema.parse(rawBody ?? {});
  try {
    return await repo.anular(numero, { expectedUpdatedAt });
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) {
      throw new NotFoundError("la ficha", numero);
    }
    throw error;
  }
}
