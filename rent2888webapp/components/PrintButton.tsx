"use client";

function pdfFilename() {
  const report = document.querySelector<HTMLElement>("[data-pdf-filename]");
  const filename = report?.dataset.pdfFilename?.trim();
  return filename || "Rent2888 - Liquidación";
}

export function PrintButton({ variant = "gold" }: { variant?: "gold" | "plain" }) {
  const cls =
    variant === "gold"
      ? "no-print text-xs font-medium px-3.5 py-1.5 rounded-md bg-brand-gold text-white hover:opacity-90 transition"
      : "no-print text-xs font-medium px-3.5 py-1.5 rounded-md border border-line bg-card text-ink hover:bg-bg transition";

  const print = () => {
    const previousTitle = document.title;
    document.title = pdfFilename();

    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    window.addEventListener("afterprint", restoreTitle, { once: true });
    window.print();
    window.setTimeout(restoreTitle, 2000);
  };

  return (
    <button className={cls} onClick={print}>
      ↓ PDF
    </button>
  );
}
