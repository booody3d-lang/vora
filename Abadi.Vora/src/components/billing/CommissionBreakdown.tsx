"use client";

import { calculateCommission, formatSar } from "@/lib/billing/engine";
import { useTranslations } from "@/i18n/use-translations";
import { PLATFORM_COMMISSION_RATE } from "@/types/billing";

interface CommissionBreakdownProps {
  orderTotal: number;
  showExample?: boolean;
}

export function CommissionBreakdown({ orderTotal, showExample }: CommissionBreakdownProps) {
  const { t } = useTranslations();
  const total = showExample ? 100 : orderTotal;
  const split = calculateCommission(total);
  const ratePercent = PLATFORM_COMMISSION_RATE * 100;

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
      <h3 className="text-sm font-bold text-[#0F172A]">
        {t("billing.commission.titleWithRate").replace("{rate}", String(ratePercent))}
      </h3>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex justify-between">
          <span className="text-slate-600">{t("billing.commission.totalPrice")}</span>
          <span className="font-semibold text-[#0F172A]">{formatSar(split.orderTotal)}</span>
        </li>
        <li className="flex justify-between text-red-600">
          <span>{t("billing.commission.platformFee")}</span>
          <span className="font-semibold">− {formatSar(split.platformCommission)}</span>
        </li>
        <li className="flex justify-between border-t border-orange-200 pt-2">
          <span className="font-medium text-emerald-700">{t("billing.commission.sellerNet")}</span>
          <span className="font-bold text-emerald-700">{formatSar(split.freelancerNetEarnings)}</span>
        </li>
      </ul>
    </div>
  );
}
