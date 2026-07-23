"use client";

import { useCallback, useEffect, useState } from "react";
import type { SecurityAuditEvent, UserSession } from "@/types/security";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";
import type { OtpDeliveryChannel } from "@/types/auth-phone";

function SectionCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatAuditTime(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SecurityDashboard() {
  const router = useRouter();
  const { t, locale } = useTranslations();

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [auditEvents, setAuditEvents] = useState<SecurityAuditEvent[]>([]);
  const [totpUri, setTotpUri] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);

  const [phone, setPhone] = useState("");
  const [countryIso2, setCountryIso2] = useState("SA");
  const [phoneE164, setPhoneE164] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [linkedPhone, setLinkedPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpChannel, setOtpChannel] = useState<OtpDeliveryChannel>("sms");
  const [otpSent, setOtpSent] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsRes, sessionRes, auditRes] = await Promise.all([
        fetch("/api/auth/sessions"),
        fetch("/api/auth/session"),
        fetch("/api/security/audit?limit=30"),
      ]);
      const sessionsData = await sessionsRes.json();
      const sessionData = await sessionRes.json();
      const auditData = await auditRes.json();

      if (sessionsData.sessions) setSessions(sessionsData.sessions);
      if (sessionData.user) {
        setTotpEnabled(sessionData.user.totpEnabled);
        setPhoneVerified(sessionData.user.phoneVerified);
        setLinkedPhone(sessionData.user.phone ?? "");
      }
      if (auditData.events) setAuditEvents(auditData.events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function flashSuccess(msg: string) {
    setMessage(msg);
    setError("");
    setTimeout(() => setMessage(""), 4000);
  }

  function flashError(msg: string) {
    setError(msg);
    setMessage("");
  }

  async function setup2FA() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa", { method: "POST" });
      const data = await res.json();
      if (data.uri) {
        setTotpUri(data.uri);
        setTotpSecret(data.secret ?? "");
      } else {
        flashError(data.error ?? t("network.settings.security.twoFaEnableFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function enable2FA() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode, enable: true }),
      });
      const data = await res.json();
      if (data.totpEnabled) {
        setTotpEnabled(true);
        setTotpUri("");
        setTotpSecret("");
        setTotpCode("");
        flashSuccess(t("network.settings.security.twoFaEnabledSuccess"));
        void loadData();
      } else {
        flashError(data.error ?? t("network.settings.security.twoFaEnableFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function disable2FA() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: disableCode || undefined,
          password: disablePassword || undefined,
          enable: false,
        }),
      });
      const data = await res.json();
      if (data.totpEnabled === false) {
        setTotpEnabled(false);
        setShowDisableForm(false);
        setDisableCode("");
        setDisablePassword("");
        flashSuccess(t("network.settings.security.twoFaDisabledSuccess"));
        void loadData();
      } else {
        flashError(data.error ?? t("network.settings.security.twoFaDisableFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendPhoneOtp() {
    if (!phoneE164 && !phone) {
      flashError(t("network.settings.security.phoneRequired"));
      return;
    }
    setBusy(true);
    try {
      const linkRes = await fetch("/api/auth/phone/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneE164 || phone, countryCode: countryIso2 }),
      });
      const linkData = await linkRes.json();
      if (!linkRes.ok) {
        flashError(linkData.error ?? t("network.settings.security.phoneLinkFailed"));
        return;
      }

      const otpRes = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: linkData.phone ?? phoneE164,
          countryCode: countryIso2,
          channel: otpChannel,
          purpose: "2fa",
        }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) {
        flashError(otpData.error ?? t("network.settings.security.otpSendFailed"));
        return;
      }
      setOtpSent(true);
      flashSuccess(t("network.settings.security.otpSent"));
    } finally {
      setBusy(false);
    }
  }

  async function verifyPhoneLink() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneE164 || phone,
          countryCode: countryIso2,
          code: otpCode,
          channel: otpChannel,
        }),
      });
      const data = await res.json();
      if (data.linked) {
        setPhoneVerified(true);
        setLinkedPhone(data.phone ?? phoneE164);
        setOtpSent(false);
        setOtpCode("");
        flashSuccess(t("network.settings.security.phoneLinkedSuccess"));
        void loadData();
      } else {
        flashError(data.error ?? t("network.settings.security.phoneLinkFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      flashError(t("network.settings.security.passwordMismatch"));
      return;
    }
    if (newPassword.length < 8) {
      flashError(t("network.settings.security.passwordTooShort"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        flashSuccess(t("network.settings.security.passwordChanged"));
        void loadData();
      } else {
        flashError(data.error ?? t("network.settings.security.passwordChangeFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function revokeSession(id: string) {
    await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    void loadData();
  }

  async function revokeOthers() {
    await fetch("/api/auth/sessions/revoke-others", { method: "POST" });
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    void loadData();
  }

  async function logoutAll() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allDevices: true }),
    });
    router.push("/auth/login");
  }

  function auditActionLabel(action: string): string {
    const key = `security.audit.actions.${action.replace(/\./g, "_")}`;
    const translated = t(key);
    return translated !== key ? translated : action;
  }

  if (loading) {
    return <p className="text-sm text-slate-400">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm",
            error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          )}
        >
          {error || message}
        </div>
      )}

      <SectionCard
        title={t("network.settings.security.passwordTitle")}
        subtitle={t("network.settings.security.passwordSubtitle")}
      >
        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={t("network.settings.security.currentPassword")}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            autoComplete="current-password"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("network.settings.security.newPassword")}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("network.settings.security.confirmPassword")}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            autoComplete="new-password"
          />
          <button
            type="button"
            disabled={busy || !currentPassword || !newPassword || !confirmPassword}
            onClick={() => void changePassword()}
            className="rounded-xl bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("network.settings.security.changePassword")}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title={t("network.settings.security.twoFaTitle")}
        subtitle={t("network.settings.security.twoFaSubtitle")}
      >
        {totpEnabled ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-emerald-600">
              {t("network.settings.security.twoFaActive")}
            </p>
            {!showDisableForm ? (
              <button
                type="button"
                onClick={() => setShowDisableForm(true)}
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                {t("network.settings.security.twoFaDisable")}
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  {t("network.settings.security.twoFaDisableHint")}
                </p>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  maxLength={6}
                  placeholder={t("network.settings.security.twoFaCodePlaceholder")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder={t("network.settings.security.twoFaDisablePassword")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy || (!disableCode && !disablePassword)}
                    onClick={() => void disable2FA()}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t("network.settings.security.twoFaConfirmDisable")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDisableForm(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {!totpUri ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void setup2FA()}
                className="rounded-xl bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("network.settings.security.twoFaSetup")}
              </button>
            ) : (
              <>
                {totpSecret && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      {t("network.settings.security.twoFaManualKey")}
                    </p>
                    <code className="mt-1 block break-all text-xs text-[#0F172A]">{totpSecret}</code>
                  </div>
                )}
                <p className="text-xs text-slate-500">{t("network.settings.security.twoFaScanHint")}</p>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  maxLength={6}
                  placeholder={t("network.settings.security.twoFaCodePlaceholder")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <button
                  type="button"
                  disabled={busy || totpCode.length < 6}
                  onClick={() => void enable2FA()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t("network.settings.security.twoFaVerifyEnable")}
                </button>
              </>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={t("network.settings.security.phoneTitle")}
        subtitle={t("network.settings.security.phoneSubtitle")}
      >
        {phoneVerified && linkedPhone ? (
          <p className="text-sm font-medium text-emerald-600">
            {t("network.settings.security.phoneLinked")}: {linkedPhone.replace(/(\+\d{2,3})\d+(\d{4})/, "$1***$2")}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#0F172A] p-4">
              <PhoneInput
                nationalNumber={phone}
                countryIso2={countryIso2}
                onNationalNumberChange={setPhone}
                onCountryChange={setCountryIso2}
                onValueChange={(value) => setPhoneE164(value.e164 ?? "")}
              />
            </div>
            <div className="flex gap-2">
              {(["sms", "whatsapp"] as const).map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setOtpChannel(channel)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold",
                    otpChannel === channel
                      ? "border-[#3B5998] bg-[#3B5998]/10 text-[#3B5998]"
                      : "border-slate-200 text-slate-600"
                  )}
                >
                  {t(`network.settings.security.channel.${channel}`)}
                </button>
              ))}
            </div>
            {!otpSent ? (
              <button
                type="button"
                disabled={busy || (!phone && !phoneE164)}
                onClick={() => void sendPhoneOtp()}
                className="rounded-xl bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("network.settings.security.sendOtp")}
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  placeholder={t("network.settings.security.otpPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <button
                  type="button"
                  disabled={busy || otpCode.length !== 6}
                  onClick={() => void verifyPhoneLink()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t("network.settings.security.verifyPhone")}
                </button>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={t("network.settings.security.sessionsTitle")}
        actions={
          <div className="flex gap-3">
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={() => void revokeOthers()}
                className="text-xs font-semibold text-amber-600 hover:underline"
              >
                {t("network.settings.security.revokeOthers")}
              </button>
            )}
            <button
              type="button"
              onClick={() => void logoutAll()}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              {t("network.settings.security.logoutAll")}
            </button>
          </div>
        }
      >
        <ul className="divide-y divide-slate-100">
          {sessions.length === 0 ? (
            <li className="py-4 text-sm text-slate-400">
              {t("network.settings.security.sessionsEmpty")}
            </li>
          ) : (
            sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0F172A]">
                    {s.deviceLabel}{" "}
                    {s.isCurrent && (
                      <span className="text-xs text-emerald-600">
                        ({t("network.settings.security.currentDevice")})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {s.location} · {s.ipAddress}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {t("network.settings.security.lastActive")}:{" "}
                    {formatAuditTime(s.lastActiveAt, locale)}
                  </p>
                </div>
                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => void revokeSession(s.id)}
                    className="shrink-0 text-xs text-red-500 hover:underline"
                  >
                    {t("network.settings.security.revoke")}
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      </SectionCard>

      <SectionCard
        title={t("network.settings.security.activityTitle")}
        subtitle={t("network.settings.security.activitySubtitle")}
      >
        {auditEvents.length === 0 ? (
          <p className="text-sm text-slate-400">{t("network.settings.security.activityEmpty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {auditEvents.map((event) => (
              <li key={event.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-[#0F172A]">
                    {auditActionLabel(event.action)}
                  </p>
                  <time className="text-xs text-slate-400">
                    {formatAuditTime(event.createdAt, locale)}
                  </time>
                </div>
                {event.ipAddress && (
                  <p className="mt-1 text-xs text-slate-400">
                    {t("security.audit.ip")}: {event.ipAddress}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
