"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/providers/VoraProviders";
import type { AdminAccessCapabilities } from "@/lib/security/roles";

interface AdminAccessResponse {
  capabilities?: AdminAccessCapabilities;
  isOwner?: boolean;
  canViewFinance?: boolean;
}

export function useAdminCapabilities() {
  const { role, user, isLoading: sessionLoading } = usePermissions();
  const [caps, setCaps] = useState<AdminAccessResponse | null>(null);
  const [capsLoading, setCapsLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (role !== "admin" && role !== "owner") {
      setCaps(null);
      setCapsLoading(false);
      return;
    }

    let cancelled = false;
    setCapsLoading(true);

    fetch("/api/admin/access", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AdminAccessResponse | null) => {
        if (!cancelled) setCaps(data);
      })
      .catch(() => {
        if (!cancelled) setCaps(null);
      })
      .finally(() => {
        if (!cancelled) setCapsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [role, sessionLoading]);

  const isOwner = caps?.isOwner ?? caps?.capabilities?.isOwner ?? role === "owner";
  const isLimitedAdmin = caps?.capabilities?.isLimitedAdmin ?? (role === "admin" && !isOwner);

  return {
    isOwner,
    isLimitedAdmin,
    canViewFinance: caps?.canViewFinance ?? caps?.capabilities?.canViewFinance ?? isOwner,
    userEmail: user?.email,
    userName: user?.fullName,
    isLoading: sessionLoading || capsLoading,
  };
}
