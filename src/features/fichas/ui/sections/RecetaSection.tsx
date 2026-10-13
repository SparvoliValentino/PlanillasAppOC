"use client";

import type { CreateFichaInput, Ficha } from "../../domain/ficha.types";

import { PaperDateField } from "../paper/PaperDateField";
import { RECETA_GRID } from "../layout/grids";
import { PaperField } from "../paper/PaperField";
import { ResizableGrid } from "../paper/ResizableGrid";

interface RecetaSectionProps {
  value: CreateFichaInput;
  onChange?: (next: Partial<Ficha>) => void;
}

export function RecetaSection({ value, onChange }: RecetaSectionProps) {
  const editable = onChange !== undefined;
  const update = (patch: Partial<Ficha>) => onChange?.(patch);
  return (
    <ResizableGrid grid={RECETA_GRID} tabStops>
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
    </ResizableGrid>
  );
}
