import { SITE_URL } from "@/i18n/config";
import { VORA_LOGO } from "@/lib/brand/logo";

export function jobPostingJsonLd(job: {
  title: string;
  slug: string;
  company: string;
  location: string;
  employmentType: string;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description ?? `${job.title} at ${job.company}`,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
    },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.location },
    },
    employmentType: job.employmentType.toUpperCase().replace("-", "_"),
    url: `${SITE_URL}/network/jobs/${job.slug}`,
  };
}

export function serviceJsonLd(service: {
  title: string;
  slug: string;
  price?: number | null;
  shortDescription: string;
  storeName: string;
  rating?: number;
}) {
  const hasPrice = service.price != null && service.price > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: service.title,
    description: service.shortDescription,
    brand: { "@type": "Brand", name: service.storeName },
    ...(hasPrice
      ? {
          offers: {
            "@type": "Offer",
            price: service.price,
            priceCurrency: "SAR",
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/freelance/services/${service.slug}`,
          },
        }
      : {}),
    ...(service.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: service.rating, reviewCount: 10 } } : {}),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VORA",
    url: SITE_URL,
    logo: `${SITE_URL}${VORA_LOGO.src}`,
    sameAs: [],
    description: "Professional Network & Freelance Marketplace in Saudi Arabia",
  };
}
