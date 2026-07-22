import { Suspense } from "react";
import { ManageStoreContent } from "@/components/profile/ManageStoreContent";
import { isStoreOwner } from "@/lib/profile/profile-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import { loadStoreBySlug } from "@/lib/supabase/profile-persistence";
import { notFound, redirect } from "next/navigation";

interface ManageStorePageProps {
  params: Promise<{ slug: string }>;
}

function ManageStoreFallback() {
  return <div className="py-10 text-center text-sm text-slate-500">Loading...</div>;
}

export default async function ManageStorePage({ params }: ManageStorePageProps) {
  const { slug } = await params;
  const store = await loadStoreBySlug(slug);
  if (!store) notFound();

  const auth = await getAuthenticatedUser();
  if (!auth || !isStoreOwner(auth.user.id, slug)) {
    redirect(`/freelance/store/${slug}`);
  }

  return (
    <Suspense fallback={<ManageStoreFallback />}>
      <ManageStoreContent storeSlug={slug} />
    </Suspense>
  );
}
