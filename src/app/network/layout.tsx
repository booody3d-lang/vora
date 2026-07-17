import { NetworkNav } from "@/components/network/layout/NetworkNav";

export default function NetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-platform="network">
      <NetworkNav />
      {children}
    </div>
  );
}
