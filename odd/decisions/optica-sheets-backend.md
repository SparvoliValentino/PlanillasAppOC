# Decisiones — optica-sheets-backend

Sesión del 2026-09-29. Documento living: se agregan decisiones a medida que avanza la feature.

## 1. N° de ficha ingresado a mano

**Decisión**: el N° de ficha deja de autogenerarse. Es obligatorio al crear, se valida que no exista (409 `CONFLICTO`) y no se puede modificar después.

**Por qué**:
- Pedido explícito del usuario: cada ficha virtual pertenece a una ficha física y debe llevar su mismo número.
- Reemplaza la decisión §4 de `optica-app-v1` ("Atomicidad de NRO_FICHA: mutex en memoria"). La atomicidad ahora es para el chequeo de duplicado: `LockService` en Apps Script y el mutex en el mock.

**Cuándo revisar**: si aparecen números cargados por error con frecuencia, agregar una acción explícita de "renumerar ficha".

## 2. Columnas de auditoría CREATED_AT / UPDATED_AT

**Decisión**: la hoja FICHAS suma dos columnas al final de las 54 del Anexo B: `CREATED_AT` y `UPDATED_AT`, en ISO 8601. Las gestiona solo el backend.

**Por qué**:
- El usuario pidió ordenar por "fecha de carga". `FECHA_ENTRADA` es la fecha escrita en el papel, no la de carga en el sistema.
- `UPDATED_AT` habilita el control de edición concurrente (`expectedUpdatedAt`).
- Se agregan al final para no mover las columnas existentes. `setup()` las agrega a una hoja ya creada.

## 3. Autenticación entre Next y Apps Script con token compartido

**Decisión**: el Apps Script se despliega como Web App ("Ejecutar como: yo", "Acceso: cualquiera") y exige un token guardado en Script Properties. Next lo envía desde el servidor (`APPS_SCRIPT_TOKEN`), nunca desde el navegador.

**Por qué**:
- Es la forma más simple de llamar al Web App servidor a servidor sin OAuth.
- Un token inválido es una mala configuración del servidor, no un error del usuario: el adaptador lo traduce a 503 (`RepositoryStorageError`) y no a 401 hacia el navegador.

**Cuándo revisar**: al implementar el login con Google + allowlist (Fase 4). El token protege al Apps Script, no a la app.

## 4. Errores de repositorio en el dominio

**Decisión**: `RepositoryNotFoundError`, `RepositoryConflictError` y `RepositoryStorageError` viven en `src/features/fichas/domain/errors.ts`. Todas las implementaciones de `FichaRepository` los usan.

**Por qué**:
- Antes vivían en el mock, y `respond.ts` y `updateFicha.ts` dependían del mock. El adaptador de Sheets hubiera tenido que importar errores del mock.

## 5. Contrato del Apps Script

**Decisión**: POST `{ token, action, payload }` → `{ ok, data }` o `{ ok: false, error: { code, message, details } }`, siempre HTTP 200. El Apps Script habla la forma de dominio (`Ficha` anidada) y guarda el mapeo de columnas en su tabla `FIELDS`.

**Por qué**:
- Apps Script no puede devolver códigos HTTP. El sobre `ok` más un código estable lo resuelve.
- El adaptador de Next queda fino: no conoce columnas, cumple la regla del PDF §7 ("el frontend nunca depende de la posición de columnas").
- La edición parcial se aplica campo por campo en el Apps Script, así un patch parcial nunca vacía campos hermanos.

## 6. Listado: orden global y estado en la URL

**Decisión**: orden por defecto fecha de carga descendente. Las fechas vacías siempre van al final, con desempate por N°. Se filtra y ordena antes de paginar, y los filtros, el orden y la página viven en la URL de `/fichas`.

**Por qué**:
- El usuario pidió ordenar "de todo el sistema", no solo de la página visible.
- Con el estado en la URL, el reload, el botón atrás y la búsqueda del Topbar funcionan.
- La lógica pura (`domain/listing.ts`) replica exactamente las reglas del Apps Script.

## 7. PDF generado por el Apps Script

**Decisión**: el PDF lo arma el Apps Script (HTML → PDF) y viaja en base64 hasta el adaptador, que lo convierte en bytes. Con el mock la descarga responde 501 `NO_DISPONIBLE`.

**Por qué**:
- No suma dependencias de generación de PDF a Next.
- La ficha se arma desde los datos de la hoja, la fuente de verdad.
- El nombre del archivo se sanea antes de ir al header `Content-Disposition`.

**Cuándo revisar**: si el diseño del PDF del conversor de Google no alcanza, generar el PDF en Next reutilizando el layout de `FichaCard`.

## 8. Anular fichas (borrado lógico)

**Decisión**: anular marca la fila con `ANULADA_AT` (ISO, vacío = activa), una columna nueva después de `UPDATED_AT`. Nueva acción `anular { nroFicha, expectedUpdatedAt? }` en el Apps Script, expuesta como `POST /api/fichas/[numero]/anular`.

**Reglas**:
- La fila no se borra: el historial queda en la Sheet y el N° sigue ocupado (crear con ese N° da 409).
- `update` sobre una ficha anulada y anular una ya anulada responden `CONFLICTO` (409). Una `expectedUpdatedAt` vieja también.
- El listado oculta las anuladas salvo `incluirAnuladas=true` (parámetro en la URL de `/fichas`). `get` y el PDF siguen funcionando.
- El detalle de una anulada muestra "Ficha anulada el …" y no ofrece Editar ni Anular.
- Anular pide confirmación en un diálogo.

**Por qué**:
- Es reversible a mano en la Sheet y no pierde datos de un cliente.
- Un `POST` a `/anular` (y no `DELETE`) refleja que no se elimina nada.

**Migración**: el Apps Script agrega el encabezado `ANULADA_AT` si falta (hojas de 56 columnas), sin mover datos. Hay que pegar el nuevo `Code.gs` y publicar una Nueva versión de la implementación existente (la URL no cambia).

**Fuera de alcance**: des-anular y borrado físico.

## Próximas decisiones pendientes

- Autenticación de la app (Google + allowlist).
- Renumerar fichas.
