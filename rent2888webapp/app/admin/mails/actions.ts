"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSheetData } from "@/lib/sheetData";
import { getCommissionPct } from "@/lib/db";
import { getMailTargets, type MailTarget } from "@/lib/mailsSheet";
import type { MailResult } from "@/lib/mailTypes";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
  return session;
}

const DEFAULT_COMENTARIO = "Sin arreglos ni compras adicionales durante este período.";

// Modelo del AI Gateway (zero-config en v0 para OpenAI). Rápido y bueno en español.
const MODEL = "openai/gpt-4.1-mini";

const clasificacionSchema = z.object({
  mails: z.array(
    z.object({
      propietario: z.string().describe("Nombre EXACTO del propietario tal como se envió"),
      compras: z.array(z.string()).describe("Compras de insumos, muebles, electro, etc."),
      arreglos: z.array(z.string()).describe("Reparaciones, service, plomería, pintura, etc."),
      comentarios: z.array(z.string()).describe("Gestiones o avisos que no son compra ni arreglo"),
    })
  ),
});

type Clasificacion = z.infer<typeof clasificacionSchema>["mails"][number];

/** Llama a la IA para redactar y clasificar los gastos extra de varios propietarios. */
async function clasificarConIA(
  conExtras: MailTarget[]
): Promise<Map<string, Clasificacion>> {
  const input = conExtras.map((t) => ({
    propietario: t.propietario,
    variosDeptos: t.deptos.length > 1,
    gastos: t.extras.map((e) => ({ concepto: e.concepto, depto: e.depto })),
  }));

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: clasificacionSchema }),
    system: [
      "Sos parte del equipo de Rent2888, una empresa de administración de alquileres temporarios.",
      "Redactás los mails mensuales de liquidación para los propietarios en español rioplatense, con tono cordial y profesional.",
      "Te paso, por propietario, una lista de anotaciones crudas de gastos del mes. Tu tarea es:",
      "1. Reescribir cada anotación de forma prolija y profesional (NO copiar el texto crudo literal, ni incluir montos).",
      "2. Clasificar cada ítem en una de tres categorías:",
      "   - compras: compra de insumos, muebles, electrodomésticos, artículos para el depto.",
      "   - arreglos: reparaciones, mantenimiento, service, plomería, electricidad, pintura, cerrajería.",
      "   - comentarios: gestiones o avisos que no son ni compra ni arreglo (inspecciones, copias de llaves, trámites).",
      "3. Si el propietario tiene varios deptos (variosDeptos = true), aclarar el depto entre paréntesis al final del ítem.",
      "4. No inventar información: basate únicamente en la anotación provista.",
      "Devolvé un objeto por cada propietario recibido, usando su nombre EXACTO.",
    ].join("\n"),
    prompt: JSON.stringify(input, null, 2),
  });

  const map = new Map<string, Clasificacion>();
  for (const c of output.mails) map.set(c.propietario, c);
  return map;
}

export type GenerateResult =
  | { ok: true; per: string; mesNombre: string; mails: MailResult[] }
  | { ok: false; error: string };

/** Genera todos los mails del mes en curso (según la planilla de mails). */
export async function generateMailsAction(): Promise<GenerateResult> {
  try {
    await requireAdmin();
    const [data, comPct] = await Promise.all([getSheetData(), getCommissionPct()]);
    const { per, mesNombre, targets } = await getMailTargets(data, comPct);

    const conExtras = targets.filter((t) => t.extras.length > 0);
    const clasificados = conExtras.length
      ? await clasificarConIA(conExtras)
      : new Map<string, Clasificacion>();

    const mails: MailResult[] = targets.map((t) => {
      const c = clasificados.get(t.propietario);
      const compras = c?.compras ?? [];
      const arreglos = c?.arreglos ?? [];
      let comentarios = c?.comentarios ?? [];
      const hasNov = compras.length + arreglos.length + comentarios.length > 0;
      if (!hasNov) comentarios = [DEFAULT_COMENTARIO];

      return {
        propietario: t.propietario,
        mail: t.mail,
        asunto: t.asunto,
        nombre: t.nombre,
        moneda: t.moneda,
        deptos: t.deptos,
        mesNombre,
        compras,
        arreglos,
        comentarios,
        hasNov,
        matched: t.mainProp !== null,
      };
    });

    return { ok: true, per, mesNombre, mails };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al generar los mails" };
  }
}
