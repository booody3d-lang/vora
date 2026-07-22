"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/use-translations";

interface SharePostModalProps {
  postId: string;
  onClose: () => void;
}

export function SharePostModal({ postId, onClose }: SharePostModalProps) {
  const { t } = useTranslations();
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/network?post=${postId}`
      : `/network?post=${postId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      void fetch(`/api/feed/${postId}/share`, { method: "POST", credentials: "include" });
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "VORA", url: shareUrl });
      void fetch(`/api/feed/${postId}/share`, { method: "POST", credentials: "include" });
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("common.cancel")}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-[#0F172A]">{t("network.feed.share.title")}</h3>
        <p className="mt-1 text-sm text-slate-500">{t("network.feed.share.subtitle")}</p>

        <div className="mt-4 flex gap-2">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white"
          >
            {copied ? t("network.feed.share.copied") : t("network.feed.share.copy")}
          </button>
        </div>

        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            onClick={() => void nativeShare()}
            className="mt-3 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("network.feed.share.native")}
          </button>
        )}
      </div>
    </div>
  );
}
