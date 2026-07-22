import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/security/jwt";
import { PROTECTED_ROUTE_PREFIXES } from "@/lib/security/rbac";
import {
  getAccessDeniedRedirect,
  isPageAllowedForUser,
  resolveRoleFromSupabaseUser,
} from "@/lib/security/middleware-auth";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LOCALE_PREFIX = /^\/(en|ar)(?=\/|$)/;

function stripLocale(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX, "") || "/";
}

function requiresAuth(pathname: string): boolean {
  if (pathname === "/profile/me") return true;
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function hasLegacySessionCookie(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const payload = await verifySessionToken(token);
  return payload !== null;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

function finalizeResponse(
  request: NextRequest,
  sessionResponse: NextResponse,
  isLocalePath: boolean,
  barePath: string
): NextResponse {
  if (isLocalePath) {
    const url = request.nextUrl.clone();
    url.pathname = barePath;
    const rewrite = NextResponse.rewrite(url);
    copyCookies(sessionResponse, rewrite);
    return rewrite;
  }
  return sessionResponse;
}

/**
 * Supabase session refresh on every matched request + locale rewrite + auth gate.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLocalePath = LOCALE_PREFIX.test(pathname);
  const barePath = isLocalePath ? pathname.replace(LOCALE_PREFIX, "") || "/" : stripLocale(pathname);
  const needsAuth = requiresAuth(barePath);

  if (isSupabaseConfigured()) {
    const { supabase, getResponse } = createSupabaseMiddlewareClient(request);

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (needsAuth && !user) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/auth/login";
        loginUrl.searchParams.set("redirect", barePath);
        return NextResponse.redirect(loginUrl);
      }

      if (user && needsAuth && !isPageAllowedForUser(barePath, user)) {
        const role = resolveRoleFromSupabaseUser(user);
        const deniedUrl = request.nextUrl.clone();
        deniedUrl.pathname = getAccessDeniedRedirect(barePath, role);
        deniedUrl.search = "";
        return NextResponse.redirect(deniedUrl);
      }

      const sessionResponse = getResponse();
      return finalizeResponse(request, sessionResponse, isLocalePath, barePath);
    }
  }

  if (isLocalePath) {
    const url = request.nextUrl.clone();
    url.pathname = barePath;
    return NextResponse.rewrite(url);
  }

  if (needsAuth && !(await hasLegacySessionCookie(request))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("redirect", barePath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/.*|api/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
