import { getFichaRepository } from "@/lib/config/repository";
import { errorResponse, ok, readJsonBody } from "@/lib/http/respond";

import { anularFicha } from "@/features/fichas/application/anularFicha";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ numero: string }>;
}

/**
 * POST /api/fichas/:numero/anular
 *
 * Voids (soft deletes) a ficha. Body: `{ expectedUpdatedAt?: string }`.
 * Returns the voided `Ficha`. 404 when missing; 409 when it is already voided
 * or `expectedUpdatedAt` no longer matches the stored `updatedAt`.
 */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { numero } = await context.params;
    const body = await readJsonBody<unknown>(request);
    const ficha = await anularFicha(getFichaRepository(), Number(numero), body);
    return ok(ficha);
  } catch (error) {
    return errorResponse(error);
  }
}
