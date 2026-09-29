import { NotFoundError } from "@/lib/http/errors";

import type { FichaRepository } from "../domain/repository";
import type { Ficha } from "../domain/ficha.types";

/**
 * Use case: retrieve a single ficha by NRO_FICHA.
 *
 * Throws `NotFoundError` if the ficha does not exist. The HTTP layer
 * translates that into a 404 JSON response.
 */
export async function getFicha(repo: FichaRepository, numero: number): Promise<Ficha> {
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new NotFoundError("la ficha", numero);
  }
  const ficha = await repo.getByNumber(numero);
  if (ficha === null) {
    throw new NotFoundError("la ficha", numero);
  }
  return ficha;
}
