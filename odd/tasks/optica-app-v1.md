# Optica App — V1 con mock local

**Feature**: optica-app-v1
**Inicio**: 2026-09-29
**Estado**: ✅ V1 cerrada y usable en local (mock-first)
**Stack**: Next.js 16 + React 19 + TypeScript estricto + Tailwind v4 + shadcn/ui 4 (preset `base-nova`) + Zod + Vitest 3
**Roadmap del PDF**: completamos Fases 1 + 2 (mock) + 3 (CRUD) + rediseño UX (no estaba en el roadmap original, lo pidió el usuario). Persistencia real (Google Sheets + Apps Script) queda para una iteración posterior.

---

## Reglas innegociables (del PDF)

- TS estricto (`strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`), sin `any` innecesario.
- Un esquema Zod compartido; nunca duplicar reglas en UI y API.
- UI **no** conoce filas, columnas ni IDs de Sheets.
- Imágenes **nunca** son producto final: solo insumo temporal para digitalizar.
- No guardar `$` en importes; formatear en UI con `Intl.NumberFormat`.
- No convertir teléfonos/documentos/carnet a `Number`.
- Graduaciones conservan signo (`+1.00`, `-0.50`).
- Enums legibles para material/origen; nunca valores mágicos `1`/`2`.
- Sin secretos en cliente.
- Toda llamada async contempla `loading`, `empty`, `success`, `error`.
- Desktop-first (≥ 1280px cómodo en 1440px); responsive móvil secundario.
- Idioma de UI: **español rioplatense**.
- Idioma de código: **inglés**.
- No commit sin pedido explícito del usuario.

---

## Decisiones tomadas en la sesión del 2026-09-29

- Persistencia: **mock local** (JSON en `.data/fichas.json`). Sheet real + Apps Script queda para después.
- UI: **Tailwind v4 + shadcn/ui 4** (preset `base-nova`).
- Layout de ficha: **réplica literal del papel** (líneas, itálica, checkboxes ☐/☑, N° gigante, 3 caras: header / cuerpo / dorso).
- Shell: **sidebar 240 px + topbar 64 px** con paleta teal.
- Endpoint base API: `/api/fichas` y `/api/fichas/[numero]`.
- `NRO_FICHA`: entero autogenerado, atómico, independiente del orden de filas.
- Fechas: input acepta solo dígitos y auto-formatea `DD/MM/AAAA`. Fechas inválidas o parciales se persisten como `""` (no rompen el guardado).

---

## Tareas

### T1 — Setup base del proyecto ✅ done
**Resultado**: Next 16.3.6 + React 19 + Tailwind v4 + shadcn 4.21 (preset base-nova) + Vitest 3. Estructura por capas lista. `npm run dev` arranca, build/lint/typecheck verdes.

### T2 — Dominio Ficha (types + Zod + normalizadores) ✅ done
**Resultado**: tipos, schema único Zod con defaults, normalizadores puros (fechas, importes, graduaciones, teléfonos, documentos), sheetMapping estable.
**Tests**: 40 (24 normalizers + 12 schema + 3 sheetMapping + 1 smoke heredado).

### T3 — Repository + mock local ✅ done
**Resultado**: interface `FichaRepository` exacta al PDF + `MockFichaRepository` con JSON en `.data/fichas.json` y mutex atómico para `NRO_FICHA`. 5 fichas de seed.
**Tests**: 17 nuevos (CRUD + búsqueda + concurrencia + persistencia).

### T4 — Casos de uso + API routes ✅ done
**Resultado**: 4 use cases (list/get/create/update) + `GET/POST /api/fichas` + `GET/PUT /api/fichas/[numero]` + helpers HTTP (`respond.ts`, `errors.ts`). Build OK, smoke test con curl verificó list, search (q=Pérez, q=2 nroFicha exact), POST con normalizadores, PUT merge, 404, 400.
**Tests**: 11 nuevos. **Total acumulado: 68**.

### T5 — Componentes UI de ficha (réplica papel) ✅ done (reescrito en T9)
**Resultado v1**: 8 sections con FieldRow/SectionFrame, layout grid 12 cols en xl.
**Resultado v2 (T9)**: rewrite completo con paper primitives. Layout literal de 3 caras (header / cuerpo / dorso), líneas horizontales/verticales, etiquetas itálica, N° gigante arriba derecha, checkboxes ☐/☑ literales, importes formateados es-AR con separador de miles.

### T6 — Páginas ✅ done
**Resultado**: `/fichas` (listado+search+paginación), `/fichas/nueva` (form vacío), `/fichas/[numero]` (read/edit toggle), `/` (home con cards de acceso rápido). Toaster Sonner, error handling con detalles por campo, manejo de loading/empty/error.

### T7 — Smoke test manual ✅ done
**Resultado**: build prod OK, persistencia en `.data/fichas.json` verificada (7 fichas tras el smoke), todos los endpoints validados vía curl.

### T8 — Documentación inicial ✅ done
**Resultado**: `README.md` específico del proyecto + `odd/decisions/optica-app-v1.md` con 8 decisiones.

### T9 — Rediseño ficha (réplica papel) ✅ done
**Resultado**: primitivos `PaperField` / `PaperCheckbox` / `PaperLayout` (`PaperCard`/`PaperFace`/`PaperBody`/`PaperHeader`). Reescritas las 8 sections + `FichaCard` + `FichaForm`. Importes formateados es-AR en read mode (`Intl.NumberFormat` con `"es-AR"`).

### T10 — Rediseño shell (sidebar + topbar) ✅ done
**Resultado**: `Sidebar` con logo + íconos Lucide + item activo en teal; `Topbar` sticky con buscador global que navega a `/fichas?q=...` + notificaciones + usuario; `KpiCard` con íconos de color (teal/sky/amber/rose); listado con KPIs y mejor tabla; home con cards de acceso rápido.

### T11 — Formateador de fechas con input numérico ✅ done
**Motivación**: el usuario quería tipear solo números y que la fecha se armara sola en `DD/MM/AAAA`.
**Resultado**:
- Nuevo módulo `src/features/fichas/ui/dateInputLogic.ts` con `parseAny()` (parsing puro de cualquier entrada: dígitos, ISO, DD/MM/AAAA, separadores varios) y `isoToDisplay()` (ISO → `DD/MM/AAAA`).
- Nuevo componente `DateInput.tsx` que solo acepta dígitos + `/`, auto-formatea mientras escribe, convierte a ISO al guardar.
- Nuevo `PaperDateField` que combina el look paper con `DateInput`.
- Aplicado a `fechaEntrada` (IdentificacionSection) y `recetaFecha` (RecetaSection).
- Nuevo `parseFechaLenient` en `normalizers.ts` para que el schema Zod persista fechas inválidas como `""` en vez de romper el request.
- Tests: 12 nuevos cubriendo typing progresivo, paste, años de 2 dígitos, validación, edge cases.

---

## Estado final

| # | Tarea | Estado | Notas |
|---|---|---|---|
| T1 | Setup base | ✅ done | Next 16 + TS estricto + Tailwind v4 + shadcn 4 + Vitest 3 |
| T2 | Dominio | ✅ done | Tipos + Zod + normalizadores + sheetMapping |
| T3 | Repository + mock | ✅ done | MockFichaRepository con JSON local + mutex atómico |
| T4 | Casos de uso + API | ✅ done | Helpers HTTP + 4 use cases + 2 API routes |
| T5 | UI ficha (v1) | 🗑️ superseded | Reescrita en T9 |
| T6 | Páginas | ✅ done | Listado + nueva + detalle + home |
| T7 | Smoke test | ✅ done | Build prod + curl end-to-end |
| T8 | Documentación | ✅ done | README + decisions |
| T9 | UI ficha réplica papel | ✅ done | PaperField/PaperCheckbox/PaperLayout |
| T10 | Shell sidebar+topbar | ✅ done | Sidebar 240px + Topbar 64px + KPIs + paleta teal |
| T11 | Formateador de fechas | ✅ done | DateInput numérico con auto-formato DD/MM/AAAA |

**Métricas finales**: 80/80 tests passing · 0 errores TS · 0 errores lint · build de producción OK · persistencia verificada.

---

## Fuera de alcance de esta V1

- **Auth con Google + allowlist** (Fase 4 del PDF).
- **OCR/IA para digitalizar fichas históricas** (Fase 5, detrás de `FichaExtractor`).
- **Conexión real a Google Sheets + Apps Script** (Fase 2 real; reemplazar `MockFichaRepository`).
- **Migración masiva con scanner duplex** (Fase 6).
- **Reportes / atajos / historial** (Fase 7).
- **Responsive móvil dedicado**.
- **Tests de UI con `@testing-library/react`** (no instalados; la lógica testeable está extraída a módulos puros).

---

## Próximas features / siguientes sesiones

Ver `odd/decisions/optica-app-v1.md` y `odd/sessions/2026-09-29.md` para el detalle del estado y el roadmap inmediato.

### Candidatos a atacar primero (orden sugerido)

1. **Google Sheets real** detrás de `FichaRepository`. La interface está lista, solo se implementa el adapter.
2. **Auth con Google + allowlist** para salir de local.
3. **Migrar commits** — todo está sin commitear. Revisar la working tree y armar commits por unidades de trabajo (ver skill `gentle-ai-work-unit-commits`).
4. **Tests de componentes UI** cuando agreguemos lógica no trivial en componentes.
5. **Atajos de teclado** y navegación más rica (fase de pulido UX).
6. **OCR/IA** cuando se decida proveedor (OpenAI, Gemini, Claude) — implementar `FichaExtractor`.
