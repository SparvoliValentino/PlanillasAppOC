"use client";

import type { Ficha } from "../../domain/ficha.types";

import { PaperDateField } from "../paper/PaperDateField";
import { PaperField } from "../paper/PaperField";

interface IdentificacionSectionProps {
  value: Ficha;
  onChange?: (next: Partial<Ficha>) => void;
}

/**
 * Header block of the ficha:
 *
 *   Nombre: _____________________________  Edad: ____
 *   Domicilio: __________________________  Tel: ____  Cel: ______
 *   Fecha Entrada: _______________
 */
export function IdentificacionSection({ value, onChange }: IdentificacionSectionProps) {
  const editable = onChange !== undefined;
  const update = (patch: Partial<Ficha>) => onChange?.(patch);

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
      <PaperField
        label="Nombre:"
        value={value.nombre}
        {...(editable
          ? { onChange: (next) => update({ nombre: next }) }
          : { placeholder: "Apellido y nombre" })}
      />
      <PaperField
        label="Edad:"
        value={value.edad}
        {...(editable
          ? {
              onChange: (next) => update({ edad: next }),
              inputMode: "numeric",
              placeholder: "Años",
            }
          : {})}
      />
      <PaperField
        label="Domicilio:"
        value={value.domicilio}
        {...(editable
          ? {
              onChange: (next) => update({ domicilio: next }),
              placeholder: "Calle, número, localidad",
            }
          : {})}
      />
      <div className="grid grid-cols-2 gap-x-6">
        <PaperField
          label="Tel.:"
          value={value.tel}
          {...(editable
            ? {
                onChange: (next) => update({ tel: next }),
                inputMode: "tel",
                placeholder: "011-0000-0000",
              }
            : {})}
        />
        <PaperField
          label="Cel.:"
          value={value.cel}
          {...(editable
            ? {
                onChange: (next) => update({ cel: next }),
                inputMode: "tel",
                placeholder: "+54 9 11 0000-0000",
              }
            : {})}
        />
      </div>
      <PaperDateField
        mode={editable ? "edit" : "read"}
        label="Fecha Entrada:"
        value={value.fechaEntrada}
        {...(editable ? { onChange: (next) => update({ fechaEntrada: next }) } : {})}
      />
    </div>
  );
}
