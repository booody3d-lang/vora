import { cn } from "@/lib/utils";

interface ProfessionalScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
  showBadge?: boolean;
}

export function ProfessionalScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  label = "Professional Score",
  className,
  showBadge = false,
}: ProfessionalScoreRingProps) {
  const normalizedScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedScore / 100) * circumference;

  const ringColor =
    normalizedScore >= 70
      ? "var(--vora-accent)"
      : normalizedScore >= 40
        ? "#F59E0B"
        : "#EF4444";

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--vora-primary-dark)]">
          <span className="text-2xl font-bold">{normalizedScore}%</span>
        </div>
      </div>
      <span className="mt-2 text-xs font-medium uppercase tracking-wider text-[var(--vora-muted)]">
        {label}
      </span>
      {showBadge && (
        <span
          className={cn(
            "mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
            normalizedScore >= 70
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-amber-500/20 text-amber-300"
          )}
        >
          {normalizedScore >= 70 ? "Eligible" : "Incomplete"}
        </span>
      )}
    </div>
  );
}
