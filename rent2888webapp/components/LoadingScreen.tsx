// Pantalla de carga compartida por los loading.tsx de cada ruta.
// Mismo spinner que el index.html original (borde gris, tope dorado).
import { TopProgressBar } from "./TopProgressBar";

export function LoadingScreen({ texto = "Cargando reportes..." }: { texto?: string }) {
  return (
    <>
      <TopProgressBar />
      {/* Topbar estática para que el header no "desaparezca" durante la carga */}
      <div className="no-print sticky top-0 z-50 h-[52px] bg-navy text-white flex items-center px-7">
        <span className="font-serif text-[19px] select-none">
          Rent<span className="text-brand-red">2888</span>
        </span>
      </div>
      <div className="flex flex-col items-center justify-center gap-3.5 min-h-[70vh]">
        <div className="w-9 h-9 rounded-full border-[3px] border-line border-t-brand-gold animate-spin" />
        <div className="text-ink2 text-sm">{texto}</div>
      </div>
    </>
  );
}
