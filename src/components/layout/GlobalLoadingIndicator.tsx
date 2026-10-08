"use client";

import { useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";

import { pendingRequests } from "@/lib/http/pendingRequests";

const IDLE = { total: 0, writing: false };

function usePendingRequests() {
  return useSyncExternalStore(
    pendingRequests.subscribe,
    pendingRequests.getSnapshot,
    () => IDLE,
  );
}

/** Thin animated progress bar fixed to the very top of the viewport. */
export function GlobalProgressBar() {
  const { total } = usePendingRequests();
  if (total === 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-teal-600/20"
    >
      <div className="h-full w-1/3 animate-[global-progress_1.1s_ease-in-out_infinite] rounded-full bg-teal-600" />
    </div>
  );
}

/** Spinner + label shown in the Topbar while any API call is in flight. */
export function GlobalLoadingStatus() {
  const { total, writing } = usePendingRequests();
  return (
    <div role="status" aria-live="polite" className="flex min-w-0 items-center">
      {total > 0 && (
        <span className="flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-100">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {writing ? "Guardando…" : "Cargando…"}
        </span>
      )}
    </div>
  );
}
