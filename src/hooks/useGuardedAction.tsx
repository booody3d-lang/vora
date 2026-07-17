"use client";

import { useCallback, useState } from "react";
import {
  canPerformAction,
  getRestrictionMessage,
  isVisitorLimitReached,
  VISITOR_VIEW_LIMIT,
  type PermissionAction,
} from "@/lib/permissions/access-control";
import {
  getVisitorViews,
  incrementVisitorView,
} from "@/lib/permissions/visitor-tracking";
import { usePermissions } from "@/providers/VoraProviders";
import { VisitorLimitModal } from "@/components/permissions/VisitorLimitModal";

interface UseGuardedActionOptions {
  action: PermissionAction;
  onAllowed?: () => void;
}

export function useGuardedAction({ action, onAllowed }: UseGuardedActionOptions) {
  const { permissions } = usePermissions();
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [restrictionMessage, setRestrictionMessage] = useState<string | null>(null);

  const execute = useCallback(() => {
    if (!permissions.isAuthenticated) {
      const views = getVisitorViews();
      if (isVisitorLimitReached(views.profileViews, views.jobViews)) {
        setShowVisitorModal(true);
        return false;
      }
      setRestrictionMessage(getRestrictionMessage(action));
      return false;
    }

    if (!canPerformAction(permissions, action)) {
      setRestrictionMessage(getRestrictionMessage(action));
      return false;
    }

    onAllowed?.();
    return true;
  }, [action, onAllowed, permissions]);

  const trackView = useCallback(
    (type: "profile" | "job") => {
      if (permissions.isAuthenticated) return true;

      const views = getVisitorViews();
      const currentCount = type === "profile" ? views.profileViews : views.jobViews;

      if (currentCount >= VISITOR_VIEW_LIMIT) {
        setShowVisitorModal(true);
        return false;
      }

      const updated = incrementVisitorView(type);
      const newCount = type === "profile" ? updated.profileViews : updated.jobViews;

      if (newCount >= VISITOR_VIEW_LIMIT) {
        setShowVisitorModal(true);
      }

      return true;
    },
    [permissions.isAuthenticated]
  );

  const VisitorModal = (
    <VisitorLimitModal open={showVisitorModal} onClose={() => setShowVisitorModal(false)} />
  );

  return {
    execute,
    trackView,
    restrictionMessage,
    clearRestriction: () => setRestrictionMessage(null),
    VisitorModal,
  };
}
