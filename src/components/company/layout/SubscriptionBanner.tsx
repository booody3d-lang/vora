"use client";

import { useState } from "react";
import Link from "next/link";
import type { CompanySubscription } from "@/types/company";
import { ANNUAL_SUBSCRIPTION_SAR } from "@/types/company";
import { computeSubscriptionState } from "@/lib/company/mock-data";

interface SubscriptionBannerProps {
  subscription: CompanySubscription;
}

export function SubscriptionBanner({ subscription }: SubscriptionBannerProps) {
  const state = computeSubscriptionState(subscription);
  const [showPaywall, setShowPaywall] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          plan: "company_annual",
          successUrl: `${window.location.origin}/company/dashboard?subscribed=true`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Payment initiation failed");
        setShowPaywall(false);
      }
    } catch {
      alert("Payment initiation failed");
    } finally {
      setLoading(false);
    }
  }

  if (subscription.status === "active" && !state.isPaywallActive) {
    return (
      <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm text-emerald-800">
        ✓ Active subscription · {state.message}
      </div>
    );
  }

  return (
    <>
      <div
        className={`border-b px-4 py-2.5 text-center text-sm ${
          state.isPaywallActive
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {state.isPaywallActive ? (
          <span>
            🔒 Publishing locked — {state.message}{" "}
            <button
              type="button"
              onClick={() => setShowPaywall(true)}
              className="font-bold underline hover:no-underline"
            >
              Subscribe now (SAR {ANNUAL_SUBSCRIPTION_SAR}/year)
            </button>
          </span>
        ) : (
          <span>
            ⏳ Trial: <strong>{state.freeJobsRemaining}</strong> free job
            {state.freeJobsRemaining !== 1 ? "s" : ""} remaining ·{" "}
            <strong>{state.daysRemaining}</strong> days left
          </span>
        )}
      </div>

      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowPaywall(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-[#0F172A]">VORA Company Subscription</h2>
            <p className="mt-2 text-sm text-slate-600">
              Unlock unlimited job postings and full ATS access with an annual subscription.
            </p>
            <div className="mt-6 rounded-xl border border-[#3B5998]/20 bg-[#3B5998]/5 p-5 text-center">
              <p className="text-3xl font-bold text-[#0F172A]">
                SAR {ANNUAL_SUBSCRIPTION_SAR}
                <span className="text-base font-normal text-slate-500">/year</span>
              </p>
              <ul className="mt-4 space-y-2 text-left text-sm text-slate-600">
                <li>✓ Unlimited job postings</li>
                <li>✓ Full ATS pipeline with drag & drop</li>
                <li>✓ Video application review</li>
                <li>✓ Company analytics dashboard</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-[#3B5998] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Processing..." : `Subscribe — SAR ${ANNUAL_SUBSCRIPTION_SAR}/year`}
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Secure payment · Mada cards accepted when live billing is enabled
            </p>
            <Link
              href="/billing/plans"
              className="mt-2 block text-center text-xs text-[#3B5998] hover:underline"
            >
              View billing details
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
