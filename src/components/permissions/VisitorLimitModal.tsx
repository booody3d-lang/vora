"use client";

import Link from "next/link";
import { useTranslations } from "@/i18n/use-translations";

interface VisitorLimitModalProps {
  open: boolean;
  onClose: () => void;
}

export function VisitorLimitModal({ open, onClose }: VisitorLimitModalProps) {
  const { t } = useTranslations();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("permissions.closeOverlay")}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="visitor-limit-title"
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#3B5998]/30">
          <svg
            className="h-7 w-7 text-[#64748B]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 id="visitor-limit-title" className="text-2xl font-bold text-white">
          {t("permissions.visitorLimitTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {t("permissions.visitorLimitBody")}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="flex-1 rounded-xl bg-gradient-to-r from-[#3B5998] to-[#475569] px-5 py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t("permissions.createAccount")}
          </Link>
          <Link
            href="/auth/login"
            className="flex-1 rounded-xl border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/5"
          >
            {t("auth.signInButton")}
          </Link>
        </div>
      </div>
    </div>
  );
}
