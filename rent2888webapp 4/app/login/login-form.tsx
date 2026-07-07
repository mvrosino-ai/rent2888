"use client";

import { useActionState } from "react";
import { TopProgressBar } from "@/components/TopProgressBar";

export function LoginForm({
  action,
}: {
  action: (
    prev: { error: string } | undefined,
    formData: FormData
  ) => Promise<{ error: string } | undefined>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {pending && <TopProgressBar />}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink2 mb-1.5">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-3.5 py-2.5 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
          placeholder="tu@email.com"
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink2 mb-1.5">
          Contraseña
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3.5 py-2.5 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
          placeholder="••••••••"
        />
      </div>
      {state?.error && (
        <p className="text-xs text-brand-red">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-navy text-white font-semibold text-[13px] py-2.5 rounded-lg hover:opacity-85 transition disabled:opacity-50"
      >
        {pending ? "Ingresando..." : "Entrar"}
      </button>
    </form>
  );
}
