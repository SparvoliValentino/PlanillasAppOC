import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Layout helpers that turn the ficha into a literal table-like document.
 * The whole card is a bordered grid with two columns on the body and one
 * block per logical "face" (frente / dorso).
 */

export function PaperCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "border border-foreground/40 bg-white text-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PaperFace({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-foreground/40 last:border-b-0", className)}>
      {children}
    </div>
  );
}

/**
 * Two-column body block (left/right with a vertical separator in the
 * middle). The right column gets a fixed-ish width on desktop so the
 * medidas / tipo de lente stay compact, matching the paper layout.
 */
export function PaperBody({
  left,
  right,
  rightWidthClass = "w-[280px]",
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  rightWidthClass?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col md:flex-row", className)}>
      <div className="flex-1 border-b border-foreground/40 p-4 md:border-b-0 md:border-r">
        {left}
      </div>
      <div className={cn("p-4 md:w-auto", rightWidthClass)}>{right}</div>
    </div>
  );
}

export function PaperHeader({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 p-4 md:grid-cols-[1fr_auto]", className)}>
      <div className="flex flex-col gap-1.5">{left}</div>
      <div className="flex items-start justify-end">{right}</div>
    </div>
  );
}
