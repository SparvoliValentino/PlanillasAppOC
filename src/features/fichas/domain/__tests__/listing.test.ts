import { describe, expect, it } from "vitest";

import { emptyFichaValues } from "../ficha.types";
import type { Ficha } from "../ficha.types";
import {
  compareFichas,
  digitsOnly,
  matchesFilters,
  normalizeSearchKey,
} from "../listing";

function ficha(nroFicha: number, overrides: Partial<Ficha> = {}): Ficha {
  return { ...emptyFichaValues(), nroFicha, createdAt: "", updatedAt: "", anuladaAt: "", ...overrides };
}

const none = { q: "", nombre: "", telefono: "", incluirAnuladas: false };

describe("normalizeSearchKey / digitsOnly", () => {
  it("strips accents, lowercases and collapses whitespace", () => {
    expect(normalizeSearchKey("  Juan   PÉREZ ")).toBe("juan perez");
    expect(normalizeSearchKey("Ñandú")).toBe("nandu");
  });

  it("keeps only digits", () => {
    expect(digitsOnly("+54 9 11 5555-0001")).toBe("5491155550001");
    expect(digitsOnly("abc")).toBe("");
  });
});

describe("matchesFilters: voided fichas", () => {
  const active = ficha(1, { nombre: "Juan Pérez" });
  const voided = ficha(2, { nombre: "Juan Pérez", anuladaAt: "2026-09-02T10:00:00.000Z" });

  it("hides voided fichas by default", () => {
    expect(matchesFilters(active, none)).toBe(true);
    expect(matchesFilters(voided, none)).toBe(false);
  });

  it("includes voided fichas when incluirAnuladas is true", () => {
    expect(matchesFilters(voided, { ...none, incluirAnuladas: true })).toBe(true);
    expect(matchesFilters(active, { ...none, incluirAnuladas: true })).toBe(true);
  });

  it("still applies the other filters to voided fichas", () => {
    expect(matchesFilters(voided, { ...none, incluirAnuladas: true, nombre: "lopez" })).toBe(false);
  });
});

describe("matchesFilters", () => {
  const juan = ficha(1, {
    nombre: "Juan Pérez",
    tel: "011-4321-0001",
    cel: "+54 9 11 5555-0001",
    cobertura: { obraSocial: "", nroCarnet: "", nroDoc: "20.123.456", formaPago: "" },
  });

  it("matches everything with no filters", () => {
    expect(matchesFilters(juan, none)).toBe(true);
  });

  it("nombre: every token, any order, accent and case insensitive", () => {
    expect(matchesFilters(juan, { ...none, nombre: "perez juan" })).toBe(true);
    expect(matchesFilters(juan, { ...none, nombre: "JUAN PÉ" })).toBe(true);
    expect(matchesFilters(juan, { ...none, nombre: "juan lopez" })).toBe(false);
  });

  it("telefono: digits contained in tel or cel", () => {
    expect(matchesFilters(juan, { ...none, telefono: "4321" })).toBe(true); // tel
    expect(matchesFilters(juan, { ...none, telefono: "5555" })).toBe(true); // cel
    expect(matchesFilters(juan, { ...none, telefono: "9999" })).toBe(false);
  });

  it("q: exact nroFicha when all digits", () => {
    expect(matchesFilters(juan, { ...none, q: "1" })).toBe(true);
    expect(matchesFilters(juan, { ...none, q: "2" })).toBe(false);
  });

  it("q: name tokens", () => {
    expect(matchesFilters(juan, { ...none, q: "perez" })).toBe(true);
    expect(matchesFilters(juan, { ...none, q: "gomez" })).toBe(false);
  });

  it("q: 3+ digits match tel, cel or document; fewer digits do not", () => {
    expect(matchesFilters(juan, { ...none, q: "4321" })).toBe(true);
    expect(matchesFilters(juan, { ...none, q: "5555-0001" })).toBe(true);
    expect(matchesFilters(juan, { ...none, q: "20.123" })).toBe(true);
    expect(matchesFilters(juan, { ...none, q: "45" })).toBe(false);
  });

  it("combines nombre, telefono and q with AND", () => {
    expect(matchesFilters(juan, { ...none, q: "1", nombre: "juan", telefono: "5555" })).toBe(true);
    expect(matchesFilters(juan, { ...none, q: "1", nombre: "juan", telefono: "9999" })).toBe(false);
    expect(matchesFilters(juan, { ...none, q: "2", nombre: "juan", telefono: "5555" })).toBe(false);
    expect(matchesFilters(juan, { ...none, q: "1", nombre: "maria", telefono: "5555" })).toBe(false);
  });
});

describe("compareFichas", () => {
  const sortNros = (list: Ficha[], by: Parameters<typeof compareFichas>[0], dir: "asc" | "desc") =>
    [...list].sort(compareFichas(by, dir)).map((f) => f.nroFicha);

  it("sorts by nroFicha in both directions", () => {
    const list = [ficha(3), ficha(1), ficha(2)];
    expect(sortNros(list, "nroFicha", "asc")).toEqual([1, 2, 3]);
    expect(sortNros(list, "nroFicha", "desc")).toEqual([3, 2, 1]);
  });

  it("sorts by nombre on the normalized key", () => {
    const list = [
      ficha(1, { nombre: "Zoe" }),
      ficha(2, { nombre: "Álvaro" }),
      ficha(3, { nombre: "beto" }),
    ];
    expect(sortNros(list, "nombre", "asc")).toEqual([2, 3, 1]);
    expect(sortNros(list, "nombre", "desc")).toEqual([1, 3, 2]);
  });

  it("puts empty values last in both directions", () => {
    const list = [
      ficha(1, { fechaEntrada: "" }),
      ficha(2, { fechaEntrada: "2026-01-01" }),
      ficha(3, { fechaEntrada: "2026-03-01" }),
    ];
    expect(sortNros(list, "fechaEntrada", "asc")).toEqual([2, 3, 1]);
    expect(sortNros(list, "fechaEntrada", "desc")).toEqual([3, 2, 1]);
    const names = [ficha(1, { nombre: "" }), ficha(2, { nombre: "Ana" })];
    expect(sortNros(names, "nombre", "asc")).toEqual([2, 1]);
    expect(sortNros(names, "nombre", "desc")).toEqual([2, 1]);
  });

  it("sorts by fechaCarga (createdAt)", () => {
    const list = [
      ficha(1, { createdAt: "2026-01-01T00:00:00.000Z" }),
      ficha(2, { createdAt: "2026-02-01T00:00:00.000Z" }),
      ficha(3, { createdAt: "" }),
    ];
    expect(sortNros(list, "fechaCarga", "desc")).toEqual([2, 1, 3]);
    expect(sortNros(list, "fechaCarga", "asc")).toEqual([1, 2, 3]);
  });

  it("breaks ties by nroFicha ascending regardless of direction", () => {
    const list = [ficha(5, { nombre: "Ana" }), ficha(2, { nombre: "ana" }), ficha(9, { nombre: "Ana" })];
    expect(sortNros(list, "nombre", "asc")).toEqual([2, 5, 9]);
    expect(sortNros(list, "nombre", "desc")).toEqual([2, 5, 9]);
  });
});
