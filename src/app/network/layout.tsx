import { NetworkLayoutShell } from "@/components/network/layout/NetworkLayoutShell";

export default function NetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-platform="network">
      <NetworkLayoutShell>{children}</NetworkLayoutShell>
    </div>
  );
}
