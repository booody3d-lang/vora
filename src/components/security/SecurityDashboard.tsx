"use client";

import { useEffect, useState } from "react";
import type { UserSession } from "@/types/security";
import { useRouter } from "next/navigation";

export function SecurityDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [totpUri, setTotpUri] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/sessions").then((r) => r.json()).then((d) => { if (d.sessions) setSessions(d.sessions); });
    fetch("/api/auth/session").then((r) => r.json()).then((d) => { if (d.user) setTotpEnabled(d.user.totpEnabled); });
  }, []);

  async function setup2FA() {
    const res = await fetch("/api/auth/2fa", { method: "POST" });
    const data = await res.json();
    if (data.uri) setTotpUri(data.uri);
  }

  async function enable2FA() {
    const res = await fetch("/api/auth/2fa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: totpCode, enable: true }),
    });
    const data = await res.json();
    if (data.totpEnabled) {
      setTotpEnabled(true);
      setMessage("2FA enabled successfully");
    } else {
      setMessage(data.error ?? "Failed");
    }
  }

  async function revokeSession(id: string) {
    await fetch("/api/auth/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function logoutAll() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allDevices: true }),
    });
    router.push("/auth/login");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0F172A]">Two-Factor Authentication</h2>
        <p className="mt-1 text-sm text-slate-500">Google Authenticator or SMS backup codes</p>
        {totpEnabled ? (
          <p className="mt-3 text-sm text-emerald-600 font-medium">✓ 2FA is active on your account</p>
        ) : (
          <div className="mt-4 space-y-3">
            {!totpUri ? (
              <button type="button" onClick={setup2FA} className="rounded-xl bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white">
                Set Up Authenticator App
              </button>
            ) : (
              <>
                <p className="text-xs text-slate-500 break-all">Scan URI: {totpUri.slice(0, 60)}...</p>
                <input type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} maxLength={6} placeholder="Enter 6-digit code" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                <button type="button" onClick={enable2FA} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                  Verify & Enable
                </button>
              </>
            )}
          </div>
        )}
        {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0F172A]">Active Sessions & Devices</h2>
          <button type="button" onClick={logoutAll} className="text-xs font-semibold text-red-600 hover:underline">
            Log Out All Devices
          </button>
        </div>
        <ul className="mt-4 divide-y divide-slate-100">
          {sessions.length === 0 ? (
            <li className="py-4 text-sm text-slate-400">Sign in to view active sessions</li>
          ) : (
            sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">
                    {s.deviceLabel} {s.isCurrent && <span className="text-xs text-emerald-600">(current)</span>}
                  </p>
                  <p className="text-xs text-slate-400">{s.location} · {s.ipAddress}</p>
                  <p className="text-[10px] text-slate-400">{s.userAgent.slice(0, 60)}...</p>
                </div>
                {!s.isCurrent && (
                  <button type="button" onClick={() => revokeSession(s.id)} className="text-xs text-red-500 hover:underline">
                    Revoke
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
