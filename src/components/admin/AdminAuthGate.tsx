"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { usePermissions } from "@/providers/VoraProviders";
import { useRouter } from "next/navigation";
import { VoraLogo } from "@/components/brand/VoraLogo";
import { useTranslations } from "@/i18n/use-translations";
import { DEV_DEMO_ACCOUNT_OPTIONS, getRedirectForRole } from "@/lib/security/dev-auth";
import { getLocaleFromPathname, localizePath } from "@/i18n/routing";
import { DEFAULT_LOCALE } from "@/i18n/config";

import { isDemoAuthEnabled } from "@/lib/security/client-auth";

const DEMO_ROLE_KEYS: Record<string, string> = {
  admin: "auth.demoAccounts.admin",
  owner: "auth.demoAccounts.owner",
};

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
  const { refreshSession } = usePermissions();
  const { t } = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function devMockLogin(email: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, devMock: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("auth.loginFailed"));
        return;
      }
      await refreshSession();
      const locale = getLocaleFromPathname(window.location.pathname) ?? DEFAULT_LOCALE;
      window.location.assign(localizePath(getRedirectForRole(data.user?.role ?? "owner"), locale));
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (isAuthenticated) return <>{children}</>;

  const adminDemos = DEV_DEMO_ACCOUNT_OPTIONS.filter((d) => d.role === "admin" || d.role === "owner");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1120] p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-900/30 bg-[#111827] p-8 shadow-2xl text-center">
        <div className="mb-6 flex justify-center">
          <VoraLogo href="/" size="auth" />
        </div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-600/20 text-2xl">🔐</div>
        <h1 className="mt-4 text-xl font-bold text-white">{t("admin.superAdmin")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("admin.sessionRequired")}</p>

        {isDemoAuthEnabled() && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left">
            <p className="text-xs font-semibold text-emerald-400">{t("admin.devBypass")}</p>
            <div className="mt-2 flex flex-col gap-2">
              {adminDemos.map((demo) => {
                const label = t(DEMO_ROLE_KEYS[demo.role] ?? "auth.demoAccounts.admin");
                return (
                  <button
                    key={demo.email}
                    type="button"
                    disabled={loading}
                    onClick={() => devMockLogin(demo.email)}
                    className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {loading
                      ? t("auth.signingIn")
                      : t("admin.loginAs", { label, email: demo.email })}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={() => router.push("/auth/login?redirect=/admin")}
          className="mt-4 w-full rounded-xl border border-slate-600 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
        >
          {t("admin.goToSignIn")}
        </button>
        {!isDemoAuthEnabled() && (
          <p className="mt-4 text-[10px] text-slate-600">{t("admin.demoHint")}</p>
        )}
      </div>
    </div>
  );
}
