"use client";

import { useActionState } from "react";
import type { ActionState } from "./actions";

const inputCls =
  "w-full px-3 py-2 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink2 mb-1";

export function CreateUserForm({
  propietarios,
  action,
}: {
  propietarios: string[];
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Email</label>
        <input name="email" type="email" required className={inputCls} placeholder="propietario@email.com" />
      </div>
      <div>
        <label className={labelCls}>Contraseña temporal</label>
        <input name="password" type="text" required minLength={6} className={inputCls} placeholder="mínimo 6 caracteres" />
      </div>
      <div>
        <label className={labelCls}>Rol</label>
        <select name="role" className={inputCls} defaultValue="OWNER">
          <option value="OWNER">Propietario</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Propietario (del sheet)</label>
        <select name="propietarioName" className={inputCls} defaultValue="">
          <option value="">— Solo para rol Propietario —</option>
          {propietarios.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
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
