# Optica App — Void a ficha (anular)

**Feature**: anular-ficha
**Start**: 2026-10-04
**Status**: 🟡 In progress
**TDD**: off. Functional checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
**Commits**: made by the user. This feature does not commit.

## Objective

Let the user "delete" a ficha as a soft delete (anular): the row stays in the Sheet for history, and the ficha leaves the normal listing.

## Decisions (orchestrator defaults, 2026-10-04)

- New Sheet column `ANULADA_AT` (ISO timestamp, empty = active), appended after `UPDATED_AT`. The Apps Script adds the header if missing (existing sheet has 56 columns).
- New Apps Script action `anular` `{ numero, expectedUpdatedAt? }`: sets `ANULADA_AT` and `UPDATED_AT`; `NO_ENCONTRADO` if missing, `CONFLICTO` if `expectedUpdatedAt` mismatches or it is already voided.
- A voided ficha keeps its N°: creating a new ficha with that N° is still a 409 (the physical ficha exists).
- Listing hides voided fichas by default; a "Mostrar anuladas" option includes them, marked as voided.
- Detail of a voided ficha: visible, with a "Ficha anulada el …" banner; editing is blocked (UI and server: `update` on a voided ficha → `CONFLICTO`). PDF download still allowed.
- Anular asks for confirmation in a dialog and uses `apiFetch` (global loading indicator).
- Out of scope: restore (des-anular), hard delete.
- The user must paste the new `Code.gs` and publish a new version of the existing deployment (same URL).

## Acceptance criteria

- Anular from the detail page after confirmation → toast, back to the listing, ficha hidden.
- "Mostrar anuladas" shows it with a voided mark; its detail shows the banner and cannot be edited.
- Duplicate N° check still covers voided fichas.
- typecheck, lint, tests and build green. Live test against the Sheet after the user redeploys.

## Tasks

### T1 — Domain, Apps Script, adapter, API, UI ✅ done
**Route**: delegated writer (2+ non-trivial files across all layers). Orchestrator spot check: `npm test`, review of `migrateHeaders_`.
**Result**:
- Apps Script: `ANULADA_AT` is column 57. `migrateHeaders_` writes only blank header cells after the legacy 56 columns, never moves data, is idempotent, and throws `ESQUEMA_INVALIDO` on any mismatch.
- Apps Script actions: `anular` is new, `update` on a voided ficha returns `CONFLICTO`, `list` takes `incluirAnuladas`.
- API: `POST /api/fichas/[numero]/anular` `{ expectedUpdatedAt? }` returns 404 or 409. `GET /api/fichas?incluirAnuladas=true`.
- Domain/application: `anularFicha` use case; `anuladaAt` on record and summary; Sheets adapter and in-memory double updated.
- UI detail: "Anular ficha" button with a confirmation `Dialog` and spinner. On success, toast and back to `/fichas`. A voided ficha shows a banner and hides Editar and Anular; PDF stays.
- UI listing: "Mostrar anuladas" checkbox (URL). Voided rows show an "Anulada" badge, muted style and a struck-through name.
- Docs: README and decision §8 in `odd/decisions/optica-sheets-backend.md`.
**Tests**: 156 → 178. typecheck ✅ lint ✅ tests ✅ build ✅. No deviations from Decisions.

### T2 — Live verification ⬜
**Route**: user redeploys the Apps Script, then tests in the browser. The Apps Script code has not run against the real Sheet yet.

## Progress and next step

- 2026-10-04: T1 done (178 tests, build OK).
- **Next step**: the user pastes the new `Code.gs` and publishes a new version of the same deployment, then tests anular in the browser.
