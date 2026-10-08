# Optica App — Google Apps Script backend (`Code.gs`)

Paste the whole block below into `Extensions > Apps Script > Code.gs` of the Google Sheet. Setup steps are in the header comment.

```javascript
/**
 * Optica App — Google Apps Script gateway for the FICHAS sheet.
 *
 * SETUP (one time)
 *   1. Open the Google Sheet > Extensions > Apps Script. Replace Code.gs with this file. Save.
 *   2. Select the `setup` function in the toolbar and click Run. Accept the permissions.
 *      It creates/validates the FICHAS sheet and prints the API token in the execution log.
 *   3. Deploy > New deployment > type "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Copy the Web app URL (ends with /exec).
 *   4. Store the URL and the token ONLY on the Next.js server (.env.local), never in the browser:
 *        APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 *        APPS_SCRIPT_TOKEN=<token from the log>
 *   5. After changing this code: paste the new Code.gs and save, then Deploy > Manage deployments >
 *      Edit (pencil) > Version: New version > Deploy. Do NOT use "New deployment": the URL must stay the same.
 *      The ANULADA_AT header is added to an existing sheet automatically on the first request after the
 *      new version is live (running setup() does the same). No data is moved.
 *
 * PROTOCOL
 *   Request  (POST, Content-Type: text/plain or application/json):
 *     { "token": "...", "action": "<action>", "payload": { ... } }
 *   GET is also accepted for read actions: ?token=...&action=list&page=1&pageSize=50
 *   Response (always HTTP 200; Apps Script cannot set status codes):
 *     { "ok": true,  "data": ... }
 *     { "ok": false, "error": { "code": "...", "message": "...", "details": [...] } }
 *
 * ACTIONS
 *   ping    {}                                            -> { sheet, rows, columns }
 *   list    { page?, pageSize?, q?, nombre?, telefono?, sortBy?, sortDir?, incluirAnuladas? }
 *           incluirAnuladas: boolean, default false. Voided fichas (ANULADA_AT set) are hidden otherwise.
 *           sortBy: "fechaCarga" | "fechaEntrada" | "nombre" | "nroFicha"
 *           sortDir: "asc" | "desc"
 *           -> { items: FichaSummary[], total, page, pageSize, totalPages, sortBy, sortDir }
 *   get     { nroFicha }                                  -> Ficha (voided fichas are returned, with anuladaAt)
 *   create  { ficha: Ficha }  (nroFicha is REQUIRED, typed by the user)   -> Ficha
 *   update  { nroFicha, patch: Partial<Ficha>, expectedUpdatedAt? }       -> Ficha (CONFLICTO if the ficha is voided)
 *   anular  { nroFicha, expectedUpdatedAt? }  (soft delete)               -> Ficha
 *           Sets ANULADA_AT and UPDATED_AT. CONFLICTO if already voided or expectedUpdatedAt differs.
 *   pdf     { nroFicha }                                  -> { fileName, mimeType, base64 }
 *
 * ERROR CODES (map them to HTTP in the Next.js adapter)
 *   NO_AUTORIZADO (401) | VALIDACION_INVALIDA (400) | NO_ENCONTRADO (404) | CONFLICTO (409)
 *   ACCION_DESCONOCIDA (400) | SOLICITUD_INVALIDA (400) | ESQUEMA_INVALIDO (500)
 *   DATOS_INCONSISTENTES (500) | ALMACENAMIENTO_NO_DISPONIBLE (503) | NO_CONFIGURADO (500)
 *   ERROR_INTERNO (500)
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SHEET_NAME = 'FICHAS';
const TOKEN_PROPERTY = 'API_TOKEN';
const TIMEZONE = 'America/Argentina/Buenos_Aires';
const LOCK_TIMEOUT_MS = 15000;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const MAX_TEXT_LENGTH = 500;
const MAX_NRO_FICHA = 99999999;
const MIN_PHONE_SEARCH_DIGITS = 3;

const MATERIAL_VALUES = ['', 'MINERAL', 'ORGANICO'];
const ORIGEN_VALUES = ['', 'STOCK', 'LABORATORIO'];
const TIPO_LENTE_VALUES = ['', 'BIFOCAL', 'PROGRESIVO'];

const SORT_FIELDS = ['fechaCarga', 'fechaEntrada', 'nombre', 'nroFicha'];
const SORT_DIRS = ['asc', 'desc'];

// ---------------------------------------------------------------------------
// Sheet schema — PDF Anexo B (54 business columns) + 3 audit columns.
// Order is the contract. Changing it is a migration.
// Field types: id | text | date | enum | amount | meta
// ---------------------------------------------------------------------------

const FIELDS = [
  // Identificacion
  { col: 'NRO_FICHA', path: 'nroFicha', type: 'id' },
  { col: 'NOMBRE', path: 'nombre', type: 'text' },
  { col: 'EDAD', path: 'edad', type: 'text' },
  { col: 'DOMICILIO', path: 'domicilio', type: 'text' },
  { col: 'TEL', path: 'tel', type: 'text' },
  { col: 'CEL', path: 'cel', type: 'text' },
  { col: 'FECHA_ENTRADA', path: 'fechaEntrada', type: 'date' },
  // Receta
  { col: 'RECETA_FECHA', path: 'recetaFecha', type: 'date' },
  { col: 'RECETA_DR', path: 'recetaDr', type: 'text' },
  // Lejos
  ...graduacionFields_('LEJOS', 'lejos'),
  ...armazonFields_('LEJOS', 'lejos'),
  // Cerca
  ...graduacionFields_('CERCA', 'cerca'),
  ...armazonFields_('CERCA', 'cerca'),
  // Medidas
  { col: 'DIL_OD', path: 'medidas.dilOd', type: 'text' },
  { col: 'DIL_OI', path: 'medidas.dilOi', type: 'text' },
  { col: 'DIC_OD', path: 'medidas.dicOd', type: 'text' },
  { col: 'DIC_OI', path: 'medidas.dicOi', type: 'text' },
  { col: 'ALT_BIF_OD', path: 'medidas.altBifOd', type: 'text' },
  { col: 'ALT_BIF_OI', path: 'medidas.altBifOi', type: 'text' },
  { col: 'ALT_PROG_OD', path: 'medidas.altProgOd', type: 'text' },
  { col: 'ALT_PROG_OI', path: 'medidas.altProgOi', type: 'text' },
  { col: 'ALT_CENTRO_OD', path: 'medidas.altCentroOd', type: 'text' },
  { col: 'ALT_CENTRO_OI', path: 'medidas.altCentroOi', type: 'text' },
  // Tipo de lente
  { col: 'TIPO_LENTE', path: 'tipoLente', type: 'enum', values: TIPO_LENTE_VALUES },
  // Economico
  { col: 'PRECIO_ARMAZON_LEJOS', path: 'economico.precioArmazonLejos', type: 'amount' },
  { col: 'PRECIO_CRISTALES_LEJOS', path: 'economico.precioCristalesLejos', type: 'amount' },
  { col: 'PRECIO_ARMAZON_CERCA', path: 'economico.precioArmazonCerca', type: 'amount' },
  { col: 'PRECIO_CRISTALES_CERCA', path: 'economico.precioCristalesCerca', type: 'amount' },
  { col: 'ADICIONALES', path: 'economico.adicionales', type: 'text' },
  { col: 'PRECIO_TOTAL', path: 'economico.precioTotal', type: 'amount' },
  { col: 'SENA', path: 'economico.sena', type: 'amount' },
  { col: 'SALDO', path: 'economico.saldo', type: 'amount' },
  // Cobertura y pago
  { col: 'OBRA_SOCIAL', path: 'cobertura.obraSocial', type: 'text' },
  { col: 'NRO_CARNET', path: 'cobertura.nroCarnet', type: 'text' },
  { col: 'NRO_DOC', path: 'cobertura.nroDoc', type: 'text' },
  { col: 'FORMA_PAGO', path: 'cobertura.formaPago', type: 'text' },
  // Audit (managed by this script, never by the client)
  { col: 'CREATED_AT', path: 'createdAt', type: 'meta' },
  { col: 'UPDATED_AT', path: 'updatedAt', type: 'meta' },
  // Soft delete marker: ISO timestamp, empty = active. Added after the original 56 columns.
  { col: 'ANULADA_AT', path: 'anuladaAt', type: 'meta' },
];

// Columns that exist in sheets created before ANULADA_AT; the last one is added by migrateHeaders_().
const LEGACY_COLUMN_COUNT = FIELDS.length - 1;

const COLUMNS = FIELDS.map(function (f) { return f.col; });
const COL_INDEX = COLUMNS.reduce(function (acc, col, i) { acc[col] = i; return acc; }, {});
const FIELD_BY_COL = FIELDS.reduce(function (acc, f) { acc[f.col] = f; return acc; }, {});
const EDITABLE_FIELDS = FIELDS.filter(function (f) { return f.type !== 'id' && f.type !== 'meta'; });
const ROW_FORMATS = FIELDS.map(function (f) {
  if (f.type === 'id') return '0';
  if (f.type === 'amount') return '0.00';
  return '@'; // plain text: keeps leading zeros, "+1.00" signs and ISO dates untouched
});

function graduacionFields_(prefix, group) {
  const out = [];
  ['OD', 'OI'].forEach(function (eye) {
    ['ESF', 'CIL', 'EJE'].forEach(function (part) {
      out.push({
        col: prefix + '_' + eye + '_' + part,
        path: group + '.' + eye.toLowerCase() + '.' + part.toLowerCase(),
        type: 'text',
      });
    });
  });
  return out;
}

function armazonFields_(prefix, group) {
  return [
    { col: prefix + '_MATERIAL', path: group + '.armazon.material', type: 'enum', values: MATERIAL_VALUES },
    { col: prefix + '_ORIGEN', path: group + '.armazon.origen', type: 'enum', values: ORIGEN_VALUES },
    { col: prefix + '_ARMAZON', path: group + '.armazon.armazon', type: 'text' },
    { col: prefix + '_MODELO', path: group + '.armazon.modelo', type: 'text' },
    { col: prefix + '_COLOR', path: group + '.armazon.color', type: 'text' },
  ];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class AppError_ extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function validationError_(issues) {
  return new AppError_('VALIDACION_INVALIDA', 'Los datos enviados no son válidos.', issues);
}

// ---------------------------------------------------------------------------
// HTTP entry points
// ---------------------------------------------------------------------------

function doGet(e) {
  const params = (e && e.parameter) || {};
  return handleRequest_({ token: params.token, action: params.action, payload: params });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: { code: 'SOLICITUD_INVALIDA', message: 'El cuerpo no es JSON válido.' } });
  }
  return handleRequest_(body || {});
}

const ACTIONS = {
  ping: actionPing_,
  list: actionList_,
  get: actionGet_,
  create: actionCreate_,
  update: actionUpdate_,
  anular: actionAnular_,
  pdf: actionPdf_,
};

function handleRequest_(request) {
  try {
    authorize_(request.token);
    const handler = Object.prototype.hasOwnProperty.call(ACTIONS, request.action) ? ACTIONS[request.action] : null;
    if (!handler) {
      throw new AppError_('ACCION_DESCONOCIDA', 'Acción no soportada: ' + String(request.action));
    }
    return json_({ ok: true, data: handler(request.payload || {}) });
  } catch (err) {
    return json_(toErrorEnvelope_(err));
  }
}

function toErrorEnvelope_(err) {
  if (err instanceof AppError_) {
    const error = { code: err.code, message: err.message };
    if (err.details) error.details = err.details;
    return { ok: false, error: error };
  }
  // Never leak internals or personal data to the client. Stack goes to Executions log only.
  console.error('Unhandled error: ' + (err && err.stack ? err.stack : err));
  return { ok: false, error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado.' } };
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function authorize_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
  if (!expected) {
    throw new AppError_('NO_CONFIGURADO', 'Falta configurar el token. Ejecutá setup() en el editor.');
  }
  if (typeof token !== 'string' || !safeEquals_(token, expected)) {
    throw new AppError_('NO_AUTORIZADO', 'Token inválido.');
  }
}

function safeEquals_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function generateToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

// ---------------------------------------------------------------------------
// Editor-only utilities (run manually from the Apps Script editor)
// ---------------------------------------------------------------------------

/** Creates or migrates the FICHAS sheet and ensures an API token exists. Safe to re-run. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  } else if (sheet.getLastColumn() >= LEGACY_COLUMN_COUNT) {
    // Sheet from before ANULADA_AT: validates the original columns and appends the new header only.
    migrateHeaders_(sheet);
  } else {
    // Existing sheet: headers must match in order; missing trailing columns are appended.
    const width = Math.max(sheet.getLastColumn(), COLUMNS.length);
    if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
    const headers = sheet.getRange(1, 1, 1, width).getValues()[0];
    COLUMNS.forEach(function (col, i) {
      const current = String(headers[i]).trim();
      if (current === '') {
        sheet.getRange(1, i + 1).setValue(col);
      } else if (current !== col) {
        throw new Error('Column ' + (i + 1) + ' should be ' + col + ' but is "' + current + '". Fix the header row manually.');
      }
    });
  }

  if (sheet.getMaxColumns() < COLUMNS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), COLUMNS.length - sheet.getMaxColumns());
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  const dataRows = sheet.getMaxRows() - 1;
  if (dataRows > 0) {
    sheet.getRange(2, 1, dataRows, COLUMNS.length).setNumberFormats(
      Array.from({ length: dataRows }, function () { return ROW_FORMATS.slice(); })
    );
  }

  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty(TOKEN_PROPERTY);
  if (!token) {
    token = generateToken_();
    props.setProperty(TOKEN_PROPERTY, token);
  }
  Logger.log('FICHAS sheet ready (' + COLUMNS.length + ' columns).');
  Logger.log('APPS_SCRIPT_TOKEN=' + token);
}

/** Replaces the API token. Update APPS_SCRIPT_TOKEN on the server afterwards. */
function rotateToken() {
  const token = generateToken_();
  PropertiesService.getScriptProperties().setProperty(TOKEN_PROPERTY, token);
  Logger.log('New APPS_SCRIPT_TOKEN=' + token);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function actionPing_() {
  const sheet = getSheet_();
  return { sheet: SHEET_NAME, rows: dataRowCount_(sheet), columns: COLUMNS.length };
}

function actionList_(payload) {
  const params = parseListParams_(payload);
  const sheet = getSheet_();
  const rowCount = dataRowCount_(sheet);

  let records = [];
  if (rowCount > 0) {
    const cols = readColumns_(sheet, rowCount, ['NRO_FICHA', 'NOMBRE', 'TEL', 'CEL', 'FECHA_ENTRADA', 'NRO_DOC', 'CREATED_AT', 'ANULADA_AT']);
    for (let i = 0; i < rowCount; i++) {
      const nroFicha = readCell_(cols.NRO_FICHA[i], FIELD_BY_COL.NRO_FICHA);
      if (nroFicha === null) continue; // skip blank or broken rows
      const record = {
        nroFicha: nroFicha,
        nombre: readCell_(cols.NOMBRE[i], FIELD_BY_COL.NOMBRE),
        tel: readCell_(cols.TEL[i], FIELD_BY_COL.TEL),
        cel: readCell_(cols.CEL[i], FIELD_BY_COL.CEL),
        fechaEntrada: readCell_(cols.FECHA_ENTRADA[i], FIELD_BY_COL.FECHA_ENTRADA),
        nroDoc: readCell_(cols.NRO_DOC[i], FIELD_BY_COL.NRO_DOC),
        createdAt: readCell_(cols.CREATED_AT[i], FIELD_BY_COL.CREATED_AT),
        anuladaAt: readCell_(cols.ANULADA_AT[i], FIELD_BY_COL.ANULADA_AT),
      };
      record.nombreKey = normalizeKey_(record.nombre);
      record.telDigits = digitsOnly_(record.tel);
      record.celDigits = digitsOnly_(record.cel);
      record.docDigits = digitsOnly_(record.nroDoc);
      records.push(record);
    }
  }

  records = records.filter(buildFilter_(params));
  records.sort(buildComparator_(params.sortBy, params.sortDir));

  const total = records.length;
  const start = (params.page - 1) * params.pageSize;
  const items = records.slice(start, start + params.pageSize).map(function (r) {
    return {
      nroFicha: r.nroFicha,
      nombre: r.nombre,
      fechaEntrada: r.fechaEntrada,
      telefono: r.cel !== '' ? r.cel : r.tel,
      fechaCarga: r.createdAt,
      anuladaAt: r.anuladaAt,
    };
  });

  return {
    items: items,
    total: total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  };
}

function actionGet_(payload) {
  const nroFicha = parseNroFicha_(payload.nroFicha);
  const sheet = getSheet_();
  const rowIndex = findRowByNro_(sheet, nroFicha);
  if (rowIndex === null) throw notFound_(nroFicha);
  return rowToFicha_(readRow_(sheet, rowIndex));
}

function actionCreate_(payload) {
  const input = isPlainObject_(payload.ficha) ? payload.ficha : payload;
  if (!isPlainObject_(input)) throw validationError_([{ path: '', message: 'Se esperaba un objeto ficha.' }]);

  // The ficha number is typed by the user: it links the digital ficha to the physical card.
  const nroFicha = parseNroFicha_(input.nroFicha);
  const values = normalizeFichaInput_(input, false);

  return withLock_(function () {
    const sheet = getSheet_();
    // findRowByNro_ also sees voided rows: a voided ficha keeps its N°.
    if (findRowByNro_(sheet, nroFicha) !== null) {
      throw new AppError_('CONFLICTO', 'Ya existe una ficha con el N° ' + nroFicha + '.', [
        { path: 'nroFicha', message: 'Número de ficha duplicado.' },
      ]);
    }
    const now = new Date().toISOString();
    const row = new Array(COLUMNS.length).fill('');
    row[COL_INDEX.NRO_FICHA] = nroFicha;
    applyValues_(row, values);
    row[COL_INDEX.CREATED_AT] = now;
    row[COL_INDEX.UPDATED_AT] = now;

    writeRow_(sheet, sheet.getLastRow() + 1, row);
    SpreadsheetApp.flush();
    return rowToFicha_(row);
  });
}

function actionUpdate_(payload) {
  const nroFicha = parseNroFicha_(payload.nroFicha);
  const patch = isPlainObject_(payload.patch) ? payload.patch : payload.ficha;
  if (!isPlainObject_(patch)) throw validationError_([{ path: 'patch', message: 'Se esperaba un objeto con los cambios.' }]);
  if (patch.nroFicha !== undefined && Number(patch.nroFicha) !== nroFicha) {
    throw validationError_([{ path: 'nroFicha', message: 'El número de ficha no se puede modificar.' }]);
  }
  const values = normalizeFichaInput_(patch, true);
  const expectedUpdatedAt = typeof payload.expectedUpdatedAt === 'string' ? payload.expectedUpdatedAt : null;

  return withLock_(function () {
    const sheet = getSheet_();
    const rowIndex = findRowByNro_(sheet, nroFicha);
    if (rowIndex === null) throw notFound_(nroFicha);

    const row = readRow_(sheet, rowIndex);
    if (isAnulada_(row)) throw new AppError_('CONFLICTO', ANULADA_MESSAGE);
    const currentUpdatedAt = readCell_(row[COL_INDEX.UPDATED_AT], FIELD_BY_COL.UPDATED_AT);
    if (expectedUpdatedAt !== null && expectedUpdatedAt !== currentUpdatedAt) {
      throw new AppError_('CONFLICTO', 'La ficha fue modificada por otra persona. Recargala antes de guardar.');
    }

    // Only the paths present in the patch are overwritten; everything else is kept.
    applyValues_(row, values);
    row[COL_INDEX.NRO_FICHA] = nroFicha;
    if (readCell_(row[COL_INDEX.CREATED_AT], FIELD_BY_COL.CREATED_AT) === '') {
      row[COL_INDEX.CREATED_AT] = new Date().toISOString();
    }
    row[COL_INDEX.UPDATED_AT] = new Date().toISOString();

    writeRow_(sheet, rowIndex, row);
    SpreadsheetApp.flush();
    return rowToFicha_(row);
  });
}

function actionAnular_(payload) {
  const nroFicha = parseNroFicha_(payload.nroFicha);
  const expectedUpdatedAt = typeof payload.expectedUpdatedAt === 'string' ? payload.expectedUpdatedAt : null;

  return withLock_(function () {
    const sheet = getSheet_();
    const rowIndex = findRowByNro_(sheet, nroFicha);
    if (rowIndex === null) throw notFound_(nroFicha);

    const row = readRow_(sheet, rowIndex);
    if (isAnulada_(row)) throw new AppError_('CONFLICTO', 'La ficha ya está anulada.');
    const currentUpdatedAt = readCell_(row[COL_INDEX.UPDATED_AT], FIELD_BY_COL.UPDATED_AT);
    if (expectedUpdatedAt !== null && expectedUpdatedAt !== currentUpdatedAt) {
      throw new AppError_('CONFLICTO', 'La ficha fue modificada por otra persona. Recargala antes de anularla.');
    }

    const now = new Date().toISOString();
    row[COL_INDEX.ANULADA_AT] = now;
    row[COL_INDEX.UPDATED_AT] = now;

    writeRow_(sheet, rowIndex, row);
    SpreadsheetApp.flush();
    return rowToFicha_(row);
  });
}

const ANULADA_MESSAGE = 'La ficha está anulada y no se puede modificar.';

function isAnulada_(row) {
  return readCell_(row[COL_INDEX.ANULADA_AT], FIELD_BY_COL.ANULADA_AT) !== '';
}

function actionPdf_(payload) {
  const ficha = actionGet_(payload);
  const fileName = 'ficha-' + ficha.nroFicha + '.pdf';
  const pdf = Utilities.newBlob(renderFichaHtml_(ficha), 'text/html', 'ficha.html')
    .getAs('application/pdf')
    .setName(fileName);
  return { fileName: fileName, mimeType: 'application/pdf', base64: Utilities.base64Encode(pdf.getBytes()) };
}

// ---------------------------------------------------------------------------
// List: params, filters, sorting
// ---------------------------------------------------------------------------

function parseListParams_(payload) {
  const issues = [];

  const page = payload.page === undefined || payload.page === '' ? 1 : Number(payload.page);
  if (!Number.isInteger(page) || page < 1) issues.push({ path: 'page', message: 'Debe ser un entero mayor o igual a 1.' });

  const pageSize = payload.pageSize === undefined || payload.pageSize === '' ? DEFAULT_PAGE_SIZE : Number(payload.pageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    issues.push({ path: 'pageSize', message: 'Debe ser un entero entre 1 y ' + MAX_PAGE_SIZE + '.' });
  }

  const sortBy = payload.sortBy ? String(payload.sortBy) : 'fechaCarga';
  if (SORT_FIELDS.indexOf(sortBy) === -1) issues.push({ path: 'sortBy', message: 'Opciones: ' + SORT_FIELDS.join(', ') + '.' });

  const defaultDir = sortBy === 'fechaCarga' || sortBy === 'fechaEntrada' ? 'desc' : 'asc';
  const sortDir = payload.sortDir ? String(payload.sortDir).toLowerCase() : defaultDir;
  if (SORT_DIRS.indexOf(sortDir) === -1) issues.push({ path: 'sortDir', message: 'Opciones: asc, desc.' });

  const q = typeof payload.q === 'string' ? payload.q.trim() : '';
  const nombre = typeof payload.nombre === 'string' ? payload.nombre.trim() : '';
  const telefono = typeof payload.telefono === 'string' ? digitsOnly_(payload.telefono) : '';
  if (typeof payload.telefono === 'string' && payload.telefono.trim() !== '' && telefono.length < MIN_PHONE_SEARCH_DIGITS) {
    issues.push({ path: 'telefono', message: 'Ingresá al menos ' + MIN_PHONE_SEARCH_DIGITS + ' dígitos.' });
  }

  if (issues.length) throw validationError_(issues);
  const incluirAnuladas = payload.incluirAnuladas === true || payload.incluirAnuladas === 'true';

  return {
    page: page, pageSize: pageSize, sortBy: sortBy, sortDir: sortDir, q: q, nombre: nombre, telefono: telefono,
    incluirAnuladas: incluirAnuladas,
  };
}

function buildFilter_(params) {
  const nombreTokens = normalizeKey_(params.nombre).split(' ').filter(Boolean);
  const qKey = normalizeKey_(params.q);
  const qTokens = qKey.split(' ').filter(Boolean);
  const qDigits = digitsOnly_(params.q);
  const qNumber = /^\d+$/.test(params.q) ? Number(params.q) : null;

  return function (r) {
    // Voided fichas are hidden unless explicitly requested.
    if (!params.incluirAnuladas && r.anuladaAt !== '') return false;

    // nombre: every word must appear (accent/case insensitive). "perez juan" matches "Juan Pérez".
    if (nombreTokens.length && !nombreTokens.every(function (t) { return r.nombreKey.indexOf(t) !== -1; })) return false;

    // telefono: digits-only match against TEL or CEL.
    if (params.telefono && r.telDigits.indexOf(params.telefono) === -1 && r.celDigits.indexOf(params.telefono) === -1) return false;

    // q: free search by N° ficha (exact), nombre, telefono/celular or documento.
    if (qKey) {
      const byNumber = qNumber !== null && r.nroFicha === qNumber;
      const byName = qTokens.length > 0 && qTokens.every(function (t) { return r.nombreKey.indexOf(t) !== -1; });
      const byDigits = qDigits.length >= MIN_PHONE_SEARCH_DIGITS && (
        r.telDigits.indexOf(qDigits) !== -1 || r.celDigits.indexOf(qDigits) !== -1 || r.docDigits.indexOf(qDigits) !== -1
      );
      if (!byNumber && !byName && !byDigits) return false;
    }
    return true;
  };
}

function buildComparator_(sortBy, sortDir) {
  const sign = sortDir === 'desc' ? -1 : 1;
  const keyOf = {
    fechaCarga: function (r) { return r.createdAt; },
    fechaEntrada: function (r) { return r.fechaEntrada; },
    nombre: function (r) { return r.nombreKey; },
  }[sortBy];

  return function (a, b) {
    let result;
    if (sortBy === 'nroFicha') {
      result = (a.nroFicha - b.nroFicha) * sign;
    } else {
      result = compareEmptyLast_(keyOf(a), keyOf(b), sign);
    }
    return result !== 0 ? result : a.nroFicha - b.nroFicha; // stable tie-breaker
  };
}

/** Empty values always go to the end, regardless of the direction. */
function compareEmptyLast_(a, b, sign) {
  if (a === b) return 0;
  if (a === '') return 1;
  if (b === '') return -1;
  return (a < b ? -1 : 1) * sign;
}

// ---------------------------------------------------------------------------
// Input normalization / validation
// ---------------------------------------------------------------------------

function parseNroFicha_(raw) {
  const n = typeof raw === 'string' ? Number(raw.trim()) : raw;
  if (raw === undefined || raw === null || raw === '' || typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_NRO_FICHA) {
    throw validationError_([{ path: 'nroFicha', message: 'El N° de ficha es obligatorio y debe ser un entero positivo.' }]);
  }
  return n;
}

/**
 * Returns a map { path: normalizedValue }.
 * partial=false (create): missing fields get their empty default.
 * partial=true  (update): missing fields are omitted so they are NOT overwritten.
 */
function normalizeFichaInput_(input, partial) {
  const issues = [];
  const values = {};
  EDITABLE_FIELDS.forEach(function (field) {
    const raw = getPath_(input, field.path);
    if (raw === undefined) {
      if (!partial) values[field.path] = defaultFor_(field);
      return;
    }
    const result = normalizeValue_(raw, field);
    if (result.error) issues.push({ path: field.path, message: result.error });
    else values[field.path] = result.value;
  });
  if (issues.length) throw validationError_(issues);
  return values;
}

function normalizeValue_(raw, field) {
  if (raw === null) return { value: defaultFor_(field) };

  switch (field.type) {
    case 'text': {
      if (typeof raw !== 'string' && typeof raw !== 'number') return { error: 'Debe ser texto.' };
      const text = cleanText_(String(raw));
      if (text.length > MAX_TEXT_LENGTH) return { error: 'Máximo ' + MAX_TEXT_LENGTH + ' caracteres.' };
      return { value: text };
    }
    case 'date': {
      if (typeof raw !== 'string') return { error: 'Debe ser una fecha con formato AAAA-MM-DD.' };
      const date = raw.trim();
      if (date !== '' && !isIsoDate_(date)) return { error: 'Fecha inválida. Formato esperado AAAA-MM-DD.' };
      return { value: date };
    }
    case 'enum': {
      if (typeof raw !== 'string') return { error: 'Valor inválido.' };
      const value = raw.trim().toUpperCase();
      if (field.values.indexOf(value) === -1) {
        return { error: 'Valor inválido. Opciones: ' + field.values.filter(Boolean).join(', ') + ' o vacío.' };
      }
      return { value: value };
    }
    case 'amount': {
      const amount = parseAmount_(raw);
      if (amount === null) return { error: 'Debe ser un importe numérico.' };
      if (amount < 0) return { error: 'No puede ser negativo.' };
      return { value: Math.round(amount * 100) / 100 };
    }
    default:
      return { error: 'Campo no editable.' };
  }
}

function defaultFor_(field) {
  return field.type === 'amount' ? 0 : '';
}

/** Removes control characters (keeps line breaks) and trims. */
function cleanText_(text) {
  return text.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ').trim();
}

function isIsoDate_(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Accepts numbers and strings like "45000", "45.000", "45.000,50", "45000,5", "45,000.50", "$ 45.000". */
function parseAmount_(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const s = raw.replace(/\$/g, '').replace(/\s/g, '');
  if (s === '') return 0;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.')); // es-AR
  if (/^\d+,\d+$/.test(s)) return Number(s.replace(',', '.'));
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, '')); // en-US
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return null;
}

// ---------------------------------------------------------------------------
// Row <-> Ficha mapping
// ---------------------------------------------------------------------------

function rowToFicha_(row) {
  const ficha = {};
  FIELDS.forEach(function (field) {
    setPath_(ficha, field.path, readCell_(row[COL_INDEX[field.col]], field));
  });
  return ficha;
}

function applyValues_(row, values) {
  EDITABLE_FIELDS.forEach(function (field) {
    if (Object.prototype.hasOwnProperty.call(values, field.path)) {
      row[COL_INDEX[field.col]] = writeCell_(values[field.path], field);
    }
  });
}

function readCell_(value, field) {
  switch (field.type) {
    case 'id': {
      const n = typeof value === 'number' ? value : Number(String(value).trim());
      return String(value).trim() !== '' && Number.isInteger(n) && n > 0 ? n : null;
    }
    case 'amount': {
      if (typeof value === 'number') return value;
      const parsed = parseAmount_(String(value));
      return parsed === null ? 0 : parsed;
    }
    case 'date':
      if (value instanceof Date) return Utilities.formatDate(value, TIMEZONE, 'yyyy-MM-dd');
      return String(value).trim();
    case 'meta':
      if (value instanceof Date) return value.toISOString();
      return String(value).trim();
    case 'enum': {
      const v = String(value).trim().toUpperCase();
      return field.values.indexOf(v) !== -1 ? v : '';
    }
    default: {
      if (value instanceof Date) return Utilities.formatDate(value, TIMEZONE, 'dd/MM/yyyy');
      return unescapeFormula_(String(value));
    }
  }
}

function writeCell_(value, field) {
  if (field.type === 'amount') return value;
  return escapeFormula_(String(value));
}

/** Formula-injection guard: text starting with = + - @ is stored as a literal. */
function escapeFormula_(text) {
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

/** Safety net in case the sheet keeps the leading apostrophe as a literal character. */
function unescapeFormula_(text) {
  return /^'[=+\-@]/.test(text) ? text.slice(1) : text;
}

// ---------------------------------------------------------------------------
// Sheet access
// ---------------------------------------------------------------------------

function getSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new AppError_('ALMACENAMIENTO_NO_DISPONIBLE', 'No existe la hoja ' + SHEET_NAME + '. Ejecutá setup().');
  assertHeaders_(sheet);
  return sheet;
}

function assertHeaders_(sheet) {
  if (sheet.getLastColumn() < LEGACY_COLUMN_COUNT) {
    throw new AppError_('ESQUEMA_INVALIDO', 'La hoja no tiene todas las columnas esperadas. Ejecutá setup().');
  }
  migrateHeaders_(sheet);
}

/**
 * Validates the headers and adds the ones introduced after the original schema (ANULADA_AT) when they
 * are blank. Only the header cell is written: existing rows and columns are never moved, and the
 * operation is idempotent, so it is safe on every request and under concurrent calls.
 */
function migrateHeaders_(sheet) {
  if (sheet.getMaxColumns() < COLUMNS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), COLUMNS.length - sheet.getMaxColumns());
  }
  const headers = sheet.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
  for (let i = 0; i < COLUMNS.length; i++) {
    const current = String(headers[i]).trim();
    if (current === COLUMNS[i]) continue;
    if (current === '' && i >= LEGACY_COLUMN_COUNT) {
      sheet.getRange(1, i + 1).setValue(COLUMNS[i]).setFontWeight('bold');
      const dataRows = sheet.getMaxRows() - 1;
      if (dataRows > 0) sheet.getRange(2, i + 1, dataRows, 1).setNumberFormat(ROW_FORMATS[i]);
      continue;
    }
    throw new AppError_('ESQUEMA_INVALIDO', 'La columna ' + (i + 1) + ' debería ser ' + COLUMNS[i] + '.');
  }
}

function dataRowCount_(sheet) {
  return Math.max(sheet.getLastRow() - 1, 0);
}

/** Returns the 1-based sheet row for a NRO_FICHA, or null. One batch read of column A. */
function findRowByNro_(sheet, nroFicha) {
  const rowCount = dataRowCount_(sheet);
  if (rowCount === 0) return null;
  const ids = sheet.getRange(2, COL_INDEX.NRO_FICHA + 1, rowCount, 1).getValues();
  let found = null;
  for (let i = 0; i < ids.length; i++) {
    if (readCell_(ids[i][0], FIELD_BY_COL.NRO_FICHA) === nroFicha) {
      if (found !== null) {
        throw new AppError_('DATOS_INCONSISTENTES', 'El N° de ficha ' + nroFicha + ' está repetido en la hoja. Corregilo manualmente.');
      }
      found = i + 2;
    }
  }
  return found;
}

function readRow_(sheet, rowIndex) {
  return sheet.getRange(rowIndex, 1, 1, COLUMNS.length).getValues()[0];
}

function writeRow_(sheet, rowIndex, row) {
  const range = sheet.getRange(rowIndex, 1, 1, COLUMNS.length);
  range.setNumberFormats([ROW_FORMATS]); // text stays text even on newly appended rows
  range.setValues([row]);
}

/** Reads only the requested columns, one getRange per contiguous block. */
function readColumns_(sheet, rowCount, colNames) {
  const indexes = colNames.map(function (c) { return COL_INDEX[c]; }).sort(function (a, b) { return a - b; });
  const result = {};
  let start = 0;
  while (start < indexes.length) {
    let end = start;
    while (end + 1 < indexes.length && indexes[end + 1] === indexes[end] + 1) end++;
    const first = indexes[start];
    const block = sheet.getRange(2, first + 1, rowCount, indexes[end] - first + 1).getValues();
    for (let i = start; i <= end; i++) {
      const offset = indexes[i] - first;
      result[COLUMNS[indexes[i]]] = block.map(function (r) { return r[offset]; });
    }
    start = end + 1;
  }
  return result;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    throw new AppError_('ALMACENAMIENTO_NO_DISPONIBLE', 'El sistema está ocupado. Reintentá en unos segundos.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function notFound_(nroFicha) {
  return new AppError_('NO_ENCONTRADO', 'No se encontró la ficha ' + nroFicha + '.');
}

// ---------------------------------------------------------------------------
// PDF rendering (HTML -> PDF, table-based layout for the converter)
// ---------------------------------------------------------------------------

function renderFichaHtml_(f) {
  const cell = function (label, value, span) {
    return '<td' + (span ? ' colspan="' + span + '"' : '') + '><span class="label">' + esc_(label) +
      '</span> <span class="value">' + esc_(value) + '</span></td>';
  };

  const identificacion =
    '<table class="box">' +
      '<tr>' + cell('Nombre:', f.nombre, 3) + cell('Edad:', f.edad) + '</tr>' +
      '<tr>' + cell('Domicilio:', f.domicilio, 2) + cell('Tel:', f.tel) + cell('Cel:', f.cel) + '</tr>' +
      '<tr>' + cell('Fecha de entrada:', isoToDisplay_(f.fechaEntrada), 4) + '</tr>' +
    '</table>';

  const receta =
    '<table class="box"><tr>' +
      cell('Receta fecha:', isoToDisplay_(f.recetaFecha)) + cell('Dr/a:', f.recetaDr) +
    '</tr></table>';

  const medidas =
    '<table class="grid">' +
      '<tr><th></th><th>OD</th><th>OI</th></tr>' +
      medidaRow_('DIL', f.medidas.dilOd, f.medidas.dilOi) +
      medidaRow_('DIC', f.medidas.dicOd, f.medidas.dicOi) +
      medidaRow_('Alt. Bif.', f.medidas.altBifOd, f.medidas.altBifOi) +
      medidaRow_('Alt. Prog.', f.medidas.altProgOd, f.medidas.altProgOi) +
      medidaRow_('Alt. Centro', f.medidas.altCentroOd, f.medidas.altCentroOi) +
    '</table>' +
    '<p class="checks">' + check_(f.tipoLente, 'BIFOCAL', 'Bifocal') + '&nbsp;&nbsp;&nbsp;' +
      check_(f.tipoLente, 'PROGRESIVO', 'Progresivo') + '</p>';

  const e = f.economico;
  const c = f.cobertura;
  const dorso =
    '<table class="box">' +
      '<tr>' + cell('Armazón lejos:', money_(e.precioArmazonLejos)) + cell('Cristales lejos:', money_(e.precioCristalesLejos)) +
        cell('Obra social:', c.obraSocial) + '</tr>' +
      '<tr>' + cell('Armazón cerca:', money_(e.precioArmazonCerca)) + cell('Cristales cerca:', money_(e.precioCristalesCerca)) +
        cell('N° carnet:', c.nroCarnet) + '</tr>' +
      '<tr>' + cell('Adicionales:', e.adicionales, 2) + cell('N° documento:', c.nroDoc) + '</tr>' +
      '<tr>' + cell('Total:', money_(e.precioTotal)) + cell('Seña:', money_(e.sena)) + cell('Forma de pago:', c.formaPago) + '</tr>' +
      '<tr>' + cell('Saldo:', money_(e.saldo), 3) + '</tr>' +
    '</table>';

  const generated = Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy HH:mm');

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: A4 landscape; margin: 12mm; }' +
    'body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; }' +
    'h1 { font-size: 14pt; margin: 0 0 6px 0; }' +
    'h2 { font-size: 10pt; margin: 10px 0 4px 0; text-transform: uppercase; color: #0f5f5c; }' +
    '.header td { vertical-align: top; }' +
    '.nro { font-size: 20pt; font-weight: bold; text-align: right; }' +
    'table { border-collapse: collapse; width: 100%; }' +
    '.box td { border-bottom: 1px solid #999; padding: 4px 6px; }' +
    '.grid th, .grid td { border: 1px solid #999; padding: 3px 6px; text-align: center; }' +
    '.grid th { background: #eef5f4; }' +
    '.label { color: #555; }' +
    '.value { font-weight: bold; }' +
    '.checks { margin: 4px 0; }' +
    '.layout > tbody > tr > td, .layout > tr > td { vertical-align: top; padding-right: 12px; }' +
    '.footer { margin-top: 12px; font-size: 8pt; color: #777; }' +
    '</style></head><body>' +
    '<table class="header"><tr><td><h1>Ficha óptica</h1></td><td class="nro">N° ' + esc_(f.nroFicha) + '</td></tr></table>' +
    '<h2>Identificación</h2>' + identificacion +
    '<table class="layout"><tr>' +
      '<td style="width:65%">' +
        '<h2>Receta</h2>' + receta +
        '<h2>Lejos</h2>' + graduacionHtml_(f.lejos) +
        '<h2>Cerca</h2>' + graduacionHtml_(f.cerca) +
      '</td>' +
      '<td style="width:35%"><h2>Medidas</h2>' + medidas + '</td>' +
    '</tr></table>' +
    '<h2>Económico y cobertura</h2>' + dorso +
    '<p class="footer">Generado el ' + esc_(generated) + '</p>' +
    '</body></html>';
}

function graduacionHtml_(group) {
  const eyeRow = function (label, eye) {
    return '<tr><th>' + label + '</th><td>' + esc_(eye.esf) + '</td><td>' + esc_(eye.cil) + '</td><td>' + esc_(eye.eje) + '</td></tr>';
  };
  const a = group.armazon;
  return '<table class="grid">' +
      '<tr><th></th><th>ESF</th><th>CIL</th><th>EJE</th></tr>' +
      eyeRow('OD', group.od) + eyeRow('OI', group.oi) +
    '</table>' +
    '<p class="checks">' +
      check_(a.material, 'MINERAL', 'Mineral') + '&nbsp;&nbsp;' + check_(a.material, 'ORGANICO', 'Orgánico') +
      '&nbsp;&nbsp;|&nbsp;&nbsp;' +
      check_(a.origen, 'STOCK', 'Stock') + '&nbsp;&nbsp;' + check_(a.origen, 'LABORATORIO', 'Laboratorio') +
    '</p>' +
    '<p class="checks"><span class="label">Armazón:</span> <span class="value">' + esc_(a.armazon) + '</span>' +
      '&nbsp;&nbsp;<span class="label">Modelo:</span> <span class="value">' + esc_(a.modelo) + '</span>' +
      '&nbsp;&nbsp;<span class="label">Color:</span> <span class="value">' + esc_(a.color) + '</span></p>';
}

function medidaRow_(label, od, oi) {
  return '<tr><th>' + esc_(label) + '</th><td>' + esc_(od) + '</td><td>' + esc_(oi) + '</td></tr>';
}

function check_(current, value, label) {
  return (current === value ? '[X] ' : '[&nbsp;&nbsp;] ') + esc_(label);
}

function money_(amount) {
  return '$ ' + formatNumberEsAr_(Number(amount) || 0);
}

function formatNumberEsAr_(n) {
  const rounded = Math.round(n * 100) / 100;
  const parts = Math.abs(rounded).toFixed(Number.isInteger(rounded) ? 0 : 2).split('.');
  const integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (rounded < 0 ? '-' : '') + integer + (parts[1] ? ',' + parts[1] : '');
}

function isoToDisplay_(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return match ? match[3] + '/' + match[2] + '/' + match[1] : '';
}

function esc_(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function isPlainObject_(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getPath_(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    if (!isPlainObject_(current)) return undefined;
    current = current[keys[i]];
  }
  return current;
}

function setPath_(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!isPlainObject_(current[keys[i]])) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function normalizeKey_(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function digitsOnly_(text) {
  return String(text || '').replace(/\D/g, '');
}
```
