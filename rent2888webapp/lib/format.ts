// Helpers compartidos, portados de index.html / interno.html (estaban duplicados en ambos).

export const MESES = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** "5/2026" -> "Mayo 2026" */
export function mesLabel(mano: string): string {
  if (!mano) return "";
  const [m, y] = mano.split("/");
  return (MESES[+m] || m) + " " + y;
}

/** "5/2026" -> "May'26" */
export function mesLabelCorto(mano: string): string {
  if (!mano) return "";
  const [m, y] = mano.split("/");
  return (MESES[+m] || m).slice(0, 3) + "'" + String(y).slice(2);
}

/** Formatea moneda: fmt(1234, 'u$') -> "u$1.234" */
export function fmt(n: number | null | undefined, mo: string): string {
  if (n == null) return "—";
  const neg = n < 0,
    abs = Math.abs(n);
  const s =
    mo === "u$"
      ? "u$" + Math.round(abs).toLocaleString("es-AR")
      : "$" + Math.round(abs).toLocaleString("es-AR");
  return neg ? "-" + s : s;
}

/** Parsea número de celda CSV; '#N/A', '', 'FALSE' -> 0 */
export function pn(s: string | undefined | null): number {
  if (!s || s === "#N/A" || s === "" || s === "FALSE") return 0;
  return parseFloat(String(s).replace(/[^\d.\-]/g, "")) || 0;
}

/** Comparador de períodos "m/yyyy" */
export function sp(a: string, b: string): number {
  const [ma, ya] = a.split("/").map(Number),
    [mb, yb] = b.split("/").map(Number);
  return ya !== yb ? ya - yb : ma - mb;
}

/**
 * Split CSV quote-aware por línea. Limitación preexistente (heredada de los HTML):
 * no soporta newlines dentro de celdas quoted porque el caller splitea por '\n' primero.
 */
export function splitCSV(line: string): string[] {
  const res: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQ = !inQ;
    } else if (line[i] === "," && !inQ) {
      res.push(cur.replace(/^"|"$/g, "").trim());
      cur = "";
    } else {
      cur += line[i];
    }
  }
  res.push(cur.replace(/^"|"$/g, "").trim());
  return res;
}
