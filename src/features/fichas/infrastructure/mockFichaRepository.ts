/**
 * JSON-on-disk implementation of `FichaRepository`.
 *
 * Storage shape (in `.data/fichas.json`):
 *   {
 *     "version": 1,
 *     "fichas": Ficha[]
 *   }
 *
 * Notes:
 *   - `NRO_FICHA` is assigned atomically via an in-process mutex. This is
 *     enough for V1 (single Node process, mock storage). When the Google
 *     Sheets adapter lands, atomicity will move to `LockService` in
 *     Apps Script or equivalent.
 *   - All writes flush the whole file. The mock is not designed for
 *     tens-of-thousands-of-writes-per-second; it is designed to be honest
 *     about the swap point when Sheets is connected.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { CreateFichaSchema } from "../domain/ficha.schema";
import type { FichaRepository } from "../domain/repository";
import type {
  CreateFichaInput,
  Ficha,
  FichaSummary,
  ListFichasParams,
  Paginated,
  UpdateFichaInput,
} from "../domain/ficha.types";
import { pickPrimaryPhone } from "../domain/ficha.types";
import type { Ficha as StoredFicha } from "../domain/ficha.types";

interface StorageShape {
  version: 1;
  fichas: StoredFicha[];
}

const EMPTY_STORAGE: StorageShape = { version: 1, fichas: [] };

class Mutex {
  private chain: Promise<void> = Promise.resolve();

  public async run<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.chain;
    let release!: () => void;
    this.chain = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await previous;
      return await fn();
    } finally {
      release();
    }
  }
}

export interface MockFichaRepositoryOptions {
  filePath: string;
  seeds?: StoredFicha[];
  /**
   * When true (default), the repository is created with the provided seeds
   * if the underlying file is missing or empty. Pass `false` to start empty
   * regardless of file state.
   */
  seedIfEmpty?: boolean;
}

export class MockFichaRepository implements FichaRepository {
  private readonly mutex = new Mutex();
  private cache: StorageShape | null = null;

  public constructor(private readonly options: MockFichaRepositoryOptions) {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  public async list(params: ListFichasParams): Promise<Paginated<FichaSummary>> {
    const all = await this.readAll();
    const filtered = this.applySearch(all.fichas, params.q);
    const total = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const items = filtered
      .slice(start, start + params.pageSize)
      .map(toSummary)
      .sort((a, b) => a.nroFicha - b.nroFicha);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  public async getByNumber(numero: number): Promise<Ficha | null> {
    const all = await this.readAll();
    return all.fichas.find((f) => f.nroFicha === numero) ?? null;
  }

  public async create(input: CreateFichaInput): Promise<Ficha> {
    const parsed = CreateFichaSchema.parse(input);
    return this.mutex.run(async () => {
      const all = await this.readAll();
      const nextNro = this.nextNro(all.fichas);
      const created: StoredFicha = { nroFicha: nextNro, ...parsed };
      all.fichas.push(created);
      await this.writeAll(all);
      return created;
    });
  }

  public async update(numero: number, input: UpdateFichaInput): Promise<Ficha> {
    return this.mutex.run(async () => {
      const all = await this.readAll();
      const index = all.fichas.findIndex((f) => f.nroFicha === numero);
      if (index === -1) {
        throw new RepositoryNotFoundError(numero);
      }
      const current = all.fichas[index] as StoredFicha;
      const merged: StoredFicha = mergeFicha(current, input);
      all.fichas[index] = merged;
      await this.writeAll(all);
      return merged;
    });
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async readAll(): Promise<StorageShape> {
    if (this.cache) return this.cache;
    let raw: string;
    try {
      raw = await readFile(this.options.filePath, "utf8");
    } catch (error) {
      if (isMissingFile(error)) {
        const initial = this.initialState();
        await this.persist(initial);
        this.cache = initial;
        return initial;
      }
      throw error;
    }
    let parsed: StorageShape;
    try {
      parsed = JSON.parse(raw) as StorageShape;
    } catch {
      // Corrupted file: refuse to silently overwrite.
      throw new RepositoryStorageError(
        `El archivo de fichas (${this.options.filePath}) no es JSON válido.`,
      );
    }
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.fichas)) {
      throw new RepositoryStorageError(
        `El archivo de fichas (${this.options.filePath}) tiene un formato no reconocido.`,
      );
    }
    if (
      this.options.seedIfEmpty !== false &&
      parsed.fichas.length === 0 &&
      this.options.seeds &&
      this.options.seeds.length > 0
    ) {
      const seeded: StorageShape = { version: 1, fichas: [...this.options.seeds] };
      await this.persist(seeded);
      this.cache = seeded;
      return seeded;
    }
    this.cache = parsed;
    return parsed;
  }

  private async writeAll(next: StorageShape): Promise<void> {
    await this.persist(next);
    this.cache = next;
  }

  private async persist(next: StorageShape): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    const tmp = `${this.options.filePath}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
    await rename(tmp, this.options.filePath);
  }

  private initialState(): StorageShape {
    const seedIfEmpty = this.options.seedIfEmpty !== false;
    if (seedIfEmpty && this.options.seeds && this.options.seeds.length > 0) {
      return { version: 1, fichas: [...this.options.seeds] };
    }
    return EMPTY_STORAGE;
  }

  private nextNro(fichas: StoredFicha[]): number {
    if (fichas.length === 0) return 1;
    const max = fichas.reduce((acc, f) => (f.nroFicha > acc ? f.nroFicha : acc), 0);
    return max + 1;
  }

  private applySearch(fichas: StoredFicha[], rawQuery: string): StoredFicha[] {
    const query = rawQuery.trim().toLowerCase();
    if (query === "") return fichas;
    // NRO_FICHA is the identifier: if the query parses as an integer that
    // matches an existing ficha, return it directly. Otherwise fall through
    // to a case-insensitive substring search across nombre/telefono/doc.
    const asNumber = Number.parseInt(query, 10);
    if (!Number.isNaN(asNumber) && String(asNumber) === query) {
      const exact = fichas.find((f) => f.nroFicha === asNumber);
      if (exact) return [exact];
    }
    return fichas.filter((f) => {
      if (f.nombre.toLowerCase().includes(query)) return true;
      if (f.cel.toLowerCase().includes(query)) return true;
      if (f.tel.toLowerCase().includes(query)) return true;
      if (f.cobertura.nroDoc.toLowerCase().includes(query)) return true;
      return false;
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSummary(ficha: StoredFicha): FichaSummary {
  return {
    nroFicha: ficha.nroFicha,
    nombre: ficha.nombre,
    fechaEntrada: ficha.fechaEntrada,
    telefono: pickPrimaryPhone(ficha),
  };
}

function mergeFicha(current: StoredFicha, patch: UpdateFichaInput): StoredFicha {
  // Patch is `Partial<Omit<Ficha, "nroFicha">>`, so we deep-merge the
  // nested objects without losing untouched fields.
  return {
    ...current,
    ...patch,
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

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class RepositoryNotFoundError extends Error {
  public readonly code = "FICHA_NO_ENCONTRADA";
  public constructor(public readonly numero: number) {
    super(`No se encontró la ficha ${numero}.`);
    this.name = "RepositoryNotFoundError";
  }
}

export class RepositoryStorageError extends Error {
  public readonly code = "REPOSITORIO_NO_DISPONIBLE";
  public constructor(message: string) {
    super(message);
    this.name = "RepositoryStorageError";
  }
}

export { defaultSeeds } from "./seed";
