import { getFichaRepository } from "@/lib/config/repository";
import { errorResponse, ok, readJsonBody } from "@/lib/http/respond";

import { getFicha } from "@/features/fichas/application/getFicha";
import { updateFicha } from "@/features/fichas/application/updateFicha";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ numero: string }>;
}

/**
 * GET /api/fichas/:numero
 *
 * Returns the full `Ficha` for the given `NRO_FICHA`. 404 when missing.
 */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const { numero } = await context.params;
    const ficha = await getFicha(getFichaRepository(), Number(numero));
    return ok(ficha);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PUT /api/fichas/:numero
 *
 * Body: `{ patch: UpdateFichaInput, expectedUpdatedAt?: string }`. Validates,
 * persists via the repository (deep merge) and returns the merged ficha.
 * 409 when `expectedUpdatedAt` no longer matches the stored `updatedAt`.
 */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { numero } = await context.params;
    const body = await readJsonBody<unknown>(request);
    const ficha = await updateFicha(getFichaRepository(), Number(numero), body);
    return ok(ficha);
  } catch (error) {
    return errorResponse(error);
  }
}
