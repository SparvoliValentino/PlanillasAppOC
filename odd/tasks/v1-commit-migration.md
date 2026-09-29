# V1 — Migración de working tree a commits por unidades

**Feature**: v1-commit-migration
**Inicio**: 2026-09-29
**Estado**: 🟡 En curso
**Stack**: el mismo de `optica-app-v1` (no se toca código, solo git).
**Motivación**: la sesión del 2026-09-29 dejó toda la V1 en la working tree sin commitear (salvo el scaffold inicial `c9a8705`). Esta mini-feature migra ese trabajo a commits por unidades de trabajo revisables, siguiendo el skill `gentle-ai-work-unit-commits`.

---

## Reglas aplicadas (del skill)

- **Commit por unidad de trabajo**, no por tipo de archivo.
- **Tests con el código** que prueban (no se commitea código sin su test, ni test sin código).
- **Docs con la feature visible al usuario**.
- **Mensaje conventional commits**, contando el "qué" y el "por qué", no la lista de archivos.
- **El repo debe seguir compilando/tests pasando después de cada commit** (o como mucho romperse solo donde el commit explícitamente introduce incompletitud).
- **No exceder el budget por PR**, pero acá solo hacemos commits locales (sin PR), así que el límite es cohesión interna y capacidad de rollback.

---

## Tareas (cada una es un commit independiente)

### C1 — `chore(deps): add npm scripts and lockfile updates` ✅ pending
**Archivos**: `package.json`, `package-lock.json`, `next-env.d.ts`
**Work unit**: housekeeping de toolchain. Habilita `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` que el scaffold no tenía.
**Verificación**: `npm run typecheck && npm run lint` pasan.

### C2 — `feat(domain): add ficha types, Zod schema, normalizers, and sheet mapping` ✅ pending
**Archivos**: `src/features/fichas/domain/{ficha.types,ficha.schema,normalizers,sheetMapping,repository}.ts` + `src/features/fichas/domain/__tests__/*`
**Work unit**: tipos, validación, normalización y contrato de persistencia. Sin UI ni infra.
**Tests**: 40 nuevos (24 normalizers + 12 schema + 3 sheetMapping + 1 smoke heredado).

### C3 — `feat(repository): add mock FichaRepository with atomic NRO_FICHA` ✅ pending
**Archivos**: `src/features/fichas/infrastructure/{mockFichaRepository,seed}.ts` + `src/features/fichas/infrastructure/__tests__/*`
**Work unit**: implementación local del contrato `FichaRepository` con persistencia JSON + mutex atómico + seed.
**Tests**: 17 nuevos (CRUD + búsqueda + concurrencia + persistencia en disco).

### C4 — `feat(application): add fichas CRUD use cases` ✅ pending
**Archivos**: `src/features/fichas/application/{listFichas,getFicha,createFicha,updateFicha}.ts` + `src/features/fichas/application/__tests__/*`
**Work unit**: 4 casos de uso puros que orquestan dominio + repositorio. Traducen errores del repo a errores de aplicación.
**Tests**: 11 nuevos.

### C5 — `feat(http): add response and error helpers for API routes` ✅ pending
**Archivos**: `src/lib/http/{respond,errors}.ts`, `src/lib/config/repository.ts`
**Work unit**: infraestructura HTTP mínima + factory singleton del repositorio (mock por default, `sheets` cuando `FICHA_REPOSITORY=sheets`).
**Tests**: ninguno propio (los cubren los tests de los use cases y de la API).

### C6 — `feat(api): add fichas CRUD endpoints` ✅ pending
**Archivos**: `src/app/api/fichas/route.ts`, `src/app/api/fichas/[numero]/route.ts`
**Work unit**: 4 endpoints REST (`GET/POST /api/fichas`, `GET/PUT /api/fichas/[numero]`) que conectan HTTP con casos de uso.
**Verificación**: smoke test con `curl` end-to-end (queda documentado en el mensaje del commit, no en código).

### C7 — `feat(ui): add paper primitives for ficha replica layout` ✅ pending
**Archivos**: `src/features/fichas/ui/paper/{PaperField,PaperCheckbox,PaperLayout}.tsx`, `src/features/fichas/ui/format.ts`
**Work unit**: primitives presentacionales puras para replicar el look "papel" (label itálica + underline dashed, checkboxes ☐/☑, layout 3 caras).
**Tests**: ninguno propio (son componentes triviales sin lógica).

### C8 — `feat(ui): add date input with progressive auto-format` ✅ pending
**Archivos**: `src/features/fichas/ui/{DateInput,dateInputLogic}.ts`, `src/features/fichas/ui/paper/PaperDateField.tsx`, `src/features/fichas/ui/__tests__/*`
**Work unit**: input numérico → auto-formato `DD/MM/AAAA` → ISO al guardar, con paste/backspace tolerante y validación silenciosa. `PaperDateField` es wrapper presentacional.
**Tests**: 12 nuevos (typing progresivo, paste, años de 2 dígitos, validación, edge cases).

### C9 — `feat(ui): add ficha sections and replica read/edit views` ✅ pending
**Archivos**: `src/features/fichas/ui/sections/*.tsx` (8), `src/features/fichas/ui/{FichaCard,FichaForm}.tsx`
**Work unit**: la ficha completa como producto. Compone las primitives (C7) y `PaperDateField` (C8) en 8 secciones y dos vistas (read/edit). Esto es la "réplica papel" que pidió el usuario.
**Tests**: ninguno propio (la lógica testeable está en domain/application/DateInput).

### C10 — `feat(ui): add app shell with sidebar and topbar` ✅ pending
**Archivos**: `src/components/layout/{Sidebar,Topbar,KpiCard}.tsx`
**Work unit**: chrome de la app. Sidebar fija de 240 px con íconos Lucide, topbar sticky de 64 px con buscador global, tarjetas KPI con íconos de color.
**Tests**: ninguno propio.

### C11 — `feat(pages): add home, fichas listing, new, and detail pages` ✅ pending
**Archivos**: `src/app/{layout,page}.tsx`, `src/app/fichas/{page,nueva/page,[numero]/page}.tsx`
**Work unit**: las 4 páginas que arman la app (home, listado + search + KPIs + paginación, form vacío, detalle con read/edit toggle). Conecta shell (C10) + ficha (C9) + toaster Sonner.
**Tests**: ninguno propio.

### C12 — `docs(odd): add optica-app-v1 task tracking, decisions, and session log` ✅ pending
**Archivos**: `odd/tasks/optica-app-v1.md` (modificado), `odd/decisions/optica-app-v1.md`, `odd/sessions/2026-09-29.md`, `odd/reference/*.png`
**Work unit**: el "paquete de documentos" de la feature para retomar después (tracking, decisiones con justificación, log de sesión, imágenes de referencia).
**Verificación**: revisión visual de cada archivo (es docs, no compila).

### C13 — `docs(readme): replace scaffold README with project documentation` ✅ pending
**Archivos**: `README.md` (modificado)
**Work unit**: el README de onboarding con stack, comandos, estructura, persistencia mock, cómo conectar Sheets, reglas innegociables y próximas features.
**Verificación**: lectura.

---

## Orden de dependencias (por qué este orden)

- **C1 deps** → habilita scripts que los siguientes commits usan en sus tests/verificaciones.
- **C2 domain** → base sin la cual ningún otro commit puede tipar.
- **C3 repo** → implementa la interface definida en C2 (sin UI encima todavía).
- **C4 application** → depende de C2 y C3.
- **C5 http** → helpers sin los que la API no compila.
- **C6 api** → depende de C4 y C5; primer commit donde un endpoint devuelve datos reales.
- **C7 paper primitives** → bases sin las que la ficha no se renderiza.
- **C8 date input** → depende de C7 (PaperDateField importa de paper/) y desbloquea las sections con fecha.
- **C9 sections + ficha** → depende de C7 y C8.
- **C10 shell** → independiente del contenido de fichas; solo necesita primitives de shadcn.
- **C11 pages** → depende de C9 y C10.
- **C12 docs odd/** → independientes del código (se commitean al final para no perderlos en un eventual reset de la working tree).
- **C13 readme** → última capa de docs.

---

## Estado final esperado

- 13 commits nuevos en `master`.
- `git log --oneline` muestra una historia limpia y revisable de la V1.
- Cada commit deja el repo compilando (cuando corresponde) o solo agrega piezas sin romper nada.
- `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` siguen verdes al final.
- Working tree limpia: `git status` solo reporta archivos ignorados (`.data/`, `.next/`, etc.).

---

## Rollback

Si en cualquier punto algo rompe y no se puede arreglar rápido:
1. `git reset --hard HEAD~1` para deshacer el último commit.
2. Diagnosticar.
3. Re-aplicar cambios sin commitear y volver a intentar.

Nunca `git reset --hard` antes de un commit que tiene archivos que todavía no existen en otro commit — en este flujo todos los archivos de C2-C11 son nuevos, así que el riesgo es bajo.
