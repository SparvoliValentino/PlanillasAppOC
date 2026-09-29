import { getFichaRepository } from "@/lib/config/repository";
import { created, errorResponse, ok, readJsonBody } from "@/lib/http/respond";

import { createFicha } from "@/features/fichas/application/createFicha";
import { listFichas } from "@/features/fichas/application/listFichas";

export const dynamic = "force-dynamic";

/**
 * GET /api/fichas?page=1&pageSize=50&q=
 *
 * Returns a paginated list of `FichaSummary`. Empty `q` returns every ficha.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const rawParams = {
      page: numberParam(url.searchParams.get("page"), 1),
      pageSize: numberParam(url.searchParams.get("pageSize"), 50),
      q: url.searchParams.get("q") ?? "",
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
 * via the repository, and returns the created ficha (with assigned
 * `NRO_FICHA`).
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
