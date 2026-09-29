import { NotFoundError } from "@/lib/http/errors";

import type { FichaRepository } from "../domain/repository";
import type { Ficha, UpdateFichaInput } from "../domain/ficha.types";
import { UpdateFichaSchema } from "../domain/ficha.schema";
import { RepositoryNotFoundError } from "../infrastructure/mockFichaRepository";

/**
 * Use case: partially update a ficha.
 *
 * Validates the patch against the partial Zod schema (which still runs
 * normalizers on the provided fields) and delegates to the repository,
 * which performs the deep merge server-side. Translates the repository's
 * not-found signal into a domain-level `NotFoundError`.
 */
export async function updateFicha(
  repo: FichaRepository,
  numero: number,
  rawPatch: unknown,
): Promise<Ficha> {
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new NotFoundError("la ficha", numero);
  }
  const patch = UpdateFichaSchema.parse(rawPatch) as UpdateFichaInput;
  try {
    return await repo.update(numero, patch);
  } catch (error) {
    if (error instanceof RepositoryNotFoundError) {
      throw new NotFoundError("la ficha", numero);
    }
    throw error;
  }
}
