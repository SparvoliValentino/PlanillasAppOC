# Optica App — Loading feedback and larger UI

**Feature**: ux-loading-and-scale
**Start**: 2026-10-04
**Status**: 🟡 In progress
**TDD**: off. Functional checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
**Commits**: made by the user. This feature does not commit.

## Objective

1. Every async operation (load list, load ficha, save new, save edit, PDF download, any API call) shows a visible loading indicator, including a global one at the top of the screen, so the user always knows the app is working.
2. Make the general UI larger for desktop screens (buttons, search inputs, tables, text, shell), EXCEPT the ficha form itself (paper replica), which stays as is.

## Authorized scope

UI of `src/app`, `src/components` and `src/features/fichas/ui` (except the ficha form's own sizing). No API/domain changes.

## Acceptance criteria

- No async flow leaves the user without feedback: initial loads show a spinner or skeleton, actions show a spinner in the button and a global top indicator, and buttons are disabled while pending.
- Shell, listing, filters, buttons, tables and texts are visibly larger on desktop; the ficha (FichaForm and its sections) keeps its current size.
- typecheck, lint, tests and build green.

## Tasks

### T1 — Loading feedback in every async flow ✅ done
**Route**: delegated writer (2+ non-trivial files; flow mapping prepares the write). Orchestrator spot check: `npm test`, rg confirms no raw `fetch(` in pages/components.
**Result**:
- All 5 client API calls (list, detail incl. "Recargar", create, edit, PDF) go through `src/lib/http/apiFetch.ts`, which registers them in `pendingRequests.ts` (pure counter store, reads vs writes).
- Global indicator (`components/layout/GlobalLoadingIndicator.tsx`): top progress bar mounted in `layout.tsx` plus a Topbar spinner pill, "Guardando…" for writes and "Cargando…" for reads (`role="status"`, `aria-live`).
- Listing: skeleton rows on first load; later loads dim the old rows under a "Cargando fichas…" banner; "Buscando…" button; filters and pagination disabled while loading.
- Detail: skeleton plus "Cargando ficha…"; not-found only after the load finishes.
- Save and PDF buttons: spinner, disabled, `aria-busy`.
**Tests**: 152 → 156 (+4 counter store).

### T2 — Larger general UI, ficha excluded ✅ done
**Route**: same delegated writer.
**Result**:
- Larger sidebar, topbar, titles, home cards, KPI cards, filters, table and toasts.
- Button defaults are bigger; header buttons moved from `sm` to the default size.
- Ficha unchanged: `src/features/**` untouched, `input.tsx` untouched (larger inputs only via call-site classes), and the ficha does not import `button`/`table`.
**Checks**: typecheck ✅ lint ✅ tests ✅ build ✅. Not checked in a browser yet (user).

## Progress and next step

- 2026-10-04: T1 + T2 done (156 tests, build OK).
- 2026-10-04: user feedback — the listing loader was not visible enough. Inline fix in `src/app/fichas/page.tsx`: `TableLoader` (large teal spinner + "Cargando fichas…") centered in the table area on first load and in the Suspense fallback; on reloads it overlays the dimmed table (opacity 40%). Thin top banner and skeleton rows removed. typecheck ✅ lint ✅ tests ✅ (178).
- **Next step**: user checks in the browser. Pending decisions: delete (hard delete vs anular; it needs an Apps Script `delete` action and a redeploy) and Reportes/Configuración (hide or define).
