"use client";

export function PrintButton({ variant = "gold" }: { variant?: "gold" | "plain" }) {
  const cls =
    variant === "gold"
      ? "no-print text-xs font-medium px-3.5 py-1.5 rounded-md bg-brand-gold text-white hover:opacity-90 transition"
      : "no-print text-xs font-medium px-3.5 py-1.5 rounded-md border border-line bg-card text-ink hover:bg-bg transition";
  return (
    <button className={cls} onClick={() => window.print()}>
      ↓ PDF
    </button>
  );
}
