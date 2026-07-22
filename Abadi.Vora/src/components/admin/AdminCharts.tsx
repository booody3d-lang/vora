interface LineChartProps {
  data: { label: string; users: number; companies: number }[];
  height?: number;
}

export function AdminLineChart({ data, height = 160 }: LineChartProps) {
  const maxUsers = Math.max(...data.map((d) => d.users));
  const maxCompanies = Math.max(...data.map((d) => d.companies));
  const max = Math.max(maxUsers, maxCompanies);
  const width = 100;
  const step = width / (data.length - 1 || 1);

  const userPoints = data
    .map((d, i) => `${(i * step).toFixed(1)},${(height - (d.users / max) * (height - 20)).toFixed(1)}`)
    .join(" ");
  const companyPoints = data
    .map((d, i) => `${(i * step).toFixed(1)},${(height - (d.companies / max) * (height - 20)).toFixed(1)}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <polyline fill="none" stroke="#3B5998" strokeWidth="1.5" points={userPoints} />
        <polyline fill="none" stroke="#EA580C" strokeWidth="1.5" points={companyPoints} />
        {data.map((d, i) => (
          <circle
            key={d.label}
            cx={i * step}
            cy={height - (d.users / max) * (height - 20)}
            r="2"
            fill="#3B5998"
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-[10px]">
        <span className="flex items-center gap-1 text-slate-400">
          <span className="h-2 w-4 rounded bg-[#3B5998]" /> Users
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="h-2 w-4 rounded bg-[#EA580C]" /> Companies
        </span>
      </div>
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export function AdminBarChart({ data, color = "#EA580C", height = 140 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-slate-300">
            {d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}
          </span>
          <div
            className="w-full rounded-t transition-all"
            style={{
              height: `${(d.value / max) * (height - 30)}px`,
              minHeight: 4,
              backgroundColor: color,
            }}
          />
          <span className="truncate text-[8px] text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

interface PieChartProps {
  data: { label: string; amount: number; color: string }[];
  size?: number;
}

export function AdminPieChart({ data, size = 120 }: PieChartProps) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  let cumulative = 0;

  const slices = data.map((d) => {
    const start = cumulative;
    cumulative += d.amount / total;
    return { ...d, start, end: cumulative };
  });

  function arcPath(start: number, end: number) {
    const r = size / 2 - 4;
    const cx = size / 2;
    const cy = size / 2;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = end * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = end - start > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size}>
        {slices.map((s) => (
          <path key={s.label} d={arcPath(s.start, s.end)} fill={s.color} />
        ))}
        <circle cx={size / 2} cy={size / 2} r={size / 4} fill="#111827" />
      </svg>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: d.color }} />
            <span className="text-slate-400">{d.label}</span>
            <span className="font-semibold text-white">
              {((d.amount / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-[#111827] p-5">
      <h3 className="font-bold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}
