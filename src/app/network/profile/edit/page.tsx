import { Suspense } from "react";
import { ProfileEditContent } from "@/components/profile/ProfileEditContent";

function EditFallback() {
  return <div className="py-10 text-center text-slate-500">Loading...</div>;
}

export default function ProfileEditPage() {
  return (
    <Suspense fallback={<EditFallback />}>
      <ProfileEditContent />
    </Suspense>
  );
}
