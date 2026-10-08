/**
 * Repository contract for the Ficha aggregate.
 *
 * Mirrors section 7.2 of the spec PDF. UI components must depend on this
 * interface, never on a concrete implementation. The only runtime
 * implementation is `infrastructure/googleSheetsFichaRepository.ts`.
 */

import type {
  AnularFichaOptions,
  CreateFichaInput,
  Ficha,
  FichaPdf,
  ListFichasParams,
  ListFichasResult,
  UpdateFichaInput,
  UpdateFichaOptions,
} from "./ficha.types";

export interface FichaRepository {
  list(params: ListFichasParams): Promise<ListFichasResult>;
  getByNumber(numero: number): Promise<Ficha | null>;
  /**
   * Creates a ficha. Implementations set `createdAt` and `updatedAt`.
   */
  create(input: CreateFichaInput): Promise<Ficha>;
  /**
   * Partially updates a ficha and bumps `updatedAt`. When
   * `options.expectedUpdatedAt` is given and differs from the stored value,
   * throws `RepositoryConflictError` without persisting anything.
   */
  update(numero: number, input: UpdateFichaInput, options?: UpdateFichaOptions): Promise<Ficha>;
  /**
   * Voids (soft deletes) a ficha: sets `anuladaAt` and bumps `updatedAt`. The
   * row is kept and its N° stays taken. Throws `RepositoryNotFoundError` when
   * missing and `RepositoryConflictError` when already voided or when
   * `options.expectedUpdatedAt` differs from the stored value. `update` on a
   * voided ficha also throws `RepositoryConflictError`.
   */
  anular(numero: number, options?: AnularFichaOptions): Promise<Ficha>;
  /**
   * Renders the ficha as a PDF. Returns `null` when the ficha does not exist.   */
  getPdf(numero: number): Promise<FichaPdf | null>;
}
