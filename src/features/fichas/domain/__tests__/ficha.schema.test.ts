import { describe, expect, it } from "vitest";
import {
  AnularFichaRequestSchema,
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
  it("rejects input without nroFicha", () => {
    const result = CreateFichaSchema.safeParse(emptyFichaValues());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("El N° de ficha es obligatorio.");
    }
  });

  it.each([0, -3, 1.5, 100000000])("rejects invalid nroFicha %s", (nroFicha) => {
    expect(() => CreateFichaSchema.parse({ nroFicha, ...emptyFichaValues() })).toThrow();
  });

  it("keeps the typed nroFicha in the parsed result", () => {
    const result = CreateFichaSchema.parse({ nroFicha: 5, ...emptyFichaValues() });
    expect(result.nroFicha).toBe(5);
  });
});

describe("UpdateFichaSchema", () => {
  it("accepts a partial patch", () => {
    const result = UpdateFichaSchema.parse({ nombre: "Juan" });
    expect(result.nombre).toBe("Juan");
  });

  it("drops nroFicha so it can never be patched", () => {
    const result = UpdateFichaSchema.parse({ nroFicha: 9, nombre: "Juan" });
    expect("nroFicha" in result).toBe(false);
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
    expect(result.nombre).toBe("");
    expect(result.telefono).toBe("");
  });

  it("hides voided fichas by default and accepts incluirAnuladas", () => {
    expect(ListFichasParamsSchema.parse({}).incluirAnuladas).toBe(false);
    expect(ListFichasParamsSchema.parse({ incluirAnuladas: true }).incluirAnuladas).toBe(true);
    expect(() => ListFichasParamsSchema.parse({ incluirAnuladas: "yes" })).toThrow();
  });

  it("defaults to fechaCarga desc", () => {
    const result = ListFichasParamsSchema.parse({});
    expect(result.sortBy).toBe("fechaCarga");
    expect(result.sortDir).toBe("desc");
  });

  it("resolves the default direction per sort field", () => {
    expect(ListFichasParamsSchema.parse({ sortBy: "fechaEntrada" }).sortDir).toBe("desc");
    expect(ListFichasParamsSchema.parse({ sortBy: "nombre" }).sortDir).toBe("asc");
    expect(ListFichasParamsSchema.parse({ sortBy: "nroFicha" }).sortDir).toBe("asc");
  });

  it("keeps an explicit sortDir", () => {
    expect(ListFichasParamsSchema.parse({ sortBy: "nombre", sortDir: "desc" }).sortDir).toBe("desc");
  });

  it("rejects invalid sortBy and sortDir", () => {
    expect(() => ListFichasParamsSchema.parse({ sortBy: "edad" })).toThrow();
    expect(() => ListFichasParamsSchema.parse({ sortDir: "up" })).toThrow();
  });

  it("rejects page 0 and non-integer pageSize", () => {
    expect(() => ListFichasParamsSchema.parse({ page: 0 })).toThrow();
    expect(() => ListFichasParamsSchema.parse({ pageSize: 0 })).toThrow();
  });

  it("reduces telefono to digits and rejects fewer than 3 digits", () => {
    expect(ListFichasParamsSchema.parse({ telefono: "011-4321" }).telefono).toBe("0114321");
    expect(() => ListFichasParamsSchema.parse({ telefono: "1" })).toThrow();
    expect(() => ListFichasParamsSchema.parse({ telefono: "12" })).toThrow();
    expect(() => ListFichasParamsSchema.parse({ telefono: "ab" })).toThrow();
    expect(ListFichasParamsSchema.parse({ telefono: "  " }).telefono).toBe("");
  });

  it("rejects pageSize over 200", () => {
    expect(() => ListFichasParamsSchema.parse({ pageSize: 1000 })).toThrow();
  });
});

describe("anuladaAt handling", () => {
  it("is not accepted from clients on create or update", () => {
    const created = CreateFichaSchema.parse({
      ...emptyFichaValues(),
      nroFicha: 1,
      anuladaAt: "2026-01-01T00:00:00.000Z",
    });
    expect("anuladaAt" in created).toBe(false);
    expect("anuladaAt" in UpdateFichaSchema.parse({ anuladaAt: "x" })).toBe(false);
  });
});

describe("AnularFichaRequestSchema", () => {
  it("accepts an empty body and an expectedUpdatedAt", () => {
    expect(AnularFichaRequestSchema.parse({})).toEqual({});
    expect(AnularFichaRequestSchema.parse({ expectedUpdatedAt: "2026-01-01T00:00:00.000Z" })).toEqual({
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("rejects an empty expectedUpdatedAt", () => {
    expect(() => AnularFichaRequestSchema.parse({ expectedUpdatedAt: "" })).toThrow();
  });
});
