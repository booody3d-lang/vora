import { SecurityDashboard } from "@/components/security/SecurityDashboard";

export default function SecuritySettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-6 text-2xl font-bold text-[#0F172A]">Account Security</h1>
      <SecurityDashboard />
    </div>
  );
}
