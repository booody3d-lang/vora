import { BillingShell } from "@/components/billing/BillingShell";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <BillingShell>{children}</BillingShell>;
}
