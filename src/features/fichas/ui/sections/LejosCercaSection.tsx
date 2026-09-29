"use client";

import type { Ficha } from "../../domain/ficha.types";

import { OjoArmazonBlock, OjoGraduacionBlock } from "./GraduacionBlock";

interface LejosCercaSectionProps {
  kind: "lejos" | "cerca";
  value: Ficha;
  onChange?: (next: Partial<Ficha>) => void;
}

/**
 * One "Lejos" or "Cerca" block:
 *
 *   O.D.  Esf _____ Cil _____ a ___
 *   O.I.  Esf _____ Cil _____ a ___
 *
 *   ☐ MINERAL  ☐ STOCK   ARMAZON ____
 *   ☐ ORGANICO ☐ LABOR   MODELO  ____
 *                          Color   ____
 */
export function LejosCercaSection({ kind, value, onChange }: LejosCercaSectionProps) {
  const block = value[kind];
  const updateBlock = (
    patch: Partial<{ od: typeof block.od; oi: typeof block.oi; armazon: typeof block.armazon }>,
  ) => {
    const next = { ...block, ...patch };
    onChange?.({ [kind]: next } as Partial<Ficha>);
  };

  return (
    <div className="flex flex-col gap-3">
      <OjoGraduacionBlock
        label="O. D."
        value={block.od}
        onChange={onChange ? (next) => updateBlock({ od: next }) : undefined}
      />
      <OjoGraduacionBlock
        label="O. I."
        value={block.oi}
        onChange={onChange ? (next) => updateBlock({ oi: next }) : undefined}
      />
      <div className="border-t border-dashed border-foreground/30" />
      <OjoArmazonBlock
        value={block.armazon}
        onChange={onChange ? (next) => updateBlock({ armazon: next }) : undefined}
      />
    </div>
  );
}
