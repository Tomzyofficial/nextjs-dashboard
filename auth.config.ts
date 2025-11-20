import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

function getBaseUrl(request: {
  nextUrl: URL;
  headers: Headers;
}): string | null {
  // Try AUTH_URL environment variable first (for production)
  // Access at runtime, not module load time (important for edge runtime)
  try {
    const authUrl = process.env.AUTH_URL;
    if (authUrl && authUrl.trim()) {
      // Ensure it doesn't end with a slash and is a valid URL
      const cleanUrl = authUrl.trim().endsWith("/")
        ? authUrl.trim().slice(0, -1)
        : authUrl.trim();
      // Validate it's a proper URL
      if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
        return cleanUrl;
      }
    }
  } catch (e) {
    // Environment variable might not be accessible in edge runtime
    console.warn("AUTH_URL not accessible:", e);
  }

  // Fallback: use request headers to construct URL (for production)
  const protocol =
    request.headers.get("x-forwarded-proto") ||
    request.headers.get("x-forwarded-protocol") ||
    (request.nextUrl.protocol === "https:" ? "https" : "http");
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;

  // Only use request headers if we're not on localhost (production)
  if (
    host &&
    !host.includes("localhost") &&
    !host.includes("127.0.0.1") &&
    !host.includes("::1")
  ) {
    const url = `${protocol}://${host}`;
    return url;
  }

  return null;
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl, headers } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      // Get base URL from env var or request headers
      const baseUrl = getBaseUrl({ nextUrl, headers });

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
