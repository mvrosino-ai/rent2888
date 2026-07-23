import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { PrintButton } from "./PrintButton";

export async function Topbar() {
  const session = await auth();
  const role = session?.user?.role;
  const displayName = session?.user?.fullName || session?.user?.email || null;

  return (
    <div className="no-print sticky top-0 z-50 h-[52px] bg-navy text-white flex items-center justify-between px-3 sm:px-7 gap-2">
      <div className="flex items-center gap-3 sm:gap-6 min-w-0">
        <Link href="/" className="font-serif text-[19px] select-none">
          Rent<span className="text-brand-red">2888</span>
        </Link>
        {role === "ADMIN" && (
          <nav className="flex gap-1 text-xs">
            <Link href="/admin" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition">
              Liquidaciones
            </Link>
            <Link href="/admin/users" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition">
              Usuarios
            </Link>
          </nav>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {displayName && (
          <div className="hidden sm:flex items-center gap-2 text-xs min-w-0">
            <span className="hidden sm:inline text-white/50">Sesión:</span>
            <span className="font-medium max-w-[110px] sm:max-w-[180px] truncate" title={displayName}>
              {displayName}
            </span>
            {role === "ADMIN" && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/15 text-white/90">
                ADMIN
              </span>
            )}
          </div>
        )}
        <PrintButton />
        {session && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-xs font-medium px-3.5 py-1.5 rounded-md border border-white/20 hover:bg-white/10 transition">
              Salir
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
