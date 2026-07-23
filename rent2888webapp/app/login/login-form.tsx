"use client";

import { useActionState, useState } from "react";

// Quita espacios y caracteres invisibles (ancho cero, BOM, espacio duro) que
// suelen colarse al copiar/pegar o autocompletar el email y rompen el login.
function cleanEmail(value: string): string {
  return value.replace(/[\s\u00A0\u200B-\u200D\uFEFF]/g, "");
}

export function LoginForm({
  action,
}: {
  action: (
    prev: { error: string } | undefined,
    formData: FormData
  ) => Promise<{ error: string } | undefined>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} noValidate className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink2 mb-1.5">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(cleanEmail(e.target.value))}
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
          autoComplete="current-password"
          className="w-full px-3.5 py-2.5 border border-line rounded-lg text-[13px] bg-bg focus:outline-none focus:border-brand-gold"
          placeholder="••••••••"
        />
        <p className="text-[11px] text-ink3 mt-1.5">
          Primera vez? Ingresá solo tu email y te pediremos crear una contraseña.
        </p>
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
