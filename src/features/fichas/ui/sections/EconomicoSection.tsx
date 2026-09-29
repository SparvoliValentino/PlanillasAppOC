"use client";

import type { Economico, Ficha } from "../../domain/ficha.types";

import { PaperField } from "../paper/PaperField";

interface EconomicoSectionProps {
  value: Ficha;
  onChange?: (next: Partial<Ficha>) => void;
}

type MoneyField = keyof Pick<
  Economico,
  | "precioArmazonLejos"
  | "precioCristalesLejos"
  | "precioArmazonCerca"
  | "precioCristalesCerca"
  | "precioTotal"
  | "sena"
  | "saldo"
>;

const LABELS: Record<MoneyField, string> = {
  precioArmazonLejos: "Armazón Lejos",
  precioCristalesLejos: "Cristales Lejos",
  precioArmazonCerca: "Armazón Cerca",
  precioCristalesCerca: "Cristales Cerca",
  precioTotal: "Precio Total:",
  sena: "Seña:",
  saldo: "Saldo:",
};

const TOP_FIELDS: MoneyField[] = [
  "precioArmazonLejos",
  "precioCristalesLejos",
  "precioArmazonCerca",
  "precioCristalesCerca",
];

const BOTTOM_FIELDS: MoneyField[] = ["precioTotal", "sena", "saldo"];

/**
 * Left side of the dorso:
 *
 *   Armazón Lejos   $ ___________
 *   Cristales Lejos $ ___________
 *   Armazón Cerca   $ ___________
 *   Cristales Cerca $ ___________
 *   Adicionales: _________________
 *
 *   Precio Total: _______________
 *   Seña:         _______________
 *   Saldo:        _______________
 */
export function EconomicoSection({ value, onChange }: EconomicoSectionProps) {
  const editable = onChange !== undefined;
  const update = (patch: Partial<Economico>) => {
    onChange?.({ economico: { ...value.economico, ...patch } });
  };
  const renderMoney = (field: MoneyField) => {
    const numeric = value.economico[field];
    if (!editable) {
      const display = numeric === 0 ? "" : numeric.toLocaleString("es-AR");
      return (
        <PaperField
          label={`${LABELS[field]} $`}
          value={display}
          mono
        />
      );
    }
    return (
      <PaperField
        label={`${LABELS[field]} $`}
        value={numeric === 0 ? "" : String(numeric)}
        onChange={(next) => {
          const parsed = Number(next.replace(/\./g, "").replace(",", "."));
          update({ [field]: Number.isFinite(parsed) ? parsed : 0 } as Partial<Economico>);
        }}
        inputMode="decimal"
        mono
      />
    );
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        {TOP_FIELDS.map((field) => (
          <div key={field}>{renderMoney(field)}</div>
        ))}
        <PaperField
          label="Adicionales:"
          value={value.economico.adicionales}
          {...(editable
            ? { onChange: (next) => update({ adicionales: next }) }
            : {})}
        />
      </div>
      <div className="border-t border-foreground/40 pt-3" />
      <div className="flex flex-col gap-1.5">
        {BOTTOM_FIELDS.map((field) => (
          <div key={field}>{renderMoney(field)}</div>
        ))}
      </div>
    </div>
  );
}
