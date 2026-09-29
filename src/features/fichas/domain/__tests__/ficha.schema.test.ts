import { describe, expect, it } from "vitest";
import {
  CreateFichaSchema,
  FichaSchema,
  ListFichasParamsSchema,
  UpdateFichaSchema,
} from "../ficha.schema";
import { emptyFichaValues } from "../ficha.types";

describe("FichaSchema", () => {
  it("parses a complete valid object", () => {
    const result = FichaSchema.parse({
      nroFicha: 1,
      ...emptyFichaValues(),
    });
    expect(result.nroFicha).toBe(1);
    expect(result.lejos.od.esf).toBe("");
  });

  it("rejects non-positive nroFicha", () => {
    expect(() =>
      FichaSchema.parse({ nroFicha: -1, ...emptyFichaValues() }),
    ).toThrow();
    expect(() =>
      FichaSchema.parse({ nroFicha: 1.5, ...emptyFichaValues() }),
    ).toThrow();
  });

  it("rejects tipoLente outside the enum", () => {
    expect(() =>
      FichaSchema.parse({
        nroFicha: 1,
        ...emptyFichaValues(),
        tipoLente: "INVALIDO",
      }),
    ).toThrow();
  });

  it("normalizes fechaEntrada (es-AR input to ISO)", () => {
    const result = FichaSchema.parse({
      nroFicha: 1,
      ...emptyFichaValues(),
      fechaEntrada: "29/09/2026",
    });
    expect(result.fechaEntrada).toBe("2026-09-29");
  });

  it("strips $ and parses importe in es-AR format", () => {
    const result = FichaSchema.parse({
      nroFicha: 1,
      ...emptyFichaValues(),
      economico: {
        ...emptyFichaValues().economico,
        precioTotal: "$ 1.234,56",
      },
    });
    expect(result.economico.precioTotal).toBe(1234.56);
  });

  it("normalizes graduaciones", () => {
    const result = FichaSchema.parse({
      nroFicha: 1,
      ...emptyFichaValues(),
      lejos: {
        ...emptyFichaValues().lejos,
        od: { esf: "1,00", cil: "-0.25", eje: "90" },
      },
    });
    expect(result.lejos.od.esf).toBe("+1.00");
    expect(result.lejos.od.cil).toBe("-0.25");
  });
});

describe("CreateFichaSchema", () => {
  it("accepts input without nroFicha", () => {
    const input = emptyFichaValues();
    const result = CreateFichaSchema.parse(input);
    expect(result.nombre).toBe("");
  });

  it("strips nroFicha from the parsed result when present in input", () => {
    const input = { nroFicha: 5, ...emptyFichaValues() };
    // `.omit()` removes the key from the parsed output, even if the caller
    // provided it; the repository is the only authority that assigns
    // nroFicha at creation time.
    const result = CreateFichaSchema.parse(input);
    expect("nroFicha" in result).toBe(false);
  });
});

describe("UpdateFichaSchema", () => {
  it("accepts a partial patch", () => {
    const result = UpdateFichaSchema.parse({ nombre: "Juan" });
    expect(result.nombre).toBe("Juan");
  });

  it("accepts an empty patch", () => {
    const result = UpdateFichaSchema.parse({});
    expect(result).toBeDefined();
  });
});

describe("ListFichasParamsSchema", () => {
  it("applies default page and pageSize", () => {
    const result = ListFichasParamsSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.q).toBe("");
  });

  it("rejects pageSize over 200", () => {
    expect(() => ListFichasParamsSchema.parse({ pageSize: 1000 })).toThrow();
  });
});
