"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react"; // تم استيراد الأيقونات
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
  const [showPassword, setShowPassword] = useState(false); // حالة إظهار/إخفاء كلمة المرور
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string>();

  // ... (تم الإبقاء على الدوال كما هي لضمان عملها)

  async function loginWithEmail(loginEmail: string, loginPassword?: string, fallbackRole?: VoraRole) {
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
      const data = await res.json() as { user?: AuthUser; error?: string; requires2FA?: boolean; };
      if (data.requires2FA) { setRequires2FA(true); setEmail(loginEmail); return; }
      if (!res.ok) { setError(data.error ?? t("auth.loginFailed")); return; }
      if (!data.user) { setError(t("auth.loginNoUser")); return; }
      await navigateAfterLogin(data.user, fallbackRole);
    } catch { setError(t("common.networkError")); } finally { setLoading(false); }
  }

  // ... (باقي الدوال كما هي)
  async function navigateAfterLogin(user: Pick<AuthUser, "role">, fallbackRole?: VoraRole) {
    const dest = resolveDestination(user, fallbackRole);
    try { await refreshSession(); } catch {}
    window.location.assign(dest);
  }
  function resolveDestination(user: Pick<AuthUser, "role">, fallbackRole?: VoraRole): string {
    if (redirectTo) return redirectTo;
    const role = (user.role ?? fallbackRole ?? "registered") as VoraRole;
    const barePath = getRedirectForRole(role);
    const locale = (typeof window !== "undefined" ? getLocaleFromPathname(window.location.pathname) : null) ?? DEFAULT_LOCALE;
    return localizePath(barePath, locale);
  }
  async function handleEmailLogin(e: React.FormEvent) { e.preventDefault(); await loginWithEmail(email, password); }
  async function sendOtp() { /*...*/ }
  async function verifyOtp(e: React.FormEvent) { /*...*/ }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl">
      {/* ... (الهيدر وجزء الـ Dev كما هو) */}
      
      {mode === "email" ? (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400">{t("auth.email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#3B5998] focus:outline-none" placeholder="alex@vora.sa" />
          </div>
          
          {/* حقل كلمة المرور مع أيقونة العين */}
          <div className="relative">
            <label className="text-xs text-slate-400">
              {t("auth.password")} {isDev && <span className="text-slate-600">{t("auth.passwordOptionalDev")}</span>}
            </label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required={!isDev} 
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#3B5998] focus:outline-none" 
              placeholder={isDev ? t("auth.passwordPlaceholderDev") : undefined} 
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-500 hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          {/* ... (باقي الفورم كما هو) */}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#3B5998] py-3 text-sm font-semibold text-white hover:bg-[#2d4373] disabled:opacity-50">
            {loading ? t("auth.signingIn") : t("auth.signInButton")}
          </button>
        </form>
      ) : (
        /* ... (جزء الـ OTP كما هو) */
        <></>
      )}
    </div>
  );
}
