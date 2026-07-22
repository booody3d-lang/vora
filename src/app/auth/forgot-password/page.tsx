import { Suspense } from "react";
import { AuthPageBrand } from "@/components/auth/AuthPageBrand";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { LoginPageFallback } from "@/components/auth/LoginPageFallback";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10">
      <AuthPageBrand />
      <Suspense fallback={<LoginPageFallback />}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
