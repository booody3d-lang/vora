import Link from "next/link";
import { SellerDashboard } from "@/components/freelance/dashboard/SellerDashboard";
import { getSellerAnalyticsForStoreSlug } from "@/lib/freelance/analytics-store";
import { isStoreOwner } from "@/lib/profile/profile-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { loadStoreBySlug } from "@/lib/supabase/profile-persistence";
import { notFound, redirect } from "next/navigation";

interface StoreAnalyticsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StoreAnalyticsPage({ params }: StoreAnalyticsPageProps) {
  const { slug } = await params;
  const store = await loadStoreBySlug(slug);
  if (!store) notFound();

  const auth = await getAuthenticatedUser();
  if (!auth || !isStoreOwner(auth.user.id, slug)) {
    redirect(`/freelance/store/${slug}`);
  }

  const { analytics, source } = await getSellerAnalyticsForStoreSlug(slug, auth.user.id);

  return (
    <div>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 md:px-6">
        <Link
          href={`/freelance/store/${slug}/manage`}
          className="text-sm font-medium text-[#EA580C] hover:underline"
        >
          ← Back to manage store
        </Link>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-medium uppercase text-slate-500">
          {source} data
        </span>
      </div>
      <SellerDashboard analytics={analytics} storeName={store.storeName} />
    </div>
  );
}
