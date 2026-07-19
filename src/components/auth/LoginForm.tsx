"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePermissions } from "@/providers/VoraProviders";
import { useTranslations } from "@/i18n/use-translations";
import {
  DEV_DEMO_ACCOUNT_OPTIONS,
  getRedirectForRole,
} from "@/lib/security/dev-auth";
import { getLocaleFromPathname, localizePath } from "@/i18n/routing";
import { DEFAULT_LOCALE } from "@/i18n/config";
import type { AuthUser, VoraRole } from "@/types/security";

type AuthMode = "email" | "phone";
const isDev = process.env.NODE_ENV === "development";

export function LoginForm() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const { refreshSession } = usePermissions();
  const [mode, setMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loginWithEmail(loginEmail: string, loginPassword?: string, fallbackRole?: VoraRole) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword ?? (isDev ? undefined : ""), devMock: isDev }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("auth.loginFailed")); return; }
      const dest = redirectTo ?? localizePath(getRedirectForRole(data.user?.role ?? fallbackRole ?? "registered"), DEFAULT_LOCALE);
      window.location.assign(dest);
    } catch { setError(t("common.networkError")); } finally { setLoading(false); }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl">
      <h1 className="mb-6 text-center text-2xl font-bold text-white">{t("auth.signIn")}</h1>
      
      {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      
      <form onSubmit={(e) => { e.preventDefault(); loginWithEmail(email, password); }} className="space-y-4">
        <div>
          <label className="text-xs text-slate-400">{t("auth.email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white" />
        </div>
        
        <div className="relative">
          <label className="text-xs text-slate-400">{t("auth.password")}</label>
          <input 
            type={showPassword ? "text" : "password"} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required={!isDev} 
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white" 
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-500 hover:text-white">
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#3B5998] py-3 text-sm font-semibold text-white">
          {loading ? t("auth.signingIn") : t("auth.signInButton")}
        </button>
      </form>
    </div>
  );
}
