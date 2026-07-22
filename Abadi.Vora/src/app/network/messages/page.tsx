import { Suspense } from "react";

import { ChatDashboard } from "@/components/network/messaging/ChatDashboard";



export default function MessagesPage() {

  return (

    <div className="mx-auto max-w-[1280px] px-4 py-4 md:px-6 md:py-6">

      <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading...</div>}>

        <ChatDashboard />

      </Suspense>

    </div>

  );

}

