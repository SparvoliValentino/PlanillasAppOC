# Optica App — V1 con mock local

**Feature**: optica-app-v1
**Inicio**: 2026-09-29
**Stack**: Next.js + React + TypeScript estricto + Tailwind + shadcn/ui + Zod + mock local de FichaRepository
**Roadmap**: Fases 1 + 2 + 3 del PDF (base + persistencia mock + CRUD). Persistencia real (Google Sheets + Apps Script) queda para una iteración posterior.

## Reglas innegociables (del PDF)

- TS estricto (`strict: true`), sin `any` innecesario.
- Un esquema Zod compartido; nunca duplicar reglas en UI y API.
- UI **no** conoce filas, columnas ni IDs de Sheets.
- Imágenes **nunca** son producto final: solo insumo temporal para digitalizar (no aplica en V1 mock).
- No guardar `$` en importes; formatear en UI con `Intl.NumberFormat`.
- No convertir teléfonos/documentos/carnet a `Number`.
- Graduaciones conservan signo (`+1.00`, `-0.50`).
- Enums legibles para material/origen; nunca valores mágicos `1`/`2`.
- Sin secretos en cliente. Tokens/credenciales solo en servidor/entorno.
- Toda llamada async contempla `loading`, `empty`, `success`, `error`.
- Desktop-first (≥ 1280px cómodo en 1440px); responsive móvil secundario.
- Idioma de UI: **español rioplatense** (convención del proyecto, fichas en español).
- Idioma de código: **inglés** (tipos, funciones, comentarios técnicos, commits).
- No commit sin pedido explícito del usuario.

## Decisiones tomadas en esta sesión

- Persistencia: **mock local** (JSON en `.data/fichas.json`). Sheet real + Apps Script queda para después.
- UI: **Tailwind + shadcn/ui** (componentes copiados al repo, no dependencia runtime).
- Layout de ficha: **horizontal**, replicando la ficha física (datos personales arriba, lejos/cerca en el cuerpo, medidas a la derecha, económico y cobertura al pie).
- Endpoint base API: `/api/fichas` y `/api/fichas/[numero]`.
- `NRO_FICHA`: entero autogenerado, atómico, independiente del orden de filas.

## Tareas

### T1 — Setup base del proyecto ✅ **en progreso**

**Objetivo**: repo inicializado, Next.js + TS estricto + Tailwind + shadcn/ui base, estructura de directorios según PDF.

**Pasos**:
1. `git init`.
2. Crear proyecto Next.js (App Router, TS, Tailwind, ESLint) sin `--use-npm` extras innecesarios.
3. Activar `strict: true` en `tsconfig.json`, agregar `noUncheckedIndexedAccess` y `noImplicitOverride`.
4. Configurar `path alias` `@/*` → `src/*`.
5. Inicializar shadcn/ui (`components.json`), agregar componentes base: `button`, `input`, `label`, `table`, `dialog`, `form`, `select`, `textarea`, `toast`/`sonner`.
6. Crear estructura: `src/app`, `src/features/fichas/{domain,application,infrastructure,ui}`, `src/lib/{config,http}`, `src/styles`.
7. Expandir `.gitignore` (Node, Next.js, `.env*.local`, `.data/`).
8. Layout shell desktop en `src/app/layout.tsx` (header mínimo + container).

**DoD**:
- `npm run dev` arranca sin errores en `http://localhost:3000`.
- `npm run build` y `npm run lint` y `npm run typecheck` pasan.
- Estructura de directorios coincide con el PDF (sección 10).
- Página `/` renderiza shell con header.

---

### T2 — Dominio Ficha (types + Zod + normalizadores)

**Objetivo**: modelo de dominio tipado, validado y testeado.

**Pasos**:
1. `src/features/fichas/domain/ficha.types.ts`: `Ficha`, `FichaSummary`, `CreateFichaInput`, `UpdateFichaInput`, `ListFichasParams`, `Paginated<T>`, enums (`TipoLente`, `Material`, `Origen`).
2. `src/features/fichas/domain/ficha.schema.ts`: esquema Zod único compartido UI ↔ API, derivado a tipos.
3. `src/features/fichas/domain/normalizers.ts`: funciones puras para fechas ISO, importes (sin `$`, parsing robusto), graduaciones (preservar `+`), teléfonos/documentos (strings).
4. `src/features/fichas/domain/sheetMapping.ts`: array estable con orden de columnas (Anexo B) — referencia aunque hoy el destino sea JSON.
5. Tests unitarios con Vitest para normalizadores y schemas (reglas `+` en graduaciones, importes sin `$`, fechas, enums).

**DoD**:
- Todos los normalizadores tienen tests que cubren casos válidos, inválidos y borde.
- Importar tipos/schema desde un archivo de prueba fuerza errores de TS si algo está mal.
- No hay `any`; tipos exportados.

---

### T3 — Interface `FichaRepository` + Mock JSON local

**Objetivo**: contrato de repositorio desacoplado; implementación mock funcional.

**Pasos**:
1. `src/features/fichas/domain/repository.ts`: interface `FichaRepository` (exacta al PDF sección 7.2).
2. `src/features/fichas/infrastructure/mockFichaRepository.ts`: implementación con archivo JSON en `.data/fichas.json`.
   - `list({ page, pageSize, q })`: filtra por `NRO_FICHA`, `NOMBRE`, `TEL`, `CEL`, `NRO_DOC` (case-insensitive).
   - `getByNumber(numero)`: lectura directa.
   - `create(input)`: genera `NRO_FICHA` atómico (lock en memoria para evitar colisiones en proceso).
   - `update(numero, input)`: merge con la ficha existente, preservando `NRO_FICHA`.
3. Seed con 5 fichas de ejemplo en `.data/fichas.seed.json` para no arrancar vacío.
4. Singleton del repositorio en `src/lib/config/repository.ts` (lee `process.env.FICHA_REPOSITORY` para futuro swap).
5. Tests de integración del mock: crear → listar → obtener → editar → volver a obtener.

**DoD**:
- Interface `FichaRepository` exactamente igual a la del PDF.
- Mock funciona end-to-end con las 5 seeds.
- Tests de los 4 métodos pasan.
- `NRO_FICHA` no se duplica bajo carga concurrente (lock en memoria suficiente para V1).

---

### T4 — Casos de uso + API routes

**Objetivo**: capa de aplicación delgada + endpoints REST.

**Pasos**:
1. `src/features/fichas/application/{listFichas,getFicha,createFicha,updateFicha}.ts`: funciones puras que reciben `FichaRepository` por DI y devuelven `Promise<…>`; validan con Zod antes de persistir.
2. `src/app/api/fichas/route.ts`: `GET` (list) y `POST` (create).
3. `src/app/api/fichas/[numero]/route.ts`: `GET` y `PUT`.
4. Helpers HTTP en `src/lib/http/{respond,errors}.ts`: traducen errores de aplicación a JSON `{ error, message }` sin filtrar stack traces.
5. Tests de casos de uso con repo mockeado (sin tocar red ni disco).

**DoD**:
- Endpoints `/api/fichas` y `/api/fichas/[numero]` responden 200/400/404/500 según contrato.
- Validación rechaza importes con `$`, teléfonos coercionados a `Number`, etc.
- No se filtra stack trace en respuestas de error.

---

### T5 — Componentes UI de ficha (horizontal)

**Objetivo**: la ficha digital se ve **horizontal**, no como lista vertical de inputs.

**Pasos**:
1. `src/features/fichas/ui/FichaCard.tsx`: vista de **lectura** con layout horizontal estilo ficha física.
2. `src/features/fichas/ui/FichaForm.tsx`: vista de **edición** con el mismo layout (modo edición cambia controles).
3. `src/features/fichas/ui/sections/`: subcomponentes:
   - `IdentificacionSection`
   - `RecetaSection`
   - `LejosSection`
   - `CercaSection`
   - `MedidasSection`
   - `TipoLenteSection`
   - `EconomicoSection`
   - `CoberturaSection`
4. Helpers de formato: `formatMoney` (es-AR, sin símbolo en input, símbolo en UI), `formatDate` (ISO → DD/MM/YYYY), `formatGraduacion`.
5. Navegación por teclado: `Tab`/`Shift+Tab`/`Enter`, foco visible.

**DoD**:
- Una persona que conoce la ficha física reconoce dónde está cada dato.
- Formateo es-AR consistente (moneda con `$`, fechas DD/MM/YYYY).
- Cada sección es testeable aisladamente (al menos snapshot o render test).

---

### T6 — Páginas: listado, nueva, detalle/editar

**Objetivo**: las 4 pantallas mínimas del PDF funcionales.

**Pasos**:
1. `src/app/fichas/page.tsx`: listado + buscador (`FichaSearch`) + paginación, llama a `GET /api/fichas`.
2. `src/app/fichas/nueva/page.tsx`: renderiza `FichaForm` vacío, `POST /api/fichas` al guardar.
3. `src/app/fichas/[numero]/page.tsx`: renderiza `FichaCard` (modo lectura por defecto, botón "Editar" abre `FichaForm`).
4. Manejo de estados: `loading` (skeleton), `empty` (mensaje claro), `error` (mensaje al usuario sin stack).
5. Navegación entre listado ↔ ficha ↔ nueva sin recarga completa (links normales de Next, `router.push` para acciones).

**DoD**:
- Flujo completo: `nueva` → guardar → redirige al detalle → editar → guardar → vuelve al detalle actualizado.
- Búsqueda por nombre y por NRO_FICHA funciona.
- Paginación navega sin perder query.
- Estados loading/empty/error visibles.

---

### T7 — Smoke test manual + hardening básico

**Objetivo**: validar el flujo completo end-to-end y dejar la V1 lista para mostrar.

**Pasos**:
1. Levantar `npm run dev` y recorrer: nueva ficha → completar todos los campos → guardar → editar → cambiar valores → guardar → buscar → ver detalle.
2. Probar graduaciones con y sin signo, importes con decimales, fechas en formatos varios.
3. Validar accesibilidad mínima: foco visible, labels asociados, contraste.
4. `npm run build` + `npm run start` para verificar build de producción.
5. Capturar screenshots de las 3 pantallas para revisar UX con el usuario.

**DoD**:
- Flujo completo verificado en build de producción.
- Sin errores en consola del navegador.
- Sin warnings de lint ni de TS.

---

### T8 — Documentación mínima para接手

**Objetivo**: dejar la base documentada para que la IA/otro dev entre rápido.

**Pasos**:
1. `README.md` con: stack, comandos (`dev`, `build`, `lint`, `test`, `typecheck`), estructura, cómo conectar Google Sheets real después.
2. Comentarios JSDoc en la interface `FichaRepository` y en los casos de uso.
3. Notas en `odd/decisions/optica-app-v1.md` con las decisiones de esta sesión y por qué.

**DoD**:
- README explica cómo arrancar, cómo correr tests, y cómo migrar a Sheets real después.
- Decisiones de la sesión registradas.

---

## Estado

| Tarea | Estado | Notas |
| --- | --- | --- |
| T1 Setup base | ✅ done | Next 16.3.6 + React 19 + Tailwind v4 + shadcn 4.21 (preset base-nova) + Vitest 3 |
| T2 Dominio | 🟡 en progreso | — |
| T3 Repository + mock | ⚪ pendiente | — |
| T4 Casos de uso + API | ⚪ pendiente | — |
| T5 Componentes UI ficha | ⚪ pendiente | — |
| T6 Páginas | ⚪ pendiente | — |
| T7 Smoke test | ⚪ pendiente | — |
| T8 Docs | ⚪ pendiente | — |

## Fuera de alcance de esta V1

- Auth con Google / allowlist (Fase 4).
- OCR/IA con revisión humana (Fase 5).
- Conexión real a Google Sheets + Apps Script (Fase 2 real).
- Migración masiva con scanner duplex (Fase 6).
- Reportes / atajos / historial (Fase 7).
- Responsive móvil dedicado.
