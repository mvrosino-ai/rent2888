import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listUsers, getCommissionPct } from "@/lib/db";
import { getSheetData } from "@/lib/sheetData";
import { getTodosPropietarios } from "@/lib/liquidacion";
import { Topbar } from "@/components/Topbar";
import {
  createUserAction,
  resetPasswordAction,
  toggleActiveAction,
  deleteUserAction,
  updateCommissionAction,
} from "./actions";
import { CreateUserForm, ResetPasswordForm, CommissionForm } from "./user-forms";

export const dynamic = "force-dynamic";

/**
 * Sección "Nuevo usuario". Depende del Google Sheet (lento), por eso se renderiza
 * dentro de un <Suspense> y se transmite por streaming: la tabla de usuarios (que
 * viene de la base de datos) aparece de inmediato sin esperar el sheet.
 */
async function NuevoUsuario() {
  let propietarios: string[] = [];
  let sheetError: string | null = null;
  try {
    propietarios = getTodosPropietarios(await getSheetData());
  } catch (e) {
    sheetError = e instanceof Error ? e.message : "Error al leer el sheet";
  }

  return (
    <>
      <p className="text-[13px] text-ink2 mb-5">
        Los usuarios con rol Propietario solo ven sus propias liquidaciones. El campo
        &quot;Propietario&quot; debe coincidir con el nombre en el sheet
        {sheetError && (
          <span className="text-brand-red"> (no pude leer el sheet: {sheetError})</span>
        )}
        .
      </p>
      <CreateUserForm propietarios={propietarios} action={createUserAction} />
    </>
  );
}

function NuevoUsuarioSkeleton() {
  return (
    <div
      className="flex items-center gap-3 py-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="h-5 w-5 rounded-full border-2 border-line border-t-brand-gold animate-spin" />
      <span className="text-[13px] text-ink2">Cargando lista de propietarios…</span>
    </div>
  );
}

export default async function UsersPage() {
  // Solo ADMIN puede acceder a la gestión de usuarios.
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  let users: Awaited<ReturnType<typeof listUsers>> = [];
  let comPct = 0.2;
  let dbError: string | null = null;

  try {
    [users, comPct] = await Promise.all([listUsers(), getCommissionPct()]);
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Error de base de datos";
  }

  return (
    <>
      <Topbar />
      <main className="max-w-[900px] mx-auto p-7 space-y-6">
        <section className="bg-card rounded-xl border border-line p-6">
          <h2 className="font-serif text-xl mb-1">Nuevo usuario</h2>
          <Suspense fallback={<NuevoUsuarioSkeleton />}>
            <NuevoUsuario />
          </Suspense>
        </section>

        <section className="bg-card rounded-xl border border-line p-6">
          <h2 className="font-serif text-xl mb-4">Usuarios</h2>
          {dbError ? (
            <p className="text-[13px] text-brand-red">
              Error de base de datos: {dbError}. Verificá DATABASE_URL y que la migración esté aplicada.
            </p>
          ) : users.length === 0 ? (
            <p className="text-[13px] text-ink3">Sin usuarios todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-ink3 border-b border-line">
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Rol</th>
                    <th className="py-2 pr-4">Propietario</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4">Contraseña</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 pr-4">{u.email}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            u.role === "ADMIN"
                              ? "bg-brand-gold-bg text-brand-gold"
                              : "bg-[#ECEDF5] text-navy"
                          }`}
                        >
                          {u.role === "ADMIN" ? "ADMIN" : "PROPIETARIO"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">{u.propietario_name || "—"}</td>
                      <td className="py-2.5 pr-4">
                        <form action={toggleActiveAction} className="inline">
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="active" value={String(!u.active)} />
                          <button
                            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                              u.active
                                ? "bg-brand-green-bg text-brand-green"
                                : "bg-brand-red-bg text-brand-red"
                            }`}
                            title={u.active ? "Click para desactivar" : "Click para reactivar"}
                          >
                            {u.active ? "ACTIVO" : "INACTIVO"}
                          </button>
                        </form>
                      </td>
                      <td className="py-2.5 pr-4">
                        <ResetPasswordForm userId={u.id} action={resetPasswordAction} />
                      </td>
                      <td className="py-2.5 text-right">
                        <form action={deleteUserAction} className="inline">
                          <input type="hidden" name="id" value={u.id} />
                          <button className="text-[11px] text-brand-red hover:underline">
                            Eliminar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-card rounded-xl border border-line p-6">
          <h2 className="font-serif text-xl mb-1">Comisión</h2>
          <p className="text-[13px] text-ink2 mb-5">
            Porcentaje de comisión Rent2888 aplicado a las liquidaciones.
          </p>
          <CommissionForm current={comPct} action={updateCommissionAction} />
        </section>
      </main>
    </>
  );
}
