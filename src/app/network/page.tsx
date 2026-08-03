import { redirect } from "next/navigation";
import { NetworkThreeColumn } from "@/components/network/layout/NetworkThreeColumn";
import { MiniProfileCard } from "@/components/network/layout/MiniProfileCard";
import { RightSidebar } from "@/components/network/layout/RightSidebar";
import { FeedList } from "@/components/network/feed/FeedList";
import { getAuthenticatedUser } from "@/lib/security/session";

export default async function NetworkFeedPage() {
  const auth = await getAuthenticatedUser();
  if (auth?.session.role === "company") {
    redirect("/company/dashboard");
  }

  return (
    <NetworkThreeColumn
      left={<MiniProfileCard />}
      center={<FeedList />}
      right={<RightSidebar />}
    />
  );
}
