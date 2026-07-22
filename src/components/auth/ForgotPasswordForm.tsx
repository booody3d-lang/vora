"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/i18n/use-translations";

export function ForgotPasswordForm() {
  const { t } = useTranslations();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devRecoveryLink, setDevRecoveryLink] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setDevRecoveryLink(null);

    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: email, channel: "email" }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        devRecoveryLink?: string;
      };

      if (!res.ok) {
        setError(data.error ?? t("auth.forgotPasswordFailed"));
        return;
      }

      setMessage(data.message ?? t("auth.forgotPasswordSent"));
      if (data.devRecoveryLink) {
        setDevRecoveryLink(data.devRecoveryLink);
      }
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">{t("auth.forgotPasswordTitle")}</h1>
      <p className="mt-2 text-sm text-slate-600">{t("auth.forgotPasswordSubtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-xs text-slate-500">{t("auth.email")}</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-[#3B5998] focus:outline-none"
          />
        </div>
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {devRecoveryLink && (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            {t("auth.devRecoveryLink")}{" "}
            <a href={devRecoveryLink} className="font-semibold underline">
              {t("auth.openRecoveryLink")}
            </a>
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#3B5998] py-3 text-sm font-semibold text-white hover:bg-[#2d4373] disabled:opacity-50"
        >
          {loading ? t("auth.forgotPasswordSending") : t("auth.forgotPasswordButton")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/auth/login" className="font-semibold text-[#3B5998] hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
