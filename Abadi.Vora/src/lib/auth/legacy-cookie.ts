import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/security/jwt";

/** Clears the deprecated custom JWT cookie after migrating to Supabase Auth. */
export function clearLegacySessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
