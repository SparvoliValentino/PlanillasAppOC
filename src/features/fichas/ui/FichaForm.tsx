"use client";

import { useCallback } from "react";

import type { Ficha } from "../domain/ficha.types";

import {
  PaperBody,
  PaperCard,
  PaperFace,
  PaperHeader,
} from "./paper/PaperLayout";
import { PaperLabel } from "./paper/PaperField";
import { CoberturaSection } from "./sections/CoberturaSection";
import { EconomicoSection } from "./sections/EconomicoSection";
import { IdentificacionSection } from "./sections/IdentificacionSection";
import { LejosCercaSection } from "./sections/LejosCercaSection";
import { MedidasSection } from "./sections/MedidasSection";
import { RecetaSection } from "./sections/RecetaSection";
import { TipoLenteSection } from "./sections/TipoLenteSection";

interface FichaFormProps {
  value: Ficha;
  onChange: (next: Ficha) => void;
}

/**
 * Edit-mode literal replica of the physical optica card. Same layout as
 * `FichaCard`; `nroFicha` is read-only and rendered prominently.
 */
export function FichaForm({ value, onChange }: FichaFormProps) {
  const handleChange = useCallback(
    (patch: Partial<Ficha>) => {
      const next: Ficha = { ...value, ...patch };
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
              <span className="font-mono text-5xl font-bold leading-none tracking-tight">
                {value.nroFicha === 0 ? "—" : value.nroFicha}
              </span>
            </div>
          }
        />
      </PaperFace>

      <PaperFace>
        <PaperBody
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
