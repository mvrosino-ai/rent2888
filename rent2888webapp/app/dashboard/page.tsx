import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSheetData } from "@/lib/sheetData";
import { computeLiquidacion } from "@/lib/liquidacion";
import { getCommissionPct } from "@/lib/db";
import { mesLabel, sp } from "@/lib/format";
import { Topbar } from "@/components/Topbar";
import { OwnerFilters } from "@/components/Filters";
import { LiquidacionReport } from "@/components/LiquidacionReport";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ prop?: string; per?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const propietarios = session.user.propietarios ?? [];

  if (propietarios.length === 0) {
    return (
      <>
        <Topbar />
        <main className="max-w-[900px] mx-auto p-3 sm:p-7">
          <div className="text-center py-16 text-ink3">
            Tu cuenta no está vinculada a ningún propietario. Contactá al administrador.
          </div>
        </main>
      </>
    );
  }

  let error: string | null = null;
  let content: React.ReactNode = null;
  let filters: React.ReactNode = null;

  try {
    const [data, comPct] = await Promise.all([getSheetData(), getCommissionPct()]);
    const { prop: propParam, per: perParam } = await searchParams;

    // Propietario activo: el del parámetro si pertenece a la cuenta, si no el primero.
    const prop =
      propParam && propietarios.includes(propParam) ? propParam : propietarios[0];

    // Períodos donde este propietario tiene datos
    const periodos = [
      ...new Set(data.liqRows.filter((r) => r.propietario === prop).map((r) => r.mesano)),
    ].sort(sp);

    if (!periodos.length) {
      // Igual mostramos el selector de propietario (si hay varios) para poder cambiar.
      filters = (
        <OwnerFilters
          propietarios={propietarios}
          prop={prop}
          periodos={[]}
          per=""
        />
      );
      content = (
        <div className="text-center py-16 text-ink3">
          No hay datos disponibles para este propietario todavía.
        </div>
      );
    } else {
      const per =
        perParam && periodos.includes(perParam) ? perParam : periodos[periodos.length - 1];

      filters = (
        <OwnerFilters
          propietarios={propietarios}
          prop={prop}
          periodos={periodos.map((p) => ({ value: p, label: mesLabel(p) }))}
          per={per}
        />
      );
      const liq = computeLiquidacion(data, prop, per, comPct);
      content = <LiquidacionReport liq={liq} />;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar los datos";
  }

  return (
    <>
      <Topbar />
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
