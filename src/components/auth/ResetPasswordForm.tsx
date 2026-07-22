"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthPageBrand } from "@/components/auth/AuthPageBrand";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/i18n/use-translations";

export function ResetPasswordForm() {
  const { t } = useTranslations();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.resetPasswordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };

      if (!res.ok || !data.ok) {
        setError(data.error ?? t("auth.resetPasswordFailed"));
        return;
      }

      setSuccess(true);
      window.setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{t("auth.resetPasswordTitle")}</h1>
        <p className="mt-3 text-sm text-slate-600">{t("auth.resetPasswordExpired")}</p>
        <Link href="/auth/login" className="mt-6 inline-block text-sm font-semibold text-[#3B5998] hover:underline">
          {t("auth.signInLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">{t("auth.resetPasswordTitle")}</h1>
      <p className="mt-2 text-sm text-slate-600">{t("auth.resetPasswordSubtitle")}</p>

      {success ? (
        <p className="mt-6 text-sm font-medium text-emerald-600">{t("auth.resetPasswordSuccess")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500">{t("auth.password")}</label>
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-[#3B5998] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">{t("auth.confirmPassword")}</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-[#3B5998] focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#3B5998] py-3 text-sm font-semibold text-white hover:bg-[#2d4373] disabled:opacity-50"
          >
            {loading ? t("auth.resetPasswordSaving") : t("auth.resetPasswordButton")}
          </button>
        </form>
      )}
    </div>
  );
}
