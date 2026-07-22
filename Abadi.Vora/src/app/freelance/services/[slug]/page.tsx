import { ServiceDetailView } from "@/components/freelance/services/ServiceDetailView";
import { DEMO_SERVICES } from "@/lib/freelance/mock-data";
import { buildServiceMetadata } from "@/lib/seo/metadata";
import { serviceJsonLd } from "@/lib/seo/json-ld";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = DEMO_SERVICES.find((s) => s.slug === slug);
  if (!service) return {};
  return buildServiceMetadata(service);
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = DEMO_SERVICES.find((s) => s.slug === slug);

  if (!service) {
    notFound();
  }

  const jsonLd = serviceJsonLd({
    title: service.title,
    slug: service.slug,
    price: service.price,
    shortDescription: service.shortDescription,
    storeName: service.storeName,
    rating: service.rating,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ServiceDetailView service={service} />
    </>
  );
}
