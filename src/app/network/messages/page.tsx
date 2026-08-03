import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ChatDashboard } from "@/components/network/messaging/ChatDashboard";
import { getAuthenticatedUser } from "@/lib/security/session";

export default async function MessagesPage() {
  const auth = await getAuthenticatedUser();
  if (auth?.session.role === "company") {
    redirect("/company/dashboard");
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-4 md:px-6 md:py-6">
      <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading...</div>}>
        <ChatDashboard />
      </Suspense>
    </div>
  );
}

