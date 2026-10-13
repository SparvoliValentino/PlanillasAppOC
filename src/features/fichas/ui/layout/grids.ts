import type { GridDef } from "./storage";

/**
 * Every resizable grid of the ficha. Rows that belong to the same logical
 * grid share one definition, so dragging a boundary moves it in all of them.
 * Defaults are proportions that reproduce the original fixed layout.
 */

/** Receta / lejos / cerca | medidas / tipo de lente. */
export const BODY_RECETA_GRID: GridDef = {
  id: "body-receta",
  defaults: [0.7, 0.3],
  minimums: [0.4, 0.2],
  gapRem: 0,
  stackBelowMd: true,
};

/** Económico | cobertura. */
export const BODY_ECONOMICO_GRID: GridDef = {
  id: "body-economico",
  defaults: [0.6, 0.4],
  minimums: [0.3, 0.25],
  gapRem: 0,
  stackBelowMd: true,
};

/** Five medidas rows: label | O.D. | value | O.I. | value (was 4.5rem 2rem 1fr 2rem 1fr). */
export const MEDIDAS_GRID: GridDef = {
  id: "medidas",
  defaults: [0.28125, 0.125, 0.234375, 0.125, 0.234375],
  minimums: [0.18, 0.09, 0.14, 0.09, 0.14],
  gapRem: 0.5,
};

/** Graduation rows (O.D./O.I., lejos/cerca): eye | esf | cil | "a" | eje. */
export const GRADUACION_GRID: GridDef = {
  id: "graduacion",
  defaults: [0.06, 0.3, 0.3, 0.04, 0.3],
  minimums: [0.04, 0.15, 0.15, 0.025, 0.1],
  gapRem: 0.5,
};

/** Material / origen checkboxes + armazón / modelo / color fields. */
export const ARMAZON_GRID: GridDef = {
  id: "armazon",
  defaults: [0.22, 0.18, 0.6],
  minimums: [0.14, 0.1, 0.3],
  gapRem: 1.5,
};

/** Receta fecha | Dr. */
export const RECETA_GRID: GridDef = {
  id: "receta",
  defaults: [0.5, 0.5],
  minimums: [0.25, 0.25],
  gapRem: 1.5,
  stackBelowMd: true,
};

/** Identification block of the header: nombre/edad, domicilio/contacto. */
export const IDENTIFICACION_GRID: GridDef = {
  id: "identificacion",
  defaults: [0.5, 0.5],
  minimums: [0.25, 0.25],
  gapRem: 1.5,
  stackBelowMd: true,
};

/** Tel. | Cel. inside the identification block. */
export const CONTACTO_GRID: GridDef = {
  id: "contacto",
  defaults: [0.5, 0.5],
  minimums: [0.25, 0.25],
  gapRem: 1.5,
};

export const ALL_GRIDS: readonly GridDef[] = [
  BODY_RECETA_GRID,
  BODY_ECONOMICO_GRID,
  MEDIDAS_GRID,
  GRADUACION_GRID,
  ARMAZON_GRID,
  RECETA_GRID,
  IDENTIFICACION_GRID,
  CONTACTO_GRID,
];
