"use client";

import { useEffect, useState } from "react";
import type { NetworkUser } from "@/types/network";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useTranslations } from "@/i18n/use-translations";

interface NewConversationPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (targetAccountId: string) => Promise<void>;
}

export function NewConversationPanel({
  open,
  onClose,
  onSelect,
}: NewConversationPanelProps) {
  const { t } = useTranslations();
  const [contacts, setContacts] = useState<NetworkUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/messages/contacts", { credentials: "include" });
        const data = await res.json();
        if (res.ok) setContacts(data.contacts ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  if (!open) return null;

  return (
    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">{t("network.messagingNew")}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          {t("common.cancel")}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">{t("common.loading")}</p>
      ) : contacts.length === 0 ? (
        <p className="text-xs text-slate-500">{t("network.messagingNoContacts")}</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <button
                type="button"
                disabled={creating === contact.id}
                onClick={() => {
                  setCreating(contact.id);
                  void onSelect(contact.id).finally(() => setCreating(null));
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition-colors hover:bg-white disabled:opacity-50"
              >
                <UserAvatar
                  photoUrl={contact.profilePhotoUrl}
                  gender={contact.gender}
                  name={contact.fullName}
                  className="h-9 w-9 border border-slate-200"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#0F172A]">
                    {contact.fullName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{contact.headline}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
