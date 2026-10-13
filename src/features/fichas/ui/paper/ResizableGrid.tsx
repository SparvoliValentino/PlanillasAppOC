"use client";

import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { setGridTracks, useGridTracks } from "../layout/store";
import type { GridDef } from "../layout/storage";
import { boundaryRange, moveBoundary } from "../layout/tracks";
import { ResizeHandle } from "./ResizeHandle";

/** Arrow-key step, as a proportion of the grid width. */
const NUDGE_STEP = 0.01;
const NUDGE_STEP_LARGE = 0.05;
/** Grab area of a handle when the grid has no gap between tracks, in rem. */
const MIN_HANDLE_WIDTH_REM = 0.75;

/** `fr` units scaled so a track list never sums below 1 (which would not fill the row). */
function toTemplate(tracks: readonly number[]): string {
  return tracks.map((track) => `minmax(0,${(track * 1000).toFixed(3)}fr)`).join(" ");
}

interface ResizableGridProps {
  grid: GridDef;
  className?: string;
  /** Whether this instance's handles are reachable with Tab. */
  tabStops?: boolean;
  children: ReactNode;
}

/**
 * CSS grid whose column tracks come from the persisted layout store. Drag or
 * keyboard-nudge a handle to move a boundary; every instance sharing the same
 * `grid.id` follows. Below `md` the stored tracks are ignored: the grid keeps
 * its original look (or stacks, when `grid.stackBelowMd` is set).
 */
export function ResizableGrid({ grid, className, tabStops = false, children }: ResizableGridProps) {
  const tracks = useGridTracks(grid);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ tracks: number[]; availablePx: number } | null>(null);

  const count = tracks.length;
  const totalGapRem = grid.gapRem * (count - 1);

  const style = {
    columnGap: `${grid.gapRem}rem`,
    "--grid-tracks": toTemplate(tracks),
    "--grid-default": toTemplate(grid.defaults),
  } as CSSProperties;

  const startDrag = () => {
    const element = ref.current;
    if (!element) return;
    const gapPx = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
    drag.current = {
      tracks,
      availablePx: Math.max(1, element.clientWidth - gapPx * (count - 1)),
    };
  };

  const dragBoundary = (index: number, deltaPx: number) => {
    const start = drag.current;
    if (!start) return;
    setGridTracks(grid.id, moveBoundary(start.tracks, index, deltaPx / start.availablePx, grid.minimums));
  };

  const nudgeBoundary = (index: number, direction: -1 | 1, large: boolean) => {
    const step = large ? NUDGE_STEP_LARGE : NUDGE_STEP;
    setGridTracks(grid.id, moveBoundary(tracks, index, direction * step, grid.minimums));
  };

  const handles = tracks.slice(0, -1).map((_, index) => {
    const cumulative = tracks.slice(0, index + 1).reduce((sum, track) => sum + track, 0);
    const range = boundaryRange(tracks, index, grid.minimums);
    const gapOffsetRem = index * grid.gapRem + grid.gapRem / 2;
    return (
      <ResizeHandle
        key={index}
        left={`calc((100% - ${totalGapRem}rem) * ${cumulative} + ${gapOffsetRem}rem)`}
        widthRem={grid.gapRem > 0 ? grid.gapRem : MIN_HANDLE_WIDTH_REM}
        label="Ajustar ancho de columna"
        valueNow={cumulative * 100}
        valueMin={(range?.lo ?? 0) * 100}
        valueMax={(range?.hi ?? 1) * 100}
        tabStop={tabStops}
        onDragStart={startDrag}
        onDrag={(deltaPx) => dragBoundary(index, deltaPx)}
        onNudge={(direction, large) => nudgeBoundary(index, direction, large)}
      />
    );
  });

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "relative grid",
        grid.stackBelowMd
          ? "grid-cols-1 md:[grid-template-columns:var(--grid-tracks)]"
          : "[grid-template-columns:var(--grid-default)] md:[grid-template-columns:var(--grid-tracks)]",
        className,
      )}
    >
      {children}
      {handles}
    </div>
  );
}
