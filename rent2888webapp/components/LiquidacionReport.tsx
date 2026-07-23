// Port fiel del HTML generado por render() en index.html (páginas 1 y 2).
import type { Liquidacion } from "@/lib/liquidacion";
import { fmt } from "@/lib/format";
import { BarChart } from "./BarChart";

function LateTag({ huesped, concepto }: { huesped: string; concepto: string }) {
  const isL = (huesped + concepto).toLowerCase().includes("late");
  if (!isL) return null;
  return <span className="r2-late">Late CO</span>;
}

/**
 * Egreso con su signo real. En la planilla los egresos negativos vienen con
 * signo "-" (restan del neto) y los positivos vienen normales (suman al neto).
 * Devuelve el texto con signo explícito y la clase de color (g = suma, r = resta).
 */
function fmtEgreso(n: number, mon: string): { text: string; cls: "g" | "r" } {
  const suma = n >= 0;
  return { text: (suma ? "+" : "−") + fmt(Math.abs(n), mon), cls: suma ? "g" : "r" };
}

export function LiquidacionReport({ liq }: { liq: Liquidacion }) {
  const {
    prop,
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
    comPct,
    tNoch,
    neto,
    hist,
    p2sub,
  } = liq;

  const today = new Date().toLocaleDateString("es-AR");
  const multiDepto = deptos.length > 1;

  return (
    <div className="r2-wrap">
      {/* ── PÁGINA 1 ── */}
      <div className="r2-page">
        <div className="r2-header print-exact">
          <div>
            <div className="r2-brand">
              Rent<span>2888</span>
            </div>
            <div className="r2-tag">Liquidación mensual · {monLabel}</div>
          </div>
          <div className="r2-hr">
            <div className="r2-hl">Total a transferir</div>
            <div className="r2-hv">{fmt(neto, mon)}</div>
          </div>
        </div>

        <div className="r2-namebar">
          <div className="r2-propname">{prop}</div>
          <div className="r2-propsub">
            {depLabel} &nbsp;·&nbsp; {deptos.length} depto{deptos.length !== 1 ? "s" : ""}{" "}
            &nbsp;·&nbsp; {tNoch} noches &nbsp;·&nbsp; {perLabel}
          </div>
        </div>

        <div className="r2-stats print-exact">
          <div className="r2-stat">
            <div className="r2-sl">Ingresos</div>
            <div className="r2-sv g">{fmt(tIngDisplay, mon)}</div>
          </div>
          <div className="r2-stat">
            <div className="r2-sl">Egresos</div>
            <div className={`r2-sv ${fmtEgreso(tEgr, mon).cls}`}>{fmtEgreso(tEgr, mon).text}</div>
          </div>
          <div className="r2-stat">
            <div className="r2-sl">Comisión {Math.round(comPct * 100)}%</div>
            <div className="r2-sv r">−{fmt(com, mon)}</div>
          </div>
          <div className="r2-stat">
            <div className="r2-sl">Noches</div>
            <div className="r2-sv">{tNoch}</div>
          </div>
        </div>

        {/* ESTADÍAS */}
        <div className="r2-section">
          <div className="r2-stitle">Estadías del mes</div>
          {deptos.length ? (
            multiDepto ? (
              deptos.map((d) => {
                const { stays } = dd[d];
                if (!stays.length) return null;
                const deptoNoch = stays
                  .filter((s) => s.ingresos > 0)
                  .reduce((s, r) => s + (r.noches || 0), 0);
                const deptoIng = stays.reduce((s, r) => s + r.ingresos, 0);
                return (
                  <div className="r2-depto-block" key={d}>
                    <div className="r2-depto-hdr print-exact">
                      <span className="r2-dtag r2-dtag-hdr">{d}</span>
                      <span className="r2-depto-noches">
                        {deptoNoch} noche{deptoNoch !== 1 ? "s" : ""}
                      </span>
                      <span className="r2-depto-subtotal">{fmt(Math.round(deptoIng), mon)}</span>
                    </div>
                    <table className="r2-tbl r2-tbl-inner">
                      <thead>
                        <tr>
                          <th>Huésped</th>
                          <th>F. Ingreso</th>
                          <th>F. Egreso</th>
                          <th style={{ textAlign: "center" }}>Noches</th>
                          <th className="r">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stays.map((s, i) => (
                          <tr key={i}>
                            <td>
                              <div>
                                {s.huesped || "—"}
                                <LateTag huesped={s.huesped} concepto={s.conceptoIngreso} />
                              </div>
                            </td>
                            <td style={{ fontSize: 12, color: "#8a95a8" }}>{s.fechaIngreso || "—"}</td>
                            <td style={{ fontSize: 12, color: "#8a95a8" }}>{s.fechaEgreso || "—"}</td>
                            <td style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>
                              {s.noches || "—"}
                            </td>
                            <td className="r">{fmt(s.ingresos, mon)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })
            ) : (
              <table className="r2-tbl">
                <thead>
                  <tr>
                    <th>Depto</th>
                    <th>Huésped</th>
                    <th>F. Ingreso</th>
                    <th>F. Egreso</th>
                    <th style={{ textAlign: "center" }}>Noches</th>
                    <th className="r">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {deptos.flatMap((d) =>
                    dd[d].stays.map((s, i) => (
                      <tr key={`${d}-${i}`}>
                        <td>
                          <span className="r2-dtag">{d}</span>
                        </td>
                        <td>
                          <div>
                            {s.huesped || "—"}
                            <LateTag huesped={s.huesped} concepto={s.conceptoIngreso} />
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: "#8a95a8" }}>{s.fechaIngreso || "—"}</td>
                        <td style={{ fontSize: 12, color: "#8a95a8" }}>{s.fechaEgreso || "—"}</td>
                        <td style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>
                          {s.noches || "—"}
                        </td>
                        <td className="r">{fmt(s.ingresos, mon)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )
          ) : (
            <div style={{ padding: "14px 0", color: "#aaa", fontSize: 13, fontStyle: "italic" }}>
              Sin estadías registradas para este período
            </div>
          )}
        </div>

        {/* EGRESOS + LIQUIDACIÓN */}
        {allEgrGrouped.length ? (
          <div className="r2-section">
            <div className="r2-stitle">Egresos del mes</div>
            <table className="r2-etbl">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Origen</th>
                  <th className="r">Monto</th>
                </tr>
              </thead>
              <tbody>
                {allEgrGrouped.map((e, i) => {
                  const eg = fmtEgreso(e.monto, mon);
                  return (
                    <tr key={i}>
                      <td>{e.concepto}</td>
                      <td>{e.sub}</td>
                      <td
                        className="r"
                        style={{ color: eg.cls === "g" ? "var(--green)" : "#d63030" }}
                      >
                        {eg.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="r2-liq print-exact">
              <div className="r2-lrow">
                <span className="r2-ll">Ingresos</span>
                <span className="r2-lv">{fmt(tIngDisplay, mon)}</span>
              </div>
              <div className="r2-lrow">
                <span className="r2-ll">Egresos</span>
                <span className={`r2-lv ${fmtEgreso(tEgr, mon).cls}`}>{fmtEgreso(tEgr, mon).text}</span>
              </div>
              <div className="r2-lrow">
                <span className="r2-ll">Comisión Rent2888 ({Math.round(comPct * 100)}%)</span>
                <span className="r2-lv r">−{fmt(com, mon)}</span>
              </div>
              <div className="r2-lrow total">
                <span className="r2-ll b">Neto a transferir</span>
                <span className="r2-lv g">{fmt(neto, mon)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="r2-section">
            <div className="r2-liq print-exact">
              <div className="r2-lrow">
                <span className="r2-ll">Ingresos</span>
                <span className="r2-lv">{fmt(tIngDisplay, mon)}</span>
              </div>
              <div className="r2-lrow">
                <span className="r2-ll">Comisión Rent2888 ({Math.round(comPct * 100)}%)</span>
                <span className="r2-lv r">−{fmt(com, mon)}</span>
              </div>
              <div className="r2-lrow total">
                <span className="r2-ll b">Neto a transferir</span>
                <span className="r2-lv g">{fmt(neto, mon)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="r2-footer print-exact">
          <span className="r2-fl">rent2888.com</span>
          <span className="r2-fl">Página 1 de 2 &nbsp;·&nbsp; {perLabel}</span>
        </div>
      </div>

      {/* ── PÁGINA 2 ── */}
      <div className="r2-page">
        <div className="r2-p2hdr print-exact">
          <div className="r2-p2title">
            {prop} &nbsp;·&nbsp; {depLabel} &nbsp;·&nbsp; Evolución mensual
          </div>
          <div className="r2-p2sub">{p2sub}</div>
        </div>
        <div className="r2-charts">
          <div className="r2-chart-box">
            <div className="r2-chart-title">Noches por mes</div>
            <BarChart data={hist.noches} labels={hist.labels} kind="noches" />
          </div>
          <div className="r2-chart-box">
            <div className="r2-chart-title">Monto liquidado por mes</div>
            <BarChart data={hist.dinero} labels={hist.labels} kind="monto" />
          </div>
        </div>
        <div className="r2-footer print-exact">
          <span className="r2-fl">rent2888.com</span>
          <span className="r2-fl">Página 2 de 2 &nbsp;·&nbsp; Generado el {today}</span>
        </div>
      </div>
    </div>
  );
}
