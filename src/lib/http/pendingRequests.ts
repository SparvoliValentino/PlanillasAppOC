/**
 * Tiny external store that counts in-flight API requests so a global
 * indicator can react. Pure (no React, no DOM) so it is easy to test.
 */

export type PendingKind = "read" | "write";

export interface PendingSnapshot {
  total: number;
  /** True when at least one write (POST/PUT/...) is in flight. */
  writing: boolean;
}

type Listener = () => void;

export interface PendingStore {
  /** Registers a request; returns an idempotent `end` function. */
  begin: (kind: PendingKind) => () => void;
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => PendingSnapshot;
}

const IDLE: PendingSnapshot = { total: 0, writing: false };

export function createPendingStore(): PendingStore {
  const counts: Record<PendingKind, number> = { read: 0, write: 0 };
  const listeners = new Set<Listener>();
  let snapshot: PendingSnapshot = IDLE;

  const recompute = () => {
    const total = counts.read + counts.write;
    const writing = counts.write > 0;
    // Keep snapshot identity stable when nothing changed (useSyncExternalStore).
    if (snapshot.total === total && snapshot.writing === writing) return;
    snapshot = total === 0 ? IDLE : { total, writing };
    listeners.forEach((listener) => listener());
  };

  return {
    begin(kind) {
      counts[kind] += 1;
      recompute();
      let ended = false;
      return () => {
        if (ended) return;
        ended = true;
        counts[kind] -= 1;
        recompute();
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
  };
}

/** Shared app-wide store used by `apiFetch` and the global indicator. */
export const pendingRequests = createPendingStore();
