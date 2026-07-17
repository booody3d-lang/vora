import { Suspense } from "react";
import SearchResults from "./SearchResults";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
