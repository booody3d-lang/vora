"use client";

import { VoraLogo } from "@/components/brand/VoraLogo";

export function AuthPageBrand() {
  return (
    <div className="mb-8 flex justify-center px-2">
      <VoraLogo href="/" size="auth" priority className="max-h-14 w-auto sm:max-h-16" />
    </div>
  );
}
