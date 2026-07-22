import { JobsListView } from "@/components/network/jobs/JobsListView";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Job Opportunities | VORA Network",
  description: "Discover professional job vacancies in Saudi Arabia and the GCC. Apply with your VORA Professional Profile.",
  path: "/network/jobs",
  keywords: ["jobs", "careers", "Saudi Arabia", "VORA", "professional network"],
});

export default function JobsPage() {
  return <JobsListView />;
}
