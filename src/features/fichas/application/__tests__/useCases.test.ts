import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { createFicha } from "../createFicha";
import { getFicha } from "../getFicha";
import { listFichas } from "../listFichas";
import { updateFicha } from "../updateFicha";
import { emptyFichaValues } from "../../domain/ficha.types";
import { MockFichaRepository } from "../../infrastructure/mockFichaRepository";
import { defaultSeeds } from "../../infrastructure/seed";
import type { FichaRepository } from "../../domain/repository";
import { NotFoundError } from "@/lib/http/errors";

let repo: FichaRepository;

beforeEach(async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "optica-usecase-"));
  repo = new MockFichaRepository({
    filePath: path.join(tempDir, "fichas.json"),
    seeds: defaultSeeds,
    seedIfEmpty: true,
  });
});

describe("listFichas use case", () => {
  it("returns the first page of seeds", async () => {
    const result = await listFichas(repo, { page: 1, pageSize: 3, q: "" });
    expect(result.total).toBe(5);
    expect(result.items.length).toBe(3);
  });

  it("filters by query string", async () => {
    const result = await listFichas(repo, { page: 1, pageSize: 50, q: "Pérez" });
    expect(result.items.length).toBe(1);
    expect(result.items[0]?.nombre).toBe("Juan Pérez");
  });

  it("rejects invalid page (non-positive)", async () => {
    await expect(listFichas(repo, { page: 0, pageSize: 10, q: "" })).rejects.toThrow();
  });
});

describe("getFicha use case", () => {
  it("returns the ficha when it exists", async () => {
    const ficha = await getFicha(repo, 1);
    expect(ficha.nroFicha).toBe(1);
  });

  it("throws NotFoundError when missing", async () => {
    await expect(getFicha(repo, 999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for non-positive number", async () => {
    await expect(getFicha(repo, 0)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getFicha(repo, -1)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("createFicha use case", () => {
  it("creates a ficha with auto-assigned nroFicha", async () => {
    const created = await createFicha(repo, {
      ...emptyFichaValues(),
      nombre: "Nuevo Cliente",
      cel: "1144440000",
    });
    expect(created.nroFicha).toBe(6);
    expect(created.nombre).toBe("Nuevo Cliente");
  });

  it("normalizes input via Zod before persisting", async () => {
    const created = await createFicha(repo, {
      ...emptyFichaValues(),
      nombre: "Cliente Con Formato",
      fechaEntrada: "29/09/2026",
      economico: {
        ...emptyFichaValues().economico,
        precioTotal: "$ 1.234,56",
      },
    });
    expect(created.fechaEntrada).toBe("2026-09-29");
    expect(created.economico.precioTotal).toBe(1234.56);
  });

  it("rejects invalid graduacion with ValidationError-shaped Zod issues", async () => {
    await expect(
      createFicha(repo, {
        ...emptyFichaValues(),
        nombre: "Graduacion Rota",
        lejos: {
          od: { esf: "abc", cil: "", eje: "" },
          oi: { esf: "", cil: "", eje: "" },
          armazon: { material: "", origen: "", armazon: "", modelo: "", color: "" },
        },
      }),
    ).rejects.toThrow();
  });
});

describe("updateFicha use case", () => {
  it("applies a partial patch and returns the merged ficha", async () => {
    const updated = await updateFicha(repo, 1, { nombre: "Juan Pérez Editado" });
    expect(updated.nombre).toBe("Juan Pérez Editado");
    expect(updated.nroFicha).toBe(1);
  });

  it("throws NotFoundError for missing ficha", async () => {
    await expect(updateFicha(repo, 999, { nombre: "x" })).rejects.toBeInstanceOf(NotFoundError);
  });
});
