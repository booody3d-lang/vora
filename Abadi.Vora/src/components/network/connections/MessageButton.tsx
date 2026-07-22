"use client";



import { useRouter } from "next/navigation";

import { useState } from "react";

import { useTranslations } from "@/i18n/use-translations";

import { useGuardedAction } from "@/hooks/useGuardedAction";

import { getMessagingUrl } from "@/lib/network/urls";

import { cn } from "@/lib/utils";



interface MessageButtonProps {

  targetAccountId: string;

  targetName: string;

  disabled?: boolean;

  className?: string;

}



export function MessageButton({

  targetAccountId,

  targetName,

  disabled = false,

  className,

}: MessageButtonProps) {

  const { t } = useTranslations();

  const router = useRouter();

  const [busy, setBusy] = useState(false);

  const { execute, restrictionMessage, VisitorModal } = useGuardedAction({

    action: "follow_connect",

    onAllowed: async () => {

      setBusy(true);

      try {

        const res = await fetch("/api/messages/conversations", {

          method: "POST",

          credentials: "include",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ targetAccountId }),

        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error ?? "Unable to start conversation");



        const conversationId = data.conversation?.id as string | undefined;

        router.push(

          getMessagingUrl({

            conversationId,

            targetAccountId: conversationId ? undefined : targetAccountId,

          })

        );

      } finally {

        setBusy(false);

      }

    },

  });



  return (

    <>

      {VisitorModal}

      <button

        type="button"

        disabled={disabled || busy}

        onClick={() => execute()}

        className={cn(

          "rounded-lg border border-[#3B5998] px-4 py-2 text-sm font-semibold text-[#3B5998] transition-colors hover:bg-[#3B5998]/5 disabled:cursor-not-allowed disabled:opacity-50",

          className

        )}

        title={t("network.connections.messageWith", { name: targetName })}

      >

        {busy ? t("common.loading") : t("network.connections.message")}

      </button>

      {restrictionMessage && (

        <p className="mt-1 text-xs text-amber-600">{restrictionMessage}</p>

      )}

    </>

  );

}

