"use client";

import Link from "next/link";

interface VisitorLimitModalProps {
  open: boolean;
  onClose: () => void;
}

export function VisitorLimitModal({ open, onClose }: VisitorLimitModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close overlay"
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
          Create an Account to Continue
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          You&apos;ve reached the free viewing limit of 3 profiles or job posts.
          Register for free to unlock full browsing, messaging, and marketplace
          features.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="flex-1 rounded-xl bg-gradient-to-r from-[#3B5998] to-[#475569] px-5 py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Create Account
          </Link>
          <Link
            href="/auth/login"
            className="flex-1 rounded-xl border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/5"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
