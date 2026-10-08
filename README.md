# Optica App

Aplicación web para digitalizar y gestionar las fichas de pacientes de una
óptica. Reemplaza la ficha física tradicional por una ficha digital
**horizontal** que se renderiza con datos estructurados (no con la foto),
guardando la misma disposición visual del papel.

> **Estado**: V1 + backend Google Sheets (Apps Script). La app usa
> únicamente la Google Sheet real; requiere `APPS_SCRIPT_URL` y `APPS_SCRIPT_TOKEN`.
> Tracking: `odd/tasks/optica-app-v1.md` y `odd/tasks/optica-sheets-backend.md`.
> Decisiones: `odd/decisions/optica-app-v1.md` y `odd/decisions/optica-sheets-backend.md`.
>
> Contexto original: `~/Downloads/Optica_App_Contexto_IA_Codigo_v1.pdf`.
> Imágenes de referencia de la ficha física: `odd/reference/ficha-{frente,dorso}.png`.

## Características implementadas (V1)

- **CRUD de fichas** completo: listado paginado, búsqueda, detalle horizontal, crear, editar.
- **N° de ficha manual**: se ingresa al crear (es el número de la ficha física), se valida que no exista y no se puede cambiar después.
- **Listado controlado**: filtros por nombre (sin importar tildes ni orden de palabras) y teléfono, búsqueda libre, orden por fecha de carga, fecha de entrada, nombre o N° (asc/desc) sobre todo el sistema. El estado vive en la URL.
- **Anular fichas** (borrado lógico): botón "Anular ficha" en el detalle, con confirmación. La fila queda en la Sheet (columna `ANULADA_AT`), sale del listado y no se puede editar; el N° no se reutiliza. "Mostrar anuladas" en el listado las incluye marcadas. No hay des-anular ni borrado físico.
- **Edición concurrente segura**: si otra persona guardó la ficha mientras la editabas, se avisa y se ofrece recargar.
- **Descarga en PDF** de cada ficha (generado por el Apps Script).
- **Backend Google Sheets** vía Apps Script (`apps-script/optica-backend.md`), detrás de `FichaRepository`.
- **Réplica visual del papel**: N° de ficha gigante arriba a la derecha, líneas horizontales y verticales que separan bloques, etiquetas en itálica, checkboxes literales ☐/☑, look "formulario" en cada cara (header, cuerpo, dorso).
- **Formateador de fechas con input numérico**: el usuario tipea solo dígitos y la fecha se arma sola en `DD/MM/AAAA` (con soporte para paste de cualquier formato y backspace progresivo).
- **Normalizadores es-AR**: importes `$ 1.234,56`, graduaciones `+1,75 → +1.75`, fechas `29/09/2026`, teléfonos, documentos.
- **Persistencia**: Google Sheets (Apps Script + `LockService`) detrás de la interfaz `FichaRepository`. No hay almacenamiento local ni datos de ejemplo.
- **Shell sidebar + topbar** con paleta teal, buscador global, KPIs en el listado.
- **Tests** (Vitest) cubriendo normalizadores, schema Zod, listado, adaptador de Sheets (fetch simulado), use cases, respuestas HTTP y formateadores.
- **Idioma**: español rioplatense en UI, inglés en código.

## Stack

- **Next.js 16** (App Router) + **React 19**.
- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`).
- **Tailwind v4** (CSS-first, sin `tailwind.config.ts`).
- **shadcn/ui 4** (preset `base-nova`; `@base-ui/react` no expone `asChild`).
- **Zod** para validación.
- **Vitest** para tests.

## Comandos

```bash
npm run dev        # Dev server en http://localhost:3000
npm run build      # Build de producción
npm run start      # Sirve el build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest
npm run test:watch # Vitest en modo watch
```

## Estructura

```
src/
  app/
    layout.tsx                 # Shell desktop: Sidebar + Topbar + Content
    page.tsx                   # Home con cards de acceso rápido
    globals.css                # Tailwind v4 + tema teal
    api/
      fichas/route.ts          # GET (list) + POST (create)
      fichas/[numero]/route.ts # GET + PUT ({ patch, expectedUpdatedAt })
      fichas/[numero]/anular/route.ts # POST ({ expectedUpdatedAt? }) → anula la ficha
      fichas/[numero]/pdf/route.ts # GET → descarga PDF
    fichas/
      page.tsx                 # Listado + buscador + KPIs + paginación
      nueva/page.tsx           # Formulario vacío
      [numero]/page.tsx        # Detalle / Editar (read/edit toggle)
  components/
    layout/
      Sidebar.tsx              # 240px, íconos Lucide, item activo teal
      Topbar.tsx               # 64px sticky, buscador global
      KpiCard.tsx              # Tarjetas con íconos de color
    ui/                        # Primitivas shadcn
  features/
    fichas/
      domain/                  # Tipos, schema Zod, normalizadores
        ficha.types.ts
        ficha.schema.ts
        normalizers.ts         # parseFecha, parseImporte, normalizeGraduacion, …
        listing.ts             # Filtros y orden del listado (puro)
        errors.ts              # Errores de repositorio (neutrales)
        sheetMapping.ts        # Orden estable de columnas (Anexo B + auditoría)
        repository.ts          # interface FichaRepository (PDF §7.2 + getPdf)
      application/             # Use cases puros
        listFichas.ts
        getFicha.ts
        getFichaPdf.ts
        createFicha.ts
        updateFicha.ts
      infrastructure/
        googleSheetsFichaRepository.ts # Adaptador Apps Script (server-only)
      ui/
        DateInput.tsx          # Input numérico → DD/MM/AAAA → ISO
        dateInputLogic.ts      # Lógica pura testeable
        FichaCard.tsx          # Vista horizontal de lectura
        FichaForm.tsx          # Vista horizontal de edición
        format.ts              # formatDate (es-AR)
        paper/
          PaperField.tsx       # Label + línea (read) / input underline (edit)
          PaperCheckbox.tsx    # ☐/☑ unicode (read) / nativo (edit)
          PaperDateField.tsx   # PaperField + DateInput
          PaperLayout.tsx      # PaperCard / PaperFace / PaperBody / PaperHeader
        sections/
          IdentificacionSection.tsx
          RecetaSection.tsx
          GraduacionBlock.tsx
          LejosCercaSection.tsx
          MedidasSection.tsx
          TipoLenteSection.tsx
          EconomicoSection.tsx
          CoberturaSection.tsx
  lib/
    config/repository.ts       # Config por env (solo Sheets; falla si falta URL/token)
    http/{errors,respond}.ts   # Helpers para los API routes
    utils.ts                   # cn helper

apps-script/
  optica-backend.md            # Code.gs completo para pegar en el Apps Script de la Sheet

odd/
  tasks/                       # Tracking por feature (optica-app-v1, optica-sheets-backend, …)
  decisions/                   # Decisiones técnicas con justificación
  sessions/2026-09-29.md       # Resumen de la sesión para retomar
  reference/                   # Imágenes extraídas del PDF (frente/dorso de la ficha)
    ficha-frente.png
    ficha-dorso.png
```

## Configuración

Copiar `.env.example` a `.env.local`. Todas las variables son **solo de servidor** (nunca `NEXT_PUBLIC_`).

| Variable | Uso |
|---|---|
| `APPS_SCRIPT_URL` | **Requerida.** URL del Web App (termina en `/exec`) |
| `APPS_SCRIPT_TOKEN` | **Requerida.** Token que imprime `setup()` en el Apps Script |
| `APPS_SCRIPT_TIMEOUT_MS` | Opcional: timeout por request (default 15000) |

Si falta `APPS_SCRIPT_URL` o `APPS_SCRIPT_TOKEN`, la API falla con error explícito: no hay fallback a datos locales. El repositorio mock fue eliminado; si `FICHA_REPOSITORY` está definida y no es `sheets`, también falla (se puede borrar esa variable).

## Persistencia

- Las fichas viven en la hoja `FICHAS` de Google Sheets.
- El N° de ficha se ingresa a mano; los duplicados se rechazan en el Apps Script con `LockService`.
- La descarga en PDF la genera el Apps Script.

## Cómo interactúan las fechas

- El modelo de dominio guarda ISO `YYYY-MM-DD` (formato canónico).
- Los **normalizadores** (`parseFecha`, `parseFechaLenient`) aceptan ISO, es-AR `DD/MM/AAAA`, `DD-MM-AAAA`, `DD.MM.AA`, "29 de septiembre de 2026".
- El **`DateInput`** es el componente UI para fechas en formularios. El usuario tipea solo dígitos y la fecha se auto-formatea a `DD/MM/AAAA`. La lógica pura está en `dateInputLogic.ts` (testeable sin DOM).
- El **`PaperDateField`** envuelve `DateInput` con el look paper (underline dashed en read/edit).
- En read mode, `formatDate()` (en `format.ts`) muestra ISO como `DD/MM/AAAA`.

## Google Sheets (Apps Script)

1. En la Google Sheet: Extensiones → Apps Script. Pegar el bloque de `apps-script/optica-backend.md` como `Code.gs`.
2. Ejecutar `setup()` una vez: crea o valida la hoja `FICHAS` (54 columnas del Anexo B + `CREATED_AT`/`UPDATED_AT`/`ANULADA_AT`) e imprime el token.
3. Implementar → Nueva implementación → Aplicación web ("Ejecutar como: yo", "Acceso: cualquiera").
4. Cargar `APPS_SCRIPT_URL` y `APPS_SCRIPT_TOKEN` en `.env.local`.
5. Al cambiar el código del Apps Script: pegar el nuevo `Code.gs` y guardar; luego Implementar → Administrar implementaciones → Editar (lápiz) → Versión: Nueva versión → Implementar. No crear una "Nueva implementación": la URL tiene que seguir siendo la misma.
6. Si la hoja ya existía sin `ANULADA_AT` (56 columnas), el script agrega ese encabezado solo en la primera llamada con la versión nueva (o al correr `setup()`); no mueve ni modifica datos.

Protocolo: `POST { token, action, payload }` → `{ ok, data }` o `{ ok: false, error: { code, message } }`. Acciones: `ping`, `list`, `get`, `create`, `update`, `anular`, `pdf`. La UI y los casos de uso no conocen Sheets: todo pasa por `FichaRepository`.

## Reglas innegociables (resumen del PDF)

- TS estricto. Sin `any`. Sin `// @ts-ignore`.
- Un único schema Zod compartido. Las reglas de validación viven ahí.
- La UI **no** conoce filas, columnas ni IDs de Sheets.
- Importes sin `$`, teléfonos y documentos como `string`, graduaciones conservan el signo.
- Toda llamada async contempla `loading`, `empty`, `success`, `error`.
- Idioma de la UI: español rioplatense.
- Idioma del código: inglés.

## Próximas features sugeridas

Ver `odd/sessions/2026-09-29.md` §"Próximas features" para el detalle y el orden recomendado.

1. **Auth con Google + allowlist** (el token solo protege al Apps Script, no a la app).
2. **Des-anular** / borrado físico y **renumerar** una ficha cargada con N° equivocado.
3. **Backup periódico** de la Google Sheet.
4. **OCR/IA** con `FichaExtractor` (Fase 5 del PDF).
5. **Tests de componentes UI** con `@testing-library/react`.
6. **Reportes** (la card del sidebar está deshabilitada).
7. **Atajos de teclado y Cmd+K**.

## Decisiones

Ver `odd/decisions/optica-sheets-backend.md` (N° manual, columnas de auditoría, token compartido, errores de repositorio, contrato del Apps Script) y `odd/decisions/optica-app-v1.md` (12 decisiones: persistencia mock (reemplazada luego por Sheets), stack UI, validación Zod, atomicidad de NRO_FICHA, búsqueda, layout de ficha réplica papel, scope de tests, criterio de commits, shell con sidebar+topbar, KPIs en listado, formateador de fechas numérico, fechas inválidas silenciosas).
