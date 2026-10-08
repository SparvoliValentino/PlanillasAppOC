import { NotFoundError } from "@/lib/http/errors";

import type { FichaRepository } from "../domain/repository";
import type { Ficha, UpdateFichaInput } from "../domain/ficha.types";
import { RepositoryNotFoundError } from "../domain/errors";
import { UpdateFichaRequestSchema } from "../domain/ficha.schema";

/**
 * Use case: partially update a ficha.
 *
 * Body shape: `{ patch, expectedUpdatedAt? }`. The patch is validated against
 * the partial Zod schema (normalizers run on provided fields; timestamps and
 * `nroFicha` are stripped) and the repository performs the deep merge and the
 * optimistic-concurrency check. Translates the repository's not-found signal
 * into a domain-level `NotFoundError`; conflicts propagate as
 * `RepositoryConflictError` (409).
 */
export async function updateFicha(
  repo: FichaRepository,
  numero: number,
  rawBody: unknown,
): Promise<Ficha> {
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new NotFoundError("la ficha", numero);
  }
  const { patch, expectedUpdatedAt } = UpdateFichaRequestSchema.parse(rawBody);
  try {
    return await repo.update(numero, patch as UpdateFichaInput, { expectedUpdatedAt });
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) {
      throw new NotFoundError("la ficha", numero);
    }
    throw error;
  }
}
