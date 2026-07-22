import { Suspense } from "react";
import { AuthPageBrand } from "@/components/auth/AuthPageBrand";
import { LoginPageFallback } from "@/components/auth/LoginPageFallback";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10">
      <AuthPageBrand />
      <Suspense fallback={<LoginPageFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
