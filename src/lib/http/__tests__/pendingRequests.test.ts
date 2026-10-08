import { describe, expect, it, vi } from "vitest";

import { createPendingStore } from "../pendingRequests";

describe("pendingRequests store", () => {
  it("starts idle", () => {
    expect(createPendingStore().getSnapshot()).toEqual({ total: 0, writing: false });
  });

  it("counts concurrent requests and flags writes", () => {
    const store = createPendingStore();
    const endRead = store.begin("read");
    expect(store.getSnapshot()).toEqual({ total: 1, writing: false });
    const endWrite = store.begin("write");
    expect(store.getSnapshot()).toEqual({ total: 2, writing: true });
    endWrite();
    expect(store.getSnapshot()).toEqual({ total: 1, writing: false });
    endRead();
    expect(store.getSnapshot().total).toBe(0);
  });

  it("ignores a repeated end call", () => {
    const store = createPendingStore();
    const a = store.begin("read");
    store.begin("read");
    a();
    a();
    expect(store.getSnapshot().total).toBe(1);
  });

  it("notifies subscribers until they unsubscribe", () => {
    const store = createPendingStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const end = store.begin("read");
    end();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.begin("read");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
