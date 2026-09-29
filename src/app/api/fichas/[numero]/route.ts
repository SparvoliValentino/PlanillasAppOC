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
 * Body: `UpdateFichaInput` (partial ficha). Validates, persists via the
 * repository (deep merge), and returns the merged ficha.
 */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { numero } = await context.params;
    const patch = await readJsonBody<unknown>(request);
    const ficha = await updateFicha(getFichaRepository(), Number(numero), patch);
    return ok(ficha);
  } catch (error) {
    return errorResponse(error);
  }
}
