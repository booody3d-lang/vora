import { Suspense } from "react";
import { StoreEditContent } from "@/components/profile/StoreEditContent";

function StoreEditFallback() {
  return <div className="py-10 text-center text-sm text-slate-500">Loading...</div>;
}

export default function StoreEditPage() {
  return (
    <Suspense fallback={<StoreEditFallback />}>
      <StoreEditContent />
    </Suspense>
  );
}
