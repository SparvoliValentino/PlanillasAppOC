/**
 * Test-only `FichaRepository` double. Lives under `src/test` so it can never
 * be wired into runtime code: the app only ever talks to Google Sheets.
 */

import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from "@/features/fichas/domain/errors";
import { CreateFichaSchema } from "@/features/fichas/domain/ficha.schema";
import type {
  AnularFichaOptions,
  CreateFichaInput,
  Ficha,
  FichaPdf,
  FichaSummary,
  ListFichasParams,
  ListFichasResult,
  UpdateFichaInput,
  UpdateFichaOptions,
} from "@/features/fichas/domain/ficha.types";
import { emptyFichaValues, pickPrimaryPhone } from "@/features/fichas/domain/ficha.types";
import { compareFichas, createFichaFilter } from "@/features/fichas/domain/listing";
import type { FichaRepository } from "@/features/fichas/domain/repository";

const BASE_MS = Date.UTC(2026, 8, 1);

/** Builds a ficha with staggered timestamps so sorting by upload date is deterministic. */
export function buildFicha(nroFicha: number, nombre: string, overrides: Partial<Ficha> = {}): Ficha {
  const stamp = new Date(BASE_MS + nroFicha * 60_000).toISOString();
  return {
    ...emptyFichaValues(),
    cel: "1155550000",
    fechaEntrada: "2026-09-01",
    anuladaAt: "",
    ...overrides,
    nroFicha,
    nombre,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/** Five fichas, numbered 1..5. */
export function sampleFichas(): Ficha[] {
  return [
    buildFicha(1, "Juan Pérez"),
    buildFicha(2, "María González"),
    buildFicha(3, "Carlos Bianchi"),
    buildFicha(4, "Lucía Fernández"),
    buildFicha(5, "Roberto Silva"),
  ];
}

export class InMemoryFichaRepository implements FichaRepository {
  private fichas: Ficha[];

  public constructor(initial: Ficha[] = []) {
    this.fichas = initial.map((f) => ({ ...f }));
  }

  public async list(params: ListFichasParams): Promise<ListFichasResult> {
    const matching = this.fichas
      .filter(createFichaFilter(params))
      .sort(compareFichas(params.sortBy, params.sortDir));
    const total = matching.length;
    const start = (params.page - 1) * params.pageSize;
    const items: FichaSummary[] = matching.slice(start, start + params.pageSize).map((f) => ({
      nroFicha: f.nroFicha,
      nombre: f.nombre,
      fechaEntrada: f.fechaEntrada,
      telefono: pickPrimaryPhone(f),
      fechaCarga: f.createdAt,
      anuladaAt: f.anuladaAt,
    }));
    return {
      items,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    };
  }

  public async getByNumber(numero: number): Promise<Ficha | null> {
    return this.fichas.find((f) => f.nroFicha === numero) ?? null;
  }

  public async create(input: CreateFichaInput): Promise<Ficha> {
    const parsed = CreateFichaSchema.parse(input);
    if (this.fichas.some((f) => f.nroFicha === parsed.nroFicha)) {
      throw new RepositoryConflictError(`Ya existe una ficha con el N° ${parsed.nroFicha}.`);
    }
    const now = new Date().toISOString();
    const created: Ficha = { ...parsed, createdAt: now, updatedAt: now, anuladaAt: "" };
    this.fichas.push(created);
    return created;
  }

  public async update(
    numero: number,
    input: UpdateFichaInput,
    options?: UpdateFichaOptions,
  ): Promise<Ficha> {
    const index = this.fichas.findIndex((f) => f.nroFicha === numero);
    if (index === -1) throw new RepositoryNotFoundError(numero);
    const current = this.fichas[index] as Ficha;
    if (current.anuladaAt !== "") {
      throw new RepositoryConflictError("La ficha está anulada y no se puede modificar.");
    }
    if (options?.expectedUpdatedAt !== undefined && options.expectedUpdatedAt !== current.updatedAt) {
      throw new RepositoryConflictError("La ficha fue modificada por otra persona. Recargala antes de guardar.");
    }
    const merged: Ficha = { ...mergeFicha(current, input), updatedAt: new Date().toISOString() };
    this.fichas[index] = merged;
    return merged;
  }

  public async anular(numero: number, options?: AnularFichaOptions): Promise<Ficha> {
    const index = this.fichas.findIndex((f) => f.nroFicha === numero);
    if (index === -1) throw new RepositoryNotFoundError(numero);
    const current = this.fichas[index] as Ficha;
    if (current.anuladaAt !== "") throw new RepositoryConflictError("La ficha ya está anulada.");
    if (options?.expectedUpdatedAt !== undefined && options.expectedUpdatedAt !== current.updatedAt) {
      throw new RepositoryConflictError("La ficha fue modificada por otra persona. Recargala antes de anularla.");
    }
    const now = new Date().toISOString();
    const voided: Ficha = { ...current, anuladaAt: now, updatedAt: now };
    this.fichas[index] = voided;
    return voided;
  }

  public async getPdf(numero: number): Promise<FichaPdf | null> {
    if (!this.fichas.some((f) => f.nroFicha === numero)) return null;
    return { fileName: `ficha-${numero}.pdf`, mimeType: "application/pdf", content: new Uint8Array([1, 2, 3]) };
  }
}

function mergeFicha(current: Ficha, patch: UpdateFichaInput): Ficha {
  // Identity and audit fields are never taken from the patch.
  const {
    nroFicha: _nro,
    createdAt: _created,
    updatedAt: _updated,
    anuladaAt: _anulada,
    ...safePatch
  } = patch as UpdateFichaInput & Partial<Pick<Ficha, "nroFicha" | "createdAt" | "updatedAt" | "anuladaAt">>;
  void _nro;
  void _created;
  void _updated;
  void _anulada;
  return {
    ...current,
    ...safePatch,
    lejos: patch.lejos
      ? {
          od: { ...current.lejos.od, ...patch.lejos.od },
          oi: { ...current.lejos.oi, ...patch.lejos.oi },
          armazon: { ...current.lejos.armazon, ...patch.lejos.armazon },
        }
      : current.lejos,
    cerca: patch.cerca
      ? {
          od: { ...current.cerca.od, ...patch.cerca.od },
          oi: { ...current.cerca.oi, ...patch.cerca.oi },
          armazon: { ...current.cerca.armazon, ...patch.cerca.armazon },
        }
      : current.cerca,
    medidas: { ...current.medidas, ...patch.medidas },
    economico: { ...current.economico, ...patch.economico },
    cobertura: { ...current.cobertura, ...patch.cobertura },
  };
}
