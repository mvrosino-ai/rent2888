// Port fiel del HTML generado por render() en interno.html.
import type { CuentaInterna } from "@/lib/interno";
import { mesLabel } from "@/lib/format";

function fmtARS(n: number | null | undefined): string {
  if (n == null) return "—";
  const neg = n < 0;
  const s = "$" + Math.round(Math.abs(n)).toLocaleString("es-AR");
  return (neg ? "-" : "") + s;
}
function fmtUSD(n: number | null | undefined): string {
  if (n == null) return "—";
  const neg = n < 0;
  const s = "u$" + Math.round(Math.abs(n)).toLocaleString("es-AR");
  return (neg ? "-" : "") + s;
}

const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "13px 16px",
  borderRight: "0.5px solid #eee",
  ...extra,
});
const lbl: React.CSSProperties = {
  fontSize: 10,
  color: "#999",
  letterSpacing: ".04em",
  marginBottom: 3,
};

export function CuentaInternaReport({ ci }: { ci: CuentaInterna }) {
  const {
    cuenta,
    totalIngARS,
    totalEgrARS,
    saldoARS,
    totalIngUSD,
    totalEgrUSD,
    saldoUSD,
    tNoch,
    movimientos,
    meses,
  } = ci;

  return (
    <div className="ri-wrap">
      <div className="ri-header print-exact">
        <div>
          <div className="ri-brand">
            Rent<span>2888</span>
          </div>
          <div className="ri-tag">CUENTA INTERNA · SALDO ACUMULADO</div>
        </div>
        <div className="ri-saldos">
          <div className="ri-saldo-box">
            <div className="ri-sl">SALDO $</div>
            <div className="ri-sv">{fmtARS(saldoARS)}</div>
          </div>
          <div className="ri-saldo-box">
            <div className="ri-sl">SALDO u$</div>
            <div className="ri-sv">{fmtUSD(saldoUSD)}</div>
          </div>
        </div>
      </div>

      <div className="ri-namebar print-exact">
        <div className="ri-cuentanombre">{cuenta}</div>
        <div className="ri-cuentasub">
          {tNoch} noches totales · {movimientos} movimientos
        </div>
      </div>

      {/* Resumen rápido */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", borderBottom: "0.5px solid #eee" }}>
        <div style={cell()}>
          <div style={lbl}>INGRESOS $</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--green)" }}>{fmtARS(totalIngARS)}</div>
        </div>
        <div style={cell()}>
          <div style={lbl}>EGRESOS $</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--red)" }}>{fmtARS(totalEgrARS)}</div>
        </div>
        <div style={cell()}>
          <div style={lbl}>NETO $</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: saldoARS >= 0 ? "var(--green)" : "var(--red)" }}>
            {fmtARS(saldoARS)}
          </div>
        </div>
        <div style={cell()}>
          <div style={lbl}>INGRESOS u$</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--green)" }}>{fmtUSD(totalIngUSD)}</div>
        </div>
        <div style={cell()}>
          <div style={lbl}>EGRESOS u$</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--red)" }}>{fmtUSD(totalEgrUSD)}</div>
        </div>
        <div style={cell({ borderRight: "none" })}>
          <div style={lbl}>NETO u$</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: saldoUSD >= 0 ? "var(--green)" : "var(--red)" }}>
            {fmtUSD(saldoUSD)}
          </div>
        </div>
      </div>

      {/* Movimientos */}
      <div className="ri-section">
        <div className="ri-stitle">MOVIMIENTOS</div>
        <table className="ri-tbl">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Depto</th>
              <th>Huésped / Concepto</th>
              <th>Propietario</th>
              <th style={{ textAlign: "center" }}>Noches</th>
              <th className="r">Ingresos $</th>
              <th className="r">Egresos $</th>
              <th className="r">Ingresos u$</th>
              <th className="r">Egresos u$</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <MesRows key={m.mesano} m={m} />
            ))}
            <tr style={{ background: "#f9f9f7", borderTop: "1.5px solid var(--navy)" }}>
              <td colSpan={5} style={{ fontWeight: 700, fontSize: 12, color: "var(--navy)", padding: 10 }}>
                SALDO TOTAL
              </td>
              <td className="r" style={{ fontWeight: 700, padding: 10, color: "var(--green)" }}>
                {totalIngARS ? fmtARS(totalIngARS) : ""}
              </td>
              <td className="r" style={{ fontWeight: 700, padding: 10, color: "var(--red)" }}>
                {totalEgrARS ? fmtARS(totalEgrARS) : ""}
              </td>
              <td className="r" style={{ fontWeight: 700, padding: 10, color: "var(--green)" }}>
                {totalIngUSD ? fmtUSD(totalIngUSD) : ""}
              </td>
              <td className="r" style={{ fontWeight: 700, padding: 10, color: "var(--red)" }}>
                {totalEgrUSD ? fmtUSD(totalEgrUSD) : ""}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ri-footer print-exact">
        <span className="ri-fl">rent2888.com · USO INTERNO</span>
        <span className="ri-fl">Generado el {new Date().toLocaleDateString("es-AR")}</span>
      </div>
    </div>
  );
}

function MesRows({ m }: { m: CuentaInterna["meses"][number] }) {
  const sub: React.CSSProperties = { fontWeight: 600, fontSize: 11, padding: "8px 10px" };
  return (
    <>
      <tr style={{ background: "#f0f0f5" }}>
        <td colSpan={5} style={{ ...sub, color: "var(--navy)" }}>
          {mesLabel(m.mesano)}
        </td>
        <td className="r g" style={{ ...sub, color: "var(--green)" }}>
          {m.ingARS ? fmtARS(m.ingARS) : ""}
        </td>
        <td className="r" style={{ ...sub, color: "var(--red)" }}>
          {m.egrARS ? fmtARS(m.egrARS) : ""}
        </td>
        <td className="r" style={{ ...sub, color: "var(--green)" }}>
          {m.ingUSD ? fmtUSD(m.ingUSD) : ""}
        </td>
        <td className="r" style={{ ...sub, color: "var(--red)" }}>
          {m.egrUSD ? fmtUSD(m.egrUSD) : ""}
        </td>
      </tr>
      {m.rows.map((r, i) => (
        <tr key={i}>
          <td className="ri-mes"></td>
          <td>{r.depto ? <span className="ri-dtag">{r.depto}</span> : "—"}</td>
          <td>
            <div>{r.huesped || r.concepto || "—"}</div>
            <div style={{ fontSize: 10, color: "#aaa" }}>{r.concepto || ""}</div>
          </td>
          <td style={{ fontSize: 12, color: "#666" }}>{r.propietario || "—"}</td>
          <td style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--navy)" }}>
            {r.noches || ""}
          </td>
          <td className="r g">{!r.isUSD && r.entrada > 0 ? fmtARS(r.entrada) : ""}</td>
          <td className="r rd">{!r.isUSD && r.salida < 0 ? fmtARS(r.salida) : ""}</td>
          <td className="r g">{r.isUSD && r.entrada > 0 ? fmtUSD(r.entrada) : ""}</td>
          <td className="r rd">{r.isUSD && r.salida < 0 ? fmtUSD(r.salida) : ""}</td>
        </tr>
      ))}
    </>
  );
}
