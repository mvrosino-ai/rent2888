import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { PrintButton } from "./PrintButton";

export async function Topbar() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <div className="no-print sticky top-0 z-50 h-[52px] bg-navy text-white flex items-center justify-between px-7">
      <div className="flex items-center gap-6">
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
      <div className="flex items-center gap-2">
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
