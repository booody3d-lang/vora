"use client";

import { useNotifications } from "@/providers/NotificationProvider";
import { useLocale } from "@/providers/LocaleProvider";
import type { NotificationCategory } from "@/types/notifications";

const CATEGORY_LABELS: Record<NotificationCategory, { en: string; ar: string }> = {
  social: { en: "Social (Followers, Likes, Mentions)", ar: "اجتماعي (متابعون، إعجابات، إشارات)" },
  employment: { en: "Employment (Jobs, Applications)", ar: "التوظيف (وظائف، طلبات)" },
  financial: { en: "Financial (Orders, Payments, Reviews)", ar: "مالي (طلبات، مدفوعات، تقييمات)" },
  owner: { en: "Platform Owner Alerts", ar: "تنبيهات مالك المنصة" },
  security: { en: "Security Alerts", ar: "تنبيهات الأمان" },
  moderation: { en: "Moderation & Support", ar: "الإشراف والدعم" },
};

export function NotificationSettings() {
  const { preferences, updatePreferences } = useNotifications();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  function toggleGlobal(enabled: boolean) {
    updatePreferences({ ...preferences, globalEnabled: enabled });
  }

  function toggleChannel(channel: "inApp" | "email" | "push", enabled: boolean) {
    updatePreferences({
      ...preferences,
      channels: { ...preferences.channels, [channel]: enabled },
    });
  }

  function toggleCategory(
    category: NotificationCategory,
    field: "enabled" | "email" | "push",
    value: boolean
  ) {
    updatePreferences({
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: { ...preferences.categories[category], [field]: value },
      },
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">
          {isAr ? "إعدادات الإشعارات" : "Notification Settings"}
        </h1>
        <p className="text-sm text-slate-500">
          {isAr ? "تحكم في التنبيهات داخل التطبيق والبريد والجوال" : "Control in-app, email, and push alerts"}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ToggleRow
          label={isAr ? "تفعيل جميع الإشعارات" : "Enable All Notifications"}
          checked={preferences.globalEnabled}
          onChange={toggleGlobal}
        />
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-400">
            {isAr ? "قنوات التوصيل" : "Delivery Channels"}
          </p>
          <ToggleRow label={isAr ? "داخل التطبيق" : "In-App Alerts"} checked={preferences.channels.inApp} onChange={(v) => toggleChannel("inApp", v)} />
          <ToggleRow label={isAr ? "البريد الإلكتروني" : "Email Delivery"} checked={preferences.channels.email} onChange={(v) => toggleChannel("email", v)} />
          <ToggleRow label={isAr ? "إشعارات الجوال" : "Mobile Push"} checked={preferences.channels.push} onChange={(v) => toggleChannel("push", v)} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase text-slate-400">
          {isAr ? "حسب الفئة" : "By Category"}
        </p>
        {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((cat) => (
          <div key={cat} className="mb-4 rounded-xl border border-slate-100 p-4">
            <ToggleRow
              label={isAr ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en}
              checked={preferences.categories[cat].enabled}
              onChange={(v) => toggleCategory(cat, "enabled", v)}
            />
            {preferences.categories[cat].enabled && (
              <div className="mt-2 flex gap-4 pl-1">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={preferences.categories[cat].email}
                    onChange={(e) => toggleCategory(cat, "email", e.target.checked)}
                  />
                  Email
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={preferences.categories[cat].push}
                    onChange={(e) => toggleCategory(cat, "push", e.target.checked)}
                  />
                  Push
                </label>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span className="text-sm text-[#0F172A]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-[#3B5998]" : "bg-slate-200"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "left-5" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}
