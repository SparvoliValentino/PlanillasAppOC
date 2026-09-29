/**
 * es-AR date formatter used by the listings UI. The ficha itself shows
 * ISO dates verbatim (the paper field underline displays whatever the
 * ficha stored); only the listado benefits from a human-readable form.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(iso: string): string {
  if (!iso) return "";
  const [yearStr, monthStr, dayStr] = iso.split("-");
  if (!yearStr || !monthStr || !dayStr) return iso;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return iso;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return iso;
  return DATE_FORMATTER.format(date);
}
