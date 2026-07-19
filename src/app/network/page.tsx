import { NetworkThreeColumn } from "@/components/network/layout/NetworkThreeColumn";
import { MiniProfileCard } from "@/components/network/layout/MiniProfileCard";
import { RightSidebar } from "@/components/network/layout/RightSidebar";
import { FeedList } from "@/components/network/feed/FeedList";

export default function NetworkFeedPage() {
  return (
    <NetworkThreeColumn
      left={<MiniProfileCard />}
      center={<FeedList />}
      right={<RightSidebar />}
    />
  );
}
