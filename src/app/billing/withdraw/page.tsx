import { WithdrawForm } from "@/components/billing/WithdrawForm";
import { TriWalletCards } from "@/components/billing/TriWalletCards";
import { DEMO_WALLET } from "@/lib/billing/engine";

export default function WithdrawPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Withdraw Funds</h1>
        <p className="mt-1 text-sm text-slate-500">
          Transfer available balance to your Saudi bank account via IBAN. Admin approval required.
        </p>
      </div>

      <TriWalletCards wallet={DEMO_WALLET} />
      <WithdrawForm wallet={DEMO_WALLET} />
    </div>
  );
}
