"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NetworkNav } from "@/components/network/layout/NetworkNav";
import { CompanyPublicNav } from "@/components/company/layout/CompanyPublicNav";
import type { CompanyProfile } from "@/types/company";

export function NetworkLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const companyMatch = pathname.match(/^\/network\/company\/([^/]+)/);
  const companySlug = companyMatch?.[1] ?? null;
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    if (!companySlug) {
      setCompany(null);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/company/${companySlug}`);
        if (res.ok) {
          const data = await res.json();
          setCompany(data.company);
        }
      } catch {
        setCompany(null);
      }
    })();
  }, [companySlug]);

  if (companySlug) {
    return (
      <>
        <CompanyPublicNav
          companyName={company?.name ?? companySlug}
          companySlug={companySlug}
        />
        {children}
      </>
    );
  }

  return (
    <>
      <NetworkNav />
      {children}
    </>
  );
}
