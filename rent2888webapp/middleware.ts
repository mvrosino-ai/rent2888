import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const path = nextUrl.pathname;

  if (path.startsWith("/login") || path.startsWith("/set-password")) {
    if (isLoggedIn) {
      return Response.redirect(new URL(role === "ADMIN" ? "/admin" : "/dashboard", nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  if (path.startsWith("/admin") && role !== "ADMIN") {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  if (path.startsWith("/dashboard") && role === "ADMIN") {
    return Response.redirect(new URL("/admin", nextUrl));
  }

  if (path === "/") {
    return Response.redirect(new URL(role === "ADMIN" ? "/admin" : "/dashboard", nextUrl));
  }
});

export const config = {
  // /api queda fuera: /api/auth es de Auth.js y /api/setup valida su propio token
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
