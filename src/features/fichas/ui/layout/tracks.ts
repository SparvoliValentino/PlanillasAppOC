/**
 * Pure math for resizable column tracks. A track list is a set of
 * proportions of the available width (never pixels), so a stored layout
 * survives zoom and window changes.
 */

/** Tolerance used when comparing proportions (floating point noise). */
const EPSILON = 1e-6;

function isUsable(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Scales the tracks so they add up to 1. Returns null when they cannot be scaled. */
export function normalizeTracks(tracks: readonly number[]): number[] | null {
  if (tracks.length === 0 || !tracks.every(isUsable)) return null;
  const total = tracks.reduce((sum, track) => sum + track, 0);
  if (!isUsable(total)) return null;
  return tracks.map((track) => track / total);
}

/**
 * Valid range, as cumulative positions, for the boundary between track
 * `index` and track `index + 1`: neither neighbour may go below its minimum.
 * Returns null when the boundary does not exist.
 */
export function boundaryRange(
  tracks: readonly number[],
  index: number,
  minimums: readonly number[],
): { lo: number; hi: number } | null {
  if (!Number.isInteger(index) || index < 0 || index >= tracks.length - 1) return null;
  let before = 0;
  for (let i = 0; i < index; i += 1) before += tracks[i] ?? 0;
  const left = tracks[index] ?? 0;
  const right = tracks[index + 1] ?? 0;
  return {
    lo: before + (minimums[index] ?? 0),
    hi: before + left + right - (minimums[index + 1] ?? 0),
  };
}

/**
 * Moves the boundary between track `index` and `index + 1` by `delta`
 * (a proportion), clamped so both tracks keep their minimum. The total is
 * preserved. Invalid input returns an unchanged copy.
 */
export function moveBoundary(
  tracks: readonly number[],
  index: number,
  delta: number,
  minimums: readonly number[],
): number[] {
  const next = [...tracks];
  const range = boundaryRange(tracks, index, minimums);
  if (!range || !Number.isFinite(delta) || range.lo > range.hi + EPSILON) return next;

  const left = tracks[index] ?? 0;
  const right = tracks[index + 1] ?? 0;
  const lowest = (minimums[index] ?? 0) - left;
  const highest = right - (minimums[index + 1] ?? 0);
  const applied = Math.min(Math.max(delta, lowest), highest);

  next[index] = left + applied;
  next[index + 1] = right - applied;
  return next;
}

/** True when the tracks are a sane layout for the given minimums. */
export function isValidTracks(
  tracks: readonly number[],
  minimums: readonly number[],
): boolean {
  if (tracks.length !== minimums.length || !tracks.every(isUsable)) return false;
  const total = tracks.reduce((sum, track) => sum + track, 0);
  if (Math.abs(total - 1) > 1e-3) return false;
  return tracks.every((track, i) => track >= (minimums[i] ?? 0) - EPSILON);
}
