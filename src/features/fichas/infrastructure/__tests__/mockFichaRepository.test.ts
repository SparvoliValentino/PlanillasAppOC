import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { emptyFichaValues } from "../../domain/ficha.types";
import { MockFichaRepository, RepositoryNotFoundError } from "../mockFichaRepository";
import { defaultSeeds } from "../seed";

let tempDir = "";

async function makeRepo(options?: { seeds?: boolean; initial?: string }) {
  const filePath = path.join(tempDir, `fichas-${Math.random().toString(36).slice(2)}.json`);
  const repo = new MockFichaRepository({
    filePath,
    seeds: options?.seeds === false ? [] : defaultSeeds,
    seedIfEmpty: options?.seeds !== false,
  });
  if (options?.initial !== undefined) {
    await writeFile(filePath, options.initial, "utf8");
  }
  return { repo, filePath };
}

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "optica-mock-"));
});

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

describe("MockFichaRepository.list", () => {
  it("returns seeded fichas paginated, sorted by nroFicha", async () => {
    const { repo } = await makeRepo();
    const page1 = await repo.list({ page: 1, pageSize: 3, q: "" });
    expect(page1.items.map((f) => f.nroFicha)).toEqual([1, 2, 3]);
    expect(page1.total).toBe(5);
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(3);

    const page2 = await repo.list({ page: 2, pageSize: 3, q: "" });
    expect(page2.items.map((f) => f.nroFicha)).toEqual([4, 5]);
    expect(page2.total).toBe(5);
  });

  it("filters by nroFicha exact match", async () => {
    const { repo } = await makeRepo();
    const result = await repo.list({ page: 1, pageSize: 50, q: "3" });
    expect(result.items.map((f) => f.nroFicha)).toEqual([3]);
  });

  it("filters by nombre (case-insensitive contains)", async () => {
    const { repo } = await makeRepo();
    const result = await repo.list({ page: 1, pageSize: 50, q: "MARÍA" });
    expect(result.items.length).toBe(1);
    expect(result.items[0]?.nombre).toBe("María González");
  });

  it("filters by telefono (cel or tel)", async () => {
    const { repo } = await makeRepo();
    const byCel = await repo.list({ page: 1, pageSize: 50, q: "5555-0001" });
    expect(byCel.items[0]?.nroFicha).toBe(1);
    const byTel = await repo.list({ page: 1, pageSize: 50, q: "4201" });
    expect(byTel.items[0]?.nroFicha).toBe(3);
  });

  it("filters by nroDoc", async () => {
    const { repo } = await makeRepo();
    const result = await repo.list({ page: 1, pageSize: 50, q: "28.456.789" });
    expect(result.items[0]?.nroFicha).toBe(2);
  });

  it("returns an empty page when nothing matches", async () => {
    const { repo } = await makeRepo();
    const result = await repo.list({ page: 1, pageSize: 50, q: "inexistente" });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("MockFichaRepository.getByNumber", () => {
  it("returns the ficha when it exists", async () => {
    const { repo } = await makeRepo();
    const ficha = await repo.getByNumber(2);
    expect(ficha).not.toBeNull();
    expect(ficha?.nombre).toBe("María González");
  });

  it("returns null when the number does not exist", async () => {
    const { repo } = await makeRepo();
    const ficha = await repo.getByNumber(999);
    expect(ficha).toBeNull();
  });
});

describe("MockFichaRepository.create + update", () => {
  it("assigns sequential nroFicha and persists", async () => {
    const { repo } = await makeRepo();
    const created = await repo.create({
      ...emptyFichaValues(),
      nombre: "Cliente Nuevo",
      cel: "1144449999",
    });
    expect(created.nroFicha).toBe(6);
    const fromRepo = await repo.getByNumber(6);
    expect(fromRepo?.nombre).toBe("Cliente Nuevo");
  });

  it("updates the existing ficha", async () => {
    const { repo } = await makeRepo();
    const updated = await repo.update(1, { nombre: "Juan Pérez Modificado" });
    expect(updated.nroFicha).toBe(1);
    const reread = await repo.getByNumber(1);
    expect(reread?.nombre).toBe("Juan Pérez Modificado");
  });

  it("merges nested fields on partial update", async () => {
    const { repo } = await makeRepo();
    // Patch only the lejos.od object; the rest of lejos must be preserved.
    const updated = await repo.update(1, {
      lejos: {
        od: { esf: "+2.00", cil: "-1.00", eje: "100" },
        oi: { esf: "", cil: "", eje: "" },
        armazon: { material: "", origen: "", armazon: "", modelo: "", color: "" },
      },
    });
    expect(updated.lejos.od.esf).toBe("+2.00");
    expect(updated.lejos.od.cil).toBe("-1.00");
    // armazon was explicitly patched (even though the new values are empty),
    // so it reflects the patch.
    expect(updated.lejos.armazon.armazon).toBe("");
    // Untouched top-level fields stay intact.
    expect(updated.nombre).toBe("Juan Pérez");
    expect(updated.economico.precioTotal).toBe(105000);
  });

  it("throws when updating a missing ficha", async () => {
    const { repo } = await makeRepo();
    await expect(repo.update(999, { nombre: "no" })).rejects.toBeInstanceOf(
      RepositoryNotFoundError,
    );
  });
});

describe("MockFichaRepository persistence", () => {
  it("seeds when starting from an empty file", async () => {
    const { repo } = await makeRepo({ initial: '{"version":1,"fichas":[]}' });
    const list = await repo.list({ page: 1, pageSize: 50, q: "" });
    expect(list.total).toBe(defaultSeeds.length);
  });

  it("does not seed when seedIfEmpty is false", async () => {
    const { repo } = await makeRepo({ initial: '{"version":1,"fichas":[]}', seeds: false });
    const list = await repo.list({ page: 1, pageSize: 50, q: "" });
    expect(list.total).toBe(0);
  });

  it("refuses to read a corrupted file", async () => {
    const { repo } = await makeRepo({ initial: "this is not json", seeds: false });
    await expect(repo.list({ page: 1, pageSize: 50, q: "" })).rejects.toThrow();
  });

  it("survives re-instantiation (data is on disk)", async () => {
    const { repo: repo1, filePath } = await makeRepo();
    await repo1.create({ ...emptyFichaValues(), nombre: "Persistente" });
    const repo2 = new MockFichaRepository({ filePath, seeds: [], seedIfEmpty: false });
    const fromRepo2 = await repo2.getByNumber(6);
    expect(fromRepo2?.nombre).toBe("Persistente");
  });
});

describe("MockFichaRepository concurrent create", () => {
  it("assigns unique sequential nroFicha under concurrent load", async () => {
    const { repo } = await makeRepo();
    const names = Array.from({ length: 25 }, (_, i) => `Concurrente ${i + 1}`);
    const created = await Promise.all(
      names.map((nombre) => repo.create({ ...emptyFichaValues(), nombre })),
    );
    const nros = created.map((f) => f.nroFicha).sort((a, b) => a - b);
    const expected = Array.from({ length: 25 }, (_, i) => 6 + i);
    expect(nros).toEqual(expected);
    const unique = new Set(nros);
    expect(unique.size).toBe(25);
  });
});
