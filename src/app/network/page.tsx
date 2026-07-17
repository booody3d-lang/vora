import { NetworkThreeColumn } from "@/components/network/layout/NetworkThreeColumn";
import { MiniProfileCard } from "@/components/network/layout/MiniProfileCard";
import { RightSidebar } from "@/components/network/layout/RightSidebar";
import { FeedList } from "@/components/network/feed/FeedList";
import {
  DEMO_CURRENT_USER,
  DEMO_FEED,
  DEMO_INSIGHTS,
  DEMO_JOBS,
} from "@/lib/network/mock-data";

export default function NetworkFeedPage() {
  return (
    <NetworkThreeColumn
      left={<MiniProfileCard profile={DEMO_CURRENT_USER} />}
      center={<FeedList initialPosts={DEMO_FEED} />}
      right={<RightSidebar jobs={DEMO_JOBS} insights={DEMO_INSIGHTS} />}
    />
  );
}
