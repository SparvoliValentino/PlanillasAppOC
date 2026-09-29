/**
 * Pure helpers used by `DateInput`. Extracted so they can be unit-tested
 * without bringing up a React DOM. The component owns the input/keyboard
 * concerns; this module owns the "raw user input → display + ISO" mapping.
 */

import { parseFecha } from "../domain/normalizers";

const ISO_REGEX = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
const DMY_REGEX = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/;

function pad2(value: string): string {
  return value.length === 1 ? `0${value}` : value;
}

function expandYear(year: string): string {
  return year.length === 2 ? `20${year}` : year;
}

function safeIso(yyyy: string, mm: string, dd: string): string {
  try {
    return parseFecha(`${yyyy}-${mm}-${dd}`);
  } catch {
    return "";
  }
}

export interface ParseResult {
  /** Canonical `DD/MM/AAAA`, or partial `D…`/`DD/MM…` while typing. */
  display: string;
  /** ISO `YYYY-MM-DD`. Empty when the date is partial or invalid. */
  iso: string;
}

/**
 * Normalize anything the user might type or paste into a `DD/MM/AAAA`
 * display plus a canonical ISO string when enough digits are present.
 *
 *   "2"          → { display: "2",          iso: "" }
 *   "29"         → { display: "29",         iso: "" }
 *   "2909"       → { display: "29/09",      iso: "" }
 *   "29092026"   → { display: "29/09/2026", iso: "2026-09-29" }
 *   "29/09/2026" → { display: "29/09/2026", iso: "2026-09-29" }
 *   "2026-09-29" → { display: "29/09/2026", iso: "2026-09-29" }
 *   "31/02/2026" → { display: "31/02/2026", iso: "" }
 */
export function parseAny(rawInput: string): ParseResult {
  const trimmed = rawInput.trim();
  if (trimmed === "") return { display: "", iso: "" };

  const isoMatch = ISO_REGEX.exec(trimmed);
  if (isoMatch) {
    const yyyy = isoMatch[1]!;
    const mm = pad2(isoMatch[2]!);
    const dd = pad2(isoMatch[3]!);
    return { display: `${dd}/${mm}/${yyyy}`, iso: safeIso(yyyy, mm, dd) };
  }

  const dmyMatch = DMY_REGEX.exec(trimmed);
  if (dmyMatch) {
    const dd = pad2(dmyMatch[1]!);
    const mm = pad2(dmyMatch[2]!);
    const yyyy = expandYear(dmyMatch[3]!);
    return { display: `${dd}/${mm}/${yyyy}`, iso: safeIso(yyyy, mm, dd) };
  }

  const digits = trimmed.replace(/\D/g, "").slice(0, 8);
  if (digits.length === 0) return { display: "", iso: "" };
  if (digits.length <= 2) return { display: digits, iso: "" };
  if (digits.length <= 4) {
    return { display: `${digits.slice(0, 2)}/${digits.slice(2)}`, iso: "" };
  }
  // 5–7 digits: partial year — never emit ISO, otherwise a 5-digit
  // input like "29092" would round-trip through `parseFecha`'s DMY regex
  // (which expands "29" → "2029") and silently commit a wrong date.
  if (digits.length < 8) {
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4);
    return { display: `${dd}/${mm}/${yyyy}`, iso: "" };
  }
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4);
  return { display: `${dd}/${mm}/${yyyy}`, iso: safeIso(yyyy, mm, dd) };
}

export function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  if (!/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m) || !/^\d{1,2}$/.test(d)) return "";
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}
