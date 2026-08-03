import { NetworkThreeColumn } from "@/components/network/layout/NetworkThreeColumn";
import { MiniProfileCard } from "@/components/network/layout/MiniProfileCard";
import { RightSidebar } from "@/components/network/layout/RightSidebar";
import { FeedList } from "@/components/network/feed/FeedList";

export default async function NetworkFeedPage() {
  // Company users are redirected to /company/dashboard once in middleware only.
  return (
    <NetworkThreeColumn
      left={<MiniProfileCard />}
      center={<FeedList />}
      right={<RightSidebar />}
    />
  );
}
