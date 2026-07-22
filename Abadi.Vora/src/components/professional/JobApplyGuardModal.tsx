"use client";

import Link from "next/link";
import type { MissingProfileModule } from "@/types/vora";
import { cn } from "@/lib/utils";

interface JobApplyGuardModalProps {
  open: boolean;
  onClose: () => void;
  score: number;
  missingModules: MissingProfileModule[];
}

export function JobApplyGuardModal({
  open,
  onClose,
  score,
  missingModules,
}: JobApplyGuardModalProps) {
  if (!open) return null;

  const incomplete = missingModules.filter((module) => !module.completed);

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
        aria-labelledby="apply-guard-title"
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0F172A] p-8 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="apply-guard-title" className="text-2xl font-bold text-white">
            Complete Your Professional Profile to Apply
          </h2>
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-semibold text-amber-300">
            {score}%
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-400">
          Job applications require a Professional Score of at least 70% and an
          uploaded resume. Complete the missing modules below to unlock
          applications.
        </p>
        <ul className="mt-5 space-y-2">
          {incomplete.map((module) => (
            <li key={module.id}>
              <Link
                href={module.href}
                className={cn(
                  "flex items-center justify-between rounded-lg border border-white/10",
                  "px-4 py-3 text-sm text-white transition-colors hover:bg-white/5"
                )}
                onClick={onClose}
              >
                <span>{module.label}</span>
                <span className="text-amber-400">Complete →</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/network/profile/edit"
          className="mt-6 block rounded-xl bg-gradient-to-r from-[#3B5998] to-[#475569] px-5 py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
          onClick={onClose}
        >
          Go to Profile Editor
        </Link>
      </div>
    </div>
  );
}
