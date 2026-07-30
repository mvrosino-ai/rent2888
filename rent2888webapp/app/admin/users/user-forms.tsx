"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "./actions";

const inputCls =
  "w-full px-3 py-2 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink2 mb-1";

/**
 * Selector de varios propietarios del sheet. Un mismo usuario (holding o dueño
 * con varios deptos) puede quedar vinculado a más de un propietario. Cada opción
 * elegida se envía como un valor "propietarioName" (el server hace getAll).
 */
function PropietariosPicker({ propietarios }: { propietarios: string[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return t ? propietarios.filter((p) => p.toLowerCase().includes(t)) : propietarios;
  }, [propietarios, query]);

  const toggle = (p: string) =>
    setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  return (
    <div>
      <label className={labelCls}>
        Propietarios del sheet{" "}
        <span className="text-ink3 normal-case font-normal tracking-normal">
          (podés elegir más de uno)
        </span>
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggle(p)}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-navy text-white hover:opacity-85 transition"
              title="Quitar"
            >
              {p}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar propietario..."
        className={inputCls + " mb-2"}
      />

      <div className="max-h-48 overflow-y-auto border border-line rounded-lg divide-y divide-line/60">
        {filtered.length === 0 ? (
          <p className="text-[12px] text-ink3 px-3 py-2.5">Sin resultados.</p>
        ) : (
          filtered.map((p) => {
            const checked = selected.includes(p);
            return (
              <label
                key={p}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer hover:bg-bg"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(p)}
                  className="accent-navy h-4 w-4"
                />
                <span>{p}</span>
              </label>
            );
          })
        )}
      </div>

      {/* Valores enviados al server (uno por propietario elegido) */}
      {selected.map((p) => (
        <input key={p} type="hidden" name="propietarioName" value={p} />
      ))}
    </div>
  );
}

export function CreateUserForm({
  propietarios,
  action,
}: {
  propietarios: string[];
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [role, setRole] = useState<"OWNER" | "ADMIN">("OWNER");

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Nombre</label>
        <input name="fullName" type="text" className={inputCls} placeholder="Nombre y apellido" />
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input name="email" type="email" required className={inputCls} placeholder="propietario@email.com" />
      </div>
      <div>
        <label className={labelCls}>Rol</label>
        <select
          name="role"
          className={inputCls}
          value={role}
          onChange={(e) => setRole(e.target.value as "OWNER" | "ADMIN")}
        >
          <option value="OWNER">Propietario</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>
      {role === "OWNER" ? (
        <PropietariosPicker propietarios={propietarios} />
      ) : (
        <div className="flex items-end">
          <p className="text-[12px] text-ink3 pb-2">
            Los administradores ven todas las liquidaciones.
          </p>
        </div>
      )}
      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          disabled={pending}
          className="bg-navy text-white text-[13px] font-semibold px-5 py-2 rounded-lg hover:opacity-85 transition disabled:opacity-50"
        >
          {pending ? "Creando..." : "Crear usuario"}
        </button>
        {state?.error && <span className="text-xs text-brand-red">{state.error}</span>}
        {state?.ok && <span className="text-xs text-brand-green">{state.ok}</span>}
      </div>
    </form>
  );
}

export function ResetPasswordForm({
  userId,
  action,
}: {
  userId: string;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={userId} />
      <input
        name="password"
        type="text"
        minLength={6}
        required
        placeholder="nueva contraseña"
        className="px-2.5 py-1.5 border border-line rounded-md text-xs bg-bg focus:outline-none focus:border-brand-gold w-40"
      />
      <button
        disabled={pending}
        className="text-xs px-3 py-1.5 rounded-md border border-line bg-card hover:bg-bg transition disabled:opacity-50"
      >
        Resetear
      </button>
      {state?.error && <span className="text-[11px] text-brand-red">{state.error}</span>}
      {state?.ok && <span className="text-[11px] text-brand-green">✓</span>}
    </form>
  );
}

export function CommissionForm({
  current,
  action,
}: {
  current: number;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex items-end gap-3">
      <div>
        <label className={labelCls}>% Comisión</label>
        <input
          name="pct"
          type="number"
          min={0}
          max={100}
          step="0.1"
          defaultValue={Math.round(current * 10000) / 100}
          className={inputCls + " w-28"}
        />
      </div>
      <button
        disabled={pending}
        className="bg-navy text-white text-[13px] font-semibold px-5 py-2 rounded-lg hover:opacity-85 transition disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
      {state?.error && <span className="text-xs text-brand-red pb-2">{state.error}</span>}
      {state?.ok && <span className="text-xs text-brand-green pb-2">{state.ok}</span>}
    </form>
  );
}
