import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db";
import { LoginForm } from "./login-form";

async function loginAction(
  _prev: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string } | undefined> {
  "use server";
  // Quita espacios y caracteres invisibles que rompen la búsqueda del email.
  const email = String(formData.get("email") || "").replace(/[\s\u00A0\u200B-\u200D\uFEFF]/g, "");
  const password = String(formData.get("password") || "");
  if (!email) return { error: "Ingresá tu email" };

  // Primer ingreso: si la cuenta existe, está activa y todavía no tiene
  // contraseña, la mandamos a definirla en vez de pedir una que no tiene.
  const user = await findUserByEmail(email);
  if (user && user.active && !user.password_hash) {
    redirect(`/set-password?email=${encodeURIComponent(email)}`);
  }

  if (!password) return { error: "Ingresá tu contraseña" };
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Email o contraseña incorrectos" };
    }
    throw e;
  }
  redirect("/");
}

export default function LoginPage() {
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
          <h1 className="font-serif text-2xl mb-1">Ingresar</h1>
          <p className="text-ink2 text-[13px] mb-6">
            Accedé con tu email y contraseña.
          </p>
          <LoginForm action={loginAction} />
        </div>
      </div>
    </div>
  );
}
