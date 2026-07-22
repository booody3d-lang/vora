"use client";

import type { ProjectItem } from "@/types/network";
import { useLocale } from "@/providers/LocaleProvider";

interface ProjectsSectionProps {
  items: ProjectItem[];
}

export function ProjectsSection({ items }: ProjectsSectionProps) {
  const { t } = useLocale();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((project) => (
        <div
          key={project.id}
          className="overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-md"
        >
          {project.imageUrl && (
            <img src={project.imageUrl} alt="" className="h-36 w-full object-cover" />
          )}
          <div className="p-4">
            <h4 className="font-semibold text-[#0F172A]">{project.title}</h4>
            {project.description && (
              <p className="mt-1 text-sm text-slate-600">{project.description}</p>
            )}
            {project.projectUrl && (
              <a
                href={project.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-[#3B5998] hover:underline"
              >
                {t("profile.sections.viewProject")}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
