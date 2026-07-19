import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { SITE_URL } from "@/i18n/config";
import { VORA_LOGO } from "@/lib/brand/logo";
import { localizePath } from "@/i18n/routing";

export interface SeoPageInput {
  title: string;
  description: string;
  locale?: Locale;
  path?: string;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
}

export function buildPageMetadata(input: SeoPageInput): Metadata {
  const locale = input.locale ?? "en";
  const canonicalPath = localizePath(input.path ?? "/", locale);
  const url = `${SITE_URL}${canonicalPath}`;
  const image = input.image ?? `${SITE_URL}${VORA_LOGO.src}`;
  const altLocale: Locale = locale === "ar" ? "en" : "ar";

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    alternates: {
      canonical: url,
      languages: {
        en: `${SITE_URL}${localizePath(input.path ?? "/", "en")}`,
        ar: `${SITE_URL}${localizePath(input.path ?? "/", "ar")}`,
        "x-default": `${SITE_URL}${localizePath(input.path ?? "/", "en")}`,
      },
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: "VORA",
      locale: locale === "ar" ? "ar_SA" : "en_US",
      alternateLocale: altLocale === "ar" ? ["ar_SA"] : ["en_US"],
      type: input.type ?? "website",
      images: [{ url: image, width: 1200, height: 630, alt: input.imageAlt ?? input.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}

export function buildServiceMetadata(service: {
  title: string;
  shortDescription: string;
  slug: string;
  price?: number | null;
  thumbnailUrl?: string;
  storeName?: string;
}, locale: Locale = "en"): Metadata {
  const priceLabel =
    service.price != null && service.price > 0
      ? locale === "ar"
        ? `${service.price} ر.س`
        : `SAR ${service.price}`
      : locale === "ar"
        ? "تواصل للسعر"
        : "Contact for price";
  const title = `${service.title} — ${priceLabel} | VORA Freelance`;
  const description =
    locale === "ar"
      ? `${service.shortDescription} · ${service.storeName ?? "متجر VORA"} · شراء فوري مع Escrow`
      : `${service.shortDescription} · ${service.storeName ?? "VORA Store"} · Instant purchase with Escrow protection`;

  return buildPageMetadata({
    title,
    description,
    locale,
    path: `/freelance/services/${service.slug}`,
    keywords: [service.title, "freelance", "SAR", "VORA", service.storeName ?? ""].filter(Boolean),
    image: service.thumbnailUrl,
    imageAlt: service.title,
  });
}

export function buildJobMetadata(job: {
  title: string;
  company: string;
  slug: string;
  location: string;
  employmentType: string;
}, locale: Locale = "en"): Metadata {
  const title =
    locale === "ar"
      ? `${job.title} — ${job.company} | وظائف VORA`
      : `${job.title} — ${job.company} | VORA Jobs`;
  const description =
    locale === "ar"
      ? `${job.title} في ${job.company} · ${job.location} · ${job.employmentType}`
      : `${job.title} at ${job.company} · ${job.location} · ${job.employmentType}`;

  return buildPageMetadata({
    title,
    description,
    locale,
    path: `/network/jobs/${job.slug}`,
    keywords: [job.title, job.company, "jobs", "Saudi Arabia", "VORA", job.location],
    type: "article",
  });
}

export function buildStoreMetadata(store: {
  storeName: string;
  slug: string;
  tagline?: string;
  coverImageUrl?: string;
}, locale: Locale = "en"): Metadata {
  const title =
    locale === "ar"
      ? `${store.storeName} — متجر VORA Freelance`
      : `${store.storeName} — VORA Freelance Store`;

  return buildPageMetadata({
    title,
    description: store.tagline ?? store.storeName,
    locale,
    path: `/freelance/store/${store.slug}`,
    keywords: [store.storeName, "freelance store", "VORA", "Saudi Arabia"],
    image: store.coverImageUrl,
    imageAlt: store.storeName,
    type: "profile",
  });
}
