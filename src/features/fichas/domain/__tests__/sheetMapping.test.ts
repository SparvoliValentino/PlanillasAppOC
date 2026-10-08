import { describe, expect, it } from "vitest";
import { FICHA_COLUMNS, FICHA_COLUMN_ORDER } from "../sheetMapping";

describe("sheetMapping", () => {
  it("defines a non-empty column order", () => {
    expect(FICHA_COLUMN_ORDER.length).toBeGreaterThan(0);
  });

  it("includes the canonical identifiers and labels", () => {
    for (const col of ["NRO_FICHA", "NOMBRE", "FECHA_ENTRADA", "OBRA_SOCIAL", "FORMA_PAGO"]) {
      expect(FICHA_COLUMNS.has(col)).toBe(true);
    }
  });

  it("keeps the 54 Anexo B columns followed by the two audit columns", () => {
    expect(FICHA_COLUMN_ORDER).toHaveLength(57);
    expect(FICHA_COLUMN_ORDER[0]).toBe("NRO_FICHA");
    expect(FICHA_COLUMN_ORDER[53]).toBe("FORMA_PAGO");
    expect(FICHA_COLUMN_ORDER.slice(-3)).toEqual(["CREATED_AT", "UPDATED_AT", "ANULADA_AT"]);
  });

  it("has no duplicate columns", () => {
    const seen = new Set<string>();
    for (const col of FICHA_COLUMN_ORDER) {
      expect(seen.has(col)).toBe(false);
      seen.add(col);
    }
  });
});
