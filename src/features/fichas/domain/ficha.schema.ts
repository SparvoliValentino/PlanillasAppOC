/**
 * Single source of truth for Ficha validation.
 *
 * Both the API routes and the UI forms import these schemas, so any rule
 * change lives in exactly one place. The schema applies the domain
 * normalizers (graduations, dates, amounts) at parse time so consumers
 * receive canonical values.
 *
 * Default values match `emptyFichaValues()` so that partial inputs from
 * forms in progress still parse cleanly.
 */

import { z } from "zod";
import {
  normalizeGraduacion,
  parseDocumento,
  parseFechaLenient,
  parseImporte,
  parseTelefono,
} from "./normalizers";
import { FICHA_SORT_FIELDS, SORT_DIRECTIONS } from "./ficha.types";
import type { FichaSortField, ListFichasParams, SortDirection } from "./ficha.types";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const trimmedString = z
  .string()
  .transform((value) => value.trim());

const defaultString = trimmedString.default("");

const graduacionSchema = z
  .string()
  .transform((value, ctx) => {
    try {
      return normalizeGraduacion(value);
    } catch (error) {
      if (error instanceof Error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error.message,
        });
        return z.NEVER;
      }
      throw error;
    }
  })
  .default("");

const fechaSchema = z
  .string()
  .transform((value) => parseFechaLenient(value))
  .default("");

const importeSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    try {
      return parseImporte(value);
    } catch (error) {
      if (error instanceof Error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error.message,
        });
        return z.NEVER;
      }
      throw error;
    }
  })
  .pipe(z.number().finite().nonnegative())
  .default(0);

const telefonoSchema = z.string().transform(parseTelefono).default("");

const documentoSchema = z.string().transform(parseDocumento).default("");

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

const tipoLenteSchema = z.enum(["", "BIFOCAL", "PROGRESIVO"]).default("");
const materialSchema = z.enum(["", "MINERAL", "ORGANICO"]).default("");
const origenSchema = z.enum(["", "STOCK", "LABORATORIO"]).default("");

// ---------------------------------------------------------------------------
// Grouped shapes (with defaults so partial forms parse cleanly)
// ---------------------------------------------------------------------------

const ojoGraduacionSchema = z
  .object({
    esf: graduacionSchema,
    cil: graduacionSchema,
    eje: defaultString,
  })
  .default({ esf: "", cil: "", eje: "" });

const ojoArmazonSchema = z
  .object({
    material: materialSchema,
    origen: origenSchema,
    armazon: defaultString,
    modelo: defaultString,
    color: defaultString,
  })
  .default({ material: "", origen: "", armazon: "", modelo: "", color: "" });

const medidasSchema = z
  .object({
    dilOd: defaultString,
    dilOi: defaultString,
    dicOd: defaultString,
    dicOi: defaultString,
    altBifOd: defaultString,
    altBifOi: defaultString,
    altProgOd: defaultString,
    altProgOi: defaultString,
    altCentroOd: defaultString,
    altCentroOi: defaultString,
  })
  .default({
    dilOd: "",
    dilOi: "",
    dicOd: "",
    dicOi: "",
    altBifOd: "",
    altBifOi: "",
    altProgOd: "",
    altProgOi: "",
    altCentroOd: "",
    altCentroOi: "",
  });

const economicoSchema = z
  .object({
    precioArmazonLejos: importeSchema,
    precioCristalesLejos: importeSchema,
    precioArmazonCerca: importeSchema,
    precioCristalesCerca: importeSchema,
    adicionales: defaultString,
    precioTotal: importeSchema,
    sena: importeSchema,
    saldo: importeSchema,
  })
  .default({
    precioArmazonLejos: 0,
    precioCristalesLejos: 0,
    precioArmazonCerca: 0,
    precioCristalesCerca: 0,
    adicionales: "",
    precioTotal: 0,
    sena: 0,
    saldo: 0,
  });

const coberturaSchema = z
  .object({
    obraSocial: defaultString,
    nroCarnet: documentoSchema,
    nroDoc: documentoSchema,
    formaPago: defaultString,
  })
  .default({ obraSocial: "", nroCarnet: "", nroDoc: "", formaPago: "" });

const ojoLadoSchema = z
  .object({
    od: ojoGraduacionSchema,
    oi: ojoGraduacionSchema,
    armazon: ojoArmazonSchema,
  })
  .default({
    od: { esf: "", cil: "", eje: "" },
    oi: { esf: "", cil: "", eje: "" },
    armazon: { material: "", origen: "", armazon: "", modelo: "", color: "" },
  });

// ---------------------------------------------------------------------------
// Public schemas
// ---------------------------------------------------------------------------

const nroFichaSchema = z
  .number({
    required_error: "El N° de ficha es obligatorio.",
    invalid_type_error: "El N° de ficha debe ser un número.",
  })
  .int("El N° de ficha debe ser un entero positivo.")
  .positive("El N° de ficha debe ser un entero positivo.")
  .max(99999999, "El N° de ficha es demasiado largo.");

export const FichaSchema = z.object({
  nroFicha: nroFichaSchema,
  nombre: defaultString,
  edad: defaultString,
  domicilio: defaultString,
  tel: telefonoSchema,
  cel: telefonoSchema,
  fechaEntrada: fechaSchema,
  recetaFecha: fechaSchema,
  recetaDr: defaultString,
  lejos: ojoLadoSchema,
  cerca: ojoLadoSchema,
  medidas: medidasSchema,
  tipoLente: tipoLenteSchema,
  economico: economicoSchema,
  cobertura: coberturaSchema,
});

// `nroFicha` is typed by the user at creation (it links the digital ficha to
// a physical card) and is immutable afterwards, so patches never carry it.
export const CreateFichaSchema = FichaSchema;

export const UpdateFichaSchema = FichaSchema.omit({ nroFicha: true }).partial();

// Stored records also carry the repository-managed audit timestamps. Legacy
// records without them load with "".
export const FichaRecordSchema = FichaSchema.extend({
  createdAt: z.string().default(""),
  updatedAt: z.string().default(""),
  anuladaAt: z.string().default(""),
});

// PUT body: the patch plus the `updatedAt` the client loaded (optimistic
// concurrency). Timestamps inside `patch` are stripped by Zod.
export const UpdateFichaRequestSchema = z.object({
  patch: UpdateFichaSchema,
  expectedUpdatedAt: z.string().min(1).optional(),
});

export const FichaSummarySchema = z.object({
  nroFicha: z.number().int().positive(),
  nombre: z.string(),
  fechaEntrada: z.string(),
  telefono: z.string(),
  fechaCarga: z.string(),
  anuladaAt: z.string().default(""),
});

// POST /anular body: the `updatedAt` the client loaded (optimistic concurrency).
export const AnularFichaRequestSchema = z.object({
  expectedUpdatedAt: z.string().min(1).optional(),
});

/** Minimum digits for a phone search (same rule as the Apps Script). */
export const MIN_PHONE_SEARCH_DIGITS = 3;

/**
 * List params. `sortDir` defaults per field (dates desc, nombre/nroFicha
 * asc) so repositories always receive a concrete value. `telefono` is
 * reduced to digits; typing something with fewer than 3 digits is invalid.
 */
export const ListFichasParamsSchema = z
  .object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(50),
    q: z.string().default(""),
    nombre: z.string().default(""),
    telefono: z.string().default(""),
    incluirAnuladas: z.boolean().default(false),
    sortBy: z.enum(FICHA_SORT_FIELDS as [FichaSortField, ...FichaSortField[]]).default("fechaCarga"),
    sortDir: z.enum(SORT_DIRECTIONS as [SortDirection, ...SortDirection[]]).optional(),
  })
  .transform((value, ctx): ListFichasParams => {
    const digits = value.telefono.replace(/\D/g, "");
    if (value.telefono.trim() !== "" && digits.length < MIN_PHONE_SEARCH_DIGITS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["telefono"],
        message: `Ingresá al menos ${MIN_PHONE_SEARCH_DIGITS} dígitos.`,
      });
      return z.NEVER;
    }
    const defaultDir: SortDirection =
      value.sortBy === "fechaCarga" || value.sortBy === "fechaEntrada" ? "desc" : "asc";
    return {
      page: value.page,
      pageSize: value.pageSize,
      q: value.q.trim(),
      nombre: value.nombre.trim(),
      telefono: digits,
      incluirAnuladas: value.incluirAnuladas,
      sortBy: value.sortBy,
      sortDir: value.sortDir ?? defaultDir,
    };
  });

export const PaginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().min(1),
  });

// ---------------------------------------------------------------------------
// Inferred types (re-exported from `ficha.types.ts` for convenience)
// ---------------------------------------------------------------------------

export type FichaInput = z.infer<typeof CreateFichaSchema>;
export type FichaPatch = z.infer<typeof UpdateFichaSchema>;
export type FichaRecord = z.infer<typeof FichaRecordSchema>;

/** Validates the `list` payload returned by a storage backend. */
export const ListFichasResultSchema = PaginatedSchema(FichaSummarySchema).extend({
  sortBy: z.enum(FICHA_SORT_FIELDS as [FichaSortField, ...FichaSortField[]]),
  sortDir: z.enum(SORT_DIRECTIONS as [SortDirection, ...SortDirection[]]),
});
