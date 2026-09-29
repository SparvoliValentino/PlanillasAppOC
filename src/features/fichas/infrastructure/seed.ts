/**
 * Seed data for the local mock repository.
 *
 * These five records give the UI something to render on first boot and let
 * the team eyeball the layout against realistic data without having to type
 * a ficha from scratch.
 */

import { emptyFichaValues } from "../domain/ficha.types";
import type { Ficha } from "../domain/ficha.types";

function buildFicha(
  nroFicha: number,
  nombre: string,
  overrides: Partial<Ficha>,
): Ficha {
  return { ...emptyFichaValues(), ...overrides, nroFicha, nombre };
}

export const defaultSeeds: Ficha[] = [
  buildFicha(1, "Juan Pérez", {
    edad: "54",
    domicilio: "Av. Corrientes 1234, CABA",
    tel: "011-4321-0001",
    cel: "+54 9 11 5555-0001",
    fechaEntrada: "2026-09-01",
    recetaFecha: "2026-08-28",
    recetaDr: "Dra. López",
    lejos: {
      od: { esf: "+1.25", cil: "-0.50", eje: "90" },
      oi: { esf: "+1.00", cil: "-0.25", eje: "85" },
      armazon: {
        material: "ORGANICO",
        origen: "STOCK",
        armazon: "Ray-Ban RB5154",
        modelo: "2372",
        color: "Negro mate",
      },
    },
    cerca: {
      od: { esf: "+2.50", cil: "", eje: "" },
      oi: { esf: "+2.25", cil: "", eje: "" },
      armazon: {
        material: "ORGANICO",
        origen: "LABORATORIO",
        armazon: "",
        modelo: "",
        color: "",
      },
    },
    tipoLente: "BIFOCAL",
    economico: {
      precioArmazonLejos: 45000,
      precioCristalesLejos: 32000,
      precioArmazonCerca: 0,
      precioCristalesCerca: 28000,
      adicionales: "Filtro azul",
      precioTotal: 105000,
      sena: 30000,
      saldo: 75000,
    },
    cobertura: {
      obraSocial: "OSDE",
      nroCarnet: "123456789",
      nroDoc: "20.123.456",
      formaPago: "Efectivo",
    },
  }),
  buildFicha(2, "María González", {
    edad: "38",
    domicilio: "San Martín 456, Quilmes",
    cel: "+54 9 11 4444-1234",
    fechaEntrada: "2026-09-12",
    recetaDr: "Dr. Suárez",
    lejos: {
      od: { esf: "-2.75", cil: "-1.00", eje: "175" },
      oi: { esf: "-2.50", cil: "-0.75", eje: "10" },
      armazon: {
        material: "MINERAL",
        origen: "LABORATORIO",
        armazon: "Vogue VO5206",
        modelo: "W44",
        color: "Havana",
      },
    },
    tipoLente: "PROGRESIVO",
    economico: {
      precioArmazonLejos: 38000,
      precioCristalesLejos: 65000,
      precioArmazonCerca: 0,
      precioCristalesCerca: 0,
      adicionales: "Antirreflejo premium",
      precioTotal: 103000,
      sena: 0,
      saldo: 103000,
    },
    cobertura: {
      obraSocial: "Swiss Medical",
      nroCarnet: "9988776655",
      nroDoc: "28.456.789",
      formaPago: "Tarjeta",
    },
  }),
  buildFicha(3, "Carlos Bianchi", {
    edad: "67",
    domicilio: "Belgrano 789, Avellaneda",
    tel: "011-4201-2233",
    fechaEntrada: "2026-08-20",
    recetaDr: "Dra. Méndez",
    cerca: {
      od: { esf: "+3.00", cil: "", eje: "" },
      oi: { esf: "+2.75", cil: "-0.50", eje: "95" },
      armazon: {
        material: "ORGANICO",
        origen: "STOCK",
        armazon: "Genérico",
        modelo: "Clásico",
        color: "Carey",
      },
    },
    tipoLente: "BIFOCAL",
    economico: {
      precioArmazonLejos: 0,
      precioCristalesLejos: 0,
      precioArmazonCerca: 18000,
      precioCristalesCerca: 22000,
      adicionales: "",
      precioTotal: 40000,
      sena: 40000,
      saldo: 0,
    },
    cobertura: {
      obraSocial: "PAMI",
      nroCarnet: "150223344",
      nroDoc: "DNI 8.456.789",
      formaPago: "Obra social",
    },
  }),
  buildFicha(4, "Lucía Fernández", {
    edad: "29",
    domicilio: "Mitre 234, Lanús",
    cel: "+54 9 11 6666-7788",
    fechaEntrada: "2026-09-22",
    lejos: {
      od: { esf: "-0.50", cil: "", eje: "" },
      oi: { esf: "-0.75", cil: "", eje: "" },
      armazon: {
        material: "ORGANICO",
        origen: "STOCK",
        armazon: "Armani Exchange AX3016",
        modelo: "8078",
        color: "Transparente",
      },
    },
    tipoLente: "",
    economico: {
      precioArmazonLejos: 52000,
      precioCristalesLejos: 18000,
      precioArmazonCerca: 0,
      precioCristalesCerca: 0,
      adicionales: "",
      precioTotal: 70000,
      sena: 35000,
      saldo: 35000,
    },
    cobertura: {
      obraSocial: "Galeno",
      nroCarnet: "M-11223344",
      nroDoc: "35.789.012",
      formaPago: "Transferencia",
    },
  }),
  buildFicha(5, "Roberto Silva", {
    edad: "45",
    domicilio: "Sarmiento 1023, Morón",
    tel: "011-4629-1010",
    cel: "+54 9 11 5555-9988",
    fechaEntrada: "2026-09-25",
    recetaDr: "Dr. Pereyra",
    lejos: {
      od: { esf: "+0.75", cil: "-0.25", eje: "100" },
      oi: { esf: "+1.00", cil: "", eje: "" },
      armazon: {
        material: "MINERAL",
        origen: "LABORATORIO",
        armazon: "Persol PO3019S",
        modelo: "9013",
        color: "Azul",
      },
    },
    cerca: {
      od: { esf: "+1.75", cil: "", eje: "" },
      oi: { esf: "+2.00", cil: "", eje: "" },
      armazon: {
        material: "MINERAL",
        origen: "LABORATORIO",
        armazon: "",
        modelo: "",
        color: "",
      },
    },
    medidas: {
      dilOd: "32",
      dilOi: "31.5",
      dicOd: "18",
      dicOi: "18",
      altBifOd: "",
      altBifOi: "",
      altProgOd: "22",
      altProgOi: "22",
      altCentroOd: "",
      altCentroOi: "",
    },
    tipoLente: "PROGRESIVO",
    economico: {
      precioArmazonLejos: 85000,
      precioCristalesLejos: 72000,
      precioArmazonCerca: 0,
      precioCristalesCerca: 0,
      adicionales: "Antirreflejo + filtro azul",
      precioTotal: 157000,
      sena: 50000,
      saldo: 107000,
    },
    cobertura: {
      obraSocial: "OSDE",
      nroCarnet: "5566778899",
      nroDoc: "23.789.456",
      formaPago: "Efectivo + tarjeta",
    },
  }),
];
