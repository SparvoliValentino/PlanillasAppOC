import { NotFoundError } from "@/lib/http/errors";

import type { FichaRepository } from "../domain/repository";
import type { FichaPdf } from "../domain/ficha.types";

/**
 * Use case: render a ficha as a PDF.
 *
 * Throws `NotFoundError` for an invalid N° or a missing ficha.
 */
export async function getFichaPdf(repo: FichaRepository, numero: number): Promise<FichaPdf> {
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new NotFoundError("la ficha", numero);
  }
  const pdf = await repo.getPdf(numero);
  if (pdf === null) {
    throw new NotFoundError("la ficha", numero);
  }
  return pdf;
}
