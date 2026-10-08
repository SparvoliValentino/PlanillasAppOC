import { beforeEach, describe, expect, it } from "vitest";

import { anularFicha } from "../anularFicha";
import { createFicha } from "../createFicha";
import { getFicha } from "../getFicha";
import { getFichaPdf } from "../getFichaPdf";
import { listFichas } from "../listFichas";
import { updateFicha } from "../updateFicha";
import { RepositoryConflictError } from "../../domain/errors";
import { emptyFichaValues } from "../../domain/ficha.types";
import type { FichaRepository } from "../../domain/repository";
import { ZodError } from "zod";
import { NotFoundError } from "@/lib/http/errors";
import { InMemoryFichaRepository, sampleFichas } from "@/test/inMemoryFichaRepository";

let repo: FichaRepository;

beforeEach(() => {
  repo = new InMemoryFichaRepository(sampleFichas());
});

describe("listFichas use case", () => {
  it("returns the first page of fichas", async () => {
    const result = await listFichas(repo, { page: 1, pageSize: 3, q: "", sortBy: "nroFicha" });
    expect(result.total).toBe(5);
    expect(result.items.length).toBe(3);
  });

  it("filters by query string", async () => {
    const result = await listFichas(repo, { page: 1, pageSize: 50, q: "Pérez" });
    expect(result.items.length).toBe(1);
    expect(result.items[0]?.nombre).toBe("Juan Pérez");
  });

  it("resolves defaults and returns totalPages, sortBy and sortDir", async () => {
    const result = await listFichas(repo, {});
    expect(result.sortBy).toBe("fechaCarga");
    expect(result.sortDir).toBe("desc");
    expect(result.totalPages).toBe(1);
    expect(result.items.map((f) => f.nroFicha)).toEqual([5, 4, 3, 2, 1]);
  });

  it("rejects a telefono filter with fewer than 3 digits", async () => {
    await expect(listFichas(repo, { telefono: "12" })).rejects.toThrow();
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
  it("creates a ficha with the typed nroFicha", async () => {
    const created = await createFicha(repo, {
      ...emptyFichaValues(),
      nroFicha: 6,
      nombre: "Nuevo Cliente",
      cel: "1144440000",
    });
    expect(created.nroFicha).toBe(6);
    expect(created.nombre).toBe("Nuevo Cliente");
  });

  it("rejects a missing nroFicha", async () => {
    await expect(createFicha(repo, { ...emptyFichaValues(), nombre: "Sin número" })).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it("rejects a duplicate nroFicha with RepositoryConflictError", async () => {
    await expect(
      createFicha(repo, { ...emptyFichaValues(), nroFicha: 1, nombre: "Duplicada" }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
  });

  it("normalizes input via Zod before persisting", async () => {
    const created = await createFicha(repo, {
      ...emptyFichaValues(),
      nroFicha: 7,
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
        nroFicha: 8,
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
    const updated = await updateFicha(repo, 1, { patch: { nombre: "Juan Pérez Editado" } });
    expect(updated.nombre).toBe("Juan Pérez Editado");
    expect(updated.nroFicha).toBe(1);
  });

  it("throws NotFoundError for missing ficha", async () => {
    await expect(updateFicha(repo, 999, { patch: { nombre: "x" } })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects a body without patch with a ZodError", async () => {
    await expect(updateFicha(repo, 1, { nombre: "x" })).rejects.toBeInstanceOf(ZodError);
  });

  it("accepts a matching expectedUpdatedAt", async () => {
    const before = await getFicha(repo, 1);
    const updated = await updateFicha(repo, 1, {
      patch: { nombre: "Coincide" },
      expectedUpdatedAt: before.updatedAt,
    });
    expect(updated.nombre).toBe("Coincide");
  });

  it("rejects a stale expectedUpdatedAt with RepositoryConflictError and does not persist", async () => {
    await expect(
      updateFicha(repo, 1, { patch: { nombre: "Viejo" }, expectedUpdatedAt: "1999-01-01T00:00:00.000Z" }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
    expect((await getFicha(repo, 1)).nombre).toBe("Juan Pérez");
  });

  it("ignores nroFicha, createdAt and updatedAt sent inside the patch", async () => {
    const before = await getFicha(repo, 1);
    const updated = await updateFicha(repo, 1, {
      patch: { nombre: "Otro", nroFicha: 99, createdAt: "2000-01-01T00:00:00.000Z", updatedAt: "2000-01-01T00:00:00.000Z" },
    });
    expect(updated.nroFicha).toBe(1);
    expect(updated.createdAt).toBe(before.createdAt);
    expect(updated.updatedAt).not.toBe("2000-01-01T00:00:00.000Z");
  });
});

describe("anularFicha use case", () => {
  it("voids the ficha, keeps it readable and bumps updatedAt", async () => {
    const before = await getFicha(repo, 1);
    const voided = await anularFicha(repo, 1, { expectedUpdatedAt: before.updatedAt });
    expect(voided.anuladaAt).not.toBe("");
    expect(voided.updatedAt).not.toBe(before.updatedAt);
    expect((await getFicha(repo, 1)).anuladaAt).toBe(voided.anuladaAt);
  });

  it("accepts an empty body (no expectedUpdatedAt)", async () => {
    expect((await anularFicha(repo, 2, {})).anuladaAt).not.toBe("");
  });

  it("throws NotFoundError for a missing or invalid numero", async () => {
    await expect(anularFicha(repo, 999, {})).rejects.toBeInstanceOf(NotFoundError);
    await expect(anularFicha(repo, 0, {})).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a stale expectedUpdatedAt and does not void", async () => {
    await expect(
      anularFicha(repo, 1, { expectedUpdatedAt: "1999-01-01T00:00:00.000Z" }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
    expect((await getFicha(repo, 1)).anuladaAt).toBe("");
  });

  it("rejects voiding an already voided ficha", async () => {
    await anularFicha(repo, 1, {});
    await expect(anularFicha(repo, 1, {})).rejects.toBeInstanceOf(RepositoryConflictError);
  });

  it("blocks update on a voided ficha", async () => {
    await anularFicha(repo, 1, {});
    await expect(updateFicha(repo, 1, { patch: { nombre: "Tarde" } })).rejects.toBeInstanceOf(
      RepositoryConflictError,
    );
    expect((await getFicha(repo, 1)).nombre).toBe("Juan Pérez");
  });

  it("still rejects a duplicate N° against a voided ficha", async () => {
    await anularFicha(repo, 1, {});
    await expect(
      createFicha(repo, { ...emptyFichaValues(), nroFicha: 1, nombre: "Duplicada" }),
    ).rejects.toBeInstanceOf(RepositoryConflictError);
  });

  it("hides voided fichas from the list unless incluirAnuladas is set", async () => {
    await anularFicha(repo, 1, {});
    const hidden = await listFichas(repo, {});
    expect(hidden.total).toBe(4);
    expect(hidden.items.some((f) => f.nroFicha === 1)).toBe(false);
    const all = await listFichas(repo, { incluirAnuladas: true });
    expect(all.total).toBe(5);
    expect(all.items.find((f) => f.nroFicha === 1)?.anuladaAt).not.toBe("");
  });

  it("can still render the PDF of a voided ficha", async () => {
    await anularFicha(repo, 1, {});
    expect((await getFichaPdf(repo, 1)).mimeType).toBe("application/pdf");
  });
});

describe("getFichaPdf use case", () => {
  it.each([0, -1, 1.5, Number.NaN])("throws NotFoundError for invalid numero %s", async (n) => {
    await expect(getFichaPdf(repo, n)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the repository returns null", async () => {
    await expect(getFichaPdf(repo, 9999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns the PDF from the repository", async () => {
    const pdf = { fileName: "ficha-1.pdf", mimeType: "application/pdf", content: new Uint8Array([1, 2]) };
    const stub = { getPdf: async () => pdf } as unknown as FichaRepository;
    expect(await getFichaPdf(stub, 1)).toBe(pdf);
  });

  it("returns the PDF of an existing ficha from the repository", async () => {
    const pdf = await getFichaPdf(repo, 1);
    expect(pdf.mimeType).toBe("application/pdf");
  });
});
