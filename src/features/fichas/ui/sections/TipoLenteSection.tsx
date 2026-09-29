"use client";

import type { Ficha } from "../../domain/ficha.types";

import { PaperCheckbox } from "../paper/PaperCheckbox";

interface TipoLenteSectionProps {
  value: Ficha;
  onChange?: (next: Partial<Ficha>) => void;
}

/**
 * Right-side checkbox pair:
 *
 *   ☐ BIFOCAL
 *   ☐ PROGRESIVOS
 */
export function TipoLenteSection({ value, onChange }: TipoLenteSectionProps) {
  const editable = onChange !== undefined;
  const update = (next: "BIFOCAL" | "PROGRESIVO" | "") => onChange?.({ tipoLente: next });
  return (
    <div className="flex flex-col gap-2 border-t border-foreground/40 pt-3">
      <PaperCheckbox
        label="BIFOCAL"
        checked={value.tipoLente === "BIFOCAL"}
        {...(editable
          ? { onChange: (checked) => update(checked ? "BIFOCAL" : "") }
          : {})}
      />
      <PaperCheckbox
        label="PROGRESIVOS"
        checked={value.tipoLente === "PROGRESIVO"}
        {...(editable
          ? { onChange: (checked) => update(checked ? "PROGRESIVO" : "") }
          : {})}
      />
    </div>
  );
}
