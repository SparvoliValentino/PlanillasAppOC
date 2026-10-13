import { useMemo, useSyncExternalStore } from "react";

import { EMPTY_LAYOUT, LAYOUT_STORAGE_KEY, parseLayout, resolveTracks, serializeLayout } from "./storage";
import type { GridDef, StoredLayout } from "./storage";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Small external store over `localStorage`, shaped for `useSyncExternalStore`.
 * Every storage access is guarded: private mode or blocked storage degrades
 * to an in-memory layout instead of throwing.
 */
export function createLayoutStore(getStorage: () => StorageLike | null) {
  let cache: StoredLayout | null = null;
  const listeners = new Set<() => void>();

  const load = (): StoredLayout => {
    try {
      return parseLayout(getStorage()?.getItem(LAYOUT_STORAGE_KEY) ?? null);
    } catch {
      return EMPTY_LAYOUT;
    }
  };

  const persist = (layout: StoredLayout) => {
    try {
      const storage = getStorage();
      if (!storage) return;
      if (Object.keys(layout).length === 0) storage.removeItem(LAYOUT_STORAGE_KEY);
      else storage.setItem(LAYOUT_STORAGE_KEY, serializeLayout(layout));
    } catch {
      // Storage unavailable or full: keep the in-memory layout.
    }
  };

  const emit = () => listeners.forEach((listener) => listener());

  // Another tab changed the layout.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== LAYOUT_STORAGE_KEY) return;
    cache = null;
    emit();
  };

  const getSnapshot = (): StoredLayout => {
    cache ??= load();
    return cache;
  };

  return {
    getSnapshot,
    /** Always the default layout: used by the server and the first client render. */
    getServerSnapshot: (): StoredLayout => EMPTY_LAYOUT,
    subscribe(listener: () => void) {
      if (listeners.size === 0 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
    setGridTracks(id: string, tracks: readonly number[]) {
      cache = { ...getSnapshot(), [id]: [...tracks] };
      persist(cache);
      emit();
    },
    reset() {
      cache = EMPTY_LAYOUT;
      persist(cache);
      emit();
    },
  };
}

export const layoutStore = createLayoutStore(() => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
});

/** Current tracks of a grid. Defaults on the server and on the first client render. */
export function useGridTracks(grid: GridDef): number[] {
  const stored = useSyncExternalStore(
    layoutStore.subscribe,
    layoutStore.getSnapshot,
    layoutStore.getServerSnapshot,
  );
  return useMemo(() => resolveTracks(stored[grid.id], grid), [stored, grid]);
}

export const setGridTracks = layoutStore.setGridTracks;
export const resetLayout = layoutStore.reset;
