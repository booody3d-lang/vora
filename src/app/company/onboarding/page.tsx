"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VoraLogo } from "@/components/brand/VoraLogo";

const STEPS = ["Company Info", "Verification", "Complete"];

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    size: "",
    headquarters: "",
    website: "",
  });

  async function handleComplete() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.companyName,
          industry: form.industry,
          sizeRange: form.size,
          headquarters: form.headquarters,
          websiteUrl: form.website,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Registration failed");
      }

      router.push("/company/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  const canContinue =
    step === 0 ? form.companyName.trim().length > 0 : true;

  return (
    <div className="min-h-screen bg-[#F1F5F9]" data-platform="network">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <VoraLogo href="/" size="md" />
      </header>

      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-8 text-center">
          <span className="rounded-full bg-[#3B5998]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#3B5998]">
            Company Onboarding
          </span>
          <h1 className="mt-3 text-2xl font-bold text-[#0F172A]">
            Register Your Company
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Separate flow for corporate entities — not available to individual freelancers
          </p>
        </div>

        <div className="mb-6 flex gap-2">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold ${
                i === step ? "bg-[#3B5998] text-white" : i < step ? "bg-[#3B5998]/20 text-[#3B5998]" : "bg-slate-100 text-slate-400"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              {(["companyName", "industry", "size", "headquarters", "website"] as const).map((field) => (
                <label key={field} className="block">
                  <span className="text-sm font-medium capitalize text-slate-700">
                    {field.replace(/([A-Z])/g, " $1")}
                    {field === "companyName" ? " *" : ""}
                  </span>
                  <input
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3B5998]"
                  />
                </label>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#3B5998]/10 text-2xl">
                🏢
              </div>
              <p className="text-sm text-slate-600">
                Upload your company logo and cover image. Verification review takes 1–2 business days.
              </p>
              <div className="rounded-lg border-2 border-dashed border-slate-200 py-8 text-sm text-slate-400">
                Drag & drop logo & cover image
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-center">
              <div className="text-4xl">🎉</div>
              <h2 className="text-lg font-bold text-[#0F172A]">You&apos;re all set!</h2>
              <div className="rounded-lg bg-amber-50 p-4 text-left text-sm text-amber-900">
                <p className="font-semibold">Your trial includes:</p>
                <ul className="mt-2 space-y-1">
                  <li>✓ 3 months free trial</li>
                  <li>✓ First 3 job postings free</li>
                  <li>✓ Full ATS pipeline access</li>
                </ul>
              </div>
              <p className="text-xs text-slate-400">
                After 3 jobs or 3 months, SAR 600/year subscription required.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || submitting}
              className="text-sm text-slate-500 disabled:opacity-40"
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canContinue}
                className="rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting || !form.companyName.trim()}
                className="rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Go to Dashboard"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Individual professional?{" "}
          <Link href="/auth/signup" className="text-[#3B5998] hover:underline">
            Sign up as a professional
          </Link>
        </p>
      </div>
    </div>
  );
}
