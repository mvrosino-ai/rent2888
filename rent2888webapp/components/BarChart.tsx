// Port fiel de drawSVG() de index.html — misma matemática, salida JSX en vez de innerHTML.

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
}: {
  data: number[];
  labels: string[];
  kind: "noches" | "monto";
  activeColor?: string;
}) {
  const fmtVal = kind === "noches" ? (v: number) => v + "n" : fmtMonto;

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
      />
    );
    // Etiqueta de valor en TODAS las barras.
    els.push(
      <text
        key={`v${i}`}
        x={(x + bW / 2).toFixed(1)}
        y={(y - 4).toFixed(1)}
        textAnchor="middle"
        fontSize={isCur ? valFont + 1 : valFont}
        fontWeight={isCur ? "700" : "500"}
        fill={isCur ? activeColor : "#8a95a8"}
        fontFamily="var(--font-dm-sans),sans-serif"
      >
        {fmtVal(v)}
      </text>
    );
    if (i % 3 === 0 || isCur) {
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

  return (
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
  );
}
