import { Suspense } from "react";
import { PlansPageContent } from "@/components/billing/PlansPageContent";

export default function PlansPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading plans…</p>}>
      <PlansPageContent />
    </Suspense>
  );
}
