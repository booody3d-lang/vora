import type { MetadataRoute } from "next";
import { SITE_URL } from "@/i18n/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/freelance",
          "/freelance/services/",
          "/freelance/store/",
          "/freelance/search",
          "/network/jobs",
          "/network/profile/",
          "/network/company/",
          "/auth/login",
          "/auth/signup",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/billing",
          "/billing/",
          "/company/dashboard",
          "/company/dashboard/",
          "/network/messages",
          "/network/settings",
          "/freelance/dashboard",
          "/freelance/messages",
          "/freelance/orders/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
