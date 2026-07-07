"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

const selCls =
  "text-[13px] px-3 py-2 pr-8 border border-line rounded-lg bg-bg text-ink cursor-pointer focus:outline-none focus:border-brand-gold min-w-[220px] appearance-none bg-no-repeat bg-[right_9px_center] bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2710%27%20height=%2710%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%2371717A%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')]";

function useParamNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const setParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.push(`${pathname}?${next.toString()}`));
  };
  return { params, setParams, pending };
}

/** Overlay con spinner que cubre la página mientras se recargan los datos al cambiar un filtro. */
function PendingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="no-print fixed inset-0 z-[300] bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3.5">
      <div className="w-9 h-9 rounded-full border-[3px] border-line border-t-brand-gold animate-spin" />
      <div className="text-ink2 text-sm">Cargando reportes...</div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink3">{label}</div>
      {children}
    </div>
  );
}

export function AdminFilters({
  propietarios,
  periodos,
  moneda,
  prop,
  per,
}: {
  propietarios: string[];
  periodos: { value: string; label: string }[];
  moneda: string;
  prop: string;
  per: string;
}) {
  const { setParams, pending } = useParamNav();

  return (
    <div
      className="no-print bg-card border-b border-line px-7 py-3.5 flex flex-wrap items-start gap-3"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <PendingOverlay show={pending} />
      <Group label="Moneda">
        <div className="flex gap-1">
          <button
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-md border transition ${
              moneda === "u$"
                ? "bg-navy border-navy text-white"
                : "bg-bg border-line text-ink2"
            }`}
            onClick={() => setParams({ moneda: "u$", prop: "" })}
          >
            💵 USD
          </button>
          <button
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-md border transition ${
              moneda === "$"
                ? "bg-brand-green border-brand-green text-white"
                : "bg-bg border-line text-ink2"
            }`}
            onClick={() => setParams({ moneda: "$", prop: "" })}
          >
            🇦🇷 Pesos
          </button>
        </div>
      </Group>
      <Group label="Propietario">
        <select className={selCls} value={prop} onChange={(e) => setParams({ prop: e.target.value })}>
          <option value="">Seleccionar...</option>
          {propietarios.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Group>
      <Group label="Período">
        <select className={selCls} value={per} onChange={(e) => setParams({ per: e.target.value })}>
          <option value="">Seleccionar...</option>
          {periodos.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Group>
    </div>
  );
}

export function PeriodFilter({
  periodos,
  per,
}: {
  periodos: { value: string; label: string }[];
  per: string;
}) {
  const { setParams, pending } = useParamNav();
  return (
    <div
      className="no-print bg-card border-b border-line px-7 py-3.5 flex flex-wrap items-start gap-3"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <PendingOverlay show={pending} />
      <Group label="Período">
        <select className={selCls} value={per} onChange={(e) => setParams({ per: e.target.value })}>
          {periodos.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Group>
    </div>
  );
}

export function CuentaFilter({
  cuentas,
  cuenta,
}: {
  cuentas: string[];
  cuenta: string;
}) {
  const { setParams, pending } = useParamNav();
  return (
    <div
      className="no-print bg-card border-b border-line px-7 py-3.5 flex flex-wrap items-start gap-3"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <PendingOverlay show={pending} />
      <Group label="Cuenta">
        <select className={selCls} value={cuenta} onChange={(e) => setParams({ cuenta: e.target.value })}>
          {cuentas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Group>
    </div>
  );
}
