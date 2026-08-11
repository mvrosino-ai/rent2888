"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  generateMailsAction,
  regenerateOneAction,
  saveMailEditAction,
  toggleSentAction,
  createSpecialAction,
  deleteMailAction,
  type GenerateResult,
  type MutationResult,
} from "./actions";
import { buildMailBody, greetingOf, type MailResult } from "@/lib/mailTypes";

type Filter = "all" | "pend" | "env" | "nov" | "sin" | "usd" | "ars" | "esp";

interface Meta {
  per: string;
  mesNombre: string;
  rowCount: number;
  targetCount: number;
}

export function MailsClient({ initial }: { initial: GenerateResult }) {
  const [meta, setMeta] = useState<Meta | null>(initial.ok ? initial : null);
  const [mails, setMails] = useState<MailResult[]>(initial.ok ? initial.mails : []);
  const [loadError, setLoadError] = useState<string | null>(initial.ok ? null : initial.error);
  const [generated, setGenerated] = useState(initial.ok && initial.mails.length > 0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showSpecial, setShowSpecial] = useState(false);

  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const applyMutation = (r: MutationResult) => {
    if (r.ok) {
      setMails(r.mails);
      setActionError(null);
    } else {
      setActionError(r.error);
    }
  };

  const generate = () =>
    startTransition(async () => {
      setActionError(null);
      const r = await generateMailsAction();
      if (r.ok) {
        setMeta(r);
        setMails(r.mails);
        setLoadError(null);
        setGenerated(true);
      } else {
        setLoadError(r.error);
      }
    });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mails.filter((m) => {
      if (filter === "pend" && m.sent) return false;
      if (filter === "env" && !m.sent) return false;
      if (filter === "nov" && (m.especial || !m.hasNov)) return false;
      if (filter === "sin" && (m.especial || m.hasNov)) return false;
      if (filter === "usd" && m.moneda !== "u$") return false;
      if (filter === "ars" && m.moneda !== "$") return false;
      if (filter === "esp" && !m.especial) return false;
      if (q) {
        const hay = (m.propietario + " " + m.deptos.join(" ") + " " + m.asunto).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [mails, query, filter]);

  const current = mails.find((m) => m.id === selectedId) || null;

  // Si el mail seleccionado desaparece tras una mutación, limpiar selección.
  useEffect(() => {
    if (selectedId && !mails.some((m) => m.id === selectedId)) setSelectedId(null);
  }, [mails, selectedId]);

  const stats = useMemo(() => {
    const usd = mails.filter((m) => m.moneda === "u$").length;
    const ars = mails.filter((m) => m.moneda === "$").length;
    const nov = mails.filter((m) => !m.especial && m.hasNov).length;
    const sent = mails.filter((m) => m.sent).length;
    const esp = mails.filter((m) => m.especial).length;
    return { total: mails.length, usd, ars, nov, sent, esp };
  }, [mails]);

  // Autocompletado para el formulario de mail especial: datos de contacto por prop.
  const contactByProp = useMemo(() => {
    const map = new Map<string, MailResult>();
    for (const m of mails) if (!m.especial && !map.has(m.propietario)) map.set(m.propietario, m);
    return map;
  }, [mails]);

  return (
    <main className="flex flex-col h-[calc(100vh-52px)]">
      {/* Toolbar */}
      <div className="no-print bg-card border-b border-line px-3 sm:px-7 py-3 flex flex-wrap items-center gap-3">
        <button
          onClick={generate}
          disabled={pending}
          className="bg-navy text-white text-[13px] font-semibold px-5 py-2 rounded-lg hover:opacity-85 transition disabled:opacity-50 flex items-center gap-2"
        >
          {pending ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Procesando…
            </>
          ) : generated ? (
            "Regenerar mails"
          ) : (
            "Generar mails"
          )}
        </button>

        {meta && (
          <button
            onClick={() => setShowSpecial(true)}
            disabled={pending}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg border border-line text-ink2 hover:bg-bg transition disabled:opacity-50"
          >
            + Mail especial
          </button>
        )}

        {meta && (
          <>
            <div className="text-[13px] text-ink2">
              <span className="font-semibold text-ink">{meta.mesNombre}</span> · {stats.total} mails
              <span className="text-ink3">
                {" "}
                · {stats.sent} enviados · {stats.nov} con nov. · {stats.usd} USD · {stats.ars} ARS
                {stats.esp > 0 ? ` · ${stats.esp} esp.` : ""}
              </span>
            </div>

            <div className="flex-1" />

            <div className="relative min-w-[180px] flex-1 sm:flex-none sm:w-56">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar propietario o depto…"
                className="w-full pl-3 pr-3 py-1.5 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
              />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {(
                [
                  ["all", "Todos"],
                  ["pend", "Pendientes"],
                  ["env", "Enviados"],
                  ["nov", "Con nov."],
                  ["sin", "Sin nov."],
                  ["usd", "USD"],
                  ["ars", "ARS"],
                  ["esp", "Especiales"],
                ] as [Filter, string][]
              ).map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[12px] px-3 py-1.5 rounded-full border transition ${
                    filter === f
                      ? "bg-navy text-white border-navy"
                      : "bg-card text-ink2 border-line hover:bg-bg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Aviso de posible filtro en la planilla */}
      {meta && (
        <FilterWarning rowCount={meta.rowCount} targetCount={meta.targetCount} />
      )}

      {/* Errores */}
      {loadError && (
        <div className="px-7 py-4 text-[13px] text-brand-red bg-brand-red-bg border-b border-line">
          {loadError}
        </div>
      )}
      {actionError && (
        <div className="no-print px-7 py-2.5 text-[13px] text-brand-red bg-brand-red-bg border-b border-line flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-ink3 hover:text-ink">
            ✕
          </button>
        </div>
      )}

      {/* Contenido */}
      {!meta && !loadError ? (
        <EmptyIntro pending={pending} />
      ) : meta && mails.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 px-6">
          <p className="text-ink2 text-[14px]">
            Todavía no generaste los mails de <strong>{meta.mesNombre}</strong>.
          </p>
          <p className="text-ink3 text-[13px]">
            Tocá &quot;Generar mails&quot; para crearlos con IA y guardarlos.
          </p>
        </div>
      ) : meta ? (
        <div className="flex flex-1 min-h-0">
          {/* Lista */}
          <div className="w-[260px] shrink-0 overflow-y-auto bg-card border-r border-line">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-ink3 text-[13px]">Sin resultados</div>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left px-3.5 py-2.5 border-b border-line/70 transition ${
                    selectedId === m.id ? "bg-brand-gold-bg" : "hover:bg-bg"
                  }`}
                >
                  <div className="text-[13px] font-semibold text-ink truncate flex items-center gap-1.5">
                    {m.sent && <span className="text-brand-green">✓</span>}
                    {m.propietario}
                  </div>
                  <div className="text-[11px] text-ink3 truncate">{m.mail || "— sin mail —"}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {m.especial ? (
                      <Badge tone="navy">especial</Badge>
                    ) : (
                      <Badge tone={m.hasNov ? "green" : "muted"}>{m.hasNov ? "nov." : "sin"}</Badge>
                    )}
                    <Badge tone={m.moneda === "u$" ? "navy" : "gold"}>
                      {m.moneda === "u$" ? "USD" : "ARS"}
                    </Badge>
                    {m.edited && !m.especial && <Badge tone="gold">editado</Badge>}
                    {m.deptos.length > 1 && <Badge tone="muted">{m.deptos.length}d</Badge>}
                    {!m.matched && !m.especial && <Badge tone="red">sin match</Badge>}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Detalle */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg">
            {current ? (
              <MailCard
                key={current.id}
                m={current}
                pending={pending}
                onMutate={(fn) => startTransition(async () => applyMutation(await fn()))}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-ink3 text-[14px]">
                Seleccioná un propietario para ver el mail.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal de mail especial */}
      {showSpecial && meta && (
        <SpecialForm
          mesNombre={meta.mesNombre}
          contactByProp={contactByProp}
          props={[...contactByProp.keys()].sort((a, b) => a.localeCompare(b, "es"))}
          pending={pending}
          onClose={() => setShowSpecial(false)}
          onCreate={(input) =>
            startTransition(async () => {
              const r = await createSpecialAction(input);
              applyMutation(r);
              if (r.ok) setShowSpecial(false);
            })
          }
        />
      )}
    </main>
  );
}

function FilterWarning({ rowCount, targetCount }: { rowCount: number; targetCount: number }) {
  return (
    <div className="no-print px-7 py-2 text-[12px] text-ink3 bg-bg border-b border-line">
      Se leyeron <strong className="text-ink2">{rowCount}</strong> filas de la planilla ·{" "}
      <strong className="text-ink2">{targetCount}</strong> propietarios. Si son menos de lo
      esperado, quitá cualquier filtro de la planilla y regenerá.
    </div>
  );
}

function EmptyIntro({ pending }: { pending: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-2">
      <div className="font-serif text-[22px] text-ink">Generador de mails de liquidación</div>
      <p className="text-[13px] text-ink2 max-w-md text-pretty">
        Tomo la planilla de mails del mes en curso, detecto los gastos extra de cada propietario
        (excluyendo lavandería, suministros, smart locker y limpieza) y redacto los mails con la
        clasificación lista. Quedan guardados para editarlos y marcarlos como enviados.
      </p>
      {!pending && <p className="text-[12px] text-ink3">Tocá &quot;Generar mails&quot; para empezar.</p>}
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "muted" | "navy" | "gold" | "red";
}) {
  const cls: Record<string, string> = {
    green: "bg-brand-green-bg text-brand-green",
    muted: "bg-line text-ink3",
    navy: "bg-navy text-white",
    gold: "bg-brand-gold-bg text-[#8a6d1f]",
    red: "bg-brand-red-bg text-brand-red",
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls[tone]}`}>
      {children}
    </span>
  );
}

function MailCard({
  m,
  pending,
  onMutate,
}: {
  m: MailResult;
  pending: boolean;
  onMutate: (fn: () => Promise<MutationResult>) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  // Borradores de edición
  const [mail, setMail] = useState(m.mail);
  const [asunto, setAsunto] = useState(m.asunto);
  const [nombre, setNombre] = useState(m.nombre);
  const [compras, setCompras] = useState(m.compras.join("\n"));
  const [arreglos, setArreglos] = useState(m.arreglos.join("\n"));
  const [comentarios, setComentarios] = useState(m.comentarios.join("\n"));
  const [nota, setNota] = useState(m.notaLibre);
  const [cuerpo, setCuerpo] = useState(m.notaLibre); // para especiales

  const toLines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  const copy = () => {
    navigator.clipboard.writeText(buildMailBody(m)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const mailtoHref = `mailto:${encodeURIComponent(m.mail)}?subject=${encodeURIComponent(
    m.asunto
  )}&body=${encodeURIComponent(buildMailBody(m))}`;

  const save = () =>
    onMutate(() =>
      saveMailEditAction({
        id: m.id,
        mail,
        asunto,
        nombre,
        compras: m.especial ? [] : toLines(compras),
        arreglos: m.especial ? [] : toLines(arreglos),
        comentarios: m.especial ? [] : toLines(comentarios),
        notaLibre: m.especial ? cuerpo : nota,
      })
    );

  return (
    <div className="bg-card rounded-xl border border-line overflow-hidden max-w-[760px] mx-auto shadow-sm">
      <div className="bg-navy text-white px-5 py-4 flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[16px] font-semibold flex-1 flex items-center gap-2">
            {m.propietario}
            {m.especial && <Badge tone="gold">especial</Badge>}
            {m.sent && <Badge tone="green">enviado</Badge>}
          </div>
          {!editing ? (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={copy}
                className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-md transition ${
                  copied ? "bg-brand-green text-white" : "bg-brand-red text-white hover:opacity-85"
                }`}
              >
                {copied ? "✓ Copiado" : "Copiar"}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition"
              >
                Editar
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  save();
                  setEditing(false);
                }}
                disabled={pending}
                className="text-[12px] font-semibold px-3.5 py-1.5 rounded-md bg-brand-green text-white hover:opacity-85 transition disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="text-[12px] text-white/70 flex flex-col gap-0.5">
            <div>
              <span className="text-white/50">Para: </span>
              <span className="text-white/90 font-medium">{m.mail || "—"}</span>
            </div>
            <div>
              <span className="text-white/50">Asunto: </span>
              <span className="text-white/90 font-medium">{m.asunto || "—"}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-1">
            <LabeledDark label="Para (mail)">
              <input
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/10 text-white text-[12px] focus:outline-none focus:bg-white/20"
              />
            </LabeledDark>
            <LabeledDark label="Asunto">
              <input
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/10 text-white text-[12px] focus:outline-none focus:bg-white/20"
              />
            </LabeledDark>
            <LabeledDark label="Saludo (nombre)">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/10 text-white text-[12px] focus:outline-none focus:bg-white/20"
              />
            </LabeledDark>
          </div>
        )}

        {m.deptos.length > 0 && !editing && (
          <div className="flex gap-1 flex-wrap">
            {m.deptos.map((d) => (
              <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Cuerpo */}
      {!editing ? (
        <MailBodyView m={m} />
      ) : m.especial ? (
        <div className="px-6 py-5">
          <Field label="Cuerpo del mail">
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              rows={14}
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] leading-relaxed bg-bg focus:outline-none focus:border-brand-gold"
            />
          </Field>
        </div>
      ) : (
        <div className="px-6 py-5 flex flex-col gap-4">
          <Field label="🛒 Compras (una por línea)">
            <textarea
              value={compras}
              onChange={(e) => setCompras(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
            />
          </Field>
          <Field label="🔧 Arreglos (uno por línea)">
            <textarea
              value={arreglos}
              onChange={(e) => setArreglos(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
            />
          </Field>
          <Field label="📝 Comentarios (uno por línea)">
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
            />
          </Field>
          <Field label="Nota libre (se agrega al final, antes del cierre)">
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder="Texto particular para este propietario…"
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
            />
          </Field>
        </div>
      )}

      {/* Pie de acciones */}
      {!editing && (
        <div className="px-5 py-3 bg-bg border-t border-line flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onMutate(() => toggleSentAction(m.id, !m.sent))}
              disabled={pending}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-md border transition disabled:opacity-50 ${
                m.sent
                  ? "bg-brand-green-bg text-brand-green border-brand-green/30"
                  : "border-line text-ink2 hover:bg-card"
              }`}
            >
              {m.sent ? "✓ Enviado" : "Marcar enviado"}
            </button>
            {!m.especial && (
              <button
                onClick={() => onMutate(() => regenerateOneAction(m.propietario))}
                disabled={pending}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-md border border-line text-ink2 hover:bg-card transition disabled:opacity-50"
              >
                Rehacer con IA
              </button>
            )}
            {m.especial && (
              <button
                onClick={() => {
                  if (confirm("¿Eliminar este mail especial?")) onMutate(() => deleteMailAction(m.id));
                }}
                disabled={pending}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-md border border-brand-red/30 text-brand-red hover:bg-brand-red-bg transition disabled:opacity-50"
              >
                Eliminar
              </button>
            )}
          </div>
          {m.mail && (
            <a
              href={mailtoHref}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-md border border-line text-ink2 hover:bg-card transition"
            >
              Abrir en mail
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function MailBodyView({ m }: { m: MailResult }) {
  if (m.especial) {
    return (
      <div className="px-6 py-5 text-[14px] leading-[1.7] text-ink whitespace-pre-wrap">
        {m.notaLibre?.trim() ? m.notaLibre : <span className="text-ink3">— sin contenido —</span>}
      </div>
    );
  }
  return (
    <div className="px-6 py-5 text-[14px] leading-[1.7] text-ink whitespace-pre-wrap">
      <p>{greetingOf(m)}</p>
      <p className="mt-4">
        Les hacemos entrega del informe detallado correspondiente al mes de{" "}
        <strong>{m.mesNombre}</strong>. Como es habitual, en los próximos días les estaremos
        enviando el dinero de la liquidación.
      </p>

      <Section title="🛒 Compras Realizadas durante el mes" items={m.compras} />
      <Section title="🔧 Arreglos Realizados en el mes" items={m.arreglos} />
      <Section title="📝 Comentarios del mes" items={m.comentarios} />

      {m.notaLibre?.trim() && <p className="mt-4">{m.notaLibre}</p>}

      <p className="mt-4">
        Muchas gracias por seguir confiando en nuestra gestión.
        <br />
        ¡Saludos!
      </p>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <p className="font-semibold">{title}</p>
      <ul className="mt-1">
        {items.map((it, i) => (
          <li key={i}>{`• ${it}`}</li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-ink2 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function LabeledDark({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wide text-white/50 mb-0.5 block">{label}</span>
      {children}
    </label>
  );
}

function SpecialForm({
  mesNombre,
  contactByProp,
  props,
  pending,
  onClose,
  onCreate,
}: {
  mesNombre: string;
  contactByProp: Map<string, MailResult>;
  props: string[];
  pending: boolean;
  onClose: () => void;
  onCreate: (input: {
    propietario: string;
    mail: string;
    asunto: string;
    nombre: string;
    moneda: string;
    deptos: string[];
    cuerpo: string;
  }) => void;
}) {
  const [propietario, setPropietario] = useState("");
  const [mail, setMail] = useState("");
  const [asunto, setAsunto] = useState("");
  const [nombre, setNombre] = useState("");
  const [moneda, setMoneda] = useState("$");
  const [deptos, setDeptos] = useState<string[]>([]);
  const [cuerpo, setCuerpo] = useState(
    `Hola, ¿cómo estás?\n\nQueríamos comentarte una corrección respecto del informe de ${mesNombre}: `
  );

  // Al elegir un propietario existente, autocompletar contacto.
  const pick = (name: string) => {
    setPropietario(name);
    const c = contactByProp.get(name);
    if (c) {
      setMail(c.mail);
      setNombre(c.nombre);
      setMoneda(c.moneda);
      setDeptos(c.deptos);
      setAsunto(`Fe de erratas · Liquidación ${mesNombre}`);
      setCuerpo(
        `${greetingOf(c)}\n\nQueríamos comentarte una corrección respecto del informe de ${mesNombre}: `
      );
    }
  };

  const canCreate = propietario.trim() && cuerpo.trim() && !pending;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl border border-line w-full max-w-[620px] max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="bg-navy text-white px-5 py-4 flex items-center justify-between sticky top-0">
          <div className="text-[15px] font-semibold">Nuevo mail especial</div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-[18px] leading-none">
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <Field label="Propietario (elegí uno de la lista o escribí)">
            <input
              list="props-list"
              value={propietario}
              onChange={(e) => pick(e.target.value)}
              placeholder="Nombre del propietario"
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
            />
            <datalist id="props-list">
              {props.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Mail (Para)">
              <input
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
              />
            </Field>
            <Field label="Saludo (nombre)">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
              />
            </Field>
          </div>

          <Field label="Asunto">
            <input
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder={`Fe de erratas · Liquidación ${mesNombre}`}
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
            />
          </Field>

          <Field label="Cuerpo del mail">
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] leading-relaxed bg-bg focus:outline-none focus:border-brand-gold"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="text-[13px] font-semibold px-4 py-2 rounded-lg border border-line text-ink2 hover:bg-bg transition"
            >
              Cancelar
            </button>
            <button
              onClick={() =>
                onCreate({ propietario, mail, asunto, nombre, moneda, deptos, cuerpo })
              }
              disabled={!canCreate}
              className="text-[13px] font-semibold px-5 py-2 rounded-lg bg-navy text-white hover:opacity-85 transition disabled:opacity-50"
            >
              Crear mail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
