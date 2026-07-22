import Link from "next/link";

interface ProfileAnalyticsPanelProps {
  isPremium: boolean;
}

const MOCK_VISITOR_DATA = [12, 18, 15, 24, 31, 28, 35, 42, 38, 45, 52, 48, 55, 62];

export function ProfileAnalyticsPanel({ isPremium }: ProfileAnalyticsPanelProps) {
  const max = Math.max(...MOCK_VISITOR_DATA);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-bold text-[#0F172A]">Profile Analytics</h3>
        <p className="text-xs text-slate-400">Profile visitors over the last 14 days</p>
      </div>

      <div className={isPremium ? "p-5" : "relative p-5"}>
        {!isPremium && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <span className="text-2xl">🔒</span>
            <p className="mt-2 text-sm font-semibold text-[#0F172A]">Premium Feature</p>
            <p className="mt-1 max-w-xs text-center text-xs text-slate-500">
              Upgrade to Premium to unlock profile visitor analytics and insights.
            </p>
            <Link
              href="/billing/plans"
              className="mt-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Upgrade to Premium to Unlock
            </Link>
          </div>
        )}

        <div className="flex h-32 items-end gap-1">
          {MOCK_VISITOR_DATA.map((value, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-[#3B5998]/80 transition-all"
              style={{ height: `${(value / max) * 100}%`, minHeight: 4 }}
              title={`${value} visitors`}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[10px] text-slate-400">
          <span>14 days ago</span>
          <span>Today</span>
        </div>
        {isPremium && (
          <p className="mt-3 text-center text-sm font-semibold text-[#3B5998]">
            62 visitors this week · +18% vs last week
          </p>
        )}
      </div>
    </div>
  );
}
