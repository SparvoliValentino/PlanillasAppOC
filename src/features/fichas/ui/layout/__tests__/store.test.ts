import { describe, expect, it, vi } from "vitest";

import { createLayoutStore } from "../store";
import { EMPTY_LAYOUT, LAYOUT_STORAGE_KEY } from "../storage";

function fakeStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(LAYOUT_STORAGE_KEY, initial);
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("createLayoutStore", () => {
  it("serves the default layout to the server", () => {
    const store = createLayoutStore(() => fakeStorage('{"version":1,"grids":{"a":[0.4,0.6]}}'));
    expect(store.getServerSnapshot()).toBe(EMPTY_LAYOUT);
  });

  it("loads the stored layout and keeps a stable snapshot", () => {
    const store = createLayoutStore(() => fakeStorage('{"version":1,"grids":{"a":[0.4,0.6]}}'));
    expect(store.getSnapshot()).toEqual({ a: [0.4, 0.6] });
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("persists updates, notifies listeners and resets", () => {
    const storage = fakeStorage();
    const store = createLayoutStore(() => storage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setGridTracks("a", [0.3, 0.7]);
    expect(store.getSnapshot()).toEqual({ a: [0.3, 0.7] });
    expect(storage.data.has(LAYOUT_STORAGE_KEY)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    store.reset();
    expect(store.getSnapshot()).toBe(EMPTY_LAYOUT);
    expect(storage.data.has(LAYOUT_STORAGE_KEY)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.setGridTracks("a", [0.5, 0.5]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("survives corrupt data and throwing storage", () => {
    expect(createLayoutStore(() => fakeStorage("{oops")).getSnapshot()).toBe(EMPTY_LAYOUT);

    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const store = createLayoutStore(() => throwing);
    expect(store.getSnapshot()).toBe(EMPTY_LAYOUT);
    expect(() => store.setGridTracks("a", [0.5, 0.5])).not.toThrow();
    expect(store.getSnapshot()).toEqual({ a: [0.5, 0.5] });

    const noStorage = createLayoutStore(() => {
      throw new Error("no access");
    });
    expect(noStorage.getSnapshot()).toBe(EMPTY_LAYOUT);
  });
});
