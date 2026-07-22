import "server-only";

import { getProfileByAccountId, listLinkedAccounts } from "@/lib/profile/profile-store";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import type { CompanyEmployee } from "@/types/company";

export function listCurrentEmployeesForCompany(companyId: string): CompanyEmployee[] {
  const employees: CompanyEmployee[] = [];

  for (const accountId of listLinkedAccounts()) {
    const profile = getProfileByAccountId(accountId);
    if (!profile?.currentCompany || profile.currentCompany.id !== companyId) continue;
    if (!profile.experiences.some((exp) => exp.isCurrent && exp.companyId === companyId)) {
      const hasCurrentRole = Boolean(profile.currentRole);
      if (!hasCurrentRole) continue;
    }

    employees.push({
      accountId,
      profileSlug: profile.slug,
      fullName: profile.fullName,
      headline: profile.headline,
      currentRole: profile.currentRole ?? profile.experiences.find((e) => e.isCurrent)?.title ?? "",
      profilePhotoUrl: resolveAvatarUrl({
        photoUrl: profile.profilePhotoUrl,
        gender: profile.gender,
      }),
    });
  }

  return employees;
}
