"use client";

import type { CertificationItem } from "@/types/network";
import { useLocale } from "@/providers/LocaleProvider";

interface CertificationsSectionProps {
  items: CertificationItem[];
}

export function CertificationsSection({ items }: CertificationsSectionProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      {items.map((cert) => (
        <div key={cert.id} className="rounded-lg border border-slate-100 p-4">
          <h4 className="font-semibold text-[#0F172A]">{cert.name}</h4>
          <p className="text-sm text-slate-600">{cert.issuingOrganization}</p>
          {cert.issueDate && (
            <p className="text-xs text-slate-400">
              {t("profile.sections.issued")} {cert.issueDate}
            </p>
          )}
          {cert.credentialUrl && (
            <a
              href={cert.credentialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-medium text-[#3B5998] hover:underline"
            >
              {t("profile.sections.viewCredential")}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
