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
