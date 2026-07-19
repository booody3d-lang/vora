import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/security/jwt";
import { PROTECTED_ROUTE_PREFIXES } from "@/lib/security/rbac";

const LOCALE_PREFIX = /^\/(en|ar)(?=\/|$)/;

function stripLocale(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX, "") || "/";
}

function requiresAuth(pathname: string): boolean {
  if (pathname === "/profile/me") return true;
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function hasValidSessionCookie(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const payload = await verifySessionToken(token);
  return payload !== null;
}

/**
 * Locale rewrite plus lightweight auth gate for protected routes.
 * JWT validation here prevents redirect loops when the session cookie is valid
 * but the in-process session map was cleared (dev reload / multi-worker).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (LOCALE_PREFIX.test(pathname)) {
    const internalPath = pathname.replace(LOCALE_PREFIX, "") || "/";
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    return NextResponse.rewrite(url);
  }

  const barePath = stripLocale(pathname);

  if (requiresAuth(barePath)) {
    const authenticated = await hasValidSessionCookie(request);
    if (!authenticated) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("redirect", barePath);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/.*|api/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
