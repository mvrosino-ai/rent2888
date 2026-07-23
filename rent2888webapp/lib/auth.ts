import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { findUserByEmail } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user || !user.active) return null;
        // Sin contraseña definida todavía: no puede entrar por el login normal
        // (debe pasar por /set-password para crear su contraseña primero).
        if (!user.password_hash) return null;

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          propietarioName: user.propietario_name,
          fullName: user.full_name,
        };
      },
    }),
  ],
});
