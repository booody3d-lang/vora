"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ADMIN_USERS } from "@/lib/admin/mock-data";
import type { AdminUserRecord, BanType, UserAccountRole } from "@/types/admin";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

export default function AdminUsersPage() {
  const { t } = useTranslations();
  const [users, setUsers] = useState(ADMIN_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserAccountRole | "all">("all");
  const [banModal, setBanModal] = useState<AdminUserRecord | null>(null);

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

  function updateRole(id: string, role: UserAccountRole) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  function applyBan(id: string, banType: BanType, reason: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, isBanned: true, banType, banReason: reason } : u
      )
    );
    setBanModal(null);
  }

  function unban(id: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, isBanned: false, banType: "none" as BanType, banReason: undefined } : u
      )
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("admin.users.title")}</h1>
        <p className="text-sm text-slate-400">Master directory · Roles · Account enforcement</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-slate-700 bg-[#111827] px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserAccountRole | "all")}
          className="rounded-xl border border-slate-700 bg-[#111827] px-4 py-2 text-sm text-white focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="professional">Professional</option>
          <option value="company">Company</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#111827]">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3">Actions</th>
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
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-400">Verified</span>
                    )}
                    {user.isPremium && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">Premium</span>
                    )}
                    {user.hasStore && (
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[9px] text-orange-400">Store</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value as UserAccountRole)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  >
                    <option value="user">User</option>
                    <option value="professional">Professional</option>
                    <option value="company">Company</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-5 py-4">
                  {user.isBanned ? (
                    <div>
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400">
                        {user.banType} ban
                      </span>
                      {user.banReason && (
                        <p className="mt-1 text-[10px] text-slate-500">{user.banReason}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-emerald-400">Active</span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-500">{user.joinedAt}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/network/profile/${user.slug}`}
                      className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                    >
                      View Profile
                    </Link>
                    {user.isBanned ? (
                      <button
                        type="button"
                        onClick={() => unban(user.id)}
                        className="rounded-lg bg-emerald-600/80 px-2 py-1 text-xs text-white"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBanModal(user)}
                        className="rounded-lg bg-red-600/80 px-2 py-1 text-xs text-white"
                      >
                        Ban
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
        <BanModal user={banModal} onClose={() => setBanModal(null)} onBan={applyBan} />
      )}
    </div>
  );
}

function BanModal({
  user,
  onClose,
  onBan,
}: {
  user: AdminUserRecord;
  onClose: () => void;
  onBan: (id: string, type: BanType, reason: string) => void;
}) {
  const [banType, setBanType] = useState<BanType>("temporary");
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#111827] p-6">
        <h3 className="text-lg font-bold text-white">Ban Account — {user.fullName}</h3>
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            {(["temporary", "permanent"] as BanType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setBanType(t)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold capitalize",
                  banType === t ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for suspension (required)..."
            rows={3}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-600 py-2 text-sm text-slate-400">
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => onBan(user.id, banType, reason)}
            className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enforce Ban
          </button>
        </div>
      </div>
    </div>
  );
}
