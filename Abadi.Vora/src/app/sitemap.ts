import type { MetadataRoute } from "next";
import { SITE_URL } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import { DEMO_SERVICES, DEMO_STORE } from "@/lib/freelance/mock-data";
import { DEMO_JOBS } from "@/lib/network/mock-data";

const LOCALES = ["en", "ar"] as const;

function localizedUrl(path: string, locale: (typeof LOCALES)[number]) {
  return `${SITE_URL}${localizePath(path || "/", locale)}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages = ["", "/freelance", "/network", "/network/jobs", "/freelance/search", "/auth/login", "/auth/signup", "/about", "/contact", "/terms", "/privacy"];

  const entries: MetadataRoute.Sitemap = [];

  for (const page of staticPages) {
    for (const locale of LOCALES) {
      entries.push({
        url: localizedUrl(page, locale),
        lastModified: now,
        changeFrequency: page === "" ? "daily" : "weekly",
        priority: page === "" ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(LOCALES.map((l) => [l, localizedUrl(page, l)])),
        },
      });
    }
  }

  for (const job of DEMO_JOBS) {
    for (const locale of LOCALES) {
      entries.push({
        url: localizedUrl(`/network/jobs/${job.slug}`, locale),
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
        alternates: {
          languages: Object.fromEntries(LOCALES.map((l) => [l, localizedUrl(`/network/jobs/${job.slug}`, l)])),
        },
      });
    }
  }

  for (const service of DEMO_SERVICES) {
    for (const locale of LOCALES) {
      entries.push({
        url: localizedUrl(`/freelance/services/${service.slug}`, locale),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.85,
        alternates: {
          languages: Object.fromEntries(LOCALES.map((l) => [l, localizedUrl(`/freelance/services/${service.slug}`, l)])),
        },
      });
    }
  }

  for (const locale of LOCALES) {
    entries.push({
      url: localizedUrl(`/freelance/store/${DEMO_STORE.slug}`, locale),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, localizedUrl(`/freelance/store/${DEMO_STORE.slug}`, l)])),
      },
    });
  }

  return entries;
}
