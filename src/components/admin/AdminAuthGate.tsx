"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { usePermissions } from "@/providers/VoraProviders";
import { useRouter } from "next/navigation";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { useTranslations } from "@/i18n/use-translations";
import { getLocaleFromPathname, localizePath } from "@/i18n/routing";
import { DEFAULT_LOCALE } from "@/i18n/config";

interface AdminAuthContextValue {
  isAuthenticated: boolean;
  logout: () => void;
}

const AdminAuthCtx = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { role, isLoading } = usePermissions();
  const { t } = useTranslations();
  const isAuthenticated = role === "admin" || role === "owner";

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    const locale = getLocaleFromPathname(window.location.pathname) ?? DEFAULT_LOCALE;
    window.location.href = localizePath("/auth/login", locale);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0B1120]">
        <VoraLogo href="/" size="auth" />
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <AdminAuthCtx.Provider value={{ isAuthenticated, logout }}>
      {children}
    </AdminAuthCtx.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthCtx);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

export function AdminLoginGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  const { t } = useTranslations();
  const router = useRouter();

  if (isAuthenticated) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1120] p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-900/30 bg-[#111827] p-8 shadow-2xl text-center">
        <div className="mb-6 flex justify-center">
          <VoraLogo href="/" size="auth" />
        </div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-600/20 text-2xl">🔐</div>
        <h1 className="mt-4 text-xl font-bold text-white">{t("admin.superAdmin")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("admin.sessionRequired")}</p>

        <button
          type="button"
          onClick={() => router.push("/auth/login?redirect=/admin")}
          className="mt-6 w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-500"
        >
          {t("admin.goToSignIn")}
        </button>
      </div>
    </div>
  );
}
