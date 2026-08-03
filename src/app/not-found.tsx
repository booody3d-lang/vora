import Link from "next/link";
import { VoraLogo } from "@/components/brand/VoraLogo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#020617] px-6 text-center">
      <VoraLogo size="lg" href="/network" linkClassName="mb-8 inline-block" />
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">404</p>
      <h1 className="mt-2 text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-slate-400">
        The page you requested does not exist or may have been moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/network"
          className="rounded-xl bg-[#3B5998] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to Network
        </Link>
        <Link
          href="/freelance"
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
        >
          Go to Marketplace
        </Link>
      </div>
    </div>
  );
}
