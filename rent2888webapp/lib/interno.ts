import "server-only";
import type { InternoRow, SheetData } from "./sheetData";
import { sp } from "./format";

export interface MesGroup {
  mesano: string;
  rows: InternoRow[];
  ingARS: number;
  egrARS: number;
  ingUSD: number;
  egrUSD: number;
}

export interface CuentaInterna {
  cuenta: string;
  totalIngARS: number;
  totalEgrARS: number;
  saldoARS: number;
  totalIngUSD: number;
  totalEgrUSD: number;
  saldoUSD: number;
  tNoch: number;
  movimientos: number;
  meses: MesGroup[];
}

export function getCuentas(data: SheetData): string[] {
  return [...new Set(data.internoRows.map((r) => r.cuenta).filter(Boolean))].sort();
}

/** Port fiel de render() de interno.html (parte de cálculo). */
export function computeCuentaInterna(data: SheetData, cuenta: string): CuentaInterna {
  const rows = data.internoRows.filter((r) => r.cuenta === cuenta);

  const rowsARS = rows.filter((r) => !r.isUSD);
  const rowsUSD = rows.filter((r) => r.isUSD);

  const totalIngARS = rowsARS.reduce((s, r) => s + r.entrada, 0);
  const totalEgrARS = rowsARS.reduce((s, r) => s + r.salida, 0);
  const saldoARS = totalIngARS + totalEgrARS;

  const totalIngUSD = rowsUSD.reduce((s, r) => s + r.entrada, 0);
  const totalEgrUSD = rowsUSD.reduce((s, r) => s + r.salida, 0);
  const saldoUSD = totalIngUSD + totalEgrUSD;

  const tNoch = rows.filter((r) => r.noches && r.entrada > 0).reduce((s, r) => s + (r.noches || 0), 0);

  const allRows = [...rows].sort((a, b) => -sp(a.mesano, b.mesano));
  const mesanos = [...new Set(allRows.map((r) => r.mesano))].sort((a, b) => -sp(a, b));

  const meses: MesGroup[] = mesanos.map((mes) => {
    const mRows = allRows.filter((r) => r.mesano === mes);
    return {
      mesano: mes,
      rows: mRows,
      ingARS: mRows.filter((r) => !r.isUSD).reduce((s, r) => s + r.entrada, 0),
      egrARS: mRows.filter((r) => !r.isUSD).reduce((s, r) => s + r.salida, 0),
      ingUSD: mRows.filter((r) => r.isUSD).reduce((s, r) => s + r.entrada, 0),
      egrUSD: mRows.filter((r) => r.isUSD).reduce((s, r) => s + r.salida, 0),
    };
  });

  return {
    cuenta,
    totalIngARS,
    totalEgrARS,
    saldoARS,
    totalIngUSD,
    totalEgrUSD,
    saldoUSD,
    tNoch,
    movimientos: rows.length,
    meses,
  };
}
