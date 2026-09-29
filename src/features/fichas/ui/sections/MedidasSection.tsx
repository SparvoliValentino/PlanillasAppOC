"use client";

import type { Ficha, Medidas } from "../../domain/ficha.types";

import { PaperField } from "../paper/PaperField";

interface MedidasSectionProps {
  value: Ficha;
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
      {ROWS.map(({ od, oi, label }) => (
        <div
          key={od}
          className="grid grid-cols-[5.5rem_3rem_1fr_3rem_1fr] items-baseline gap-x-2 text-sm"
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
        </div>
      ))}
    </div>
  );
}
