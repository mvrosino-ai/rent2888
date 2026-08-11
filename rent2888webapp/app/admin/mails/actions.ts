"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MESES } from "@/lib/format";
import { getSheetData } from "@/lib/sheetData";
import {
  getCommissionPct,
  listMails,
  getMailById,
  saveGeneratedMail,
  updateMailContent,
  setMailSent,
  createSpecialMail,
  deleteMail,
  type DbMail,
} from "@/lib/db";
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

// ── Mapeo DbMail → MailResult (forma que consume el cliente) ──

function mesNombreOf(per: string): string {
  const idx = Number(per.split("/")[0]);
  return MESES[idx] || "";
}

function toResult(m: DbMail): MailResult {
  const hasNov =
    m.compras.length + m.arreglos.length > 0 ||
    m.comentarios.some((c) => c.trim() && c !== DEFAULT_COMENTARIO);
  return {
    id: m.id,
    periodo: m.periodo,
    propietario: m.propietario,
    mail: m.mail,
    asunto: m.asunto,
    nombre: m.nombre,
    moneda: m.moneda,
    deptos: m.deptos,
    mesNombre: mesNombreOf(m.periodo),
    compras: m.compras,
    arreglos: m.arreglos,
    comentarios: m.comentarios,
    notaLibre: m.nota_libre || "",
    especial: m.especial,
    edited: m.edited,
    sent: m.sent,
    sentAt: m.sent_at,
    hasNov: m.especial ? true : hasNov,
    matched: m.matched,
  };
}

// ── Clasificación / redacción con IA ──

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

async function clasificarConIA(conExtras: MailTarget[]): Promise<Map<string, Clasificacion>> {
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

/** Convierte un target + su clasificación IA en las 3 listas del mail. */
function buildSections(t: MailTarget, c: Clasificacion | undefined) {
  const compras = c?.compras ?? [];
  const arreglos = c?.arreglos ?? [];
  let comentarios = c?.comentarios ?? [];
  if (compras.length + arreglos.length + comentarios.length === 0) {
    comentarios = [DEFAULT_COMENTARIO];
  }
  return { compras, arreglos, comentarios };
}

// ── Resultados ──

export type GenerateResult =
  | {
      ok: true;
      per: string;
      mesNombre: string;
      mails: MailResult[];
      rowCount: number;
      targetCount: number;
    }
  | { ok: false; error: string };

export type MutationResult = { ok: true; mails: MailResult[] } | { ok: false; error: string };

// ── Acciones ──

/** Carga los mails ya guardados del mes en curso (sin llamar a la IA). */
export async function loadMailsAction(): Promise<GenerateResult> {
  try {
    await requireAdmin();
    const [data, comPct] = await Promise.all([getSheetData(), getCommissionPct()]);
    const { per, mesNombre, targets, rowCount } = await getMailTargets(data, comPct);
    const mails = (await listMails(per)).map(toResult);
    return { ok: true, per, mesNombre, mails, rowCount, targetCount: targets.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al cargar los mails" };
  }
}

/**
 * Genera (o regenera) los mails del mes con IA y los guarda en la base.
 * Conserva las ediciones manuales: los mails ya editados a mano no se pisan.
 */
export async function generateMailsAction(): Promise<GenerateResult> {
  try {
    await requireAdmin();
    const [data, comPct] = await Promise.all([getSheetData(), getCommissionPct()]);
    const { per, mesNombre, targets, rowCount } = await getMailTargets(data, comPct);

    const conExtras = targets.filter((t) => t.extras.length > 0);
    const clasificados = conExtras.length
      ? await clasificarConIA(conExtras)
      : new Map<string, Clasificacion>();

    for (const t of targets) {
      const { compras, arreglos, comentarios } = buildSections(t, clasificados.get(t.propietario));
      await saveGeneratedMail({
        periodo: per,
        propietario: t.propietario,
        mail: t.mail,
        asunto: t.asunto,
        nombre: t.nombre,
        moneda: t.moneda,
        deptos: t.deptos,
        compras,
        arreglos,
        comentarios,
        matched: t.mainProp !== null,
      });
    }

    const mails = (await listMails(per)).map(toResult);
    return { ok: true, per, mesNombre, mails, rowCount, targetCount: targets.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al generar los mails" };
  }
}

/** Rehace con IA un único propietario, pisando su contenido (incluso si estaba editado). */
export async function regenerateOneAction(propietario: string): Promise<MutationResult> {
  try {
    await requireAdmin();
    const [data, comPct] = await Promise.all([getSheetData(), getCommissionPct()]);
    const { per, targets } = await getMailTargets(data, comPct);
    const t = targets.find((x) => x.propietario === propietario);
    if (!t) return { ok: false, error: "No encontré ese propietario en la planilla." };

    const clasificados = t.extras.length
      ? await clasificarConIA([t])
      : new Map<string, Clasificacion>();
    const { compras, arreglos, comentarios } = buildSections(t, clasificados.get(t.propietario));

    await saveGeneratedMail(
      {
        periodo: per,
        propietario: t.propietario,
        mail: t.mail,
        asunto: t.asunto,
        nombre: t.nombre,
        moneda: t.moneda,
        deptos: t.deptos,
        compras,
        arreglos,
        comentarios,
        matched: t.mainProp !== null,
      },
      { force: true }
    );

    const mails = (await listMails(per)).map(toResult);
    return { ok: true, mails };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al regenerar el mail" };
  }
}

/** Guarda la edición manual de un mail (secciones + nota libre + contacto). */
export async function saveMailEditAction(input: {
  id: string;
  mail: string;
  asunto: string;
  nombre: string;
  compras: string[];
  arreglos: string[];
  comentarios: string[];
  notaLibre: string;
}): Promise<MutationResult> {
  try {
    await requireAdmin();
    const existing = await getMailById(input.id);
    if (!existing) return { ok: false, error: "Mail no encontrado." };
    await updateMailContent(input.id, {
      mail: input.mail,
      asunto: input.asunto,
      nombre: input.nombre,
      compras: input.compras.map((s) => s.trim()).filter(Boolean),
      arreglos: input.arreglos.map((s) => s.trim()).filter(Boolean),
      comentarios: input.comentarios.map((s) => s.trim()).filter(Boolean),
      notaLibre: input.notaLibre,
    });
    const mails = (await listMails(existing.periodo)).map(toResult);
    return { ok: true, mails };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar" };
  }
}

/** Marca / desmarca un mail como enviado. */
export async function toggleSentAction(id: string, sent: boolean): Promise<MutationResult> {
  try {
    await requireAdmin();
    const existing = await getMailById(id);
    if (!existing) return { ok: false, error: "Mail no encontrado." };
    await setMailSent(id, sent);
    const mails = (await listMails(existing.periodo)).map(toResult);
    return { ok: true, mails };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar" };
  }
}

/** Crea un mail especial (fe de erratas u otro) dirigido a un propietario. */
export async function createSpecialAction(input: {
  propietario: string;
  mail: string;
  asunto: string;
  nombre: string;
  moneda: string;
  deptos: string[];
  cuerpo: string;
}): Promise<MutationResult> {
  try {
    await requireAdmin();
    if (!input.propietario.trim()) return { ok: false, error: "Falta el propietario." };
    if (!input.cuerpo.trim()) return { ok: false, error: "El cuerpo del mail está vacío." };
    const [data, comPct] = await Promise.all([getSheetData(), getCommissionPct()]);
    const { per } = await getMailTargets(data, comPct);
    await createSpecialMail({
      periodo: per,
      propietario: input.propietario.trim(),
      mail: input.mail.trim(),
      asunto: input.asunto.trim(),
      nombre: input.nombre.trim(),
      moneda: input.moneda || "$",
      deptos: input.deptos,
      cuerpo: input.cuerpo,
    });
    const mails = (await listMails(per)).map(toResult);
    return { ok: true, mails };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear el mail" };
  }
}

/** Elimina un mail (pensado para los especiales). */
export async function deleteMailAction(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();
    const existing = await getMailById(id);
    if (!existing) return { ok: false, error: "Mail no encontrado." };
    await deleteMail(id);
    const mails = (await listMails(existing.periodo)).map(toResult);
    return { ok: true, mails };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar" };
  }
}
