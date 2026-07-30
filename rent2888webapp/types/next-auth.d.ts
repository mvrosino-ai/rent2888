import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: "ADMIN" | "OWNER";
      propietarios: string[];
      fullName: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "OWNER";
    propietarios?: string[];
    fullName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "OWNER";
    propietarios?: string[];
    fullName?: string | null;
  }
}
