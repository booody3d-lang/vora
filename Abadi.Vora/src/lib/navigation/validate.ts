import type { PlatformContext } from "@/types/vora";

export function isValidPlatform(value: string): value is PlatformContext {
  return value === "network" || value === "freelance";
}

export function platformFromPathname(pathname: string): PlatformContext | null {
  if (pathname.startsWith("/freelance")) return "freelance";
  if (pathname.startsWith("/network")) return "network";
  return null;
}

export function shouldShowGlobalSidebar(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/auth")) return false;
  if (pathname.startsWith("/company")) return false;
  if (pathname === "/") return false;
  return platformFromPathname(pathname) !== null;
}
