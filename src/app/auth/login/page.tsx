import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginPageFallback } from "@/components/auth/LoginPageFallback";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4">
      <Suspense fallback={<LoginPageFallback />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
