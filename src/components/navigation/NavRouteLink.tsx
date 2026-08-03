"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function isValidNavHref(href: string): boolean {
  if (!href || href === "#") return false;
  if (href.startsWith("javascript:")) return false;
  if (href.includes("{profileSlug}") || href.includes("{storeSlug}")) return false;
  return href.startsWith("/");
}

/** Routes gated by middleware RBAC — use full document navigation to avoid silent client redirects. */
const MIDDLEWARE_GATED_PREFIXES = [
  "/admin",
  "/network/messages",
  "/network/settings",
  "/network/ai",
  "/network/connections",
  "/network/profile/edit",
  "/freelance/messages",
  "/freelance/dashboard",
  "/freelance/orders",
  "/freelance/manage-store",
  "/billing",
  "/company/dashboard",
  "/company/onboarding",
];

export function shouldHardNavigate(href: string): boolean {
  const path = href.split("?")[0].split("#")[0];
  return MIDDLEWARE_GATED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

interface NavRouteLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
  onNavigate?: () => void;
  /** Full document navigation — reliable for middleware-gated routes like /admin */
  hardNavigate?: boolean;
  "aria-label"?: string;
}

/**
 * Safe navigation link: skips invalid hrefs and optionally forces a full page load
 * so middleware redirects are not swallowed by client-side routing.
 */
export function NavRouteLink({
  href,
  className,
  children,
  prefetch,
  onNavigate,
  hardNavigate = false,
  "aria-label": ariaLabel,
}: NavRouteLinkProps) {
  if (!isValidNavHref(href)) return null;

  if (hardNavigate) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        className={className}
        onClick={() => onNavigate?.()}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={className}
      aria-label={ariaLabel}
      onClick={() => onNavigate?.()}
    >
      {children}
    </Link>
  );
}

export { isValidNavHref };
