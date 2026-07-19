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
  const { isOpen, toggle, setOpen } = useCollapsibleSidebar("vora_global_sidebar");
  const [links, setLinks] = useState<ResolvedNavigationLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mode: SidebarMode = platform;

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
    await loadLinks(platform);
  }, [loadLinks, platform]);

  const setMode = useCallback(
    (next: SidebarMode, options?: { navigate?: boolean }) => {
      setPlatform(next);
      if (options?.navigate !== false) {
        router.push(next === "network" ? "/network" : "/freelance");
      }
    },
    [router, setPlatform]
  );

  useEffect(() => {
    void loadLinks(platform);
  }, [platform, loadLinks]);

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
