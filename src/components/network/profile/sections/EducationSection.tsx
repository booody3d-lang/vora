import type { EducationItem } from "@/types/network";

interface EducationSectionProps {
  items: EducationItem[];
}

export function EducationSection({ items }: EducationSectionProps) {
  return (
    <div className="space-y-4">
      {items.map((edu) => (
        <div key={edu.id} className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
            🎓
          </div>
          <div>
            <h4 className="font-semibold text-[#0F172A]">{edu.institution}</h4>
            <p className="text-sm text-slate-600">
              {edu.degree}
              {edu.fieldOfStudy && `, ${edu.fieldOfStudy}`}
            </p>
            {edu.endDate && (
              <p className="text-xs text-slate-400">Graduated {edu.endDate}</p>
            )}
            {edu.isVerified && (
              <span className="mt-1 inline-block text-[10px] font-semibold text-emerald-600">
                ✓ Verified
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
