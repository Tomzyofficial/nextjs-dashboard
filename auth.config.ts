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
        console.log("[AUTH] Using AUTH_URL:", cleanUrl);
        return cleanUrl;
      }
    } else {
      console.log("[AUTH] AUTH_URL is not set or empty");
    }
  } catch (e) {
    // Environment variable might not be accessible in edge runtime
    console.warn("[AUTH] AUTH_URL not accessible:", e);
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

  console.log("[AUTH] Headers - protocol:", protocol, "host:", host);
  console.log("[AUTH] nextUrl.host:", request.nextUrl.host);
  console.log(
    "[AUTH] x-forwarded-host:",
    request.headers.get("x-forwarded-host")
  );
  console.log("[AUTH] host header:", request.headers.get("host"));

  // Only use request headers if we're not on localhost (production)
  if (
    host &&
    !host.includes("localhost") &&
    !host.includes("127.0.0.1") &&
    !host.includes("::1")
  ) {
    const url = `${protocol}://${host}`;
    console.log("[AUTH] Using header-based URL:", url);
    return url;
  }

  console.log("[AUTH] No valid base URL found, returning null");
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
      console.log("[AUTH] baseUrl result:", baseUrl);
      console.log("[AUTH] nextUrl.toString():", nextUrl.toString());

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
        console.log(
          "[AUTH] Redirecting to login with callbackUrl:",
          callbackUrl
        );
        console.log("[AUTH] Final loginUrl:", loginUrl.toString());
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
