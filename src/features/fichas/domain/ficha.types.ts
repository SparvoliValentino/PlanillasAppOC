/**
 * Domain types for the Optica Ficha.
 *
 * This file is the source of truth for the structural shape of the Ficha.
 * Runtime validation lives in `ficha.schema.ts` (Zod). Repositories and
 * application use cases consume these types.
 *
 * Conventions (from the spec PDF):
 *   - One row in the Google Sheet = one Ficha.
 *   - `NRO_FICHA` is the stable, user-visible identifier (not the row index).
 *   - Imported amounts are stored as `number` without the `$` symbol.
 *   - Phone numbers, IDs and membership numbers stay as `string`.
 *   - Graduations keep their sign (`+1.00`, `-0.50`) and stay as `string`
 *     to preserve the format coming from the prescription.
 *   - Dates are persisted as ISO `YYYY-MM-DD` and rendered in es-AR format
 *     only at the UI layer.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type TipoLente = "BIFOCAL" | "PROGRESIVO" | "";

export type MaterialLente = "MINERAL" | "ORGANICO" | "";

export type OrigenLente = "STOCK" | "LABORATORIO" | "";

export const TIPO_LENTE_VALUES: readonly TipoLente[] = ["", "BIFOCAL", "PROGRESIVO"] as const;
export const MATERIAL_LENTE_VALUES: readonly MaterialLente[] = ["", "MINERAL", "ORGANICO"] as const;
export const ORIGEN_LENTE_VALUES: readonly OrigenLente[] = ["", "STOCK", "LABORATORIO"] as const;

export type FichaSortField = "fechaCarga" | "fechaEntrada" | "nombre" | "nroFicha";

export type SortDirection = "asc" | "desc";

export const FICHA_SORT_FIELDS: readonly FichaSortField[] = [
  "fechaCarga",
  "fechaEntrada",
  "nombre",
  "nroFicha",
] as const;
export const SORT_DIRECTIONS: readonly SortDirection[] = ["asc", "desc"] as const;

// ---------------------------------------------------------------------------
// Grouped shapes
// ---------------------------------------------------------------------------

export interface OjoGraduacion {
  esf: string;
  cil: string;
  eje: string;
}

export interface OjoArmazon {
  material: MaterialLente;
  origen: OrigenLente;
  armazon: string;
  modelo: string;
  color: string;
}

export interface Medidas {
  dilOd: string;
  dilOi: string;
  dicOd: string;
  dicOi: string;
  altBifOd: string;
  altBifOi: string;
  altProgOd: string;
  altProgOi: string;
  altCentroOd: string;
  altCentroOi: string;
}

export interface Economico {
  precioArmazonLejos: number;
  precioCristalesLejos: number;
  precioArmazonCerca: number;
  precioCristalesCerca: number;
  adicionales: string;
  precioTotal: number;
  sena: number;
  saldo: number;
}

export interface Cobertura {
  obraSocial: string;
  nroCarnet: string;
  nroDoc: string;
  formaPago: string;
}

// ---------------------------------------------------------------------------
// Public domain entities
// ---------------------------------------------------------------------------

export interface Ficha {
  nroFicha: number;
  /** ISO 8601 upload timestamp. Repository-managed; "" for legacy records. */
  createdAt: string;
  /** ISO 8601 last-modification timestamp. Repository-managed; "" for legacy records. */
  updatedAt: string;
  /** ISO 8601 void timestamp ("anulada"). "" while the ficha is active. */
  anuladaAt: string;
  nombre: string;
  edad: string;
  domicilio: string;
  tel: string;
  cel: string;
  fechaEntrada: string;
  recetaFecha: string;
  recetaDr: string;
  lejos: {
    od: OjoGraduacion;
    oi: OjoGraduacion;
    armazon: OjoArmazon;
  };
  cerca: {
    od: OjoGraduacion;
    oi: OjoGraduacion;
    armazon: OjoArmazon;
  };
  medidas: Medidas;
  tipoLente: TipoLente;
  economico: Economico;
  cobertura: Cobertura;
}

export interface FichaSummary {
  nroFicha: number;
  nombre: string;
  fechaEntrada: string;
  telefono: string;
  /** Upload timestamp (ISO 8601); same value as `Ficha.createdAt`. */
  fechaCarga: string;
  /** Void timestamp (ISO 8601); "" while the ficha is active. */
  anuladaAt: string;
}

// ---------------------------------------------------------------------------
// Use case inputs / outputs
// ---------------------------------------------------------------------------

/**
 * A rendered ficha PDF. `content` holds raw bytes (not base64) so the HTTP
 * layer can stream them as-is and no adapter detail (base64) leaks upward.
 */
export interface FichaPdf {
  fileName: string;
  mimeType: string;
  content: Uint8Array;
}

/** Audit timestamps are managed only by the repository, never by clients. */
export type CreateFichaInput = Omit<Ficha, "createdAt" | "updatedAt" | "anuladaAt">;

export type UpdateFichaInput = Partial<Omit<Ficha, "nroFicha" | "createdAt" | "updatedAt" | "anuladaAt">>;

export interface AnularFichaOptions {
  /** Optimistic concurrency token: the `updatedAt` the client loaded. */
  expectedUpdatedAt?: string;
}

export interface UpdateFichaOptions {
  /**
   * Optimistic concurrency token: the `updatedAt` the client loaded. When it
   * differs from the stored one the update is rejected with a conflict.
   */
  expectedUpdatedAt?: string;
}

/**
 * Fully resolved list parameters (what repositories receive). `sortDir` is
 * always concrete: use cases resolve the per-field default.
 */
export interface ListFichasParams {
  page: number;
  pageSize: number;
  /** Free search: exact N° ficha, name tokens, or phone/document digits. */
  q: string;
  /** Name tokens; every token must be contained (accent/case-insensitive). */
  nombre: string;
  /** Digits only; matched against `tel` or `cel`. Empty means no filter. */
  telefono: string;
  /** Include voided fichas. Defaults to false: they are hidden. */
  incluirAnuladas: boolean;
  sortBy: FichaSortField;
  sortDir: SortDirection;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  /** At least 1, even when there are no items. */
  totalPages: number;
}

export interface ListFichasResult extends Paginated<FichaSummary> {
  sortBy: FichaSortField;
  sortDir: SortDirection;
}

// ---------------------------------------------------------------------------
// Dependency injection token
// ---------------------------------------------------------------------------

export const FICHA_REPOSITORY_TOKEN = Symbol.for("optica.ficha.repository");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the primary phone for list/search display, preferring `CEL` over `TEL`.
 */
export function pickPrimaryPhone(ficha: Pick<Ficha, "cel" | "tel">): string {
  return ficha.cel.trim() !== "" ? ficha.cel : ficha.tel;
}

/**
 * Builds the empty-string defaults for a new Ficha. `nroFicha` is not
 * included: the user types it manually at creation.
 */
export function emptyFichaValues(): Omit<CreateFichaInput, "nroFicha"> {
  const emptyOjo: OjoGraduacion = { esf: "", cil: "", eje: "" };
  const emptyArmazon: OjoArmazon = {
    material: "",
    origen: "",
    armazon: "",
    modelo: "",
    color: "",
  };
  const emptyMedidas: Medidas = {
    dilOd: "",
    dilOi: "",
    dicOd: "",
    dicOi: "",
    altBifOd: "",
    altBifOi: "",
    altProgOd: "",
    altProgOi: "",
    altCentroOd: "",
    altCentroOi: "",
  };
  const emptyEconomico: Economico = {
    precioArmazonLejos: 0,
    precioCristalesLejos: 0,
    precioArmazonCerca: 0,
    precioCristalesCerca: 0,
    adicionales: "",
    precioTotal: 0,
    sena: 0,
    saldo: 0,
  };
  const emptyCobertura: Cobertura = {
    obraSocial: "",
    nroCarnet: "",
    nroDoc: "",
    formaPago: "",
  };
  return {
    nombre: "",
    edad: "",
    domicilio: "",
    tel: "",
    cel: "",
    fechaEntrada: "",
    recetaFecha: "",
    recetaDr: "",
    lejos: { od: { ...emptyOjo }, oi: { ...emptyOjo }, armazon: { ...emptyArmazon } },
    cerca: { od: { ...emptyOjo }, oi: { ...emptyOjo }, armazon: { ...emptyArmazon } },
    medidas: { ...emptyMedidas },
    tipoLente: "",
    economico: { ...emptyEconomico },
    cobertura: { ...emptyCobertura },
  };
}
