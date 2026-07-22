"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useCollapsibleSidebar } from "@/hooks/useCollapsibleSidebar";

interface CompanySidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

const CompanySidebarContext = createContext<CompanySidebarContextValue | null>(null);

export function CompanySidebarProvider({ children }: { children: ReactNode }) {
  const { isOpen, toggle, setOpen } = useCollapsibleSidebar("vora_company_sidebar");

  const value = useMemo(
    () => ({ isOpen, toggle, setOpen }),
    [isOpen, toggle, setOpen]
  );

  return (
    <CompanySidebarContext.Provider value={value}>{children}</CompanySidebarContext.Provider>
  );
}

export function useCompanySidebar() {
  const ctx = useContext(CompanySidebarContext);
  if (!ctx) throw new Error("useCompanySidebar must be used within CompanySidebarProvider");
  return ctx;
}
