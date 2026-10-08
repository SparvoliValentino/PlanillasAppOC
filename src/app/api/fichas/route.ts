import { getFichaRepository } from "@/lib/config/repository";
import { created, errorResponse, ok, readJsonBody } from "@/lib/http/respond";

import { createFicha } from "@/features/fichas/application/createFicha";
import type { FichaSortField, SortDirection } from "@/features/fichas/domain/ficha.types";
import { listFichas } from "@/features/fichas/application/listFichas";

export const dynamic = "force-dynamic";

/**
 * GET /api/fichas?page=1&pageSize=50&q=&nombre=&telefono=&sortBy=&sortDir=&incluirAnuladas=
 *
 * Returns a paginated, filtered and sorted list of `FichaSummary`. Filters
 * and sorting apply to the whole dataset before paginating. Invalid params
 * respond 400. `sortBy`: fechaCarga (default) | fechaEntrada | nombre |
 * nroFicha. `sortDir`: asc | desc (default depends on `sortBy`).
 * `incluirAnuladas=true` also returns voided fichas (hidden by default).
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const rawParams = {
      page: numberParam(url.searchParams.get("page"), 1),
      pageSize: numberParam(url.searchParams.get("pageSize"), 50),
      q: url.searchParams.get("q") ?? "",
      nombre: url.searchParams.get("nombre") ?? "",
      telefono: url.searchParams.get("telefono") ?? "",
      incluirAnuladas: url.searchParams.get("incluirAnuladas") === "true",
      // Passed through unchecked: the schema rejects invalid values (400).
      ...sortParams(url.searchParams),
    };
    const result = await listFichas(getFichaRepository(), rawParams);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/fichas
 *
 * Body: `CreateFichaInput`. Validates with the shared Zod schema, persists
 * via the repository, and returns the created ficha. `nroFicha` is
 * required; a duplicate number responds 409 `CONFLICTO`.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<unknown>(request);
    const ficha = await createFicha(getFichaRepository(), body);
    return created(ficha);
  } catch (error) {
    return errorResponse(error);
  }
}

function numberParam(raw: string | null, fallback: number): number {
  if (raw === null || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sortParams(params: URLSearchParams): { sortBy?: FichaSortField; sortDir?: SortDirection } {
  const sortBy = params.get("sortBy");
  const sortDir = params.get("sortDir");
  return {
    ...(sortBy ? { sortBy: sortBy as FichaSortField } : {}),
    ...(sortDir ? { sortDir: sortDir as SortDirection } : {}),
  };
}
