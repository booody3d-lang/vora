import { CompanyPageView } from "@/components/company/page/CompanyPageView";
import { getCompanyBySlug } from "@/lib/company/company-store";
import { listActiveJobsForCompany } from "@/lib/company/jobs-store";
import { listCurrentEmployeesForCompany } from "@/lib/company/employees";
import { getCompanySocialContext } from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { notFound } from "next/navigation";

interface CompanyPublicPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CompanyPublicPage({ params }: CompanyPublicPageProps) {
  const { slug } = await params;
  const baseCompany = await getCompanyBySlug(slug);

  if (!baseCompany) {
    notFound();
  }

  const auth = await getAuthenticatedUser();
  const social = await getCompanySocialContext(auth?.user.id ?? null, baseCompany.id);

  const company = {
    ...baseCompany,
    followerCount: social.followerCount,
    currentEmployees: auth ? listCurrentEmployeesForCompany(baseCompany.id) : undefined,
  };

  const jobs = await listActiveJobsForCompany(baseCompany.id);

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-platform="network">
      <CompanyPageView
        company={company}
        posts={[]}
        jobs={jobs}
        initiallyFollowing={social.isFollowing}
      />
    </div>
  );
}
