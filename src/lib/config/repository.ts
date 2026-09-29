/**
 * Singleton factory for the Ficha repository.
 *
 * The first call wires the default `MockFichaRepository` pointing at
 * `.data/fichas.json` and seed it with `defaultSeeds` on first boot. Tests
 * construct their own `MockFichaRepository` instances against a temp file,
 * so they bypass this factory entirely.
 */

import path from "node:path";

import type { FichaRepository } from "@/features/fichas/domain/repository";
import { MockFichaRepository, defaultSeeds } from "@/features/fichas/infrastructure/mockFichaRepository";

let cached: FichaRepository | null = null;

export function getFichaRepository(): FichaRepository {
  if (cached) return cached;
  const filePath =
    process.env["FICHA_REPOSITORY_PATH"] ?? path.resolve(process.cwd(), ".data", "fichas.json");
  cached = new MockFichaRepository({
    filePath,
    seeds: defaultSeeds,
    seedIfEmpty: true,
  });
  return cached;
}

/**
 * Test-only helper to clear the cached singleton. Never call from app code.
 */
export function __resetFichaRepositoryForTests(): void {
  cached = null;
}
