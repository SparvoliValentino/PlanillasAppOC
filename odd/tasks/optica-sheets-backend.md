# Optica App — Backend Google Sheets + adaptaciones de frontend

**Feature**: optica-sheets-backend
**Inicio**: 2026-09-29
**Estado**: 🟡 En curso — T1 ✅ T2 ✅ T3 ✅ T4 ✅ T5 ✅ T6 ✅ T7 ✅. Falta la prueba en vivo contra la Sheet real.
**Stack**: el de `optica-app-v1` + Google Apps Script (`apps-script/optica-backend.md`).
**Roadmap del PDF**: Fase 2 (Persistencia real) + ajustes de Fase 3 (CRUD).
**Decisiones**: `odd/decisions/optica-sheets-backend.md`
**TDD**: off (sin configuración de proyecto). Checks funcionales por tarea: `npm run typecheck`, `npm run lint`, `npm test` (Vitest).
**Commits**: los hace el usuario (decisión §8 de `optica-app-v1`). Esta feature no commitea.

---

## Objetivo

Conectar la app a Google Sheets a través del gateway Apps Script ya desplegado, sin acoplar la UI a Sheets, y sumar las capacidades pedidas por el usuario:

- A. Listar paginado y controlado.
- B. Filtrar por nombre y teléfono.
- C. Traer una ficha por N°.
- D. Editar una ficha.
- E. Descargar una ficha como PDF.
- F. Crear una ficha desde cero **con N° de ficha ingresado a mano** (la ficha virtual pertenece a una física).
- G. Ordenar por fecha de carga o alfabéticamente sobre todo el sistema.

## Alcance autorizado

Cambios en dominio, aplicación, infraestructura, API y UI de `fichas`, env vars y docs. Consultar al usuario antes de cualquier cambio fuera del plan aprobado el 2026-09-29.

## Criterios de aceptación

- Con `FICHA_REPOSITORY=sheets` la app lista, busca, ordena, abre, crea, edita y descarga PDF contra la Google Sheet real.
- Con `FICHA_REPOSITORY=mock` todo sigue funcionando localmente (PDF responde "solo disponible con Google Sheets").
- El N° de ficha se ingresa a mano al crear, se valida duplicado (409) y no se puede modificar después.
- Edición concurrente detectada (409 con mensaje claro).
- Token y URL del Apps Script solo en servidor.
- typecheck, lint y tests en verde.

---

## Tareas

### T1 — Errores de repositorio neutrales ✅ done
**Ruta**: inline (refactor mecánico, 5 archivos ya entendidos por el mapeo previo).
**Resultado**:
- Nuevo `src/features/fichas/domain/errors.ts` con `RepositoryNotFoundError`, `RepositoryConflictError` y `RepositoryStorageError`.
- `mockFichaRepository.ts`, `application/updateFicha.ts` y `lib/http/respond.ts` ya no dependen del mock para los errores.
- `respond.ts` mapea `RepositoryConflictError` → 409 `CONFLICTO`.
- Se descartó un error "no autorizado" hacia el cliente: un token inválido del Apps Script es una mala configuración del servidor y se mapeará a `RepositoryStorageError` (503). Ver decisión §3.
- `.env.local` (ignorado por git) con `FICHA_REPOSITORY=mock`, `APPS_SCRIPT_URL` y `APPS_SCRIPT_TOKEN`. `.env.example` versionado sin secretos.
**Tests**: +3 en `src/lib/http/__tests__/respond.test.ts`. Total 83 passing. typecheck ✅ lint ✅.

### T2 — N° de ficha manual ✅ done
**Ruta**: delegada a un writer (trigger: 2+ archivos no triviales entre schema, mock, form, página y tests). Revisión del diff y spot check (`npm test`, `npm run typecheck`) por el orquestador.
**Resultado**:
- `ficha.schema.ts`: `nroFicha` obligatorio, entero 1–99999999, con mensajes en español. `CreateFichaSchema = FichaSchema`. `UpdateFichaSchema = FichaSchema.omit({ nroFicha }).partial()`, así un patch nunca puede cambiar el N°.
- `ficha.types.ts`: `CreateFichaInput = Ficha`.
- `mockFichaRepository.ts`: se eliminó `nextNro`. `create` valida el duplicado dentro del mutex y lanza `RepositoryConflictError` → 409 "Ya existe una ficha con el N° X."
- `FichaForm.tsx`: prop `nroFichaEditable`. Input numérico (solo dígitos, `aria-label="Número de ficha"`, autofocus) en el lugar del N° del papel.
- `/fichas/nueva`: envía el N°, bloquea el guardado sin N° ("Ingresá el N° de ficha antes de guardar.") y muestra el mensaje del 409.
- `/fichas/[numero]`: sin cambios; el N° sigue de solo lectura.
**Tests**: 83 → 92. Cubre N° faltante/0/negativo/decimal/demasiado largo; duplicado; 25 altas concurrentes con N° distintos; 10 concurrentes con el mismo N° → 1 éxito y 9 `RepositoryConflictError`. typecheck ✅ lint ✅ tests ✅.

### T3 — Auditoría + edición concurrente ✅ done
**Ruta**: delegada a un writer (trigger: 2+ archivos no triviales). Revisión del diff y spot check por el orquestador.
**Resultado**:
- `Ficha` suma `createdAt` y `updatedAt` (ISO; "" en registros viejos). `CreateFichaInput` y `UpdateFichaInput` los excluyen, así el cliente nunca los setea. `FichaForm` y las secciones trabajan con `CreateFichaInput`.
- `ficha.schema.ts`: `UpdateFichaRequestSchema = { patch, expectedUpdatedAt? }`. `FichaRecordSchema` (ficha + timestamps) queda para validar las respuestas del Apps Script en T5.
- `FichaRepository.update(numero, patch, { expectedUpdatedAt })`. El mock chequea dentro del mutex, lanza `RepositoryConflictError` → 409 "La ficha fue modificada por otra persona. Recargala antes de guardar." y `mergeFicha` ignora `nroFicha`, `createdAt` y `updatedAt` del patch.
- Seeds con timestamps escalonados de 1 minuto para que el orden por fecha de carga sea determinístico.
- PUT `/api/fichas/[numero]` recibe `{ patch, expectedUpdatedAt }`. Es el mismo contrato que el `update` del Apps Script.
- Detalle: ante un 409 muestra un toast con la acción "Recargar", que descarta la edición y recarga. Muestra además la línea "Cargada el … · Última modificación …" (`formatDateTime` en `ui/format.ts`).
**Tests**: 92 → 106. typecheck ✅ lint ✅ tests ✅.
**Limitación conocida**: dos guardados en el mismo milisegundo podrían compartir `updatedAt`. Es irrelevante para el uso real (humanos editando).

### T4 — Listado: filtros y orden ✅ done
**Ruta**: delegada a un writer (trigger: 2+ archivos no triviales). Spot check del orquestador (`npm test`).
**Resultado**:
- Parámetros: `nombre`, `telefono` (dígitos, mínimo 3), `sortBy` (`fechaCarga|fechaEntrada|nombre|nroFicha`, default `fechaCarga`) y `sortDir` (default `desc` en fechas y `asc` en nombre/N°).
- La respuesta suma `totalPages`, `sortBy` y `sortDir`, y `FichaSummary` suma `fechaCarga`.
- `domain/listing.ts` (nuevo, puro): normalización sin tildes, filtros AND y comparador con vacíos al final y desempate por N°. Replica las reglas del Apps Script.
- Mock: filtra → ordena → pagina. Corrige el bug de ordenar después de paginar.
- `GET /api/fichas` acepta los nuevos parámetros y responde 400 si son inválidos.
- `/fichas`:
  - La URL es la fuente de verdad (filtros, orden y página) y se envuelve en `Suspense`. Corrige la búsqueda del Topbar, que antes se ignoraba.
  - Suma inputs Nombre y Teléfono, "Limpiar filtros", select "Ordenar por" y botón asc/desc.
  - Suma la columna "Fecha de carga" y paginación con `totalPages`.
**Tests**: 106 → 133 (+14 en `listing.test.ts`). typecheck ✅ lint ✅ tests ✅ build ✅.
**Notas**: select nativo estilizado (no el `Select` de base-ui) por simplicidad y accesibilidad. Encabezados de tabla clickeables no implementados (opcional). No se probó en navegador.

### T5 — Adaptador Google Sheets ✅ done
**Ruta**: delegada a un writer (trigger: 2+ archivos no triviales). Spot check del orquestador (`npm test`) y revisión del selector.
**Resultado**:
- `infrastructure/googleSheetsFichaRepository.ts`:
  - POST `text/plain` con `{ token, action, payload }`, `redirect: "follow"`, `no-store` y timeout (default 15 s, `APPS_SCRIPT_TIMEOUT_MS` opcional).
  - Valida toda respuesta con Zod (`FichaRecordSchema`, `ListFichasResultSchema`).
- Mapeo de errores:
  - `NO_ENCONTRADO` → `null` en `get`, `RepositoryNotFoundError` en `update`.
  - `CONFLICTO` → `RepositoryConflictError` (409).
  - `VALIDACION_INVALIDA` → `RepositoryValidationError` (400, nuevo en `domain/errors.ts`).
  - Todo lo demás → `RepositoryStorageError` (503 genérico): token inválido, esquema, red, timeout, HTML, forma inválida.
  - El log solo incluye acción y tipo de error, nunca el token ni datos personales.
- `lib/config/repository.ts`: `FICHA_REPOSITORY=mock|sheets` con `resolveRepositoryConfig(env)` puro. Si falta una variable, el error nombra la variable, nunca su valor.
- `server-only` instalado e importado en el adaptador y en la config. Vitest usa un stub (`src/test/server-only-stub.ts`).
**Tests**: 133 → 166 (+26 adaptador con fetch simulado, +6 config, +1 respond). typecheck ✅ lint ✅ tests ✅ build ✅.
**Pendiente**: prueba en vivo contra la Sheet real (requiere autorización del usuario porque crea datos).

### T6 — Descarga PDF ✅ done
**Ruta**: delegada a un writer (trigger: 2+ archivos no triviales). Spot check del orquestador (`npm test`).
**Resultado**:
- `FichaRepository.getPdf(numero) → FichaPdf | null` (`content: Uint8Array`; el base64 queda dentro del adaptador).
- Sheets: acción `pdf`, validada con Zod. Exige `mimeType === "application/pdf"` y sanea `fileName` (`^[\w.-]+\.pdf$`, si no `ficha-<N°>.pdf`).
- Mock: 404 si la ficha no existe. Si existe, lanza `RepositoryUnsupportedError` → 501 `NO_DISPONIBLE` "La descarga en PDF solo está disponible con Google Sheets."
- Caso de uso `getFichaPdf`. Ruta `GET /api/fichas/[numero]/pdf` con `Content-Disposition: attachment` y `no-store`.
- Detalle: botón "Descargar PDF" (estado "Generando…"). Los errores se muestran en un toast.
**Tests**: 166 → 185. typecheck ✅ lint ✅ tests ✅ build ✅.

### T7 — Docs ✅ done
**Ruta**: inline (docs + un cambio mecánico).
**Resultado**:
- `sheetMapping.ts` suma `CREATED_AT`/`UPDATED_AT`, con un test que fija 54 + 2 columnas.
- README: configuración por env, setup del Apps Script, nuevas capacidades, estructura y próximas features.
- Decisiones §6 y §7.
**Tests**: 185 → 186. typecheck ✅ lint ✅ tests ✅.

---

## Progreso y próximo paso

- 2026-09-29: backend Apps Script generado (`apps-script/optica-backend.md`), desplegado por el usuario (versión 1) y `setup()` ejecutado. T1 cerrada.
- 2026-09-29: ping al deploy real OK (`FICHAS`, 56 columnas, 0 filas). Un token inválido devuelve `NO_AUTORIZADO`. T2 cerrada.
- 2026-09-29: T3 cerrada (106 tests).
- 2026-09-29: T4 cerrada (133 tests, build OK). El usuario autorizó encadenar T4–T7.
- 2026-09-29: T5 cerrada (166 tests, build OK).
- 2026-09-29: T6 y T7 cerradas (186 tests). Implementación completa.
- **Próximo paso**: prueba en vivo contra la Google Sheet real con `FICHA_REPOSITORY=sheets` (crear, listar, editar, PDF). Requiere OK del usuario porque escribe datos en la hoja.
