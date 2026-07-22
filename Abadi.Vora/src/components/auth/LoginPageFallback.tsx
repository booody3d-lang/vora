"use client";



import { useTranslations } from "@/i18n/use-translations";



export function LoginPageFallback() {

  const { t } = useTranslations();

  return (

    <div className="flex w-full max-w-md items-center justify-center rounded-2xl border border-white/10 bg-[#0F172A]/50 p-12">

      <p className="text-sm text-slate-500">{t("common.loading")}</p>

    </div>

  );

}

