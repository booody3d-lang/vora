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
import { usePermissions } from "@/providers/VoraProviders";
import type { CompanyProfile } from "@/types/company";

interface CurrentCompanyState {
  companySlug: string | null;
  company: CompanyProfile | null;
  loading: boolean;
}

interface CurrentCompanyContextValue extends CurrentCompanyState {
  refresh: () => Promise<void>;
  patchCompany: (updates: Partial<CompanyProfile>) => Promise<CompanyProfile | null>;
  applyCompany: (company: CompanyProfile) => void;
}

const emptyState: CurrentCompanyState = {
  companySlug: null,
  company: null,
  loading: true,
};

const CurrentCompanyCtx = createContext<CurrentCompanyContextValue | null>(null);

export function CurrentCompanyProvider({ children }: { children: ReactNode }) {
  const { user } = usePermissions();
  const [state, setState] = useState<CurrentCompanyState>(emptyState);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/company/me", { credentials: "include" });
      const data = await res.json();
      if (!data.authenticated || !data.hasCompany) {
        setState({ ...emptyState, loading: false });
        return;
      }
      setState({
        companySlug: data.companySlug ?? data.company?.slug ?? null,
        company: data.company ?? null,
        loading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const applyCompany = useCallback((company: CompanyProfile) => {
    setState({
      companySlug: company.slug,
      company,
      loading: false,
    });
  }, []);

  const patchCompany = useCallback(async (updates: Partial<CompanyProfile>) => {
    let snapshot: CurrentCompanyState | null = null;

    setState((prev) => {
      if (!prev.company) return prev;
      snapshot = prev;
      return {
        ...prev,
        company: { ...prev.company, ...updates },
      };
    });

    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");

      setState({
        companySlug: data.company.slug,
        company: data.company,
        loading: false,
      });

      return data.company as CompanyProfile;
    } catch {
      if (snapshot) setState(snapshot);
      return null;
    }
  }, []);

  useEffect(() => {
    if (user && (user.role === "company" || user.role === "admin" || user.role === "owner")) {
      void refresh();
    } else {
      setState({ ...emptyState, loading: false });
    }
  }, [user?.id, user?.role, refresh, user]);

  const value = useMemo(
    () => ({
      ...state,
      refresh,
      patchCompany,
      applyCompany,
    }),
    [state, refresh, patchCompany, applyCompany]
  );

  return <CurrentCompanyCtx.Provider value={value}>{children}</CurrentCompanyCtx.Provider>;
}

export function useCurrentCompany() {
  const context = useContext(CurrentCompanyCtx);
  if (!context) {
    throw new Error("useCurrentCompany must be used within CurrentCompanyProvider");
  }
  return context;
}
