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
}

// ---------------------------------------------------------------------------
// Use case inputs / outputs
// ---------------------------------------------------------------------------

export type CreateFichaInput = Omit<Ficha, "nroFicha">;

export type UpdateFichaInput = Partial<Omit<Ficha, "nroFicha">>;

export interface ListFichasParams {
  page: number;
  pageSize: number;
  q: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
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
 * Builds the empty-string defaults for a new Ficha. The repository is still
 * responsible for assigning `nroFicha`.
 */
export function emptyFichaValues(): Omit<Ficha, "nroFicha"> {
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
