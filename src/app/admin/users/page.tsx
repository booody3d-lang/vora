"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ADMIN_USERS } from "@/lib/admin/mock-data";
import type { AdminUserRecord, BanType, UserAccountRole } from "@/types/admin";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

const ROLE_KEYS: Record<UserAccountRole, string> = {
  user: "admin.users.roleUser",
  professional: "admin.users.roleProfessional",
  company: "admin.users.roleCompany",
  admin: "admin.users.roleAdmin",
};

export default function AdminUsersPage() {
  const { t } = useTranslations();
  const [users, setUsers] = useState(ADMIN_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserAccountRole | "all">("all");
  const [banModal, setBanModal] = useState<AdminUserRecord | null>(null);

  const loadUsers = useCallback(() => {
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { users?: AdminUserRecord[] } | null) => {
        if (data?.users) setUsers(data.users);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  async function updateRole(id: string, role: UserAccountRole) {
    const previous = users;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    if (!res.ok) {
      setUsers(previous);
      return;
    }

    const data = (await res.json()) as { user?: AdminUserRecord };
    if (data.user) {
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user! : u)));
    }
  }

  async function applyBan(id: string, banType: BanType, reason: string) {
    const previous = users;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, isBanned: true, banType, banReason: reason } : u
      )
    );
    setBanModal(null);

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ban: { type: banType, reason } }),
    });

    if (!res.ok) {
      setUsers(previous);
      return;
    }

    const data = (await res.json()) as { user?: AdminUserRecord };
    if (data.user) {
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user! : u)));
    }
  }

  async function unban(id: string) {
    const previous = users;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, isBanned: false, banType: "none" as BanType, banReason: undefined } : u
      )
    );

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unban: true }),
    });

    if (!res.ok) {
      setUsers(previous);
      return;
    }

    const data = (await res.json()) as { user?: AdminUserRecord };
    if (data.user) {
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user! : u)));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("admin.users.title")}</h1>
        <p className="text-sm text-slate-400">{t("admin.users.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder={t("admin.users.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-slate-700 bg-[#111827] px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserAccountRole | "all")}
          className="rounded-xl border border-slate-700 bg-[#111827] px-4 py-2 text-sm text-white focus:outline-none"
        >
          <option value="all">{t("admin.users.allRoles")}</option>
          {(Object.keys(ROLE_KEYS) as UserAccountRole[]).map((role) => (
            <option key={role} value={role}>
              {t(ROLE_KEYS[role])}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#111827]">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 text-start text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">{t("admin.users.colUser")}</th>
              <th className="px-5 py-3">{t("admin.users.colRole")}</th>
              <th className="px-5 py-3">{t("admin.users.colStatus")}</th>
              <th className="px-5 py-3">{t("admin.users.colJoined")}</th>
              <th className="px-5 py-3">{t("admin.users.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b border-slate-800">
                <td className="px-5 py-4">
                  <p className="font-medium text-white">{user.fullName}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  <div className="mt-1 flex gap-1">
                    {user.isVerified && (
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-400">
                        {t("admin.users.verified")}
                      </span>
                    )}
                    {user.isPremium && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">
                        {t("admin.users.premium")}
                      </span>
                    )}
                    {user.hasStore && (
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[9px] text-orange-400">
                        {t("admin.users.store")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value as UserAccountRole)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  >
                    {(Object.keys(ROLE_KEYS) as UserAccountRole[]).map((role) => (
                      <option key={role} value={role}>
                        {t(ROLE_KEYS[role])}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4">
                  {user.isBanned ? (
                    <div>
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400">
                        {t("admin.users.banLabel").replace("{type}", user.banType)}
                      </span>
                      {user.banReason && (
                        <p className="mt-1 text-[10px] text-slate-500">{user.banReason}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-emerald-400">{t("admin.users.active")}</span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-500">{user.joinedAt}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/network/profile/${user.slug}`}
                      className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                    >
                      {t("admin.users.viewProfile")}
                    </Link>
                    {user.isBanned ? (
                      <button
                        type="button"
                        onClick={() => unban(user.id)}
                        className="rounded-lg bg-emerald-600/80 px-2 py-1 text-xs text-white"
                      >
                        {t("admin.users.unban")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBanModal(user)}
                        className="rounded-lg bg-red-600/80 px-2 py-1 text-xs text-white"
                      >
                        {t("admin.users.ban")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {banModal && (
        <BanModal user={banModal} onClose={() => setBanModal(null)} onBan={applyBan} t={t} />
      )}
    </div>
  );
}

function BanModal({
  user,
  onClose,
  onBan,
  t,
}: {
  user: AdminUserRecord;
  onClose: () => void;
  onBan: (id: string, type: BanType, reason: string) => void;
  t: (key: string) => string;
}) {
  const [banType, setBanType] = useState<BanType>("temporary");
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("admin.users.close")}
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111827] p-6">
        <h3 className="text-lg font-bold text-white">
          {t("admin.users.banAccount")} — {user.fullName}
        </h3>
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            {(["temporary", "permanent"] as BanType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBanType(type)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold",
                  banType === type ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400"
                )}
              >
                {type === "temporary" ? t("admin.users.banTemporary") : t("admin.users.banPermanent")}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("admin.users.banReasonPlaceholder")}
            rows={3}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-600 py-2 text-sm text-slate-400"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => onBan(user.id, banType, reason)}
            className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("admin.users.enforceBan")}
          </button>
        </div>
      </div>
    </div>
  );
}
