import { gateway, generateText } from "ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const additional = typeof body.additional === "string" ? body.additional.trim() : "";
  if (!additional) return NextResponse.json({ error: "Ingresá el contenido adicional." }, { status: 400 });

  const current = {
    compras: Array.isArray(body.compras) ? body.compras : [],
    arreglos: Array.isArray(body.arreglos) ? body.arreglos : [],
    comentarios: Array.isArray(body.comentarios) ? body.comentarios : [],
    notaLibre: typeof body.notaLibre === "string" ? body.notaLibre : "",
  };

  const result = await generateText({
    model: gateway("openai/gpt-5-mini"),
    system: `Sos editor de mails profesionales de administración de alquileres temporarios en Argentina.
Integrá el contenido adicional dentro de la sección más lógica del mail sin inventar datos.
Mejorá gramática, claridad y tono cordial. Respondé ÚNICAMENTE JSON válido con esta forma:
{"section":"compras|arreglos|comentarios|notaLibre","text":"texto final listo para pegar"}.
Usá notaLibre solo si no corresponde claramente a compras, arreglos o comentarios.
No agregues viñetas, emojis ni explicaciones en text.`,
    prompt: JSON.stringify({ additional, current }),
  });

  try {
    const parsed = JSON.parse(result.text) as { section?: string; text?: string };
    const allowed = new Set(["compras", "arreglos", "comentarios", "notaLibre"]);
    if (!allowed.has(parsed.section || "") || !parsed.text?.trim()) throw new Error("Respuesta inválida");
    return NextResponse.json({ section: parsed.section, text: parsed.text.trim() });
  } catch {
    return NextResponse.json({ error: "La IA no devolvió una respuesta válida. Probá nuevamente." }, { status: 502 });
  }
}

export const runtime = "nodejs";
