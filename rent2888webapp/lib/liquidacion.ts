import "server-only";
import type { LiqRow, SheetData } from "./sheetData";
import { MESES, mesLabel, sp } from "./format";

// Overrides manuales para diferencias de redondeo vs PowerBI (propietario -> mes/año -> neto).
// Portado byte a byte de index.html — se aplica DESPUÉS del cálculo, igual que el original.
const NETO_OVERRIDES: Record<string, Record<string, number>> = {
  "Jessie Barnatan": { "5/2026": 1189, "6/2026": 1524 },
  Demo: { "6/2026": 5206 },
  Jalles: { "6/2026": 777 },
  "Nacho Codron": { "6/2026": 851 },
  Scalabrini1566: { "6/2026": 563 },
};

export interface EgresoLine {
  concepto: string;
  sub: string;
  esEdif: boolean;
  monto: number;
}

export interface DeptoData {
  stays: LiqRow[];
  ing: number;
  egr: number;
  noch: number;
}

export interface Liquidacion {
  prop: string;
  per: string;
  mon: string;
  monLabel: string;
  perLabel: string;
  depLabel: string;
  deptos: string[];
  dd: Record<string, DeptoData>;
  allEgrGrouped: EgresoLine[];
  tIngDisplay: number;
  tEgr: number;
  com: number;
  comPct: number;
  tNoch: number;
  neto: number;
  hist: { labels: string[]; noches: number[]; dinero: number[]; ci: number };
  p2sub: string;
}

/** Períodos disponibles (orden cronológico). */
export function getPeriodos(data: SheetData): string[] {
  return [...new Set(data.liqRows.map((r) => r.mesano).filter(Boolean))].sort(sp);
}

/** Propietarios activos filtrados por moneda (para el dropdown del admin). */
export function getPropietariosActivos(data: SheetData, moneda: string): string[] {
  return Object.entries(data.propMap)
    .filter(([, v]) => v.activo && v.moneda === moneda)
    .map(([p]) => p)
    .sort();
}

/** Todos los propietarios activos (para el alta de usuarios). */
export function getTodosPropietarios(data: SheetData): string[] {
  return Object.entries(data.propMap)
    .filter(([, v]) => v.activo)
    .map(([p]) => p)
    .sort();
}

/**
 * Cálculo de liquidación mensual — port fiel de la primera mitad de render() en index.html.
 * commissionPct reemplaza a CFG.com (ej: 0.20).
 */
export function computeLiquidacion(
  data: SheetData,
  prop: string,
  per: string,
  commissionPct: number
): Liquidacion {
  const { liqRows: dataRows, propMap, edificioMap, propToEdif, sharedBuildingMap: sbMap } = data;

  const mon = propMap[prop]?.moneda || "$";
  const directRows = dataRows.filter((r) => r.propietario === prop && r.mesano === per);
  const sharedBuildings = new Set(Object.keys(sbMap));

  // ── Egresos de edificios compartidos ──
  const buildingExpenses: { concepto: string; edificio: string; egresos: number; myDeptos: number }[] = [];
  const myEdifMap: Record<string, number> = {};

  // Fuente 1: propToEdif — solo entradas esCompartido
  for (const entry of propToEdif[prop] || []) {
    const { edificio: e, cantidad: q, esCompartido } = entry;
    if (sharedBuildings.has(e) && q > 0 && esCompartido) {
      myEdifMap[e] = (myEdifMap[e] || 0) + q;
    }
  }

  // Fuente 2: edificioMap directo
  for (const edif of sharedBuildings) {
    if (myEdifMap[edif]) continue;
    const entry = (edificioMap[edif] || []).find((m) => m.activo && m.prop === prop);
    if (entry) myEdifMap[edif] = entry.cantidad || 1;
  }

  for (const [edif, cantidad] of Object.entries(myEdifMap)) {
    // Filas de egreso del edificio: depto = nombre del edificio.
    // Acumular por concepto sin redondear por fila.
    const byConcepto: Record<string, number> = {};
    for (const r of dataRows) {
      if (r.mesano !== per) continue;
      if (r.egresos === 0 || !r.conceptoEgreso) continue;
      if (r.depto !== edif) continue;
      const key = r.conceptoEgreso;
      const isUSD = mon === "u$";
      let porDepto: number;
      if (isUSD) {
        if (r.egrPorDeptoU != null && r.egrPorDeptoU !== 0) {
          porDepto = r.egrPorDeptoU;
        } else if (r.egrAaU != null && r.egrAaU !== 0) {
          porDepto = r.egrAaU / (sbMap[edif] || 1);
        } else {
          porDepto = 0;
        }
      } else {
        porDepto =
          r.egrPorDepto != null && r.egrPorDepto !== 0
            ? r.egrPorDepto
            : r.egresos / (sbMap[edif] || 1);
      }
      byConcepto[key] = (byConcepto[key] || 0) + porDepto;
    }

    if (mon === "u$") {
      // USD: redondeo POR CONCEPTO — asimetría intencional vs pesos, no unificar.
      for (const [concepto, totalPorDepto] of Object.entries(byConcepto)) {
        buildingExpenses.push({
          concepto,
          edificio: edif,
          egresos: Math.round(totalPorDepto * cantidad),
          myDeptos: cantidad,
        });
      }
    } else {
      // Pesos: redondeo sobre el TOTAL del edificio; el último concepto absorbe el residuo.
      const totalEdif = Object.values(byConcepto).reduce((s, v) => s + v, 0);
      const totalEdifRounded = Math.round(totalEdif * cantidad);
      const conceptos = Object.entries(byConcepto);
      let acum = 0;
      for (let i = 0; i < conceptos.length; i++) {
        const [concepto, v] = conceptos[i];
        const esUltimo = i === conceptos.length - 1;
        const egrConc = esUltimo
          ? totalEdifRounded - acum
          : Math.round((v / totalEdif) * totalEdifRounded);
        acum += egrConc;
        buildingExpenses.push({ concepto, edificio: edif, egresos: egrConc, myDeptos: cantidad });
      }
    }
  }

  // ── Estadías y egresos directos por depto ──
  const deptos = [
    ...new Set(directRows.map((r) => r.depto).filter((d) => d && !sharedBuildings.has(d))),
  ].sort();

  let tIng = 0,
    tIngRaw = 0,
    tNoch = 0;
  const dd: Record<string, DeptoData> = {};

  for (const d of deptos) {
    const drs = directRows.filter((r) => r.depto === d);
    const stays = drs
      .filter((r) => r.conceptoIngreso && r.conceptoIngreso !== "Booking")
      .sort((a, b) => {
        const p = (s: string) => {
          if (!s) return 0;
          const [dd_, mm, yy] = s.split("/");
          return new Date(2000 + parseInt(yy), parseInt(mm) - 1, parseInt(dd_)).getTime();
        };
        return p(a.fechaIngreso) - p(b.fechaIngreso);
      });
    const egrs = drs.filter(
      (r) => r.conceptoEgreso && r.egresos !== 0 && !sharedBuildings.has(r.depto)
    );
    const ingRaw = stays.reduce((s, r) => s + r.ingresos, 0);
    const ing = Math.round(ingRaw);
    const egr = egrs.reduce((s, r) => s + r.egresos, 0);
    const noch = stays.filter((r) => r.ingresos > 0).reduce((s, r) => s + (r.noches || 0), 0);
    dd[d] = { stays, ing, egr, noch };
    tIng += ing;
    tIngRaw += ingRaw;
  }
  void tIng;

  const directEgrs = directRows.filter(
    (r) => r.conceptoEgreso && r.egresos !== 0 && !sharedBuildings.has(r.depto)
  );
  const dirEgrByDepto: Record<string, number> = {};
  for (const r of directEgrs) {
    dirEgrByDepto[r.depto] = (dirEgrByDepto[r.depto] || 0) + r.egresos;
  }
  const directEgrTotal = Object.values(dirEgrByDepto).reduce((s, v) => s + Math.round(v), 0);
  const buildEgrTotal = buildingExpenses.reduce((s, e) => s + e.egresos, 0);
  const tEgr = directEgrTotal + buildEgrTotal;
  tNoch = directRows
    .filter((r) => r.conceptoIngreso && r.ingresos > 0)
    .reduce((s, r) => s + (r.noches || 0), 0);

  // Comisión sobre ingreso crudo PRE-redondeo; un solo redondeo al final del neto.
  const com = Math.round(tIngRaw * commissionPct);
  const comRaw = tIngRaw * commissionPct;
  const tEgrRaw =
    directEgrs.reduce((s, r) => s + r.egresos, 0) +
    buildingExpenses.reduce((s, e) => s + e.egresos, 0);
  let neto = Math.round(tIngRaw - comRaw + tEgrRaw);
  if (NETO_OVERRIDES[prop]?.[per] != null) neto = NETO_OVERRIDES[prop][per];
  const tIngDisplay = Math.round(tIngRaw);

  // ── Serie histórica (últimos 18 períodos hasta el seleccionado) ──
  // Mes actual usa el neto completo; meses pasados usan fórmula simplificada
  // sin buildingExpenses — así está en producción, no "arreglar".
  const allPers = [...new Set(dataRows.filter((r) => r.propietario === prop).map((r) => r.mesano))]
    .sort(sp)
    .filter((p) => sp(p, per) <= 0)
    .slice(-18);
  const hN = allPers.map((p) =>
    dataRows
      .filter((x) => x.propietario === prop && x.mesano === p && x.conceptoIngreso)
      .reduce((s, x) => s + (x.noches || 0), 0)
  );
  const hD = allPers.map((p) => {
    if (p === per) return neto;
    const pr = dataRows.filter((x) => x.propietario === prop && x.mesano === p);
    const i = pr.filter((x) => x.conceptoIngreso).reduce((s, x) => s + x.ingresos, 0);
    // Egresos con su signo real: negativos restan, positivos suman (igual que el neto del mes actual).
    const e = pr.filter((x) => x.conceptoEgreso && x.egresos !== 0).reduce((s, x) => s + x.egresos, 0);
    return Math.round(Math.max(0, i + e - i * commissionPct));
  });
  const hL = allPers.map((p) => {
    const [m, y] = p.split("/");
    return MESES[+m].slice(0, 3) + "'" + String(y).slice(2);
  });
  const ci = allPers.indexOf(per);

  // ── Agrupación de egresos para la tabla ──
  const directGrouped: Record<string, EgresoLine> = {};
  for (const e of directEgrs) {
    const key = `${e.depto}||${e.conceptoEgreso || "Egreso"}`;
    if (!directGrouped[key])
      directGrouped[key] = { concepto: e.conceptoEgreso || "Egreso", sub: e.depto, esEdif: false, monto: 0 };
    directGrouped[key].monto += e.egresos;
  }
  const buildGrouped: Record<string, EgresoLine> = {};
  for (const e of buildingExpenses) {
    const key = `${e.edificio}||${e.concepto}`;
    if (!buildGrouped[key])
      buildGrouped[key] = { concepto: e.concepto, sub: e.edificio, esEdif: true, monto: 0 };
    buildGrouped[key].monto += e.egresos;
  }
  const allEgrGrouped = [...Object.values(directGrouped), ...Object.values(buildGrouped)];

  const monLabel = mon === "u$" ? "USD" : "Pesos";
  const perLabel = mesLabel(per);
  const depLabel = deptos.join(", ") || "—";
  const p2sub = hL.length > 1 ? `${hL[0]} – ${hL[hL.length - 1]}` : perLabel;

  return {
    prop,
    per,
    mon,
    monLabel,
    perLabel,
    depLabel,
    deptos,
    dd,
    allEgrGrouped,
    tIngDisplay,
    tEgr,
    com,
    comPct: commissionPct,
    tNoch,
    neto,
    hist: { labels: hL, noches: hN, dinero: hD, ci },
    p2sub,
  };
}
