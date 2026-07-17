import { SITE_URL } from "@/i18n/config";

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
  price: number;
  shortDescription: string;
  storeName: string;
  rating?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: service.title,
    description: service.shortDescription,
    brand: { "@type": "Brand", name: service.storeName },
    offers: {
      "@type": "Offer",
      price: service.price,
      priceCurrency: "SAR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/freelance/services/${service.slug}`,
    },
    ...(service.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: service.rating, reviewCount: 10 } } : {}),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VORA",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/vora-logo.svg`,
    sameAs: [],
    description: "Professional Network & Freelance Marketplace in Saudi Arabia",
  };
}
