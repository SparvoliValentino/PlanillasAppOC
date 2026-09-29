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

interface FichaCardProps {
  ficha: Ficha;
}

/**
 * Read-only literal replica of the physical optica card.
 */
export function FichaCard({ ficha }: FichaCardProps) {
  return (
    <PaperCard>
      <PaperFace>
        <PaperHeader
          left={<IdentificacionSection value={ficha} />}
          right={
            <div className="flex flex-col items-end">
              <PaperLabel className="text-xs">N°:</PaperLabel>
              <span className="font-mono text-5xl font-bold leading-none tracking-tight">
                {ficha.nroFicha}
              </span>
            </div>
          }
        />
      </PaperFace>

      <PaperFace>
        <PaperBody
          left={
            <div className="flex flex-col gap-4">
              <RecetaSection value={ficha} />
              <hr className="border-foreground/30" />
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Lejos
              </p>
              <LejosCercaSection kind="lejos" value={ficha} />
              <hr className="border-foreground/30" />
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Cerca
              </p>
              <LejosCercaSection kind="cerca" value={ficha} />
            </div>
          }
          right={
            <div className="flex flex-col gap-4">
              <MedidasSection value={ficha} />
              <TipoLenteSection value={ficha} />
            </div>
          }
        />
      </PaperFace>

      <PaperFace className="border-b-0">
        <PaperBody
          left={<EconomicoSection value={ficha} />}
          right={<CoberturaSection value={ficha} />}
        />
      </PaperFace>
    </PaperCard>
  );
}
