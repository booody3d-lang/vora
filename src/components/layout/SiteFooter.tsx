"use client";



import Link from "next/link";

import { VoraLogo } from "@/components/brand/VoraLogo";

import { useTranslations } from "@/i18n/use-translations";



export function SiteFooter() {

  const { t } = useTranslations();

  const year = new Date().getFullYear();



  return (

    <footer className="border-t border-slate-200 bg-white px-4 py-8 md:px-6">

      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">

        <div className="flex flex-col items-center gap-3 md:items-start">

          <VoraLogo href="/" size="sm" />

          <p className="text-sm text-slate-500">

            {t("legal.footer.copyright", { year })}

          </p>

        </div>

        <nav className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-600">

          <Link href="/about" className="hover:text-[#3B5998]">

            {t("legal.footer.about")}

          </Link>

          <Link href="/contact" className="hover:text-[#3B5998]">

            {t("legal.footer.contact")}

          </Link>

          <Link href="/terms" className="hover:text-[#3B5998]">

            {t("legal.footer.terms")}

          </Link>

          <Link href="/privacy" className="hover:text-[#3B5998]">

            {t("legal.footer.privacy")}

          </Link>

        </nav>

      </div>

    </footer>

  );

}

