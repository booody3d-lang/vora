import { NextResponse, type NextRequest } from "next/server";

const LOCALE_PREFIX = /^\/(en|ar)(?=\/|$)/;

/**
 * Minimal middleware: rewrite /en/... and /ar/... to unprefixed routes only.
 * No redirects — prevents loops and 500s from redirect chains.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (LOCALE_PREFIX.test(pathname)) {
    const internalPath = pathname.replace(LOCALE_PREFIX, "") || "/";
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/.*|api/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
