import { AuthPageBrand } from "@/components/auth/AuthPageBrand";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10">
      <AuthPageBrand />
      <SignupForm />
    </main>
  );
}
