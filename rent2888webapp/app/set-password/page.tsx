import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { setInitialPassword } from "@/lib/db";
import { SetPasswordForm } from "./set-password-form";

async function setPasswordAction(
  _prev: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string } | undefined> {
  "use server";
  const email = String(formData.get("email") || "").replace(/[\s\u00A0\u200B-\u200D\uFEFF]/g, "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!email) return { error: "Ingresá tu email" };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };
  if (password !== confirm) return { error: "Las contraseñas no coinciden" };

  const hash = await bcrypt.hash(password, 10);
  const ok = await setInitialPassword(email, hash);
  if (!ok) {
    return {
      error:
        "No se pudo crear la contraseña. Puede que esta cuenta ya tenga una o no esté habilitada. Probá ingresar con tu contraseña.",
    };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      // La contraseña se guardó bien; que ingrese desde el login.
      redirect("/login");
    }
    throw e;
  }
  redirect("/");
}

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-serif text-4xl text-navy">
            Rent<span className="text-brand-red">2888</span>
          </div>
          <div className="text-xs uppercase tracking-[0.15em] text-ink3 mt-2">
            Reportes de liquidación
          </div>
        </div>
        <div className="bg-card rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <h1 className="font-serif text-2xl mb-1">Creá tu contraseña</h1>
          <p className="text-ink2 text-[13px] mb-6">
            Es tu primer ingreso. Elegí una contraseña para tu cuenta; la vas a usar
            de ahora en más para entrar.
          </p>
          <SetPasswordForm defaultEmail={email ?? ""} action={setPasswordAction} />
        </div>
      </div>
    </div>
  );
}
