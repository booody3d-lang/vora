"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { platformFromPathname } from "@/lib/navigation/validate";
import type { PlatformContext } from "@/types/vora";

const PLATFORM_STORAGE_KEY = "vora_platform_mode";

interface PlatformContextValue {
  platform: PlatformContext;
  setPlatform: (platform: PlatformContext) => void;
  togglePlatform: () => void;
}

const PlatformCtx = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatformState] = useState<PlatformContext>("network");

  useEffect(() => {
    const stored = localStorage.getItem(PLATFORM_STORAGE_KEY);
    if (stored === "network" || stored === "freelance") {
      setPlatformState(stored);
      return;
    }

    const pathPlatform = platformFromPathname(window.location.pathname);
    if (pathPlatform) {
      setPlatformState(pathPlatform);
    }
  }, []);

  const setPlatform = useCallback((next: PlatformContext) => {
    setPlatformState(next);
    localStorage.setItem(PLATFORM_STORAGE_KEY, next);
  }, []);

  const togglePlatform = useCallback(() => {
    setPlatform(platform === "network" ? "freelance" : "network");
  }, [platform, setPlatform]);

  const value = useMemo(
    () => ({ platform, setPlatform, togglePlatform }),
    [platform, setPlatform, togglePlatform]
  );

  return <PlatformCtx.Provider value={value}>{children}</PlatformCtx.Provider>;
}

export function usePlatform() {
  const context = useContext(PlatformCtx);
  if (!context) throw new Error("usePlatform must be used within PlatformProvider");
  return context;
}
