"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VoraLogo } from "@/components/brand/VoraLogo";

const STEPS = ["Company Info", "Verification", "Complete"];

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    size: "",
    headquarters: "",
    website: "",
  });

  function handleComplete() {
    router.push("/company/dashboard");
  }

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

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-sm text-slate-500 disabled:opacity-40"
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white"
              >
                Go to Dashboard
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
