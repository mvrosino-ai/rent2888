"use client";

import { useMemo, useState, useTransition } from "react";
import { generateMailsAction, type GenerateResult } from "./actions";
import { buildMailBody, greetingOf, type MailResult } from "@/lib/mailTypes";

type Filter = "all" | "nov" | "sin" | "usd" | "ars";

export function MailsClient() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const mails = result?.ok ? result.mails : [];

  const generate = () =>
    startTransition(async () => {
      setSelected(null);
      const r = await generateMailsAction();
      setResult(r);
    });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mails.filter((m) => {
      if (filter === "nov" && !m.hasNov) return false;
      if (filter === "sin" && m.hasNov) return false;
      if (filter === "usd" && m.moneda !== "u$") return false;
      if (filter === "ars" && m.moneda !== "$") return false;
      if (q) {
        const hay = (m.propietario + " " + m.deptos.join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [mails, query, filter]);

  const current = mails.find((m) => m.propietario === selected) || null;

  const stats = useMemo(() => {
    const usd = mails.filter((m) => m.moneda === "u$").length;
    const ars = mails.filter((m) => m.moneda === "$").length;
    const nov = mails.filter((m) => m.hasNov).length;
    return { total: mails.length, usd, ars, nov };
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
              Generando…
            </>
          ) : result?.ok ? (
            "Regenerar mails"
          ) : (
            "Generar mails"
          )}
        </button>

        {result?.ok && (
          <>
            <div className="text-[13px] text-ink2">
              <span className="font-semibold text-ink">{result.mesNombre}</span> · {stats.total} mails
              <span className="text-ink3">
                {" "}
                · {stats.nov} con nov. · {stats.usd} USD · {stats.ars} ARS
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
                  ["nov", "Con nov."],
                  ["sin", "Sin nov."],
                  ["usd", "USD"],
                  ["ars", "ARS"],
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

      {/* Error */}
      {result && !result.ok && (
        <div className="px-7 py-4 text-[13px] text-brand-red bg-brand-red-bg border-b border-line">
          {result.error}
        </div>
      )}

      {/* Contenido */}
      {!result ? (
        <EmptyIntro pending={pending} />
      ) : result.ok && mails.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-ink3 text-[14px]">
          No se encontraron propietarios en la planilla de mails.
        </div>
      ) : result.ok ? (
        <div className="flex flex-1 min-h-0">
          {/* Lista */}
          <div className="w-[260px] shrink-0 overflow-y-auto bg-card border-r border-line">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-ink3 text-[13px]">Sin resultados</div>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.propietario}
                  onClick={() => setSelected(m.propietario)}
                  className={`w-full text-left px-3.5 py-2.5 border-b border-line/70 transition ${
                    selected === m.propietario ? "bg-brand-gold-bg" : "hover:bg-bg"
                  }`}
                >
                  <div className="text-[13px] font-semibold text-ink truncate">{m.propietario}</div>
                  <div className="text-[11px] text-ink3 truncate">{m.mail || "— sin mail —"}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <Badge tone={m.hasNov ? "green" : "muted"}>{m.hasNov ? "nov." : "sin"}</Badge>
                    <Badge tone={m.moneda === "u$" ? "navy" : "gold"}>
                      {m.moneda === "u$" ? "USD" : "ARS"}
                    </Badge>
                    {m.deptos.length > 1 && <Badge tone="muted">{m.deptos.length}d</Badge>}
                    {!m.matched && <Badge tone="red">sin match</Badge>}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Detalle */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg">
            {current ? (
              <MailCard m={current} />
            ) : (
              <div className="h-full flex items-center justify-center text-ink3 text-[14px]">
                Seleccioná un propietario para ver el mail.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function EmptyIntro({ pending }: { pending: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-2">
      <div className="font-serif text-[22px] text-ink">Generador de mails de liquidación</div>
      <p className="text-[13px] text-ink2 max-w-md text-pretty">
        Tomo la planilla de mails del mes en curso, detecto los gastos extra de cada propietario
        (excluyendo lavandería, suministros, smart locker y limpieza) y redacto los mails con la
        redacción y clasificación lista para copiar.
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

function MailCard({ m }: { m: MailResult }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(buildMailBody(m)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const mailtoHref = `mailto:${encodeURIComponent(m.mail)}?subject=${encodeURIComponent(
    m.asunto
  )}&body=${encodeURIComponent(buildMailBody(m))}`;

  return (
    <div className="bg-card rounded-xl border border-line overflow-hidden max-w-[760px] mx-auto shadow-sm">
      <div className="bg-navy text-white px-5 py-4 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="text-[16px] font-semibold flex-1">{m.propietario}</div>
          <button
            onClick={copy}
            className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-md transition ${
              copied ? "bg-brand-green text-white" : "bg-brand-red text-white hover:opacity-85"
            }`}
          >
            {copied ? "✓ Copiado" : "Copiar texto"}
          </button>
        </div>
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
        {m.deptos.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {m.deptos.map((d) => (
              <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

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

        <p className="mt-4">
          Muchas gracias por seguir confiando en nuestra gestión.
          <br />
          ¡Saludos!
        </p>
      </div>

      <div className="px-5 py-3 bg-bg border-t border-line flex items-center justify-between gap-2">
        <span className="text-[12px] text-ink3">Adjuntá el PDF desde Drive antes de enviar.</span>
        {m.mail && (
          <a
            href={mailtoHref}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-md border border-line text-ink2 hover:bg-card transition"
          >
            Abrir en mail
          </a>
        )}
      </div>
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
