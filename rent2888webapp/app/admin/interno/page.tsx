import { getSheetData } from "@/lib/sheetData";
import { computeCuentaInterna, getCuentas } from "@/lib/interno";
import { Topbar } from "@/components/Topbar";
import { CuentaFilter } from "@/components/Filters";
import { CuentaInternaReport } from "@/components/CuentaInternaReport";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export default async function InternoPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string }>;
}) {
  const sp = await searchParams;

  let error: string | null = null;
  let filters: React.ReactNode = null;
  let content: React.ReactNode = (
    <div className="text-center py-16 text-ink3">Seleccioná una cuenta.</div>
  );

  try {
    const data = await getSheetData();
    const cuentas = getCuentas(data);
    const cuenta = sp.cuenta && cuentas.includes(sp.cuenta) ? sp.cuenta : cuentas[0] || "";

    filters = <CuentaFilter cuentas={cuentas} cuenta={cuenta} />;

    if (cuenta) {
      const ci = computeCuentaInterna(data, cuenta);
      content = <CuentaInternaReport ci={ci} />;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar los datos";
  }

  return (
    <>
      <Topbar />
      {filters}
      <main className="max-w-[1000px] mx-auto p-7">
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
