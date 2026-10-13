"use client";

import type {
  MaterialLente,
  OjoArmazon,
  OjoGraduacion,
  OrigenLente,
} from "../../domain/ficha.types";

import { ARMAZON_GRID, GRADUACION_GRID } from "../layout/grids";
import { PaperCheckbox } from "../paper/PaperCheckbox";
import { PaperField } from "../paper/PaperField";
import { ResizableGrid } from "../paper/ResizableGrid";

interface OjoGraduacionBlockProps {
  label: string;
  value: OjoGraduacion;
  onChange?: (next: OjoGraduacion) => void;
  /** Only one row per logical grid needs to be reachable with Tab. */
  tabStops?: boolean;
}

/**
 * Horizontal row for one eye's graduacion:
 *
 *   O.D.  Esf __________  Cil __________  a __________
 */
export function OjoGraduacionBlock({
  label,
  value,
  onChange,
  tabStops,
}: OjoGraduacionBlockProps) {
  const editable = onChange !== undefined;
  const update = (patch: Partial<OjoGraduacion>) => onChange?.({ ...value, ...patch });
  return (
    <ResizableGrid grid={GRADUACION_GRID} tabStops={tabStops} className="items-baseline text-sm">
      <span className="italic text-foreground/80">{label}</span>
      <PaperField
        label="Esf"
        value={value.esf}
        {...(editable
          ? {
              onChange: (next) => update({ esf: next }),
              placeholder: "+1.00",
            }
          : {})}
        mono
      />
      <PaperField
        label="Cil"
        value={value.cil}
        {...(editable
          ? {
              onChange: (next) => update({ cil: next }),
              placeholder: "-0.50",
            }
          : {})}
        mono
      />
      <span className="italic text-foreground/60">a</span>
      <PaperField
        label=""
        value={value.eje}
        {...(editable
          ? {
              onChange: (next) => update({ eje: next }),
              placeholder: "90",
              inputMode: "numeric",
            }
          : {})}
        mono
      />
    </ResizableGrid>
  );
}

interface OjoArmazonBlockProps {
  value: OjoArmazon;
  onChange?: (next: OjoArmazon) => void;
  tabStops?: boolean;
}

/**
 * Material / Origen checkboxes + Armazon / Modelo / Color fields.
 *
 *   ☐ MINERAL   ☐ STOCK       ARMAZON ____________
 *   ☐ ORGANICO  ☐ LABOR       MODELO  ____________
 *                                Color ____________
 */
export function OjoArmazonBlock({ value, onChange, tabStops }: OjoArmazonBlockProps) {
  const editable = onChange !== undefined;
  const update = (patch: Partial<OjoArmazon>) => onChange?.({ ...value, ...patch });
  return (
    <ResizableGrid grid={ARMAZON_GRID} tabStops={tabStops} className="items-center gap-y-2">
      <PaperCheckbox
        label="MINERAL"
        checked={value.material === "MINERAL"}
        {...(editable
          ? { onChange: (next) => update({ material: next ? "MINERAL" : "" }) }
          : {})}
      />
      <PaperCheckbox
        label="STOCK"
        checked={value.origen === "STOCK"}
        {...(editable
          ? { onChange: (next) => update({ origen: next ? "STOCK" : "" }) }
          : {})}
      />
      <PaperField
        label="ARMAZON:"
        value={value.armazon}
        {...(editable
          ? { onChange: (next) => update({ armazon: next }) }
          : { placeholder: "Marca y modelo" })}
      />
      <PaperCheckbox
        label="ORGANICO"
        checked={value.material === "ORGANICO"}
        {...(editable
          ? {
              onChange: (next) =>
                update({
                  material: next ? ("ORGANICO" as MaterialLente) : ("" as MaterialLente),
                }),
            }
          : {})}
      />
      <PaperCheckbox
        label="LABOR."
        checked={value.origen === "LABORATORIO"}
        {...(editable
          ? {
              onChange: (next) =>
                update({
                  origen: next ? ("LABORATORIO" as OrigenLente) : ("" as OrigenLente),
                }),
            }
          : {})}
      />
      <PaperField
        label="MODELO:"
        value={value.modelo}
        {...(editable
          ? { onChange: (next) => update({ modelo: next }) }
          : { placeholder: "Modelo" })}
      />
      <span aria-hidden className="col-span-2" />
      <PaperField
        label="Color:"
        value={value.color}
        {...(editable
          ? { onChange: (next) => update({ color: next }) }
          : { placeholder: "Color" })}
      />
    </ResizableGrid>
  );
}
