import { FreelanceNav } from "@/components/freelance/layout/MarketplaceNav";

export default function FreelanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FFFBEB]" data-platform="freelance">
      <FreelanceNav />
      {children}
    </div>
  );
}
