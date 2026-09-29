/**
 * Stable Google Sheets column order for the `FICHAS` sheet.
 *
 * Source of truth: PDF "Optica_App_Contexto_IA_Codigo_v1.pdf", Anexo B
 * (Esquema de columnas propuesto). This order is the contract that any
 * future Apps Script adapter MUST respect: changing the order here is a
 * schema migration and must be coordinated.
 *
 * The list below matches the PDF exactly. New columns are added through
 * a controlled migration; field removal is forbidden in V1.
 */

export const FICHA_COLUMN_ORDER: readonly string[] = [
  // Identificacion
  "NRO_FICHA",
  "NOMBRE",
  "EDAD",
  "DOMICILIO",
  "TEL",
  "CEL",
  "FECHA_ENTRADA",
  // Receta
  "RECETA_FECHA",
  "RECETA_DR",
  // Lejos
  "LEJOS_OD_ESF",
  "LEJOS_OD_CIL",
  "LEJOS_OD_EJE",
  "LEJOS_OI_ESF",
  "LEJOS_OI_CIL",
  "LEJOS_OI_EJE",
  "LEJOS_MATERIAL",
  "LEJOS_ORIGEN",
  "LEJOS_ARMAZON",
  "LEJOS_MODELO",
  "LEJOS_COLOR",
  // Cerca
  "CERCA_OD_ESF",
  "CERCA_OD_CIL",
  "CERCA_OD_EJE",
  "CERCA_OI_ESF",
  "CERCA_OI_CIL",
  "CERCA_OI_EJE",
  "CERCA_MATERIAL",
  "CERCA_ORIGEN",
  "CERCA_ARMAZON",
  "CERCA_MODELO",
  "CERCA_COLOR",
  // Medidas
  "DIL_OD",
  "DIL_OI",
  "DIC_OD",
  "DIC_OI",
  "ALT_BIF_OD",
  "ALT_BIF_OI",
  "ALT_PROG_OD",
  "ALT_PROG_OI",
  "ALT_CENTRO_OD",
  "ALT_CENTRO_OI",
  // Tipo de lente
  "TIPO_LENTE",
  // Economico
  "PRECIO_ARMAZON_LEJOS",
  "PRECIO_CRISTALES_LEJOS",
  "PRECIO_ARMAZON_CERCA",
  "PRECIO_CRISTALES_CERCA",
  "ADICIONALES",
  "PRECIO_TOTAL",
  "SENA",
  "SALDO",
  // Cobertura y pago
  "OBRA_SOCIAL",
  "NRO_CARNET",
  "NRO_DOC",
  "FORMA_PAGO",
] as const;

/**
 * Set view of `FICHA_COLUMN_ORDER` for O(1) membership checks.
 */
export const FICHA_COLUMNS: ReadonlySet<string> = new Set(FICHA_COLUMN_ORDER);
