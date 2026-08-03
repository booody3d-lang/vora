"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePermissions } from "@/providers/VoraProviders";

/** Client fallback when middleware misses company role — keeps employers off the job-seeker feed. */
const REDIRECTS: Record<string, string> = {
  "/network": "/company/dashboard",
  "/network/": "/company/dashboard",
  "/network/jobs": "/company/dashboard/jobs",
};

export function CompanyNetworkGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isLoading } = usePermissions();

  useEffect(() => {
    if (isLoading || role !== "company") return;
    const target = REDIRECTS[pathname];
    if (target) {
      router.replace(target);
    }
  }, [pathname, role, isLoading, router]);

  return null;
}
