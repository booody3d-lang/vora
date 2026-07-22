"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobPostingForm, WorkLocation, EmploymentType } from "@/types/company";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { ANNUAL_SUBSCRIPTION_SAR } from "@/types/company";
import { cn } from "@/lib/utils";

const STEPS = ["Basics", "Details", "Requirements", "Review"];

const WORK_LOCATIONS: { value: WorkLocation; label: string }[] = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

const INITIAL: JobPostingForm = {
  title: "",
  location: "",
  workLocation: "hybrid",
  employmentType: "full_time",
  showSalary: false,
  description: "",
  requiredSkills: [],
  requireVideoPitch: false,
};

interface JobCreatorWizardProps {
  onComplete?: (job: JobPostingForm) => void;
}

export function JobCreatorWizard({ onComplete }: JobCreatorWizardProps) {
  const router = useRouter();
  const { publishGuard, loading, refresh } = useCurrentCompany();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<JobPostingForm>(INITIAL);
  const [skillInput, setSkillInput] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const guard = publishGuard ?? { allowed: false, reason: "Loading subscription…" };

  function update<K extends keyof JobPostingForm>(key: K, value: JobPostingForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !form.requiredSkills.includes(trimmed)) {
      update("requiredSkills", [...form.requiredSkills, trimmed]);
      setSkillInput("");
    }
  }

  async function handlePublish() {
    if (loading || publishing) return;
    if (!guard.allowed) {
      setShowPaywall(true);
      return;
    }

    setPublishing(true);
    setPublishError(null);

    try {
      const res = await fetch("/api/company/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.status === 403) {
        setShowPaywall(true);
        return;
      }

      if (!res.ok) {
        setPublishError(data.error ?? "Failed to publish job");
        return;
      }

      onComplete?.(form);
      await refresh();
      router.push("/company/dashboard/jobs");
    } catch {
      setPublishError("Failed to publish job");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="mb-6 flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex-1 rounded-lg py-2 text-center text-xs font-semibold",
              i === step
                ? "bg-[#3B5998] text-white"
                : i < step
                  ? "bg-[#3B5998]/20 text-[#3B5998]"
                  : "bg-slate-100 text-slate-400"
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#0F172A]">Job Basics</h2>
            <Field label="Job Title" required>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Senior Product Designer"
                className="input-field"
              />
            </Field>
            <Field label="Location" required>
              <input
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. Dubai, UAE"
                className="input-field"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Work Location">
                <select
                  value={form.workLocation}
                  onChange={(e) => update("workLocation", e.target.value as WorkLocation)}
                  className="input-field"
                >
                  {WORK_LOCATIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Employment Type">
                <select
                  value={form.employmentType}
                  onChange={(e) => update("employmentType", e.target.value as EmploymentType)}
                  className="input-field"
                >
                  {EMPLOYMENT_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#0F172A]">Compensation & Description</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.showSalary}
                onChange={(e) => update("showSalary", e.target.checked)}
                className="rounded"
              />
              Show salary range to public
            </label>
            {form.showSalary && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Salary Min (SAR)">
                  <input
                    type="number"
                    value={form.salaryMin ?? ""}
                    onChange={(e) => update("salaryMin", Number(e.target.value) || undefined)}
                    className="input-field"
                  />
                </Field>
                <Field label="Salary Max (SAR)">
                  <input
                    type="number"
                    value={form.salaryMax ?? ""}
                    onChange={(e) => update("salaryMax", Number(e.target.value) || undefined)}
                    className="input-field"
                  />
                </Field>
              </div>
            )}
            <Field label="Job Description" required>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={8}
                placeholder="Describe the role, responsibilities, and requirements..."
                className="input-field resize-none"
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#0F172A]">Requirements</h2>
            <Field label="Required Skills">
              <div className="flex gap-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill and press Enter"
                  className="input-field flex-1"
                />
                <button type="button" onClick={addSkill} className="rounded-lg bg-slate-100 px-4 text-sm font-medium hover:bg-slate-200">
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1 rounded-full bg-[#3B5998]/10 px-3 py-1 text-xs font-medium text-[#3B5998]"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => update("requiredSkills", form.requiredSkills.filter((s) => s !== skill))}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </Field>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.requireVideoPitch}
                  onChange={(e) => update("requireVideoPitch", e.target.checked)}
                  className="mt-1 rounded"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Require Video Introduction Pitch
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Applicants must submit a video introduction (max 2 min) with their application.
                    Enables the Video Application Review interface in ATS.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <h2 className="text-lg font-bold text-[#0F172A]">Review & Publish</h2>
            <ReviewRow label="Title" value={form.title} />
            <ReviewRow label="Location" value={`${form.location} · ${form.workLocation} · ${form.employmentType.replace("_", " ")}`} />
            {form.showSalary && form.salaryMin && (
              <ReviewRow label="Salary" value={`SAR ${form.salaryMin} – ${form.salaryMax}`} />
            )}
            <ReviewRow label="Skills" value={form.requiredSkills.join(", ") || "None"} />
            <ReviewRow label="Video Pitch Required" value={form.requireVideoPitch ? "Yes" : "No"} />
            <div className="mt-2 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-400">Description preview</p>
              <p className="mt-1 line-clamp-4 text-slate-700">{form.description}</p>
            </div>
          </div>
        )}

        {publishError && (
          <p className="mt-4 text-sm text-red-600">{publishError}</p>
        )}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={publishing}
              className="rounded-lg bg-[#3B5998] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {publishing ? "Publishing…" : "Publish Job"}
            </button>
          )}
        </div>
      </div>

      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={() => setShowPaywall(false)} />
          <div className="relative max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-[#0F172A]">Publishing Locked</h2>
            <p className="mt-2 text-sm text-slate-600">{guard.reason}</p>
            <p className="mt-2 text-sm text-slate-600">{getPaywallMessage()}</p>
            <button type="button" className="mt-6 w-full rounded-xl bg-[#3B5998] py-3 text-sm font-semibold text-white">
              Subscribe — SAR {ANNUAL_SUBSCRIPTION_SAR}/year
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-field {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input-field:focus {
          border-color: #3b5998;
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}{required && " *"}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-slate-400">{label}:</span>
      <span className="text-[#0F172A]">{value}</span>
    </div>
  );
}

function getPaywallMessage() {
  return `Subscribe to VORA Company for SAR ${ANNUAL_SUBSCRIPTION_SAR}/year to publish unlimited jobs.`;
}
