import { PlanSelector } from "@/components/billing/PlanSelector";
import { DEMO_SUBSCRIPTION } from "@/lib/billing/engine";

export default function PlansPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Subscription Plans</h1>
        <p className="mt-1 text-sm text-slate-500">
          Individual Premium (SR 20/mo or SR 120/yr) · Company Annual (SR 600/yr) · Freelancers free
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Individual / Professional</h2>
        <PlanSelector currentPlan={DEMO_SUBSCRIPTION.plan} target="individual" />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Company / Enterprise</h2>
        <PlanSelector currentPlan="free" target="company" />
        <p className="mt-3 text-xs text-slate-400">
          Triggered when trial ends (3 months) or 4th job listing is attempted. Annual billing only.
        </p>
      </section>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <strong>Freelancers:</strong> No subscription required. Platform takes 10% commission on completed sales only.
      </div>
    </div>
  );
}
