/**
 * Repository contract for the Ficha aggregate.
 *
 * Mirrors section 7.2 of the spec PDF. UI components must depend on this
 * interface, never on a concrete implementation. The mock implementation in
 * `infrastructure/mockFichaRepository.ts` is the V1 storage; a future
 * Google Sheets adapter will live next to it and satisfy the same contract.
 */

import type {
  CreateFichaInput,
  Ficha,
  FichaSummary,
  ListFichasParams,
  Paginated,
  UpdateFichaInput,
} from "./ficha.types";

export interface FichaRepository {
  list(params: ListFichasParams): Promise<Paginated<FichaSummary>>;
  getByNumber(numero: number): Promise<Ficha | null>;
  create(input: CreateFichaInput): Promise<Ficha>;
  update(numero: number, input: UpdateFichaInput): Promise<Ficha>;
}
