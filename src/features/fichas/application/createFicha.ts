import type { FichaRepository } from "../domain/repository";
import type { CreateFichaInput, Ficha } from "../domain/ficha.types";
import { CreateFichaSchema } from "../domain/ficha.schema";

/**
 * Use case: create a new ficha.
 *
 * Validates the input against the shared Zod schema (so normalizers run
 * before persistence) and delegates to the repository. `nroFicha` is required
 * (typed by the user); the repository rejects duplicates with a conflict.
 */
export async function createFicha(
  repo: FichaRepository,
  rawInput: unknown,
): Promise<Ficha> {
  const input = CreateFichaSchema.parse(rawInput) as CreateFichaInput;
  return repo.create(input);
}
