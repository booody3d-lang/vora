import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileEditContent } from "@/components/profile/ProfileEditContent";
import { getAuthenticatedUser } from "@/lib/security/session";

function EditFallback() {
  return <div className="py-10 text-center text-slate-500">Loading...</div>;
}

export default async function ProfileEditPage() {
  const auth = await getAuthenticatedUser();
  if (auth?.user.role === "company") {
    redirect("/company/dashboard/settings");
  }

  return (
    <Suspense fallback={<EditFallback />}>
      <ProfileEditContent />
    </Suspense>
  );
}
