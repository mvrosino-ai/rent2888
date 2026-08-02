"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { RefreshButton } from "./RefreshButton";

const selCls =
  "text-[13px] px-3 py-2 pr-8 border border-line rounded-lg bg-bg text-ink cursor-pointer focus:outline-none focus:border-brand-gold w-full sm:min-w-[220px] appearance-none bg-no-repeat bg-[right_9px_center] bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2710%27%20height=%2710%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%2371717A%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')]";

// Construye la navegación a partir del set COMPLETO de parámetros vigentes
// (resueltos por el servidor y pasados como props). No depende de
// useSearchParams, que durante una transición pendiente puede estar
// desactualizado y hacer que el primer cambio "no enganche".
function useNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  const navigate = (allParams: Record<string, string>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(allParams)) {
      if (v) next.set(k, v);
    }
    start(() => router.push(`${pathname}?${next.toString()}`));
  };
  return { navigate, pending };
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink3">{label}</div>
      {children}
    </div>
  );
}

function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-bg/60 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl bg-card border border-line px-6 py-5 shadow-lg">
        <span className="h-8 w-8 rounded-full border-[3px] border-line border-t-brand-gold animate-spin" />
        <span className="text-[13px] font-medium text-ink2">Cargando datos…</span>
      </div>
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
  const { navigate, pending } = useNav();
  // Meses del más nuevo al más viejo: el seleccionado por defecto (el más
  // reciente) queda arriba y el desplegable se abre hacia abajo.
  const periodosDesc = [...periodos].reverse();

  return (
    <>
    <LoadingOverlay show={pending} />
    <div
      className="no-print bg-card border-b border-line px-3 sm:px-7 py-3.5 flex flex-wrap items-start gap-3"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <Group label="Moneda">
        <div className="flex gap-1">
          <button
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-md border transition ${
              moneda === "u$"
                ? "bg-navy border-navy text-white"
                : "bg-bg border-line text-ink2"
            }`}
            onClick={() => navigate({ moneda: "u$", prop: "", per })}
          >
            💵 USD
          </button>
          <button
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-md border transition ${
              moneda === "$"
                ? "bg-brand-green border-brand-green text-white"
                : "bg-bg border-line text-ink2"
            }`}
            onClick={() => navigate({ moneda: "$", prop: "", per })}
          >
            🇦🇷 Pesos
          </button>
        </div>
      </Group>
      <Group label="Propietario">
        <select
          className={selCls}
          value={prop}
          onChange={(e) => navigate({ moneda, prop: e.target.value, per })}
        >
          <option value="">Seleccionar...</option>
          {propietarios.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Group>
      <Group label="Período">
        <select
          className={selCls}
          value={per}
          onChange={(e) => navigate({ moneda, prop, per: e.target.value })}
        >
          <option value="">Seleccionar...</option>
          {periodosDesc.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Group>
      <div className="ml-auto self-end">
        <RefreshButton />
      </div>
    </div>
    </>
  );
}

export function PeriodFilter({
  periodos,
  per,
}: {
  periodos: { value: string; label: string }[];
  per: string;
}) {
  const { navigate, pending } = useNav();
  const periodosDesc = [...periodos].reverse();
  return (
    <>
    <LoadingOverlay show={pending} />
    <div
      className="no-print bg-card border-b border-line px-3 sm:px-7 py-3.5 flex flex-wrap items-start gap-3"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <Group label="Período">
        <select className={selCls} value={per} onChange={(e) => navigate({ per: e.target.value })}>
          {periodosDesc.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Group>
    </div>
    </>
  );
}

export function OwnerFilters({
  propietarios,
  prop,
  periodos,
  per,
}: {
  propietarios: string[];
  prop: string;
  periodos: { value: string; label: string }[];
  per: string;
}) {
  const { navigate, pending } = useNav();
  const periodosDesc = [...periodos].reverse();
  const varios = propietarios.length > 1;
  return (
    <>
    <LoadingOverlay show={pending} />
    <div
      className="no-print bg-card border-b border-line px-3 sm:px-7 py-3.5 flex flex-wrap items-start gap-3"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      {varios && (
        <Group label="Propietario">
          <select
            className={selCls}
            value={prop}
            onChange={(e) => navigate({ prop: e.target.value })}
          >
            {propietarios.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Group>
      )}
      <Group label="Período">
        <select
          className={selCls}
          value={per}
          onChange={(e) => navigate({ prop, per: e.target.value })}
        >
          {periodosDesc.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Group>
    </div>
    </>
  );
}

export function CuentaFilter({
  cuentas,
  cuenta,
}: {
  cuentas: string[];
  cuenta: string;
}) {
  const { navigate, pending } = useNav();
  return (
    <>
    <LoadingOverlay show={pending} />
    <div
      className="no-print bg-card border-b border-line px-3 sm:px-7 py-3.5 flex flex-wrap items-start gap-3"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <Group label="Cuenta">
        <select className={selCls} value={cuenta} onChange={(e) => navigate({ cuenta: e.target.value })}>
          {cuentas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Group>
    </div>
    </>
  );
}
