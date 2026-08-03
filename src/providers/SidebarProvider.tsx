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
import { useRouter } from "next/navigation";
import { useCollapsibleSidebar } from "@/hooks/useCollapsibleSidebar";
import { usePlatform } from "@/providers/PlatformProvider";
import { usePermissions } from "@/providers/VoraProviders";
import type { ResolvedNavigationLink } from "@/types/navigation";
import type { SidebarMode } from "@/types/navigation";
import type { PlatformContext } from "@/types/vora";

interface SidebarContextValue {
  mode: SidebarMode;
  setMode: (mode: SidebarMode, options?: { navigate?: boolean }) => void;
  links: ResolvedNavigationLink[];
  isLoading: boolean;
  error: string | null;
  refreshLinks: () => Promise<void>;
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

async function fetchNavLinks(platform: PlatformContext): Promise<ResolvedNavigationLink[]> {
  const res = await fetch(`/api/navigation/links?platform=${platform}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load navigation");
  const data = await res.json();
  return data.links ?? [];
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { platform, setPlatform } = usePlatform();
  const { role } = usePermissions();
  const { isOpen, toggle, setOpen } = useCollapsibleSidebar("vora_global_sidebar");
  const [links, setLinks] = useState<ResolvedNavigationLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectivePlatform: PlatformContext = role === "company" ? "network" : platform;
  const mode: SidebarMode = effectivePlatform;

  const loadLinks = useCallback(async (targetPlatform: PlatformContext) => {
    setIsLoading(true);
    setError(null);
    try {
      const nextLinks = await fetchNavLinks(targetPlatform);
      setLinks(nextLinks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Navigation unavailable");
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshLinks = useCallback(async () => {
    await loadLinks(effectivePlatform);
  }, [loadLinks, effectivePlatform]);

  const setMode = useCallback(
    (next: SidebarMode, options?: { navigate?: boolean }) => {
      if (role === "company" && next === "freelance") {
        return;
      }
      setPlatform(next);
      if (options?.navigate !== false) {
        if (role === "company") {
          router.push("/company/dashboard");
        } else {
          router.push(next === "network" ? "/network" : "/freelance");
        }
      }
    },
    [router, setPlatform, role]
  );

  useEffect(() => {
    void loadLinks(effectivePlatform);
  }, [effectivePlatform, loadLinks]);

  const value = useMemo(
    () => ({ mode, setMode, links, isLoading, error, refreshLinks, isOpen, toggle, setOpen }),
    [mode, setMode, links, isLoading, error, refreshLinks, isOpen, toggle, setOpen]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
