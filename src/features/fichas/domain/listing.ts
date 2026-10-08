/**
 * Pure filtering and sorting rules for the fichas list.
 *
 * These mirror the Google Apps Script backend (`buildFilter_` /
 * `buildComparator_`) so every adapter behaves the same.
 * Filtering and sorting always run over the WHOLE dataset, before pagination.
 */

import type { Ficha, FichaSortField, ListFichasParams, SortDirection } from "./ficha.types";

/** Minimum digits required for a digits-based search. */
const MIN_DIGITS_SEARCH = 3;

/** Fields the list rules read; a full `Ficha` satisfies it. */
export type ListableFicha = Pick<
  Ficha,
  "nroFicha" | "nombre" | "tel" | "cel" | "fechaEntrada" | "createdAt" | "anuladaAt"
> & {
  cobertura: Pick<Ficha["cobertura"], "nroDoc">;
};

export type FichaFilters = Pick<ListFichasParams, "q" | "nombre" | "telefono" | "incluirAnuladas">;

/** Lowercase, accent-free, single-spaced, trimmed key for text comparison. */
export function normalizeSearchKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function digitsOnly(text: string): string {
  return text.replace(/\D/g, "");
}

function tokens(text: string): string[] {
  return normalizeSearchKey(text).split(" ").filter(Boolean);
}

function hasEveryToken(key: string, needed: string[]): boolean {
  return needed.every((token) => key.includes(token));
}

/**
 * Builds a predicate with all filters combined by AND. Useful to prepare the
 * filter once and apply it to many fichas.
 */
export function createFichaFilter(filters: FichaFilters): (ficha: ListableFicha) => boolean {
  const nombreTokens = tokens(filters.nombre);
  const telefono = digitsOnly(filters.telefono);
  const q = filters.q.trim();
  const qTokens = tokens(q);
  const qDigits = digitsOnly(q);
  const qNumber = /^\d+$/.test(q) ? Number(q) : null;

  return (ficha) => {
    // Voided fichas are hidden unless explicitly requested.
    if (!filters.incluirAnuladas && ficha.anuladaAt !== "") return false;

    const nombreKey = normalizeSearchKey(ficha.nombre);
    const telDigits = digitsOnly(ficha.tel);
    const celDigits = digitsOnly(ficha.cel);

    if (nombreTokens.length > 0 && !hasEveryToken(nombreKey, nombreTokens)) return false;

    if (telefono !== "" && !telDigits.includes(telefono) && !celDigits.includes(telefono)) {
      return false;
    }

    if (qTokens.length > 0 || qNumber !== null) {
      const byNumber = qNumber !== null && ficha.nroFicha === qNumber;
      const byName = qTokens.length > 0 && hasEveryToken(nombreKey, qTokens);
      const byDigits =
        qDigits.length >= MIN_DIGITS_SEARCH &&
        (telDigits.includes(qDigits) ||
          celDigits.includes(qDigits) ||
          digitsOnly(ficha.cobertura.nroDoc).includes(qDigits));
      if (!byNumber && !byName && !byDigits) return false;
    }
    return true;
  };
}

export function matchesFilters(ficha: ListableFicha, filters: FichaFilters): boolean {
  return createFichaFilter(filters)(ficha);
}

/**
 * Builds the comparator for the requested sort. Empty values always go last,
 * whatever the direction. Ties fall back to `nroFicha` ascending.
 */
export function compareFichas(
  sortBy: FichaSortField,
  sortDir: SortDirection,
): (a: ListableFicha, b: ListableFicha) => number {
  const sign = sortDir === "desc" ? -1 : 1;

  return (a, b) => {
    let result = 0;
    if (sortBy === "nroFicha") {
      result = (a.nroFicha - b.nroFicha) * sign;
    } else {
      result = compareEmptyLast(sortKey(a, sortBy), sortKey(b, sortBy), sign);
    }
    return result !== 0 ? result : a.nroFicha - b.nroFicha;
  };
}

function sortKey(ficha: ListableFicha, sortBy: Exclude<FichaSortField, "nroFicha">): string {
  switch (sortBy) {
    case "fechaCarga":
      return ficha.createdAt;
    case "fechaEntrada":
      return ficha.fechaEntrada;
    case "nombre":
      return normalizeSearchKey(ficha.nombre);
  }
}

function compareEmptyLast(a: string, b: string, sign: number): number {
  if (a === b) return 0;
  if (a === "") return 1;
  if (b === "") return -1;
  return (a < b ? -1 : 1) * sign;
}
