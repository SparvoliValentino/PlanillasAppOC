import { describe, expect, it } from "vitest";
import {
  NormalizerError,
  normalizeGraduacion,
  parseDocumento,
  parseFecha,
  parseImporte,
  parseTelefono,
} from "../normalizers";

describe("normalizeGraduacion", () => {
  it("preserves explicit positive sign", () => {
    expect(normalizeGraduacion("+1.00")).toBe("+1.00");
  });

  it("preserves explicit negative sign", () => {
    expect(normalizeGraduacion("-0.50")).toBe("-0.50");
  });

  it("prepends + when only a number is provided", () => {
    expect(normalizeGraduacion("1.00")).toBe("+1.00");
    expect(normalizeGraduacion("0.50")).toBe("+0.50");
  });

  it("normalizes comma decimal to dot", () => {
    expect(normalizeGraduacion("  -0,25  ")).toBe("-0.25");
  });

  it("returns empty for blank input", () => {
    expect(normalizeGraduacion("")).toBe("");
    expect(normalizeGraduacion("   ")).toBe("");
  });

  it("throws on invalid characters", () => {
    expect(() => normalizeGraduacion("abc")).toThrow(NormalizerError);
    expect(() => normalizeGraduacion("1.2.3")).toThrow(NormalizerError);
    expect(() => normalizeGraduacion("++1")).toThrow(NormalizerError);
  });

  it("attaches NormalizerError metadata", () => {
    try {
      normalizeGraduacion("xyz");
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(NormalizerError);
      if (error instanceof NormalizerError) {
        expect(error.field).toBe("graduacion");
        expect(error.raw).toBe("xyz");
        expect(error.code).toBe("GRADUACION_INVALIDA");
      }
    }
  });
});

describe("parseFecha", () => {
  it("parses ISO YYYY-MM-DD", () => {
    expect(parseFecha("2026-09-29")).toBe("2026-09-29");
    expect(parseFecha("2026/09/29")).toBe("2026-09-29");
  });

  it("parses DD/MM/YYYY es-AR", () => {
    expect(parseFecha("29/09/2026")).toBe("2026-09-29");
    expect(parseFecha("29-9-2026")).toBe("2026-09-29");
    expect(parseFecha("29.9.26")).toBe("2026-09-29");
  });

  it("parses long-form Spanish date", () => {
    expect(parseFecha("29 de septiembre de 2026")).toBe("2026-09-29");
    expect(parseFecha("1 de enero de 2025")).toBe("2025-01-01");
  });

  it("rejects invalid dates", () => {
    expect(() => parseFecha("31/02/2026")).toThrow(NormalizerError);
    expect(() => parseFecha("foo")).toThrow(NormalizerError);
  });

  it("returns empty for blank", () => {
    expect(parseFecha("")).toBe("");
    expect(parseFecha("   ")).toBe("");
  });
});

describe("parseImporte", () => {
  it("accepts plain numbers", () => {
    expect(parseImporte("1234")).toBe(1234);
    expect(parseImporte("1234.56")).toBe(1234.56);
  });

  it("accepts es-AR formatted strings", () => {
    expect(parseImporte("1.234,56")).toBe(1234.56);
    expect(parseImporte("$ 1.234,56")).toBe(1234.56);
    expect(parseImporte("1.234.567,89")).toBe(1234567.89);
  });

  it("accepts the zero and near-zero inputs", () => {
    expect(parseImporte("$ 0")).toBe(0);
    expect(parseImporte("0,00")).toBe(0);
  });

  it("returns 0 for empty", () => {
    expect(parseImporte("")).toBe(0);
    expect(parseImporte("   ")).toBe(0);
  });

  it("passes numbers through", () => {
    expect(parseImporte(1234.5)).toBe(1234.5);
  });

  it("rejects non-numeric strings", () => {
    expect(() => parseImporte("abc")).toThrow(NormalizerError);
  });
});

describe("parseTelefono", () => {
  it("preserves a leading + and removes inner spaces and dashes", () => {
    expect(parseTelefono("+54 11 5555-5555")).toBe("+541155555555");
  });

  it("keeps digits when there is no country code", () => {
    expect(parseTelefono("1144445555")).toBe("1144445555");
  });

  it("returns empty for blank input", () => {
    expect(parseTelefono("")).toBe("");
    expect(parseTelefono("  ")).toBe("");
  });
});

describe("parseDocumento", () => {
  it("preserves dots and inner spaces", () => {
    expect(parseDocumento("12.345.678")).toBe("12.345.678");
    expect(parseDocumento("DNI 12345678")).toBe("DNI 12345678");
  });

  it("trims surrounding whitespace", () => {
    expect(parseDocumento("  12345  ")).toBe("12345");
  });

  it("returns empty for blank input", () => {
    expect(parseDocumento("")).toBe("");
  });
});
