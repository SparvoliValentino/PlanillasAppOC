"use client";

import type { CreateFichaInput, Ficha, Medidas } from "../../domain/ficha.types";

import { MEDIDAS_GRID } from "../layout/grids";
import { PaperField } from "../paper/PaperField";
import { ResizableGrid } from "../paper/ResizableGrid";

interface MedidasSectionProps {
  value: CreateFichaInput;
  onChange?: (next: Partial<Ficha>) => void;
}

interface RowDef {
  od: keyof Medidas;
  oi: keyof Medidas;
  label: string;
}

const ROWS: RowDef[] = [
  { od: "dilOd", oi: "dilOi", label: "D.I.L." },
  { od: "dicOd", oi: "dicOi", label: "D.I.C." },
  { od: "altBifOd", oi: "altBifOi", label: "Alt. Bif." },
  { od: "altProgOd", oi: "altProgOi", label: "Alt. Prog." },
  { od: "altCentroOd", oi: "altCentroOi", label: "Alt. Cent." },
];

/**
 * Right-side block of the paper ficha:
 *
 *   D.I.L.    O.D. ____  O.I. ____
 *   D.I.C.    O.D. ____  O.I. ____
 *   Alt.Bif.  O.D. ____  O.I. ____
 *   Alt.Prog. O.D. ____  O.I. ____
 *   Alt.Cent. O.D. ____  O.I. ____
 */
export function MedidasSection({ value, onChange }: MedidasSectionProps) {
  const editable = onChange !== undefined;
  const update = (field: keyof Medidas, next: string) => {
    onChange?.({ medidas: { ...value.medidas, [field]: next } });
  };
  return (
    <div className="flex flex-col gap-2">
      {ROWS.map(({ od, oi, label }, index) => (
        <ResizableGrid
          key={od}
          grid={MEDIDAS_GRID}
          tabStops={index === 0}
          className="items-baseline text-sm"
        >
          <span className="italic text-foreground/80">{label}</span>
          <span className="text-right italic text-foreground/60">O.D.</span>
          <PaperField
            label=""
            value={value.medidas[od]}
            {...(editable
              ? {
                  onChange: (next) => update(od, next),
                  inputMode: "decimal",
                }
              : {})}
            mono
          />
          <span className="text-right italic text-foreground/60">O.I.</span>
          <PaperField
            label=""
            value={value.medidas[oi]}
            {...(editable
              ? {
                  onChange: (next) => update(oi, next),
                  inputMode: "decimal",
                }
              : {})}
            mono
          />
        </ResizableGrid>
      ))}
    </div>
  );
}
