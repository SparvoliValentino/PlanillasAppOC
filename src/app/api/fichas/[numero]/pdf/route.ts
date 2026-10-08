import { getFichaRepository } from "@/lib/config/repository";
import { errorResponse } from "@/lib/http/respond";

import { getFichaPdf } from "@/features/fichas/application/getFichaPdf";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ numero: string }>;
}

/**
 * GET /api/fichas/:numero/pdf
 *
 * Streams the ficha as a PDF attachment. Errors are JSON (404 missing,
 * 501 when the active repository cannot generate PDFs, 503 storage down).
 */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const { numero } = await context.params;
    const pdf = await getFichaPdf(getFichaRepository(), Number(numero));
    // Re-wrap into a fresh Uint8Array<ArrayBuffer>, which is a valid BodyInit.
    return new Response(new Uint8Array(pdf.content), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
