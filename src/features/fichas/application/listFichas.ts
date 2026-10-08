import type { FichaRepository } from "../domain/repository";
import type { ListFichasParams, ListFichasResult } from "../domain/ficha.types";
import { ListFichasParamsSchema } from "../domain/ficha.schema";

/**
 * Use case: list/search/sort fichas, paginated.
 *
 * Validates and resolves the params (defaults, digits-only `telefono`,
 * per-field default `sortDir`) and delegates to the repository, which
 * filters and sorts the whole dataset before paginating. Invalid params
 * throw a `ZodError` (HTTP 400 at the API layer).
 */
export async function listFichas(
  repo: FichaRepository,
  rawParams: Partial<ListFichasParams>,
): Promise<ListFichasResult> {
  const params = ListFichasParamsSchema.parse(rawParams);
  return repo.list(params);
}
