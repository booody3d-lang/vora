import { Suspense } from "react";
import { NetworkSearchResults } from "./NetworkSearchResults";

export default function NetworkSearchPage() {
  return (
    <Suspense fallback={<div className="px-4 py-8 text-sm text-slate-500">Loading...</div>}>
      <NetworkSearchResults />
    </Suspense>
  );
}
