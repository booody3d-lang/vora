import { ChatDashboard } from "@/components/network/messaging/ChatDashboard";
import { DEMO_CONVERSATIONS, DEMO_CURRENT_USER } from "@/lib/network/mock-data";

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-4 md:px-6 md:py-6">
      <ChatDashboard
        conversations={DEMO_CONVERSATIONS}
        currentUserId={DEMO_CURRENT_USER.id}
      />
    </div>
  );
}
