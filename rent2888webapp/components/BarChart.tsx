"use client";

// Port fiel de drawSVG() de index.html — misma matemática, salida JSX en vez de innerHTML.

import { useState } from "react";

function fmtMonto(v: number): string {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(0) + "k";
  return String(v);
}

export function BarChart({
  data,
  labels,
  kind,
  activeColor = "#e8543a",
  version = 1,
}: {
  data: number[];
  labels: string[];
  kind: "noches" | "monto";
  activeColor?: string;
  version?: 1 | 2 | 3;
}) {
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const fmtVal = kind === "noches" ? (v: number) => v + "n" : fmtMonto;
  const fmtFullVal = (v: number) =>
    kind === "monto"
      ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v)
      : `${v} noches`;

  const W = 600,
    H = 260,
    pL = 48,
    pR = 12,
    pT = 24,
    pB = 50;
  const cW = W - pL - pR,
    cH = H - pT - pB;
  const n = data.length,
    cur = n - 1;
  const maxV = Math.max(...data, 1);
  const slot = cW / n;
  const bW = Math.max(6, slot * 0.65);
  const steps = 4;

  const els: React.ReactNode[] = [];

  for (let i = 0; i <= steps; i++) {
    const v = Math.round((maxV / steps) * i);
    const y = pT + cH - (cH * i) / steps;
    els.push(
      <line
        key={`g${i}`}
        x1={pL}
        y1={y.toFixed(1)}
        x2={W - pR}
        y2={y.toFixed(1)}
        stroke="#f0f3f9"
        strokeWidth="1"
      />,
      <text
        key={`gl${i}`}
        x={pL - 5}
        y={(y + 4).toFixed(1)}
        textAnchor="end"
        fontSize="11"
        fill="#8a95a8"
        fontFamily="var(--font-dm-sans),sans-serif"
      >
        {fmtVal(v)}
      </text>
    );
  }

  // Tamaño de fuente de las etiquetas de valor: se achica cuando hay muchas
  // barras para que TODAS entren sin encimarse.
  const valFont = n > 16 ? 8 : n > 12 ? 9 : 10;

  data.forEach((v, i) => {
    const isCur = i === cur;
    const bH = Math.max(3, (v / maxV) * cH);
    const x = pL + i * slot + (slot - bW) / 2;
    const y = pT + cH - bH;
    const fill = isCur ? activeColor : "#d1d9f0";
    els.push(
      <rect
        key={`b${i}`}
        x={x.toFixed(1)}
        y={y.toFixed(1)}
        width={bW.toFixed(1)}
        height={bH.toFixed(1)}
        fill={fill}
        rx="2"
        role="img"
        aria-label={`${labels[i]}: ${kind === "monto" ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v) : `${v} noches`}`}
      >
        <title>{`${labels[i]}: ${kind === "monto" ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v) : `${v} noches`}`}</title>
      </rect>
    );
    // V2: monto dentro de cada barra y nombre del mes dentro, vertical.
    // V1 conserva el formato actual para poder seguir descargando reportes.
    els.push(
      <text
        key={`v${i}`}
        x={(x + bW / 2).toFixed(1)}
        y={version === 2 ? (y + Math.min(bH - 4, 15)).toFixed(1) : (y - 4).toFixed(1)}
        textAnchor="middle"
        fontSize={version === 2 ? Math.max(9, valFont) : isCur ? valFont + 1 : valFont}
        fontWeight={isCur ? "700" : "500"}
        fill={version === 2 ? (isCur ? "#ffffff" : "#26315f") : isCur ? activeColor : "#8a95a8"}
        fontFamily="var(--font-dm-sans),sans-serif"
        transform={version === 2 ? `rotate(-90 ${(x + bW / 2).toFixed(1)} ${(y + Math.min(bH - 4, 15)).toFixed(1)})` : undefined}
      >
        {fmtVal(v)}
      </text>
    );
    if (version === 2) {
      const monthY = y + bH / 2;
      els.push(
        <text
          key={`l${i}`}
          x={(x + bW / 2).toFixed(1)}
          y={monthY.toFixed(1)}
          textAnchor="middle"
          fontSize="10"
          fontWeight={isCur ? "700" : "600"}
          fill={isCur ? "#ffffff" : "#26315f"}
          fontFamily="var(--font-dm-sans),sans-serif"
          transform={`rotate(-90 ${(x + bW / 2).toFixed(1)} ${monthY.toFixed(1)})`}
        >
          {labels[i]}
        </text>
      );
    }
    els.push(
      <rect
        key={`hit${i}`}
        x={(x - 2).toFixed(1)}
        y={pT}
        width={(bW + 4).toFixed(1)}
        height={cH}
        fill="transparent"
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setActiveBar(i)}
        onMouseLeave={() => setActiveBar(null)}
        onClick={() => setActiveBar((current) => (current === i ? null : i))}
        aria-label={`Ver detalle de ${labels[i]}`}
      />
    );
    if (version !== 2 && (i % 3 === 0 || isCur)) {
      els.push(
        <text
          key={`l${i}`}
          x={(x + bW / 2).toFixed(1)}
          y={(pT + cH + 14).toFixed(1)}
          textAnchor="middle"
          fontSize="11"
          fontWeight={isCur ? "700" : "400"}
          fill={isCur ? activeColor : "#8a95a8"}
          fontFamily="var(--font-dm-sans),sans-serif"
        >
          {labels[i]}
        </text>
      );
    }
  });

  if (activeBar !== null) {
    const i = activeBar;
    const v = data[i];
    const x = pL + i * slot + (slot - bW) / 2;
    const y = pT + cH - Math.max(3, (v / maxV) * cH);
    const tooltipW = kind === "monto" ? 116 : 92;
    const tooltipX = Math.min(Math.max(pL, x + bW / 2 - tooltipW / 2), W - pR - tooltipW);
    const tooltipY = Math.max(2, y - 28);
    els.push(
      <g key="tooltip" pointerEvents="none">
        <rect x={tooltipX} y={tooltipY} width={tooltipW} height="23" rx="4" fill="#202a58" />
        <text x={tooltipX + tooltipW / 2} y={tooltipY + 9} textAnchor="middle" fontSize="8" fontWeight="600" fill="#ffffff" fontFamily="var(--font-dm-sans),sans-serif">
          {labels[i]}
        </text>
        <text x={tooltipX + tooltipW / 2} y={tooltipY + 18} textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff" fontFamily="var(--font-dm-sans),sans-serif">
          {fmtFullVal(v)}
        </text>
      </g>
    );
  }

  return (
    <div className={version === 3 ? "space-y-2" : undefined}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {els}
        <rect x={pL} y={H - 14} width="10" height="10" fill={activeColor} rx="1" />
      <text
        x={pL + 14}
        y={H - 5}
        fontSize="11"
        fill="#8a95a8"
        fontFamily="var(--font-dm-sans),sans-serif"
      >
        Mes actual
      </text>
      <rect x={pL + 120} y={H - 14} width="10" height="10" fill="#d1d9f0" rx="1" />
      <text
        x={pL + 134}
        y={H - 5}
        fontSize="11"
        fill="#8a95a8"
        fontFamily="var(--font-dm-sans),sans-serif"
      >
        Meses anteriores
        </text>
      </svg>
      {version === 3 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 px-8 text-[10px] text-ink2 print:text-[9px]">
          {labels.map((label, i) => (
            <div key={`${label}-${i}`} className="flex items-center justify-between gap-2 border-b border-line/60 py-0.5">
              <span className="font-medium text-ink">{label}</span>
              <span className="font-semibold tabular-nums">{fmtFullVal(data[i])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
