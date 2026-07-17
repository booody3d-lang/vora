"use client";

import { useEffect, useState } from "react";
import type { PrivacySettings } from "@/types/security";
import { DEFAULT_PRIVACY_SETTINGS } from "@/types/security";

export function PrivacySettingsPanel() {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/security/privacy")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setSettings(d.settings); })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    await fetch("/api/security/privacy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function requestDeletion() {
    if (!confirm("Request permanent account deletion? This action follows GDPR/PDPL 30-day grace period.")) return;
    const res = await fetch("/api/security/privacy", { method: "DELETE" });
    const data = await res.json();
    alert(data.message);
  }

  if (loading) return <p className="text-sm text-slate-400">Loading privacy settings...</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0F172A]">Profile Visibility</h2>
        <p className="mt-1 text-sm text-slate-500">Control who can see your professional profile</p>
        <select
          value={settings.profileVisibility}
          onChange={(e) => setSettings({ ...settings, profileVisibility: e.target.value as PrivacySettings["profileVisibility"] })}
          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
        >
          <option value="public">Public — Anyone can view</option>
          <option value="members_only">VORA Members Only</option>
          <option value="connections_only">Connections Only</option>
        </select>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-[#0F172A]">Contact Privacy</h2>
        <Toggle label="Hide email address" checked={settings.hideEmail} onChange={(v) => setSettings({ ...settings, hideEmail: v })} />
        <Toggle label="Hide phone number" checked={settings.hidePhone} onChange={(v) => setSettings({ ...settings, hidePhone: v })} />
        <Toggle label="Hide all contact info" checked={settings.hideContactInfo} onChange={(v) => setSettings({ ...settings, hideContactInfo: v })} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-[#0F172A]">Activity & Data</h2>
        <Toggle label="Show feed activity to connections" checked={settings.feedActivityVisible} onChange={(v) => setSettings({ ...settings, feedActivityVisible: v })} />
        <Toggle label="Allow search engine indexing" checked={settings.allowSearchIndexing} onChange={(v) => setSettings({ ...settings, allowSearchIndexing: v })} />
        <Toggle label="Marketing communications" checked={settings.marketingConsent} onChange={(v) => setSettings({ ...settings, marketingConsent: v })} />
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-bold text-red-800">Data Rights (GDPR / PDPL)</h2>
        <p className="mt-1 text-sm text-red-600">Request permanent deletion of your personal data</p>
        <button type="button" onClick={requestDeletion} className="mt-3 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
          Request Account Deletion
        </button>
      </section>

      <button type="button" onClick={save} className="rounded-xl bg-[#3B5998] px-6 py-2.5 text-sm font-semibold text-white">
        {saved ? "Saved ✓" : "Save Privacy Settings"}
      </button>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
      <span className="text-sm text-[#0F172A]">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#3B5998]" />
    </label>
  );
}
