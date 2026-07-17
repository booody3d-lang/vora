"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/use-translations";
import { generateDeviceFingerprint } from "@/lib/security/anti-abuse";

export function SignupForm() {
  const { t } = useTranslations();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"registered" | "professional" | "company">("registered");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [pwErrors, setPwErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPwErrors([]);

    try {
      const fingerprint = generateDeviceFingerprint({
        userAgent: navigator.userAgent,
        screenRes: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
      });

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, role, fingerprint, dataProcessingConsent: consent }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("8 characters")) {
          setPwErrors(data.error.split(". "));
        }
        setError(data.error ?? t("auth.signupFailed"));
        return;
      }
      const dest = role === "company" ? "/company/onboarding" : role === "professional" ? "/network" : "/freelance";
      router.push(dest);
      router.refresh();
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">{t("auth.signUp")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("auth.signUpSubtitle")}</p>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-slate-400">{t("auth.fullName")}</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#3B5998] focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-slate-400">{t("auth.email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#3B5998] focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-slate-400">{t("auth.password")}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#3B5998] focus:outline-none" />
          <p className="mt-1 text-[10px] text-slate-500">{t("auth.passwordHint")}</p>
          {pwErrors.map((e) => (
            <p key={e} className="text-[10px] text-red-400">{e}</p>
          ))}
        </div>
        <div>
          <label className="text-xs text-slate-400">{t("auth.accountType")}</label>
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#3B5998] focus:outline-none">
            <option value="registered">{t("auth.roleRegistered")}</option>
            <option value="professional">{t("auth.roleProfessional")}</option>
            <option value="company">{t("auth.roleCompany")}</option>
          </select>
        </div>
        <label className="flex items-start gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" required />
          {t("auth.consentGdpr")}
        </label>
        <button type="submit" disabled={loading || !consent} className="w-full rounded-xl bg-[#3B5998] py-3 text-sm font-semibold text-white hover:bg-[#2d4373] disabled:opacity-50">
          {loading ? t("auth.creating") : t("auth.createAccount")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href="/auth/login" className="text-[#3B5998] hover:underline">{t("auth.signInLink")}</Link>
      </p>
    </div>
  );
}
