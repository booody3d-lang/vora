"use client";

import dynamic from "next/dynamic";
import { MessagingDockProvider } from "@/providers/MessagingDockProvider";
import { usePermissions } from "@/providers/VoraProviders";

const FloatingChatDock = dynamic(
  () =>
    import("@/components/network/messaging/FloatingChatDock").then(
      (mod) => mod.FloatingChatDock
    ),
  { ssr: false }
);

export function MessagingDockRoot({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = usePermissions();
  const isAuthenticated = Boolean(user);

  if (isLoading || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <MessagingDockProvider>
      {children}
      <FloatingChatDock />
    </MessagingDockProvider>
  );
}
