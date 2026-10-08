"use client";

import type { CreateFichaInput, Ficha } from "../../domain/ficha.types";

import { PaperDateField } from "../paper/PaperDateField";
import { PaperField } from "../paper/PaperField";

interface RecetaSectionProps {
  value: CreateFichaInput;
  onChange?: (next: Partial<Ficha>) => void;
}

export function RecetaSection({ value, onChange }: RecetaSectionProps) {
  const editable = onChange !== undefined;
  const update = (patch: Partial<Ficha>) => onChange?.(patch);
  return (
    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
      <PaperDateField
        mode={editable ? "edit" : "read"}
        label="Receta Fecha:"
        value={value.recetaFecha}
        {...(editable ? { onChange: (next) => update({ recetaFecha: next }) } : {})}
      />
      <PaperField
        label="Dr:"
        value={value.recetaDr}
        {...(editable
          ? {
              onChange: (next) => update({ recetaDr: next }),
              placeholder: "Apellido y nombre",
            }
          : {})}
      />
    </div>
  );
}
