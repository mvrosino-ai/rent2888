export default function Loading() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Header skeleton, mismo alto que el Topbar real */}
      <div className="sticky top-0 z-50 h-[52px] bg-navy flex items-center px-7">
        <div className="font-serif text-[19px] text-white select-none">
          Rent<span className="text-brand-red">2888</span>
        </div>
      </div>
      <div
        className="flex flex-col items-center justify-center gap-3 py-32"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="h-8 w-8 rounded-full border-[3px] border-line border-t-brand-gold animate-spin" />
        <span className="text-[13px] font-medium text-ink2">Cargando…</span>
      </div>
    </div>
  );
}
