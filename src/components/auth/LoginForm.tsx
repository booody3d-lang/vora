"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/i18n/use-translations";
import { getRedirectForRole } from "@/lib/security/dev-auth";
import { localizePath } from "@/i18n/routing";
import { DEFAULT_LOCALE } from "@/i18n/config";
import type { VoraRole } from "@/types/security";

export function LoginForm() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("auth.loginFailed"));
        return;
      }

      const role = (data.user?.role ?? "registered") as VoraRole;
      const dest =
        redirectTo ?? localizePath(getRedirectForRole(role), DEFAULT_LOCALE);
      window.location.assign(dest);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">{t("auth.signIn")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("auth.signUpSubtitle")}</p>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-slate-400">{t("auth.email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#3B5998] focus:outline-none"
          />
        </div>

        <div className="relative">
          <label className="text-xs text-slate-400">{t("auth.password")}</label>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#3B5998] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-slate-500 hover:text-white"
            aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#3B5998] py-3 text-sm font-semibold text-white hover:bg-[#2d4373] disabled:opacity-50"
        >
          {loading ? t("auth.signingIn") : t("auth.signInButton")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        {t("auth.noAccount")}{" "}
        <Link href="/auth/signup" className="text-[#3B5998] hover:underline">
          {t("auth.createOne")}
        </Link>
      </p>
    </div>
  );
}
