import type { FichaRepository } from "../domain/repository";
import type { FichaSummary, ListFichasParams, Paginated } from "../domain/ficha.types";
import { ListFichasParamsSchema } from "../domain/ficha.schema";

/**
 * Use case: list/search fichas, paginated.
 *
 * Validates the params (page, pageSize, q) and delegates to the repository.
 * `q` is normalized: trimmed; empty string means "no filter".
 */
export async function listFichas(
  repo: FichaRepository,
  rawParams: Partial<ListFichasParams>,
): Promise<Paginated<FichaSummary>> {
  const params = ListFichasParamsSchema.parse(rawParams);
  return repo.list(params);
}
