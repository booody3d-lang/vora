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

const DEMO_ROLE_KEYS: Record<VoraRole, string | null> = {
  visitor: null,
  registered: "auth.demoAccounts.registered",
  professional: "auth.demoAccounts.professional",
  company: "auth.demoAccounts.company",
  admin: "auth.demoAccounts.admin",
  owner: "auth.demoAccounts.owner",
};

export function LoginForm() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const { refreshSession } = usePermissions();
  const [mode, setMode] = useState<AuthMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string>();

  function resolveDestination(user: Pick<AuthUser, "role">, fallbackRole?: VoraRole): string {
    if (redirectTo) return redirectTo;
    const role = (user.role ?? fallbackRole ?? "registered") as VoraRole;
    const barePath = getRedirectForRole(role);
    const locale =
      (typeof window !== "undefined" ? getLocaleFromPathname(window.location.pathname) : null) ??
      DEFAULT_LOCALE;
    return localizePath(barePath, locale);
  }

  async function navigateAfterLogin(user: Pick<AuthUser, "role">, fallbackRole?: VoraRole) {
    const dest = resolveDestination(user, fallbackRole);
    try {
      await refreshSession();
    } catch {
      // Full page load will re-fetch session anyway
    }
    window.location.assign(dest);
  }

  async function loginWithEmail(
    loginEmail: string,
    loginPassword?: string,
    fallbackRole?: VoraRole
  ) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword ?? (isDev ? undefined : ""),
          devMock: isDev,
        }),
      });
      const data = await res.json() as {
        user?: AuthUser;
        error?: string;
        requires2FA?: boolean;
      };

      if (data.requires2FA) {
        setRequires2FA(true);
        setEmail(loginEmail);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? t("auth.loginFailed"));
        return;
      }
      if (!data.user) {
        setError(t("auth.loginNoUser"));
        return;
      }
      await navigateAfterLogin(data.user, fallbackRole);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    await loginWithEmail(email, password);
  }

  async function sendOtp() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setOtpSent(true);
      if (data.demoCode) setDemoOtp(data.demoCode);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      await navigateAfterLogin(data.user);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">{t("auth.signIn")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("auth.subtitle")}</p>
        {isDev && (
          <p className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
            {t("auth.devModeHint")}
          </p>
        )}
      </div>

      {isDev && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="mb-2 text-xs font-semibold text-emerald-400">{t("auth.quickDemoLogin")}</p>
          <div className="flex flex-wrap gap-2">
            {DEV_DEMO_ACCOUNT_OPTIONS.map((demo) => {
              const key = DEMO_ROLE_KEYS[demo.role];
              return (
                <button
                  key={demo.email}
                  type="button"
                  disabled={loading}
                  onClick={() => loginWithEmail(demo.email, undefined, demo.role)}
                  className="rounded-lg border border-emerald-500/30 bg-slate-900 px-2.5 py-1.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  {key ? t(key) : demo.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4 flex rounded-xl bg-slate-800/50 p-1">
        <button type="button" onClick={() => setMode("email")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === "email" ? "bg-[#3B5998] text-white" : "text-slate-400"}`}>
          {t("auth.emailPasswordTab")}
        </button>
        <button type="button" onClick={() => setMode("phone")} className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === "phone" ? "bg-[#EA580C] text-white" : "text-slate-400"}`}>
          {t("auth.phoneOtpTab")}
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      {mode === "email" ? (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400">{t("auth.email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#3B5998] focus:outline-none" placeholder="alex@vora.sa" />
          </div>
          <div>
            <label className="text-xs text-slate-400">
              {t("auth.password")} {isDev && <span className="text-slate-600">{t("auth.passwordOptionalDev")}</span>}
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!isDev} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#3B5998] focus:outline-none" placeholder={isDev ? t("auth.passwordPlaceholderDev") : undefined} />
          </div>
          {requires2FA && (
            <div>
              <label className="text-xs text-slate-400">{t("auth.twoFaCode")}</label>
              <input type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} maxLength={6} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none" placeholder="000000" />
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#3B5998] py-3 text-sm font-semibold text-white hover:bg-[#2d4373] disabled:opacity-50">
            {loading ? t("auth.signingIn") : t("auth.signInButton")}
          </button>
          {!isDev && (
            <p className="text-center text-[10px] text-slate-500">{t("auth.demoHint")}</p>
          )}
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400">{t("auth.saudiMobile")}</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#EA580C] focus:outline-none" placeholder="05XXXXXXXX" />
          </div>
          {!otpSent ? (
            <button type="button" onClick={sendOtp} disabled={loading} className="w-full rounded-xl bg-[#EA580C] py-3 text-sm font-semibold text-white disabled:opacity-50">
              {t("auth.sendOtp")}
            </button>
          ) : (
            <>
              <div>
                <label className="text-xs text-slate-400">{t("auth.otpDigit")}</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#EA580C] focus:outline-none" />
              </div>
              {demoOtp && <p className="text-xs text-amber-400">{t("auth.demoOtp", { code: demoOtp })}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#EA580C] py-3 text-sm font-semibold text-white disabled:opacity-50">
                {t("auth.verifySignIn")}
              </button>
            </>
          )}
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-400">
        {t("auth.noAccount")}{" "}
        <Link href="/auth/signup" className="text-[#3B5998] hover:underline">{t("auth.createOne")}</Link>
      </p>
    </div>
  );
}
