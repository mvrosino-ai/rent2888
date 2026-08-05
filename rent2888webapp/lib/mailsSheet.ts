import "server-only";
import { splitCSV, MESES } from "./format";
import type { SheetData } from "./sheetData";
import { computeLiquidacion } from "./liquidacion";

// ── Planilla de mails ──
// Distinta al Sheet principal de liquidaciones. Cada mes se crea un TAB nuevo
// con el nombre del mes a liquidar. Como la planilla NO está publicada, el
// lookup por nombre de pestaña no funciona (cae siempre a la primera), así que
// leemos el tab por defecto (el actual / primero) y deducimos el mes desde el
// texto del Asunto (col K, ej. "Liquidación Julio/26").
//
// Columnas relevantes (0-indexed):
//   A(0) Depto · B(1) Propietario · F(5) Moneda ·
//   J(9) Mail · K(10) Asunto · L(11) Nombre (saludo) · M(12) Anotaciones
const MAILS_SHEET_ID =
  process.env.MAILS_SHEET_ID || "1Y3q_uid0zoPy9zXS2_HKIKWUXl413kOso_f6HqeKTD8";

// Conceptos de egreso que NO son "novedades" (gastos operativos habituales).
// Se excluyen del mail. Comparación sin acentos y en minúsculas.
const EXCLUDED_CONCEPTS = ["lavander", "suministro", "smart locker", "smartlocker", "locker", "limpiez"];

export interface MailRowRaw {
  depto: string;
  propietario: string;
  moneda: string;
  mail: string;
  asunto: string;
  nombre: string;
  anotacion: string;
}

/** Un gasto "extra" (novedad) crudo, para que la IA lo redacte y clasifique. */
export interface ExtraExpense {
  concepto: string;
  depto: string;
  monto: number;
  moneda: string;
}

/** Datos de un propietario listo para generar su mail. */
export interface MailTarget {
  propietario: string;
  mail: string;
  asunto: string;
  nombre: string;
  moneda: string;
  deptos: string[];
  /** Propietario correspondiente en el Sheet principal (para la liquidación). */
  mainProp: string | null;
  extras: ExtraExpense[];
}

export interface MailsSheetResult {
  per: string; // "7/2026"
  mesNombre: string; // "Julio"
  targets: MailTarget[];
}

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchMailsCSV(): Promise<string> {
  // Sin parámetro de hoja: devuelve el tab actual (primero) = mes en curso.
  const url = `https://docs.google.com/spreadsheets/d/${MAILS_SHEET_ID}/gviz/tq?tqx=out:csv`;
  const r = await fetch(url, { next: { revalidate: 300, tags: ["mails-sheet"] } });
  if (!r.ok)
    throw new Error(
      "No se pudo acceder a la planilla de mails. Verificá que sea accesible por link."
    );
  return r.text();
}

/** Deduce "m/yyyy" y el nombre del mes desde un Asunto tipo "Liquidación Julio/26". */
function parsePeriodoFromAsunto(asunto: string): { per: string; mesNombre: string } | null {
  const m = norm(asunto).match(/liquidacion\s+([a-zñ]+)\s*\/\s*(\d{2,4})/);
  if (!m) return null;
  const mesIdx = MESES.findIndex((x) => norm(x) === m[1]);
  if (mesIdx <= 0) return null;
  const yy = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  return { per: `${mesIdx}/${yy}`, mesNombre: MESES[mesIdx] };
}

/** Resuelve el propietario del Sheet principal a partir del nombre / deptos del mail. */
function resolveMainProp(
  mailProp: string,
  deptos: string[],
  data: SheetData,
  per: string
): string | null {
  const target = norm(mailProp);
  const keys = Object.keys(data.propMap);

  // 1) Coincidencia exacta por nombre normalizado.
  const exact = keys.find((k) => norm(k) === target);
  if (exact) return exact;

  // 2) Coincidencia por inclusión (un nombre contiene al otro), si es única.
  const partial = keys.filter((k) => {
    const nk = norm(k);
    return nk.includes(target) || target.includes(nk);
  });
  if (partial.length === 1) return partial[0];

  // 3) Coincidencia por depto: buscar quién factura ese depto en el período.
  const deptoSet = new Set(deptos.map(norm).filter(Boolean));
  if (deptoSet.size) {
    const owner = data.liqRows.find(
      (r) => r.mesano === per && r.propietario && deptoSet.has(norm(r.depto))
    );
    if (owner) return owner.propietario;
  }

  return null;
}

function isExcluded(concepto: string): boolean {
  const n = norm(concepto);
  if (!n) return true; // sin concepto → no es novedad
  return EXCLUDED_CONCEPTS.some((e) => n.includes(e));
}

/**
 * Lee la planilla de mails, deduce el mes y arma, por propietario, la lista de
 * gastos "extra" (novedades) a partir de la liquidación del Sheet principal.
 */
export function buildMailTargets(csv: string, data: SheetData, commissionPct: number): MailsSheetResult {
  const lines = csv.split("\n").filter((l) => l.trim());

  // Encabezado: fila con "Mail" y "Asunto".
  let hi = -1;
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const c = splitCSV(lines[i]);
    if (c.some((x) => norm(x) === "mail") && c.some((x) => norm(x) === "asunto")) {
      hi = i;
      break;
    }
  }
  if (hi < 0) throw new Error("No encontré los encabezados (Mail / Asunto) en la planilla de mails.");

  // Filas crudas.
  const raws: MailRowRaw[] = [];
  let periodo: { per: string; mesNombre: string } | null = null;
  for (let i = hi + 1; i < lines.length; i++) {
    const c = splitCSV(lines[i]);
    const propietario = (c[1] || "").trim();
    const asunto = (c[10] || "").trim();
    if (!propietario && !asunto) continue;
    if (!periodo && asunto) periodo = parsePeriodoFromAsunto(asunto);
    raws.push({
      depto: (c[0] || "").trim(),
      propietario,
      moneda: (c[5] || "$").trim() || "$",
      mail: (c[9] || "").trim(),
      asunto,
      nombre: (c[11] || "").trim(),
      anotacion: (c[12] || "").trim(),
    });
  }

  if (!periodo)
    throw new Error(
      'No pude deducir el mes desde la planilla de mails. Revisá que el Asunto tenga el formato "Liquidación <Mes>/<AA>".'
    );
  const { per, mesNombre } = periodo;

  // Agrupar por propietario (un propietario puede tener varios deptos/filas).
  const byProp = new Map<string, MailRowRaw[]>();
  for (const r of raws) {
    if (!r.propietario) continue;
    const key = r.propietario;
    if (!byProp.has(key)) byProp.set(key, []);
    byProp.get(key)!.push(r);
  }

  const targets: MailTarget[] = [];
  for (const [propietario, rows] of byProp) {
    const first = rows.find((r) => r.mail) || rows[0];
    const deptos = [...new Set(rows.map((r) => r.depto).filter(Boolean))];
    const mainProp = resolveMainProp(propietario, deptos, data, per);

    // Moneda: la fuente de verdad es el Sheet principal (propMap), la misma que
    // define la liquidación. La col F de la planilla de mails está vacía en
    // muchas filas, así que solo se usa como respaldo. Así el desglose/filtro
    // USD vs ARS nunca queda mal clasificado por una celda F vacía.
    const moneda = (mainProp && data.propMap[mainProp]?.moneda) || first.moneda || "$";

    // Extraer gastos extra desde la liquidación del propietario en el período.
    const extras: ExtraExpense[] = [];
    if (mainProp) {
      try {
        const liq = computeLiquidacion(data, mainProp, per, commissionPct);
        for (const e of liq.allEgrGrouped) {
          if (isExcluded(e.concepto)) continue;
          if (!e.monto) continue;
          extras.push({ concepto: e.concepto, depto: e.sub, monto: e.monto, moneda: liq.mon });
        }
      } catch {
        // Sin liquidación para ese período → sin extras.
      }
    }

    targets.push({
      propietario,
      mail: first.mail,
      asunto: first.asunto,
      nombre: first.nombre,
      moneda,
      deptos,
      mainProp,
      extras,
    });
  }

  targets.sort((a, b) => a.propietario.localeCompare(b.propietario, "es"));
  return { per, mesNombre, targets };
}

/** API pública: descarga la planilla y arma los targets. */
export async function getMailTargets(
  data: SheetData,
  commissionPct: number
): Promise<MailsSheetResult> {
  const csv = await fetchMailsCSV();
  return buildMailTargets(csv, data, commissionPct);
}
