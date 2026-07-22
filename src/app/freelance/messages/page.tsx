import { redirect } from "next/navigation";
import { FreelanceChatDashboard } from "@/components/freelance/messaging/FreelanceChatDashboard";
import {
  listChatSessionsForAccount,
  listInquiriesForSeller,
} from "@/lib/freelance/chat-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export default async function FreelanceMessagesPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    redirect("/login?next=/freelance/messages");
  }

  const [sessions, inquiries] = await Promise.all([
    listChatSessionsForAccount(auth.user.id),
    listInquiriesForSeller(auth.user.id),
  ]);

  return (
    <FreelanceChatDashboard
      initialChats={sessions}
      initialInquiries={inquiries}
      viewerAccountId={auth.user.id}
      isSeller
    />
  );
}
