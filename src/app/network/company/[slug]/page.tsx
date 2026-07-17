import { CompanyPageView } from "@/components/company/page/CompanyPageView";
import {
  DEMO_COMPANY,
  DEMO_COMPANY_POSTS,
  DEMO_JOBS,
} from "@/lib/company/mock-data";
import { notFound } from "next/navigation";

interface CompanyPublicPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CompanyPublicPage({ params }: CompanyPublicPageProps) {
  const { slug } = await params;

  if (slug !== DEMO_COMPANY.slug) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-platform="network">
      <CompanyPageView
        company={DEMO_COMPANY}
        posts={DEMO_COMPANY_POSTS}
        jobs={DEMO_JOBS}
      />
    </div>
  );
}
