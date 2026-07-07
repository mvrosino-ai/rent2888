import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: "ADMIN" | "OWNER";
      propietarioName: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "OWNER";
    propietarioName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "OWNER";
    propietarioName?: string | null;
  }
}
