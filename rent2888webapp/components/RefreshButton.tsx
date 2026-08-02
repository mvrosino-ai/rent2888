"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshSheet } from "@/app/refresh-action";

/**
 * Botón "Actualizar datos": invalida la caché del Sheet y recarga la vista.
 * Útil cuando el admin acaba de editar el Google Sheet (o de sacar un filtro)
 * y quiere ver los cambios sin esperar los 5 minutos de caché.
 */
export function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    startTransition(async () => {
      await refreshSheet();
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title="Volver a leer el Google Sheet ahora"
      className="no-print inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-line bg-card text-ink hover:bg-bg transition disabled:opacity-50"
    >
      <span
        aria-hidden
        className={pending ? "inline-block animate-spin" : "inline-block"}
      >
        ↻
      </span>
      {pending ? "Actualizando…" : "Actualizar datos"}
    </button>
  );
}
