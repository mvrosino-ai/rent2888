import type { NextAuthConfig } from "next-auth";

// Config edge-safe (sin DB ni bcrypt) — la usa el middleware.
// Los providers reales se agregan en lib/auth.ts (solo Node runtime).
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.propietarioName = (user as { propietarioName?: string | null }).propietarioName ?? null;
        token.fullName = (user as { fullName?: string | null }).fullName ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as "ADMIN" | "OWNER";
        session.user.propietarioName = (token.propietarioName as string | null) ?? null;
        session.user.fullName = (token.fullName as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
