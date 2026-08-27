import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheetData";

export const dynamic = "force-dynamic";

const rx = /schapira|it436/i;

export async function GET() {
  let data;
  try {
    data = await getSheetData();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 200 }
    );
  }

  // propMap entries que matchean
  const propMapMatch = Object.entries(data.propMap).filter(([k]) => rx.test(k));

  // edificioMap: cualquier depto/edif cuya key o miembros matcheen
  const edificioMapMatch = Object.entries(data.edificioMap)
    .filter(([k, members]) => rx.test(k) || members.some((m) => rx.test(m.prop)))
    .map(([k, members]) => ({ key: k, members }));

  // propToEdif de Carlos
  const propToEdifMatch = Object.entries(data.propToEdif).filter(([k]) => rx.test(k));

  // liqRows del propietario o depto
  const liqMatch = data.liqRows
    .filter((r) => rx.test(r.propietario) || rx.test(r.depto))
    .map((r) => ({ depto: r.depto, prop: r.propietario, mes: r.mesano, ing: r.ingresos, egr: r.egresos, concI: r.conceptoIngreso }));

  const distinctProps = [...new Set(data.liqRows.map((r) => r.propietario))].filter((p) => rx.test(p));
  const distinctDeptos = [...new Set(data.liqRows.filter((r) => rx.test(r.propietario) || rx.test(r.depto)).map((r) => r.depto))];

  return NextResponse.json({
    propMapMatch,
    edificioMapMatch,
    propToEdifMatch,
    distinctProps,
    distinctDeptos,
    liqMatchCount: liqMatch.length,
    liqMatchSample: liqMatch.slice(0, 30),
  });
}
