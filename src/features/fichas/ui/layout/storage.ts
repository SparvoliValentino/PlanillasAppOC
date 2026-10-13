import { isValidTracks, normalizeTracks } from "./tracks";

/** Definition of one logical grid: its id, default look and per-track limits. */
export interface GridDef {
  /** Stable id; every row of the same logical grid shares it. */
  readonly id: string;
  /** Default proportions; must add up to 1. */
  readonly defaults: readonly number[];
  /** Minimum proportion of each track. */
  readonly minimums: readonly number[];
  /** Horizontal gap between tracks, in rem. */
  readonly gapRem: number;
  /** When true the grid is a single column below the `md` breakpoint. */
  readonly stackBelowMd?: boolean;
}

/** Stored tracks by grid id. */
export type StoredLayout = Readonly<Record<string, readonly number[]>>;

export const LAYOUT_STORAGE_KEY = "optica.ficha.layout.v1";
const LAYOUT_VERSION = 1;

export const EMPTY_LAYOUT: StoredLayout = Object.freeze({});

/** Parses a stored value. Anything corrupt or outdated yields an empty layout. */
export function parseLayout(raw: string | null): StoredLayout {
  if (raw === null) return EMPTY_LAYOUT;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_LAYOUT;
  }
  if (typeof data !== "object" || data === null) return EMPTY_LAYOUT;
  const { version, grids } = data as { version?: unknown; grids?: unknown };
  if (version !== LAYOUT_VERSION || typeof grids !== "object" || grids === null) {
    return EMPTY_LAYOUT;
  }

  const layout: Record<string, readonly number[]> = {};
  for (const [id, tracks] of Object.entries(grids)) {
    if (!Array.isArray(tracks)) continue;
    if (!tracks.every((track) => typeof track === "number" && Number.isFinite(track))) continue;
    layout[id] = tracks as number[];
  }
  return layout;
}

export function serializeLayout(layout: StoredLayout): string {
  return JSON.stringify({ version: LAYOUT_VERSION, grids: layout });
}

/**
 * Tracks to render for a grid: the stored ones when they fit the grid
 * definition, the defaults otherwise (missing, wrong count, below minimums).
 */
export function resolveTracks(stored: readonly number[] | undefined, grid: GridDef): number[] {
  if (stored && stored.length === grid.defaults.length) {
    const normalized = normalizeTracks(stored);
    if (normalized && isValidTracks(normalized, grid.minimums)) return normalized;
  }
  return [...grid.defaults];
}
