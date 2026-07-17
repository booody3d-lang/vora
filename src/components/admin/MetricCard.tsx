"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/use-translations";

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  growthPercent?: number;
  accent?: "blue" | "orange" | "emerald" | "amber" | "red";
  className?: string;
}

export function MetricCard({
  label,
  value,
  sublabel,
  growthPercent,
  accent = "blue",
  className,
}: MetricCardProps) {
  const accentColors = {
    blue: "border-blue-500/20 bg-blue-500/5",
    orange: "border-orange-500/20 bg-orange-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    red: "border-red-500/20 bg-red-500/5",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        accentColors[accent],
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">
        {typeof value === "number" ? value.toLocaleString("en-SA") : value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
      {growthPercent !== undefined && (
        <GrowthBadge percent={growthPercent} />
      )}
    </div>
  );
}

export function GrowthBadge({ percent }: { percent: number }) {
  const { t } = useTranslations();
  const positive = percent >= 0;
  return (
    <span
      className={cn(
        "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
        positive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
      )}
    >
      {positive ? "↑" : "↓"} {t("admin.growthThisWeek", { percent: Math.abs(percent) })}
    </span>
  );
}
