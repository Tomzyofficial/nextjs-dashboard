import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

const baseUrl = process.env.AUTH_URL;

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        // Redirect unauthenticated users to login page with production URL
        const loginUrl = baseUrl
          ? new URL("/login", baseUrl)
          : new URL("/login", nextUrl);
        // Construct the callbackUrl using production URL
        const callbackUrl = baseUrl
          ? new URL(nextUrl.pathname + nextUrl.search, baseUrl).toString()
          : nextUrl.toString();
        loginUrl.searchParams.set("callbackUrl", callbackUrl);
        return NextResponse.redirect(loginUrl);
      } else if (isLoggedIn && isOnLogin) {
        // Redirect logged-in users away from login page to dashboard
        const redirectUrl = baseUrl
          ? new URL("/dashboard", baseUrl)
          : new URL("/dashboard", nextUrl);
        return NextResponse.redirect(redirectUrl);
      }
      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
