import { describe, expect, it } from "vitest";

import { EMPTY_LAYOUT, parseLayout, resolveTracks, serializeLayout } from "../storage";
import type { GridDef } from "../storage";

const GRID: GridDef = {
  id: "test",
  defaults: [0.5, 0.5],
  minimums: [0.2, 0.2],
  gapRem: 0,
};

describe("parseLayout / serializeLayout", () => {
  it("round-trips a layout", () => {
    const layout = { test: [0.3, 0.7] };
    expect(parseLayout(serializeLayout(layout))).toEqual(layout);
  });

  it("falls back to empty on corrupt or outdated data", () => {
    expect(parseLayout(null)).toBe(EMPTY_LAYOUT);
    expect(parseLayout("not json")).toBe(EMPTY_LAYOUT);
    expect(parseLayout("42")).toBe(EMPTY_LAYOUT);
    expect(parseLayout("null")).toBe(EMPTY_LAYOUT);
    expect(parseLayout(JSON.stringify({ version: 0, grids: { test: [0.5, 0.5] } }))).toBe(
      EMPTY_LAYOUT,
    );
    expect(parseLayout(JSON.stringify({ version: 1, grids: "x" }))).toBe(EMPTY_LAYOUT);
  });

  it("drops grids with non-numeric or non-finite tracks but keeps the rest", () => {
    const raw = JSON.stringify({
      version: 1,
      grids: { good: [0.4, 0.6], text: ["a", "b"], nope: 3, nan: [null, 1] },
    });
    expect(parseLayout(raw)).toEqual({ good: [0.4, 0.6] });
  });
});

describe("resolveTracks", () => {
  it("uses stored tracks when they fit the grid", () => {
    expect(resolveTracks([0.3, 0.7], GRID)).toEqual([0.3, 0.7]);
  });

  it("falls back to defaults when missing", () => {
    expect(resolveTracks(undefined, GRID)).toEqual([0.5, 0.5]);
  });

  it("falls back to defaults on count mismatch, bad numbers or broken minimums", () => {
    expect(resolveTracks([0.2, 0.3, 0.5], GRID)).toEqual([0.5, 0.5]);
    expect(resolveTracks([Number.NaN, 0.5], GRID)).toEqual([0.5, 0.5]);
    expect(resolveTracks([-1, 2], GRID)).toEqual([0.5, 0.5]);
    expect(resolveTracks([0.9, 0.1], GRID)).toEqual([0.5, 0.5]);
  });

  it("returns a copy of the defaults", () => {
    expect(resolveTracks(undefined, GRID)).not.toBe(GRID.defaults);
  });
});
