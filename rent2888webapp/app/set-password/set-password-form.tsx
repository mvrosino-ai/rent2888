"use client";

import { useActionState } from "react";

export function SetPasswordForm({
  defaultEmail,
  action,
}: {
  defaultEmail: string;
  action: (
    prev: { error: string } | undefined,
    formData: FormData
  ) => Promise<{ error: string } | undefined>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink2 mb-1.5">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          autoComplete="email"
          className="w-full px-3.5 py-2.5 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
          placeholder="tu@email.com"
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink2 mb-1.5">
          Nueva contraseña
        </label>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full px-3.5 py-2.5 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
          placeholder="mínimo 6 caracteres"
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink2 mb-1.5">
          Repetir contraseña
        </label>
        <input
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full px-3.5 py-2.5 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
          placeholder="••••••••"
        />
      </div>
      {state?.error && <p className="text-xs text-brand-red">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-navy text-white font-semibold text-[13px] py-2.5 rounded-lg hover:opacity-85 transition disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Crear contraseña y entrar"}
      </button>
    </form>
  );
}
