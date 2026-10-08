"use client";

import { useCallback } from "react";

import type { CreateFichaInput } from "../domain/ficha.types";

import {
  PaperBody,
  PaperCard,
  PaperFace,
  PaperHeader,
} from "./paper/PaperLayout";
import { PaperLabel } from "./paper/PaperField";
import { Input } from "@/components/ui/input";
import { CoberturaSection } from "./sections/CoberturaSection";
import { EconomicoSection } from "./sections/EconomicoSection";
import { IdentificacionSection } from "./sections/IdentificacionSection";
import { LejosCercaSection } from "./sections/LejosCercaSection";
import { MEDIDAS_COLUMN_WIDTH, MedidasSection } from "./sections/MedidasSection";
import { RecetaSection } from "./sections/RecetaSection";
import { TipoLenteSection } from "./sections/TipoLenteSection";

interface FichaFormProps<T extends CreateFichaInput> {
  value: T;
  onChange: (next: T) => void;
  /** When true the N° de ficha is a typed input (creation); otherwise read-only. */
  nroFichaEditable?: boolean;
}

/**
 * Edit-mode literal replica of the physical optica card. Same layout as
 * `FichaCard`; `nroFicha` is rendered prominently and is only editable when
 * `nroFichaEditable` is set (creation), since it is immutable afterwards.
 */
export function FichaForm<T extends CreateFichaInput>({
  value,
  onChange,
  nroFichaEditable = false,
}: FichaFormProps<T>) {
  const handleChange = useCallback(
    (patch: Partial<CreateFichaInput>) => {
      const next: T = { ...value, ...patch };
      if (patch.lejos) next.lejos = { ...value.lejos, ...patch.lejos };
      if (patch.cerca) next.cerca = { ...value.cerca, ...patch.cerca };
      if (patch.medidas) next.medidas = { ...value.medidas, ...patch.medidas };
      if (patch.economico) next.economico = { ...value.economico, ...patch.economico };
      if (patch.cobertura) next.cobertura = { ...value.cobertura, ...patch.cobertura };
      onChange(next);
    },
    [onChange, value],
  );

  return (
    <PaperCard>
      <PaperFace>
        <PaperHeader
          left={<IdentificacionSection value={value} onChange={handleChange} />}
          right={
            <div className="flex flex-col items-end">
              <PaperLabel className="text-xs">
                {value.nroFicha === 0 ? "N°:" : "N° de ficha"}
              </PaperLabel>
              {nroFichaEditable ? (
                <Input
                  value={value.nroFicha === 0 ? "" : String(value.nroFicha)}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "");
                    handleChange({ nroFicha: digits === "" ? 0 : Number(digits) });
                  }}
                  inputMode="numeric"
                  aria-label="Número de ficha"
                  placeholder="—"
                  autoFocus
                  className="h-14 w-44 rounded-none border-x-0 border-t-0 border-b border-dashed border-foreground/40 bg-transparent px-1 text-right font-mono text-5xl font-bold tracking-tight shadow-none focus-visible:border-solid focus-visible:border-foreground focus-visible:ring-0 md:text-5xl"
                />
              ) : (
                <span className="font-mono text-5xl font-bold leading-none tracking-tight">
                  {value.nroFicha === 0 ? "—" : value.nroFicha}
                </span>
              )}
            </div>
          }
        />
      </PaperFace>

      <PaperFace>
        <PaperBody
          rightWidthClass={MEDIDAS_COLUMN_WIDTH}
          left={
            <div className="flex flex-col gap-4">
              <RecetaSection value={value} onChange={handleChange} />
              <hr className="border-foreground/30" />
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Lejos
              </p>
              <LejosCercaSection kind="lejos" value={value} onChange={handleChange} />
              <hr className="border-foreground/30" />
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Cerca
              </p>
              <LejosCercaSection kind="cerca" value={value} onChange={handleChange} />
            </div>
          }
          right={
            <div className="flex flex-col gap-4">
              <MedidasSection value={value} onChange={handleChange} />
              <TipoLenteSection value={value} onChange={handleChange} />
            </div>
          }
        />
      </PaperFace>

      <PaperFace className="border-b-0">
        <PaperBody
          left={<EconomicoSection value={value} onChange={handleChange} />}
          right={<CoberturaSection value={value} onChange={handleChange} />}
        />
      </PaperFace>
    </PaperCard>
  );
}
