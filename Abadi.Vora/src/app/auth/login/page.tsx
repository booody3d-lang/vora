import { Suspense } from "react";
import { AuthPageBrand } from "@/components/auth/AuthPageBrand";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginPageFallback } from "@/components/auth/LoginPageFallback";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10">
      <AuthPageBrand />
      <Suspense fallback={<LoginPageFallback />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
