import { Suspense } from "react";
import { ProfileEditContent } from "@/components/profile/ProfileEditContent";

function ProfileSettingsFallback() {
  return <div className="py-10 text-center text-sm text-slate-500">Loading...</div>;
}

export default function ProfileSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <Suspense fallback={<ProfileSettingsFallback />}>
        <ProfileEditContent />
      </Suspense>
    </div>
  );
}
