"use client";

import { useCallback } from "react";
import { useNotifications } from "@/providers/NotificationProvider";
import { dispatchNotification } from "@/lib/notifications/engine";
import { buildTriggerNotification, type TriggerInput } from "@/lib/notifications/triggers";
import type { NotificationPayload } from "@/types/notifications";

export function useNotificationTrigger() {
  const { preferences } = useNotifications();

  const fire = useCallback(
    async (input: TriggerInput | NotificationPayload) => {
      const notification = "createdAt" in input ? input : buildTriggerNotification(input);
      return dispatchNotification(notification, preferences);
    },
    [preferences]
  );

  return { fire };
}
