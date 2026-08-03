"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function isValidNavHref(href: string): boolean {
  if (!href || href === "#") return false;
  if (href.startsWith("javascript:")) return false;
  if (href.includes("{profileSlug}") || href.includes("{storeSlug}")) return false;
  return href.startsWith("/");
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
