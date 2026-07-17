import { PrivacySettingsPanel } from "@/components/security/PrivacySettingsPanel";

export default function PrivacySettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-2 text-2xl font-bold text-[#0F172A]">Privacy & Data</h1>
      <p className="mb-6 text-sm text-slate-500">GDPR & Saudi PDPL compliant privacy controls</p>
      <PrivacySettingsPanel />
    </div>
  );
}
