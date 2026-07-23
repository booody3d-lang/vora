import { SecurityDashboard } from "@/components/security/SecurityDashboard";
import { getTranslations } from "@/i18n/get-translations";

export default async function SecuritySettingsPage() {
  const { t } = await getTranslations();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-6 text-2xl font-bold text-[#0F172A]">
        {t("network.settings.security.pageTitle")}
      </h1>
      <SecurityDashboard />
    </div>
  );
}
