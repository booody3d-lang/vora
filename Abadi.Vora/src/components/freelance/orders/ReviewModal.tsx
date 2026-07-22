"use client";

import { useState } from "react";
import type { ReviewSubmission } from "@/types/freelance";
import { useLocale } from "@/providers/LocaleProvider";

interface ReviewModalProps {
  open: boolean;
  onSubmit: (review: ReviewSubmission) => void;
}

function StarSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-amber-500">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[#EA580C]"
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      </div>
    </div>
  );
}

export function ReviewModal({ open, onSubmit }: ReviewModalProps) {
  const { t } = useLocale();
  const [quality, setQuality] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [text, setText] = useState("");

  if (!open) return null;

  function handleSubmit() {
    if (!text.trim()) return;
    onSubmit({
      overallQuality: quality,
      communication,
      deliveryPunctuality: punctuality,
      publicReview: text.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-xl font-bold text-[#0F172A]">{t("review.title")}</h2>
        <p className="mt-1 text-xs text-slate-400">Required before order completion</p>

        <div className="mt-6 space-y-5">
          <StarSlider label={t("review.quality")} value={quality} onChange={setQuality} />
          <StarSlider label={t("review.communication")} value={communication} onChange={setCommunication} />
          <StarSlider label={t("review.punctuality")} value={punctuality} onChange={setPunctuality} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your public review..."
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#EA580C]"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="mt-6 w-full rounded-xl bg-[#EA580C] py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t("review.submit")}
        </button>
      </div>
    </div>
  );
}
