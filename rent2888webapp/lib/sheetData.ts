import "server-only";
import { pn, splitCSV } from "./format";

// ── Tipos ──

export interface PropInfo {
  moneda: string;
  activo: boolean;
}

export interface EdifMember {
  prop: string;
  cantidad: number;
  moneda: string;
  activo: boolean;
}

export interface PropEdifEntry {
  edificio: string;
  cantidad: number;
  esIndividual?: boolean;
  esCompartido?: boolean;
}

/** Fila para la vista de liquidación (portada de index.html parseMainSheet). */
export interface LiqRow {
  edificio: string;
  depto: string;
  propietario: string;
  moneda: string;
  plataforma: string;
  conceptoIngreso: string;
  huesped: string;
  fechaIngreso: string;
  fechaEgreso: string;
  noches: number;
  ingresos: number;
  egresos: number;
  egrPorDepto: number | null;
  egrPorDeptoU: number | null;
  egrAaU: number | null;
  conceptoEgreso: string;
  mesano: string;
  mes: number;
  ano: number;
}

/** Fila para cuentas internas (portada de interno.html parseMainSheet). */
export interface InternoRow {
  cuenta: string;
  depto: string;
  propietario: string;
  moneda: string;
  isUSD: boolean;
  plataforma: string;
  concepto: string;
  huesped: string;
  fechaIngreso: string;
  fechaEgreso: string;
  noches: number;
  entrada: number;
  salida: number;
  mesano: string;
}

export interface SheetData {
  liqRows: LiqRow[];
  internoRows: InternoRow[];
  propMap: Record<string, PropInfo>;
  edificioMap: Record<string, EdifMember[]>;
  propToEdif: Record<string, PropEdifEntry[]>;
  edificioNames: Set<string>;
  sharedBuildingMap: Record<string, number>;
}

// ── Config desde env ──

function cfg() {
  const sid = process.env.GOOGLE_SHEET_ID;
  if (!sid) throw new Error("Falta la variable de entorno GOOGLE_SHEET_ID");
  return {
    sid,
    tab: process.env.SHEET_TAB_MAIN || "$$$",
    ptab: process.env.SHEET_TAB_PROP || "Departamento - Propietario - Edificio",
  };
}

async function fetchCSV(sheetId: string, tabName: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  // Sin caché de Next.js: el CSV exportado puede pesar decenas de MB (la hoja $$$
  // suele tener miles de filas de fórmulas arrastradas de más), muy por encima del
  // límite de 2MB del data cache — cachearlo simplemente falla en silencio.
  // Reintentamos ante cortes de conexión transitorios ("socket closed") que son
  // más frecuentes cuanto más grande es el archivo a descargar.
  const MAX_INTENTOS = 3;
  let ultimoError: unknown;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      const r = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) {
        throw new Error(
          `No se pudo acceder a la hoja "${tabName}". Verificá que el Sheet sea público.`
        );
      }
      const text = await r.text();
      if (!text.trim()) throw new Error(`La hoja "${tabName}" devolvió una respuesta vacía.`);
      return text;
    } catch (e) {
      ultimoError = e;
      if (intento < MAX_INTENTOS) continue;
    }
  }
  if (ultimoError instanceof Error) {
    throw new Error(
      `No se pudo leer la hoja "${tabName}" tras ${MAX_INTENTOS} intentos (${ultimoError.message}). ` +
        `El archivo puede ser muy grande — revisá si hay filas vacías de más al final de la hoja.`
    );
  }
  throw new Error(`No se pudo leer la hoja "${tabName}" tras ${MAX_INTENTOS} intentos.`);
}

// ── Parse hoja de propietarios ──
// Dos tablas lado a lado: cols 0-4 deptos individuales, cols 5-8 edificios compartidos.

function parsePropSheet(csv: string) {
  const propMap: Record<string, PropInfo> = {};
  const edificioMap: Record<string, EdifMember[]> = {};
  const propToEdif: Record<string, PropEdifEntry[]> = {};
  const edificioNames = new Set<string>();

  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { propMap, edificioMap, propToEdif, edificioNames };

  let hi = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const c = splitCSV(lines[i]);
    if (
      (c[0] || "").toLowerCase().includes("depto") &&
      (c[5] || "").toLowerCase().includes("edif")
    ) {
      hi = i;
      break;
    }
  }

  for (let i = hi + 1; i < lines.length; i++) {
    const c = splitCSV(lines[i]);

    // Tabla A (cols 0-4): deptos individuales
    const deptoA = (c[0] || "").trim();
    const propA = (c[1] || "").trim();
    const cantA = pn(c[2]);
    const monA = (c[3] || "$").trim();
    const estA = (c[4] || "Activo").trim();
    const activoA = estA === "Activo" && cantA > 0;

    if (deptoA && propA && propA !== "#N/A" && !deptoA.toLowerCase().includes("depto")) {
      edificioNames.add(deptoA);
      if (!edificioMap[deptoA]) edificioMap[deptoA] = [];
      edificioMap[deptoA].push({ prop: propA, cantidad: cantA, moneda: monA, activo: activoA });
      if (activoA) {
        if (!propToEdif[propA]) propToEdif[propA] = [];
        propToEdif[propA].push({ edificio: deptoA, cantidad: cantA, esIndividual: true });
      }
      if (!propMap[propA]) propMap[propA] = { moneda: monA, activo: activoA };
      else if (activoA) {
        propMap[propA].activo = true;
        propMap[propA].moneda = monA;
      }
    }

    // Tabla B (cols 5-8): edificios compartidos (sin columna estado)
    const edifB = (c[5] || "").trim();
    const propB = (c[6] || "").trim();
    const cantB = pn(c[7]);
    const monB = (c[8] || "$").trim();
    const activoB = cantB > 0;

    const edifBlow = edifB.toLowerCase();
    if (
      edifB &&
      propB &&
      propB !== "#N/A" &&
      !edifBlow.includes("edif") &&
      !edifBlow.includes("prop") &&
      !edifBlow.includes("propietario")
    ) {
      edificioNames.add(edifB);
      if (!edificioMap[edifB]) edificioMap[edifB] = [];
      edificioMap[edifB].push({ prop: propB, cantidad: cantB, moneda: monB, activo: activoB });
      if (activoB) {
        if (!propToEdif[propB]) propToEdif[propB] = [];
        propToEdif[propB].push({ edificio: edifB, cantidad: cantB, esCompartido: true });
      }
      if (!propMap[propB]) propMap[propB] = { moneda: monB, activo: activoB };
      else if (activoB) {
        propMap[propB].activo = true;
      }
    }
  }

  return { propMap, edificioMap, propToEdif, edificioNames };
}

// ── Parse hoja principal ($$$) ──
// Un solo pase que produce las dos vistas de fila (liquidación e interno),
// replicando exactamente las condiciones de inclusión de cada HTML original.

function parseMainSheet(csv: string, propMap: Record<string, PropInfo>) {
  const lines = csv.split("\n").filter((l) => l.trim());
  let headers: string[] = [];
  let hi = -1;

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const c = splitCSV(lines[i]);
    if (c.some((x) => x === "mes/ano") && c.some((x) => x === "Propietario")) {
      headers = c;
      hi = i;
      break;
    }
  }
  if (hi < 0)
    throw new Error(
      "No encontré los encabezados en la hoja $$$. Verificá el nombre de la pestaña."
    );

  const ci = (n: string) => headers.findIndex((h) => h.trim() === n.trim());

  // Índices fijos intencionales (NO cambiar a lookup por nombre):
  //  - col 19 = "Donde $?" (cuenta interna)
  //  - col 20 = "Edificio" col U (hay otra columna "Edificio" en col AE que rompería el lookup)
  //  - cols 30/31 = filas de referencia AE/AF con el mapa edificio->cantidad de deptos
  const COL = {
    edificio: 20,
    dondePesos: 19,
    depto: ci("Departamento"),
    concIngr: ci("Concepto Ingresos"),
    concEgr: ci("Concepto Egresos"),
    huesped: ci("Huésped"),
    plataforma: ci("Plataforma"),
    fechaIn: ci("Fecha de ingreso"),
    fechaEg: ci("Fecha de Egreso"),
    noches: ci("Noches"),
    ing_ars: ci("Ingresos u$ a $"), // col AJ — u$ convertido a pesos
    ing_ars_orig: ci("TOTAL"), // col Y — ingreso original en pesos
    ing_usd: ci("Ingresos Total $"), // col AQ — ya convertido a u$
    egr_ars: ci("Egresos"), // col X — pesos
    egr_usd: ci("Egresos $ a u$"), // col AH — ya convertido a u$
    eprDepto: ci("$ por Depto"), // col AB — egreso dividido por depto (pesos)
    eprDeptoU: ci("$ por depto en u$"), // col AI — egreso por depto en u$
    propietario: ci("Propietario"),
    mesano: ci("mes/ano"),
    mes: ci("mes"),
    ano: ci("ano"),
    moneda: ci("Moneda del Reporte"),
    moneda2: ci("Moneda Reporte"),
    moneda3: ci("Moneda"),
  };

  const monCol =
    COL.moneda >= 0 ? COL.moneda : COL.moneda2 >= 0 ? COL.moneda2 : COL.moneda3;

  // sharedBuildingMap: filas de referencia embebidas en la zona de datos (cols 30/31)
  const sharedBuildingMap: Record<string, number> = {};
  for (let i = 0; i < lines.length; i++) {
    const c = splitCSV(lines[i]);
    const edif = (c[30] || "").trim();
    const dptos = parseInt(c[31]);
    if (edif && edif !== "Edificio" && !isNaN(dptos) && dptos > 0) {
      sharedBuildingMap[edif] = dptos;
    }
  }

  const liqRows: LiqRow[] = [];
  const internoRows: InternoRow[] = [];

  for (let i = hi + 1; i < lines.length; i++) {
    const c = splitCSV(lines[i]);
    const mano = (c[COL.mesano] || "").trim();
    if (!mano || mano === "#N/A" || mano === "mes/ano") continue;
    if (!/^\d{1,2}\/\d{4}$/.test(mano)) continue;

    const prop = (c[COL.propietario] || "").trim();
    const rawMoneda = monCol >= 0 ? (c[monCol] || "").trim() : "";

    // ── Vista liquidación (condiciones de index.html) ──
    {
      const edif = (c[COL.edificio] || "").trim();
      const skip = (!prop && !edif) || (prop === "#N/A" && !edif);
      if (!skip) {
        const moneda = rawMoneda || propMap[prop]?.moneda || "$";
        const isUSD = moneda === "u$";
        // Pesos: col AJ (Ingresos u$ a $) si tiene valor, sino col Y (TOTAL)
        const ing = isUSD
          ? pn(c[COL.ing_usd])
          : pn(c[COL.ing_ars]) || pn(c[COL.ing_ars_orig]);
        const egr = isUSD ? pn(c[COL.egr_usd]) : pn(c[COL.egr_ars]);
        const concIngr = (c[COL.concIngr] || "").trim();

        if (ing || egr || concIngr) {
          liqRows.push({
            edificio: edif,
            depto: (c[COL.depto] || "").trim(),
            propietario: prop,
            moneda,
            plataforma: (c[COL.plataforma] || "").trim(),
            conceptoIngreso: concIngr,
            huesped: (c[COL.huesped] || "").trim(),
            fechaIngreso: (c[COL.fechaIn] || "").trim(),
            fechaEgreso: (c[COL.fechaEg] || "").trim(),
            noches: pn(c[COL.noches]),
            ingresos: ing,
            egresos: egr,
            egrPorDepto: COL.eprDepto >= 0 ? pn(c[COL.eprDepto]) : null,
            egrPorDeptoU: COL.eprDeptoU >= 0 ? pn(c[COL.eprDeptoU]) : null,
            egrAaU: COL.egr_usd >= 0 ? pn(c[COL.egr_usd]) : null,
            conceptoEgreso: (c[COL.concEgr] || "").trim(),
            mesano: mano,
            mes: pn(c[COL.mes]),
            ano: pn(c[COL.ano]),
          });
        }
      }
    }

    // ── Vista interno (condiciones de interno.html) ──
    {
      const cuenta = (c[COL.dondePesos] || "").trim();
      if (cuenta) {
        const moneda = rawMoneda || "$";
        const isUSD = moneda === "u$";
        const rawARS = pn(c[COL.egr_ars]);
        const rawUSD = pn(c[COL.egr_usd]);
        const raw = isUSD ? rawUSD : rawARS;
        if (raw) {
          const entrada = raw > 0 ? raw : 0;
          const salida = raw < 0 ? raw : 0;
          const concepto =
            (c[COL.concEgr] || "").trim() || (c[COL.concIngr] || "").trim();
          internoRows.push({
            cuenta,
            depto: (c[COL.depto] || "").trim(),
            propietario: prop,
            moneda,
            isUSD,
            plataforma: (c[COL.plataforma] || "").trim(),
            concepto,
            huesped: (c[COL.huesped] || "").trim(),
            fechaIngreso: (c[COL.fechaIn] || "").trim(),
            fechaEgreso: (c[COL.fechaEg] || "").trim(),
            noches: pn(c[COL.noches]),
            entrada: Math.round(entrada),
            salida: Math.round(salida),
            mesano: mano,
          });
        }
      }
    }
  }

  return { liqRows, internoRows, sharedBuildingMap };
}

// ── API pública ──

/** Parseo puro (sin red) — separado de getSheetData para poder testearlo. */
export function parseSheetData(csvProp: string, csvMain: string): SheetData {
  const { propMap, edificioMap, propToEdif, edificioNames } = parsePropSheet(csvProp);
  const { liqRows, internoRows, sharedBuildingMap } = parseMainSheet(csvMain, propMap);

  if (!liqRows.length)
    throw new Error("Sin datos en la hoja $$$. Verificá el nombre de la pestaña.");

  return { liqRows, internoRows, propMap, edificioMap, propToEdif, edificioNames, sharedBuildingMap };
}

export async function getSheetData(): Promise<SheetData> {
  const { sid, tab, ptab } = cfg();
  const [csvProp, csvMain] = await Promise.all([
    fetchCSV(sid, ptab),
    fetchCSV(sid, tab),
  ]);
  return parseSheetData(csvProp, csvMain);
}
