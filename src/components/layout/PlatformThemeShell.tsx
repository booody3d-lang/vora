"use client";

import { useEffect } from "react";
import { usePlatform } from "@/providers/VoraProviders";

export function PlatformThemeShell({ children }: { children: React.ReactNode }) {
  const { platform } = usePlatform();

  useEffect(() => {
    document.documentElement.setAttribute("data-platform", platform);
  }, [platform]);

  return <>{children}</>;
}
