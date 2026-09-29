# Decisiones — optica-app-v1

Sesión del 2026-09-29. Documento living: nuevas decisiones se agregan al final con su fecha.

## 1. Persistencia: mock local primero

**Decisión**: arrancar V1 con un `MockFichaRepository` que persiste en `.data/fichas.json`. La capa de UI consume la interface `FichaRepository`; reemplazar por Google Sheets + Apps Script no toca ningún componente de UI.

**Por qué**:

- Permite iterar UI/CRUD sin credenciales de Google ni Apps Script desplegado.
- Hace explícito el contrato (los 4 verbos del PDF) y el punto de swap.
- Cuando llegue el momento, la decisión de qué backend usar no compromete el resto del código.

**Cuándo revisar**: cuando se superen las ~50.000 fichas, cuando la concurrencia de edición simultánea crezca, o cuando aparezcan relaciones que una fila no represente bien (umbrales del PDF §13.1).

## 2. UI: Tailwind v4 + shadcn/ui (preset `base-nova`)

**Decisión**: Tailwind v4 (CSS-first, sin `tailwind.config.ts`) + shadcn/ui 4 con preset `base-nova`.

**Por qué**:

- Tailwind acelera el ajuste fino del layout horizontal de la ficha.
- shadcn/ui da componentes accesibles (focus, navegación por teclado) listos para usar. Cumple con la regla de accesibilidad del PDF.
- El preset `base-nova` es la opción idiomática de shadcn 4.x (el histórico "new-york" ya no existe en esa versión).

**Riesgo conocido**: el `cn helper` viene del paquete `cn` (no del clásico `clsx + tailwind-merge`). Funciona, pero conviene reemplazarlo si surge fricción.

## 3. Validación: Zod con defaults

**Decisión**: un único `FichaSchema` en `domain/ficha.schema.ts`. Cada campo de tipo string lleva `.default("")`, los nested objects llevan `.default({...})`. Los normalizadores (`parseFechaLenient`, `parseImporte`, `normalizeGraduacion`) corren como `transform` antes de la validación final.

**Por qué**:

- El PDF exige un solo esquema compartido (sin duplicar reglas UI/API).
- Los defaults permiten que la API acepte formularios parciales (un usuario puede guardar la ficha aunque tenga solo el nombre completo).
- Los normalizadores aplicados como `transform` garantizan que la persistencia guarda valores canónicos (ISO, signo `+`, importes sin `$`), no strings sucios de la UI.

**Cuándo revisar**: si surge la necesidad de validar reglas de negocio que crucen varios campos (por ejemplo, "BIFOCAL requiere `altBif_*`"), mover a un `superRefine` o a un caso de uso explícito.

## 4. Atomicidad de `NRO_FICHA`: mutex en memoria

**Decisión**: el mock serializa `create()` con un `Mutex` propio (cadena de Promesas) para garantizar `NRO_FICHA` único.

**Por qué**:

- El PDF exige atomicidad para evitar fichas duplicadas.
- En V1 hay un solo proceso Node; un mutex en memoria es suficiente.
- Cuando llegue Sheets, la atomicidad se moverá a `LockService` en Apps Script (es lo que el PDF sugiere).

**Limitación**: si se corre la app detrás de un balanceador con varios instancias, el mutex deja de funcionar. El switch a Sheets resuelve eso.

## 5. Búsqueda: NRO_FICHA exacto, resto contains

**Decisión**: la búsqueda en el listado distingue dos modos:

- Si la query parsea como entero y matchea un `NRO_FICHA` existente, devuelve esa ficha exacta.
- En cualquier otro caso, hace `includes` case-insensitive sobre `nombre`, `tel`, `cel` y `cobertura.nroDoc`.

**Por qué**:

- El PDF dice "Buscar por numero de ficha, nombre, telefono/celular y documento". El número es un identificador; el resto son coincidencias parciales razonables para una óptica.
- Buscar `3` debería devolver la ficha 3, no todas las que tengan un "3" en algún lado (UX obvia).
- Si la query no matchea ningún `NRO_FICHA`, caemos al contains para no perder resultados cuando el usuario tipea un teléfono parcial.

## 6. Layout: ficha horizontal (réplica papel)

**Decisión**: la ficha se reconstruye con HTML/CSS imitando el papel:

- Encabezado con `N°: XXXX` gigante arriba a la derecha.
- 2 columnas en el cuerpo: receta + lejos + cerca a la izquierda; medidas + tipo de lente a la derecha.
- Dorso aparte: precios + totales a la izquierda; obra social + carnet + doc + forma de pago a la derecha.
- Líneas horizontales separan las 3 "caras" (header / cuerpo / dorso).
- Línea vertical divide el cuerpo en dos mitades.
- Etiquetas en itálica, valores en monoespaciada donde corresponde.
- Checkboxes literales ☐/☑ en read; nativos en edit.
- Líneas underline dashed cuando un campo está vacío en read mode (formato "papel por completar").

**Por qué**:

- El PDF es explícito: "digitalizar la ficha, no la foto". La persona que conoce el papel tiene que reconocer dónde está cada dato sin curva de aprendizaje.
- Los primitives (`PaperField`, `PaperCheckbox`, `PaperLayout`) son presentacionales puros y pueden evolucionar sin tocar el dominio.
- Importes formateados con `Intl.NumberFormat("es-AR")` para el separador de miles ("45.000") — se almacenan sin formato y se formatean solo en UI.

**Cuándo revisar**: feedback del dueño del negocio cuando vea la V1 en uso.

## 7. Tests: contratos del dominio y casos de uso, no UI

**Decisión**: 80 tests cubren:

- Normalizadores (24 tests): fechas, importes, graduaciones, teléfonos.
- Schema Zod (12 tests): parseo válido, rechazos, defaults.
- Sheet mapping (3 tests): columnas canónicas.
- MockFichaRepository (17 tests): CRUD, búsqueda, concurrencia, persistencia en disco.
- Casos de uso (11 tests): validación, traducciones de errores.
- DateInput (12 tests): typing progresivo, paste, validación, años de 2 dígitos.

**Por qué**:

- La lógica no trivial vive en dominio y casos de uso. Testear ahí da la mejor relación cobertura/costo.
- Los componentes UI son mayormente presentacionales; un test de snapshot o render test no aporta más que un typecheck.
- La lógica testeable del DateInput se extrajo a `dateInputLogic.ts` (puro) para poder testear sin React DOM.
- Cuando llegue el Sheets adapter, los tests del mock se duplican casi 1:1 sin esfuerzo.

## 8. Sin commits automáticos durante la sesión

**Decisión**: durante esta sesión solo se hizo **un** commit (`chore: initial scaffold`), porque el sistema de subagentes del orquestador necesitaba un HEAD válido. El resto del trabajo quedó en el filesystem.

**Por qué**:

- El orquestador prohíbe commits automáticos salvo pedido explícito.
- Esa política existe para proteger la carga de revisión del humano.
- La excepción del commit inicial fue inevitable (no había HEAD) y está documentada en el mensaje del commit.

**Pendiente**: el usuario debe decidir el criterio de commits cuando retome (recomendado: por unidades de trabajo revisables, ver skill `gentle-ai-work-unit-commits`).

## 9. Shell: sidebar fija + topbar sticky

**Decisión**: shell persistente con:

- **Sidebar 240 px** a la izquierda, fija en `md+`. Contiene logo (ícono Glasses + "Optica App" + subtítulo), nav con íconos Lucide (Inicio, Fichas, Reportes, Configuración), item activo resaltado en teal, items deshabilitados con badge "PRONTO", footer con versión.
- **Topbar 64 px sticky** arriba. Contiene buscador global (envía a `/fichas?q=...`), botones de notificaciones y cuenta, nombre del usuario.

**Por qué**:

- La ficha es la pantalla principal y requiere mucho ancho. Una sidebar fija (no topbar doble) deja más espacio horizontal para la ficha y replica cómo se usan las ópticas en su flujo diario.
- Topbar sticky mantiene el buscador siempre accesible sin scrollear.
- Paleta teal (Glasses / Óptica) como acento; neutros para el resto.

## 10. KPIs en el listado

**Decisión**: 4 cards KPI arriba del listado: Total de fichas, En esta página, Ingresos últimos 7 días, Cargadas hoy.

**Por qué**:

- Feedback visual inmediato del estado de la base sin entrar a reportes.
- "Ingresos últimos 7 días" se calcula en cliente sobre la página actual (no es el total real). Documentado en código como heurística; cuando se conecte Sheets se puede cambiar a un endpoint agregado.

**Cuándo revisar**: cuando agreguemos reportes reales, mover estos KPIs a su fuente de verdad y agregar más métricas.

## 11. Formateador de fechas: input numérico con auto-formato

**Decisión**: nuevo componente `DateInput` que:

- Acepta **solo dígitos** mientras se tipea (los caracteres no numéricos se bloquean en `onKeyDown`).
- Auto-formatea progresivamente como `DD/MM/AAAA` mientras se completan los dígitos:
  - `"2"` → `"2"`
  - `"29"` → `"29"`
  - `"290"` → `"29/0"`
  - `"2909"` → `"29/09"`
  - `"29092"` → `"29/09/2"`
  - `"29092026"` → `"29/09/2026"`
- Acepta paste de **cualquier formato razonable** (`DD/MM/AAAA`, `DD-MM-AAAA`, `DD.MM.AA`, `AAAA-MM-DD`, `AAAA/MM/DD`, dígitos sueltos).
- Internamente convierte a ISO `YYYY-MM-DD` antes de propagar al formulario.
- Si la fecha es inválida (`31/02/2026`) o está incompleta, mantiene el string en el display pero propaga `""` al padre (no rompe el guardado).
- Backspace reformatea progresivamente: no quedan `"/"` huérfanos.

**Por qué**:

- Pedido explícito del usuario ("que el usuario ingrese solo números y la fecha se setee sola").
- Es el patrón estándar de inputs de fecha en iOS/Android: separar la responsabilidad "lo que el usuario tipea" de "lo que se guarda" (display vs. modelo canónico).
- La lógica pura está en `dateInputLogic.ts` (testeable sin DOM) y el componente `DateInput.tsx` solo se encarga del input/eventos.
- Se combina con el look "papel" vía `PaperDateField`, que envuelve `DateInput` con el underline dashed.
- `parseFechaLenient` en el normalizer permite que el schema Zod persista fechas inválidas como `""` sin romper el request.

**Edge case bug encontrado**: `parseAny("29092")` originalmente emitía ISO porque `safeIso("2", "09", "29")` matcheaba el regex DMY de `parseFecha` (que expande años de 2 dígitos a 20xx). Fix: en el fallback numérico, no emitir ISO hasta tener los 8 dígitos completos.

## 12. Persistencia de fechas inválidas: silencioso

**Decisión**: nuevo `parseFechaLenient(input)` que devuelve `""` en lugar de throw. El schema Zod lo usa para todas las fechas (`fechaEntrada`, `recetaFecha`).

**Por qué**:

- El usuario está editando; si escribe `"31/02/2026"` o `"29/09"` a medio camino, no queremos que el guardado explote con 400.
- La ficha queda con `fechaEntrada: ""` y el usuario puede corregir después.
- `parseFecha` (estricto) se mantiene para casos donde sí queremos fallar loud (e.g. tests, validaciones explícitas).

---

## Próximas decisiones pendientes

- **Auth**: el PDF sugiere login con Google + allowlist. Decidir proveedor exacto cuando se implemente (Fase 4).
- **Proveedor de OCR/IA** (Fase 5): OpenAI, Gemini o Claude, desacoplado detrás de `FichaExtractor`.
- **Deploy target**: Vercel es el default más probable por la afinidad con Next.js. Decidir cuando haya que salir de local.
- **Criterio de commits**: el usuario debe decidir si commitea por unidades de trabajo, una sola vez al final, o por sesión.
- **KPIs de listado**: pasar de heurística en cliente a endpoint agregado cuando se conecte Sheets.
