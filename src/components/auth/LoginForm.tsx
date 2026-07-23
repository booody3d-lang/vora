"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { usePermissions } from "@/providers/VoraProviders";
import { useTranslations } from "@/i18n/use-translations";
import { DEFAULT_COUNTRY_ISO2, detectInitialCountryIso2 } from "@/lib/auth/phone";
import {
  PLATFORM_ACCOUNT_OPTIONS,
  getRedirectForRole,
} from "@/lib/security/platform-accounts";
import { getLocaleFromPathname, localizePath } from "@/i18n/routing";
import { DEFAULT_LOCALE } from "@/i18n/config";
import type { AuthUser, VoraRole } from "@/types/security";
import type { OtpDeliveryChannel, PhoneInputValue } from "@/types/auth-phone";

type AuthMode = "email" | "phone";

const ROLE_KEYS: Record<VoraRole, string | null> = {
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
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNational, setPhoneNational] = useState("");
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_COUNTRY_ISO2);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [phoneValid, setPhoneValid] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpChannel, setOtpChannel] = useState<OtpDeliveryChannel>("sms");
  const [otpSent, setOtpSent] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string>();

  useEffect(() => {
    setPhoneCountry(detectInitialCountryIso2());
  }, []);

  function handlePhoneValueChange(value: PhoneInputValue) {
    setPhoneE164(value.e164);
    setPhoneValid(value.isValid);
  }

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

  async function loginWithEmail(loginEmail: string, loginPassword: string, mfaCode?: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          ...(mfaCode ? { totpCode: mfaCode } : {}),
        }),
      });
      const data = (await res.json()) as {
        user?: AuthUser;
        error?: string;
        requires2FA?: boolean;
      };

      if (data.requires2FA && !mfaCode) {
        setRequires2FA(true);
        setEmail(loginEmail);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? (data.requires2FA ? t("auth.twoFaInvalid") : t("auth.loginFailed")));
        if (data.requires2FA) {
          setRequires2FA(true);
        }
        return;
      }
      if (!data.user) {
        setError(t("auth.loginNoUser"));
        return;
      }
      await navigateAfterLogin(data.user);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    await loginWithEmail(email, password, requires2FA ? totpCode : undefined);
  }

  function selectPlatformAccount(accountEmail: string) {
    setEmail(accountEmail);
    setError("");
  }

  async function sendOtp() {
    if (!phoneValid || !phoneE164) {
      setError(t("auth.invalidPhone"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneE164,
          countryCode: phoneCountry,
          channel: otpChannel,
          purpose: "login",
        }),
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
    if (!phoneValid || !phoneE164) {
      setError(t("auth.invalidPhone"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneE164, countryCode: phoneCountry, code: otp }),
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
      </div>

      <div className="mb-4 rounded-xl border border-[#3B5998]/30 bg-[#3B5998]/5 p-3">
        <p className="mb-2 text-xs font-semibold text-[#93B4E8]">{t("auth.accountTypeList")}</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_ACCOUNT_OPTIONS.map((account) => {
            const key = ROLE_KEYS[account.role];
            const active = email.toLowerCase() === account.email.toLowerCase();
            return (
              <button
                key={account.email}
                type="button"
                disabled={loading}
                onClick={() => selectPlatformAccount(account.email)}
                className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition disabled:opacity-50 ${
                  active
                    ? "border-[#3B5998] bg-[#3B5998] text-white"
                    : "border-slate-600 bg-slate-900 text-slate-300 hover:border-[#3B5998]/50"
                }`}
              >
                {key ? t(key) : account.email}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">{t("auth.accountTypeHint")}</p>
      </div>

      <div className="mb-4 flex rounded-xl bg-slate-800/50 p-1">
        <button
          type="button"
          onClick={() => setMode("email")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            mode === "email" ? "bg-[#3B5998] text-white" : "text-slate-400"
          }`}
        >
          {t("auth.emailPasswordTab")}
        </button>
        <button
          type="button"
          onClick={() => setMode("phone")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            mode === "phone" ? "bg-[#EA580C] text-white" : "text-slate-400"
          }`}
        >
          {t("auth.phoneOtpTab")}
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {mode === "email" ? (
        <form onSubmit={handleEmailLogin} className="space-y-4">
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
          <div className="text-end">
            <Link href="/auth/forgot-password" className="text-xs text-[#93C5FD] hover:underline">
              {t("auth.forgotPasswordLink")}
            </Link>
          </div>
          {requires2FA && (
            <div>
              <label className="text-xs text-slate-400">{t("auth.twoFaCode")}</label>
              <p className="mt-1 text-[11px] text-slate-500">{t("auth.twoFaRequired")}</p>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                maxLength={6}
                required
                autoComplete="one-time-code"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                placeholder="000000"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#3B5998] py-3 text-sm font-semibold text-white hover:bg-[#2d4373] disabled:opacity-50"
          >
            {loading
              ? t("auth.signingIn")
              : requires2FA
                ? t("auth.verifyTwoFaButton")
                : t("auth.signInButton")}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <PhoneInput
            nationalNumber={phoneNational}
            countryIso2={phoneCountry}
            onNationalNumberChange={setPhoneNational}
            onCountryChange={setPhoneCountry}
            onValueChange={handlePhoneValueChange}
            disabled={loading || otpSent}
          />
          {!otpSent && (
            <div>
              <p className="mb-2 text-xs text-slate-400">{t("auth.otpChannelLabel")}</p>
              <div className="flex rounded-xl bg-slate-800/50 p-1">
                <button
                  type="button"
                  onClick={() => setOtpChannel("sms")}
                  disabled={loading}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                    otpChannel === "sms" ? "bg-[#EA580C] text-white" : "text-slate-400"
                  }`}
                >
                  {t("auth.otpChannelSms")}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpChannel("whatsapp")}
                  disabled={loading}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                    otpChannel === "whatsapp" ? "bg-emerald-600 text-white" : "text-slate-400"
                  }`}
                >
                  {t("auth.otpChannelWhatsapp")}
                </button>
              </div>
            </div>
          )}
          {!otpSent ? (
            <button
              type="button"
              onClick={sendOtp}
              disabled={loading || !phoneValid}
              className="w-full rounded-xl bg-[#EA580C] py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {otpChannel === "whatsapp" ? t("auth.sendOtpWhatsapp") : t("auth.sendOtpSms")}
            </button>
          ) : (
            <>
              <div>
                <label className="text-xs text-slate-400">{t("auth.otpDigit")}</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#EA580C] focus:outline-none"
                />
              </div>
              {demoOtp && (
                <p className="text-xs text-amber-400">{t("auth.demoOtp", { code: demoOtp })}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#EA580C] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("auth.verifySignIn")}
              </button>
            </>
          )}
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-400">
        {t("auth.noAccount")}{" "}
        <Link href="/auth/signup" className="text-[#3B5998] hover:underline">
          {t("auth.createOne")}
        </Link>
      </p>
    </div>
  );
}
