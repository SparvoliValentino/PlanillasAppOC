import { describe, expect, it } from "vitest";

import { boundaryRange, isValidTracks, moveBoundary, normalizeTracks } from "../tracks";

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

describe("normalizeTracks", () => {
  it("scales tracks to add up to 1", () => {
    expect(normalizeTracks([1, 1, 2])).toEqual([0.25, 0.25, 0.5]);
  });

  it("rejects empty, non-positive and non-finite input", () => {
    expect(normalizeTracks([])).toBeNull();
    expect(normalizeTracks([0.5, 0])).toBeNull();
    expect(normalizeTracks([0.5, -0.1])).toBeNull();
    expect(normalizeTracks([0.5, Number.NaN])).toBeNull();
    expect(normalizeTracks([0.5, Number.POSITIVE_INFINITY])).toBeNull();
  });
});

describe("moveBoundary", () => {
  const mins = [0.2, 0.2, 0.2];

  it("moves the boundary and preserves the total", () => {
    const next = moveBoundary([0.4, 0.3, 0.3], 0, 0.1, mins);
    expect(next[0]).toBeCloseTo(0.5);
    expect(next[1]).toBeCloseTo(0.2);
    expect(next[2]).toBe(0.3);
    expect(sum(next)).toBeCloseTo(1);
  });

  it("clamps to the minimum of the shrinking neighbour", () => {
    const next = moveBoundary([0.4, 0.3, 0.3], 0, 0.5, mins);
    expect(next[0]).toBeCloseTo(0.5);
    expect(next[1]).toBeCloseTo(0.2);
    const back = moveBoundary([0.4, 0.3, 0.3], 0, -0.5, mins);
    expect(back[0]).toBeCloseTo(0.2);
    expect(back[1]).toBeCloseTo(0.5);
  });

  it("returns an unchanged copy for invalid boundaries or deltas", () => {
    const tracks = [0.5, 0.5];
    expect(moveBoundary(tracks, 1, 0.1, [0.1, 0.1])).toEqual(tracks);
    expect(moveBoundary(tracks, -1, 0.1, [0.1, 0.1])).toEqual(tracks);
    expect(moveBoundary(tracks, 0, Number.NaN, [0.1, 0.1])).toEqual(tracks);
    expect(moveBoundary(tracks, 0, 0.1, [0.1, 0.1])).not.toBe(tracks);
  });

  it("does not mutate its input", () => {
    const tracks = [0.5, 0.5];
    moveBoundary(tracks, 0, 0.1, [0.1, 0.1]);
    expect(tracks).toEqual([0.5, 0.5]);
  });
});

describe("boundaryRange", () => {
  it("returns cumulative limits for a boundary", () => {
    const range = boundaryRange([0.4, 0.3, 0.3], 1, [0.2, 0.1, 0.2]);
    expect(range?.lo).toBeCloseTo(0.5);
    expect(range?.hi).toBeCloseTo(0.8);
  });

  it("returns null when the boundary does not exist", () => {
    expect(boundaryRange([0.5, 0.5], 1, [0.1, 0.1])).toBeNull();
  });
});

describe("isValidTracks", () => {
  it("accepts tracks that add up to 1 and respect minimums", () => {
    expect(isValidTracks([0.5, 0.5], [0.1, 0.1])).toBe(true);
  });

  it("rejects wrong count, wrong total and values below the minimum", () => {
    expect(isValidTracks([0.5, 0.5], [0.1])).toBe(false);
    expect(isValidTracks([0.5, 0.4], [0.1, 0.1])).toBe(false);
    expect(isValidTracks([0.95, 0.05], [0.1, 0.1])).toBe(false);
  });
});
