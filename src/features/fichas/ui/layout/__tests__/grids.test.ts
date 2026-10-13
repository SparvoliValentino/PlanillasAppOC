import { describe, expect, it } from "vitest";

import { ALL_GRIDS } from "../grids";
import { isValidTracks } from "../tracks";

describe("ficha grid definitions", () => {
  it("have unique ids", () => {
    const ids = ALL_GRIDS.map((grid) => grid.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(ALL_GRIDS.map((grid) => [grid.id, grid] as const))(
    "%s has defaults that add up to 1 and respect its minimums",
    (_id, grid) => {
      expect(grid.minimums).toHaveLength(grid.defaults.length);
      expect(isValidTracks(grid.defaults, grid.minimums)).toBe(true);
    },
  );
});
