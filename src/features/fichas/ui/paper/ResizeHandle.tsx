"use client";

import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

interface ResizeHandleProps {
  /** CSS `left` of the handle's center, relative to the grid. */
  left: string;
  /** Width of the grab area, in rem. */
  widthRem: number;
  label: string;
  /** Boundary position and limits, as percentages of the grid. */
  valueNow: number;
  valueMin: number;
  valueMax: number;
  /** Whether Tab reaches this handle. Arrow keys work whenever it has focus. */
  tabStop: boolean;
  onDragStart: () => void;
  /** Total horizontal movement since the drag started, in pixels. */
  onDrag: (deltaPx: number) => void;
  onNudge: (direction: -1 | 1, large: boolean) => void;
}

/**
 * Vertical drag handle sitting on a column boundary. Pointer events with
 * capture cover mouse and touch; arrow keys nudge the boundary. Invisible
 * until hover/focus, hidden below `md` and when printing.
 */
export function ResizeHandle({
  left,
  widthRem,
  label,
  valueNow,
  valueMin,
  valueMax,
  tabStop,
  onDragStart,
  onDrag,
  onNudge,
}: ResizeHandleProps) {
  const startX = useRef<number | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    startX.current = event.clientX;
    onDragStart();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    onDrag(event.clientX - startX.current);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    startX.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    onNudge(event.key === "ArrowLeft" ? -1 : 1, event.shiftKey);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(valueNow)}
      aria-valuemin={Math.round(valueMin)}
      aria-valuemax={Math.round(valueMax)}
      tabIndex={tabStop ? 0 : -1}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      style={{ left, width: `${widthRem}rem` }}
      className="group absolute inset-y-0 z-10 hidden -translate-x-1/2 cursor-col-resize touch-none select-none outline-none md:block print:hidden"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-transparent group-hover:bg-primary/50 group-focus-visible:bg-primary"
      />
    </div>
  );
}
