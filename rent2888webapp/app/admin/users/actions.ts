"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import {
  createUser,
  deleteUser,
  setCommissionPct,
  setUserActive,
  updateUserPassword,
  updateUserPropietario,
} from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
  return session;
}

export type ActionState = { error?: string; ok?: string } | undefined;

export async function createUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const role = formData.get("role") === "ADMIN" ? "ADMIN" : "OWNER";
    const propietarioName = String(formData.get("propietarioName") || "").trim() || null;

    if (!email || !password) return { error: "Email y contraseña son obligatorios" };
    if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };
    if (role === "OWNER" && !propietarioName)
      return { error: "Un usuario propietario debe estar vinculado a un propietario del sheet" };

    const passwordHash = await bcrypt.hash(password, 10);
    await createUser({
      email,
      passwordHash,
      role,
      propietarioName: role === "OWNER" ? propietarioName : null,
    });
    revalidatePath("/admin/users");
    return { ok: `Usuario ${email} creado` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg.includes("duplicate") || msg.includes("unique"))
      return { error: "Ya existe un usuario con ese email" };
    return { error: msg };
  }
}

export async function toggleActiveAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await setUserActive(id, active);
  revalidatePath("/admin/users");
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id"));
    const password = String(formData.get("password") || "");
    if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };
    await updateUserPassword(id, await bcrypt.hash(password, 10));
    revalidatePath("/admin/users");
    return { ok: "Contraseña actualizada" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updatePropietarioAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const propietarioName = String(formData.get("propietarioName") || "").trim() || null;
  await updateUserPropietario(id, propietarioName);
  revalidatePath("/admin/users");
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  if (session.user && "id" in session.user && (session.user as { id?: string }).id === id) {
    throw new Error("No podés eliminar tu propio usuario");
  }
  await deleteUser(id);
  revalidatePath("/admin/users");
}

export async function updateCommissionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();
    const pct = parseFloat(String(formData.get("pct")));
    if (isNaN(pct) || pct < 0 || pct > 100) return { error: "Porcentaje inválido" };
    await setCommissionPct(pct / 100);
    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath("/dashboard");
    return { ok: `Comisión actualizada a ${pct}%` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}
