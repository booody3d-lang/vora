import type { SkillItem } from "@/types/network";

interface SkillsSectionProps {
  items: SkillItem[];
}

export function SkillsSection({ items }: SkillsSectionProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((skill) => (
        <div
          key={skill.id}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2"
        >
          <span className="text-sm font-medium text-[#0F172A]">{skill.name}</span>
          {skill.videoVerified && (
            <span
              title="Video-Verified Skill"
              className="flex items-center gap-0.5 rounded-full bg-[#3B5998]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#3B5998]"
            >
              🎬 Verified
            </span>
          )}
          <span className="text-xs text-slate-400">{skill.endorsementCount} endorsements</span>
        </div>
      ))}
    </div>
  );
}
