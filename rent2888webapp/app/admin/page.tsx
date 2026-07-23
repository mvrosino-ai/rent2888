import { Suspense } from "react";
import { getSheetData } from "@/lib/sheetData";
import {
  computeLiquidacion,
  getPeriodos,
  getPropietariosActivos,
} from "@/lib/liquidacion";
import { getCommissionPct } from "@/lib/db";
import { mesLabel } from "@/lib/format";
import { Topbar } from "@/components/Topbar";
import { AdminFilters } from "@/components/Filters";
import { LiquidacionReport } from "@/components/LiquidacionReport";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ moneda?: string; prop?: string; per?: string }>;
}) {
  const sp = await searchParams;
  return (
    <>
      <Topbar />
      <Suspense key={JSON.stringify(sp)} fallback={<AdminSkeleton />}>
        <AdminBody sp={sp} />
      </Suspense>
    </>
  );
}

function AdminSkeleton() {
  return (
    <>
      <div className="no-print bg-card border-b border-line px-7 py-3.5 h-[62px]" />
      <main className="max-w-[900px] mx-auto p-3 sm:p-7">
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="h-7 w-7 rounded-full border-[3px] border-line border-t-brand-gold animate-spin" />
          <div className="text-[13px] text-ink3">Cargando datos…</div>
        </div>
      </main>
    </>
  );
}

async function AdminBody({
  sp,
}: {
  sp: { moneda?: string; prop?: string; per?: string };
}) {
  const moneda = sp.moneda === "$" ? "$" : "u$";

  let error: string | null = null;
  let filters: React.ReactNode = null;
  let content: React.ReactNode = (
    <div className="text-center py-16 text-ink3">Seleccioná un propietario y período.</div>
  );

  try {
    const [data, comPct] = await Promise.all([getSheetData(), getCommissionPct()]);

    const propietarios = getPropietariosActivos(data, moneda);
    const periodos = getPeriodos(data);
    const per = sp.per && periodos.includes(sp.per) ? sp.per : periodos[periodos.length - 1] || "";
    const prop = sp.prop && propietarios.includes(sp.prop) ? sp.prop : "";

    filters = (
      <AdminFilters
        propietarios={propietarios}
        periodos={periodos.map((p) => ({ value: p, label: mesLabel(p) }))}
        moneda={moneda}
        prop={prop}
        per={per}
      />
    );

    if (prop && per) {
      const liq = computeLiquidacion(data, prop, per, comPct);
      content = <LiquidacionReport liq={liq} />;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar los datos";
  }

  return (
    <>
      {filters}
      <main className="max-w-[900px] mx-auto p-3 sm:p-7">
        {error ? (
          <div className="text-center py-16 max-w-sm mx-auto">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="font-semibold mb-1.5">Error al cargar</div>
            <div className="text-[13px] text-ink2">{error}</div>
          </div>
        ) : (
          content
        )}
      </main>
    </>
  );
}
