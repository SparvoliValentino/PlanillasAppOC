"use client";

import type { Cobertura, Ficha } from "../../domain/ficha.types";

import { PaperField } from "../paper/PaperField";

interface CoberturaSectionProps {
  value: Ficha;
  onChange?: (next: Partial<Ficha>) => void;
}

/**
 * Right side of the dorso:
 *
 *   Obra Social:     ___________
 *   Nro. de Carnet:  ___________
 *   Nro. Doc.:       ___________
 *
 *   Forma de pago:   ___________
 *                    ___________
 *                    ___________
 */
export function CoberturaSection({ value, onChange }: CoberturaSectionProps) {
  const editable = onChange !== undefined;
  const update = (patch: Partial<Cobertura>) => {
    onChange?.({ cobertura: { ...value.cobertura, ...patch } });
  };
  return (
    <div className="flex flex-col gap-2">
      <PaperField
        label="Obra Social:"
        value={value.cobertura.obraSocial}
        {...(editable
          ? { onChange: (next) => update({ obraSocial: next }) }
          : {})}
      />
      <PaperField
        label="Nro. de Carnet:"
        value={value.cobertura.nroCarnet}
        {...(editable
          ? { onChange: (next) => update({ nroCarnet: next }) }
          : {})}
      />
      <PaperField
        label="Nro. Doc.:"
        value={value.cobertura.nroDoc}
        {...(editable
          ? { onChange: (next) => update({ nroDoc: next }) }
          : {})}
      />
      <div className="border-t border-foreground/40 pt-3" />
      <PaperField
        label="Forma de pago:"
        value={value.cobertura.formaPago}
        {...(editable
          ? { onChange: (next) => update({ formaPago: next }) }
          : {})}
      />
      <div aria-hidden className="border-b border-dashed border-foreground/30" />
      <div aria-hidden className="border-b border-dashed border-foreground/30" />
    </div>
  );
}
