/**
 * Pure normalizers used by Ficha schemas and forms.
 *
 * These are intentionally separate from the schema so we can unit-test them
 * directly and reuse them anywhere (UI, server, future Sheets adapter).
 *
 * Rules in scope (from the spec PDF):
 *   - Preserve the sign of graduations (`+1.00`, `-0.50`).
 *   - Strip `$` and locale separators from imported amounts.
 *   - Keep phone numbers, IDs and membership numbers as `string`.
 *   - Parse free-text dates into ISO `YYYY-MM-DD`.
 *
 * Each public function either returns a normalized value or throws a
 * `NormalizerError` so the caller can map the failure to a friendly
 * field-level message without leaking parser internals.
 */

const MONTHS_ES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

export class NormalizerError extends Error {
  public readonly field: string;
  public readonly raw: string;
  public readonly code: string;

  public constructor(field: string, raw: string, code: string, message: string) {
    super(message);
    this.name = "NormalizerError";
    this.field = field;
    this.raw = raw;
    this.code = code;
  }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isBlank(input: string): boolean {
  return input.trim() === "";
}

// ---------------------------------------------------------------------------
// Graduaciones
// ---------------------------------------------------------------------------

const GRADUATION_PATTERN = /^[+-]?\d+(?:[.,]\d+)?$/;

/**
 * Normalizes a graduation string to canonical `+1.00` / `-0.50` / `+0.00`.
 * Comma decimal separator (`-0,25`) is converted to dot. Empty input → `""`.
 * Throws `NormalizerError` when the input looks like a value but is malformed.
 */
export function normalizeGraduacion(input: string): string {
  if (isBlank(input)) return "";
  const trimmed = input.trim().replace(/\s+/g, "");
  if (!GRADUATION_PATTERN.test(trimmed)) {
    throw new NormalizerError(
      "graduacion",
      input,
      "GRADUACION_INVALIDA",
      `La graduación "${input}" no es válida. Use el formato +1.00 o -0.50.`,
    );
  }
  const sign = trimmed.startsWith("-") ? "-" : "+";
  const numeric = trimmed.replace(/^[+-]/, "").replace(",", ".");
  const asNumber = Number(numeric);
  if (Number.isNaN(asNumber)) {
    throw new NormalizerError(
      "graduacion",
      input,
      "GRADUACION_INVALIDA",
      `La graduación "${input}" no es válida.`,
    );
  }
  return `${sign}${asNumber.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

function buildIso(year: number, month: number, day: number): string {
  if (month < 1 || month > 12) {
    throw new NormalizerError(
      "fecha",
      `${year}-${month}-${day}`,
      "FECHA_INVALIDA",
      `El mes "${month}" no es válido.`,
    );
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    throw new NormalizerError(
      "fecha",
      `${year}-${month}-${day}`,
      "FECHA_INVALIDA",
      `El día "${day}" no es válido para el mes indicado.`,
    );
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function expandTwoDigitYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

/**
 * Parses free-text dates into ISO `YYYY-MM-DD`. Accepts:
 *   - "2026-09-29" / "2026/09/29"
 *   - "29/09/2026" / "29-9-2026" / "29.9.26"
 *   - "29 de septiembre de 2026" (es-ES/es-AR long form)
 *
 * Returns `""` for empty or whitespace input. Throws `NormalizerError` when
 * the input looks like a date but is structurally invalid.
 */
export function parseFecha(input: string): string {
  if (isBlank(input)) return "";
  const trimmed = input.trim();

  // ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return buildIso(year, month, day);
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YY/YYYY (es-AR)
  const dmyMatch = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(trimmed);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = expandTwoDigitYear(Number(dmyMatch[3]));
    return buildIso(year, month, day);
  }

  // "29 de septiembre de 2026" (es long form)
  const longMatch = /^(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+de\s+(\d{4}))?$/i.exec(trimmed);
  if (longMatch) {
    const day = Number(longMatch[1]);
    const monthName = (longMatch[2] ?? "").toLowerCase();
    const month = MONTHS_ES[monthName];
    if (month === undefined) {
      throw new NormalizerError(
        "fecha",
        input,
        "FECHA_INVALIDA",
        `El mes "${monthName}" no se reconoce.`,
      );
    }
    const year = longMatch[3] ? Number(longMatch[3]) : new Date().getFullYear();
    return buildIso(year, month, day);
  }

  throw new NormalizerError(
    "fecha",
    input,
    "FECHA_INVALIDA",
    `La fecha "${input}" no tiene un formato reconocido (use DD/MM/AAAA o YYYY-MM-DD).`,
  );
}

/**
 * Same as `parseFecha` but never throws: returns `""` for invalid input.
 * Useful for form-driven contexts where the user is still typing and a
 * partial/invalid value should clear the stored date rather than 400 the
 * whole request.
 */
export function parseFechaLenient(input: string): string {
  try {
    return parseFecha(input);
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Importes
// ---------------------------------------------------------------------------

/**
 * Parses a money string into a `number`.
 *
 * Accepts es-AR locale (`"1.234,56"`, `"$ 1.234,56"`) and en-US (`"1234.56"`).
 * Returns `0` for empty/whitespace input. Throws `NormalizerError` for
 * non-numeric input.
 */
export function parseImporte(input: string | number): number {
  if (typeof input === "number") {
    if (Number.isNaN(input)) {
      throw new NormalizerError("importe", String(input), "IMPORTE_INVALIDO", "Importe inválido.");
    }
    return input;
  }
  if (isBlank(input)) return 0;
  let cleaned = input.trim().replace(/\$/g, "").replace(/\s+/g, "");

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    // es-AR: dots are thousands, comma is decimal.
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // Only comma: could be es-AR decimal or thousands. Heuristic: if exactly
    // three digits follow the comma, treat as thousands; otherwise decimal.
    const [, after] = cleaned.split(",");
    if (after !== undefined && after.length === 3 && /^\d{3}$/.test(after)) {
      cleaned = cleaned.replace(",", "");
    } else {
      cleaned = cleaned.replace(",", ".");
    }
  }
  // Only dot or none: leave as-is (en-US style).

  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new NormalizerError(
      "importe",
      input,
      "IMPORTE_INVALIDO",
      `El importe "${input}" no es un número válido.`,
    );
  }
  const value = Number(cleaned);
  if (Number.isNaN(value)) {
    throw new NormalizerError(
      "importe",
      input,
      "IMPORTE_INVALIDO",
      `El importe "${input}" no es un número válido.`,
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Teléfonos y documentos
// ---------------------------------------------------------------------------

/**
 * Normalizes a phone number string. Keeps a leading `+`, removes inner spaces
 * and dashes. Returns `""` for blank input.
 */
export function parseTelefono(input: string): string {
  if (isBlank(input)) return "";
  let trimmed = input.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  trimmed = trimmed.replace(/[\s-]/g, "");
  if (hasLeadingPlus && !trimmed.startsWith("+")) {
    trimmed = `+${trimmed}`;
  }
  return trimmed;
}

/**
 * Trims a document/ID string and preserves internal dots, spaces and dashes.
 * Returns `""` for blank input.
 */
export function parseDocumento(input: string): string {
  if (isBlank(input)) return "";
  return input.trim();
}
