"use client";



import { useSearchParams } from "next/navigation";

import { MessagingShell } from "@/components/network/messaging/MessagingShell";



export function ChatDashboard() {

  const searchParams = useSearchParams();

  const initialConversationId = searchParams.get("conversation") ?? undefined;

  const initialTargetAccountId = searchParams.get("with") ?? undefined;



  return (

    <MessagingShell

      showMobileThread

      initialConversationId={initialConversationId}

      initialTargetAccountId={initialTargetAccountId}

    />

  );

}

