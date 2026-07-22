import type { Locale } from "@/i18n/config";

export const EMAIL_COPY: Record<
  Locale,
  {
    tagline: string;
    ctaDefault: string;
    footer: string;
    amountPrefix: string;
  }
> = {
  en: {
    tagline: "Professional Network & Freelance Marketplace",
    ctaDefault: "View in VORA",
    footer: "VORA · Saudi Riyal (SR) · Manage notification preferences in your profile settings.",
    amountPrefix: "SR",
  },
  ar: {
    tagline: "شبكة مهنية وسوق مستقلين",
    ctaDefault: "عرض في VORA",
    footer: "VORA · ريال سعودي (SR) · يمكنك إدارة تفضيلات الإشعارات من إعدادات الملف.",
    amountPrefix: "ر.س",
  },
};

export function resolveEmailLocale(input?: {
  locale?: Locale;
  titleAr?: string;
  bodyAr?: string;
}): Locale {
  if (input?.locale === "ar" || input?.locale === "en") return input.locale;
  if (input?.titleAr || input?.bodyAr) return "ar";
  return "en";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
