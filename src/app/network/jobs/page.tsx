import { redirect } from "next/navigation";
import { JobsListView } from "@/components/network/jobs/JobsListView";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getAuthenticatedUser } from "@/lib/security/session";

export const metadata = buildPageMetadata({
  title: "Job Opportunities | VORA Network",
  description: "Discover professional job vacancies in Saudi Arabia and the GCC. Apply with your VORA Professional Profile.",
  path: "/network/jobs",
  keywords: ["jobs", "careers", "Saudi Arabia", "VORA", "professional network"],
});

export default async function JobsPage() {
  const auth = await getAuthenticatedUser();
  if (auth?.session.role === "company") {
    redirect("/company/dashboard/jobs");
  }

  return <JobsListView />;
}
