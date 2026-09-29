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

export const FichaSchema = z.object({
  nroFicha: z.number().int().positive(),
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

export const CreateFichaSchema = FichaSchema.omit({ nroFicha: true });

export const UpdateFichaSchema = CreateFichaSchema.partial();

export const FichaSummarySchema = z.object({
  nroFicha: z.number().int().positive(),
  nombre: z.string(),
  fechaEntrada: z.string(),
  telefono: z.string(),
});

export const ListFichasParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(200).default(50),
  q: z.string().default(""),
});

export const PaginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });

// ---------------------------------------------------------------------------
// Inferred types (re-exported from `ficha.types.ts` for convenience)
// ---------------------------------------------------------------------------

export type FichaInput = z.infer<typeof CreateFichaSchema>;
export type FichaPatch = z.infer<typeof UpdateFichaSchema>;
