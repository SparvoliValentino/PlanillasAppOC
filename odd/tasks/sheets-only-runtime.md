# Optica App — Sheets-only runtime (remove mock data)

**Feature**: sheets-only-runtime
**Start**: 2026-10-04
**Status**: 🟡 In progress
**Depends on**: `optica-sheets-backend` (T1–T7 done, uncommitted).
**TDD**: off (no project configuration). Functional checks per task: `npm run typecheck`, `npm run lint`, `npm test` (Vitest), `npm run build`.
**Commits**: made by the user (decision §8 of `optica-app-v1`). This feature does not commit.

## Objective

The app must only use the Google Sheets backend (Apps Script gateway). No mock repository, no seeds, no local JSON storage at runtime. A missing or invalid configuration must fail loudly instead of silently falling back to local data.

## Problem / Why

`FICHA_REPOSITORY` defaulted to `mock`, so fichas created on 2026-10-04 were written to `.data/fichas.json` instead of the Sheet. The user wants the integration to be the only path and to work end to end.

## Authorized scope

- Runtime config, infrastructure, domain errors, tests and docs of `fichas`.
- Remove `MockFichaRepository`, `seed.ts` and the `mock` selector from runtime.
- Tests may use an in-memory test double that lives under test code only.
- Out of scope: deleting `.data/fichas.json` (user data; ask first), `.env.local` (blocked by permissions; the user edits it).

## Acceptance criteria

- Runtime only builds `GoogleSheetsFichaRepository`. Missing `APPS_SCRIPT_URL` / `APPS_SCRIPT_TOKEN` throws an error naming the variable.
- No seeds, no `.data` writes from app code.
- Live: list, get, create, update, 409 conflict and PDF work against the real Sheet through the local API.
- typecheck, lint, tests and build green.

## Tasks

### T1 — Remove mock from runtime ✅ done
**Route**: delegated writer (2+ non-trivial files: config, infrastructure, tests). Orchestrator spot check (`npm test`, `npm run typecheck`, rg for leftovers).
**Result**:
- Deleted `mockFichaRepository.ts`, `seed.ts`, `mockFichaRepository.test.ts`.
- `resolveRepositoryConfig(env)` returns Sheets config only. `FICHA_REPOSITORY` unset or `sheets` is accepted; any other value (e.g. `mock`) throws "mock repository removed".
- `RepositoryUnsupportedError` and the 501 `NO_DISPONIBLE` mapping removed (unused).
- Tests use `src/test/inMemoryFichaRepository.ts` (test-only double). Mutex concurrency tests dropped with the mock.
- UI copy: sidebar footer "Google Sheets"; home page says data is stored in Google Sheets.
**Tests**: 152 passing. typecheck ✅ lint ✅ tests ✅ build ✅.

### T2 — Docs 🟡 partial
**Route**: done by T1's writer.
**Result**: README updated (Sheets-only config, Persistencia section). `.env.example` NOT updated: write denied by permissions; still lists `FICHA_REPOSITORY=mock` and `FICHA_REPOSITORY_PATH`. The user must edit it to `APPS_SCRIPT_URL=`, `APPS_SCRIPT_TOKEN=`, `# APPS_SCRIPT_TIMEOUT_MS=`.

### T3 — Live verification against the real Sheet ⬜
**Route**: inline (HTTP calls to the local dev server). Requires the user to set `FICHA_REPOSITORY`-free `.env.local` with URL + token and restart `npm run dev`.

### T3 — Live verification ✅ done (user-verified)
**Result**: on 2026-10-04 the user tested against the real Sheet: create, list, filter, open, edit and PDF download all work. Delete is not tested because the app has no delete feature (README "próximas features" #2).

## Progress and next step

- 2026-10-04: feature created. T1 done (152 tests, build OK). T2 partial (`.env.example` pending, user edit).
- **Next step**: T3. User sets `.env.local` (`FICHA_REPOSITORY=sheets` or removed) and restarts `npm run dev`.
