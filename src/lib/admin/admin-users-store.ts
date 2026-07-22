import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import {
  banUserInSupabase,
  listUsersForAdminFromSupabase,
  unbanUserInSupabase,
  updateUserRoleInSupabase,
} from "@/lib/admin/admin-users-supabase";
import { ADMIN_USERS } from "@/lib/admin/mock-data";
import type { AdminUserRecord, BanType, UserAccountRole } from "@/types/admin";

const USERS_FILE = "admin-users.json";

interface AdminUsersDataFile {
  users: AdminUserRecord[];
}

let usersTableProbed = false;
let usersTableAvailable = false;

export async function isAdminUsersSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (usersTableProbed) return usersTableAvailable;

  usersTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("accounts").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("accounts missing", error);
      }
      usersTableAvailable = false;
      return false;
    }
    usersTableAvailable = true;
    return true;
  } catch {
    usersTableAvailable = false;
    return false;
  }
}

function readUsersData(): AdminUsersDataFile {
  return readJsonStore(USERS_FILE, () => ({
    users: ADMIN_USERS,
  }));
}

function writeUsersData(data: AdminUsersDataFile) {
  writeJsonStore(USERS_FILE, data);
}

export async function listUsersForAdmin(limit = 200): Promise<AdminUserRecord[]> {
  const jsonFallback = readUsersData().users;

  if (!(await isAdminUsersSupabaseReady())) {
    return jsonFallback.slice(0, limit);
  }

  return runOptionalDbSync(
    "listUsersForAdmin",
    () => listUsersForAdminFromSupabase(limit),
    jsonFallback.slice(0, limit)
  );
}

export async function updateUserRoleForAdmin(
  userId: string,
  role: UserAccountRole
): Promise<AdminUserRecord | null> {
  const data = readUsersData();
  const index = data.users.findIndex((user) => user.id === userId);
  if (index >= 0) {
    data.users[index] = { ...data.users[index], role };
    writeUsersData(data);
  }

  if (!(await isAdminUsersSupabaseReady()) || !isValidBillingUuid(userId)) {
    return index >= 0 ? data.users[index] : null;
  }

  return runOptionalDbSync(
    "updateUserRoleForAdmin",
    () => updateUserRoleInSupabase(userId, role),
    index >= 0 ? data.users[index] : null
  );
}

export async function banUserForAdmin(
  userId: string,
  banType: BanType,
  reason: string
): Promise<AdminUserRecord | null> {
  const data = readUsersData();
  const index = data.users.findIndex((user) => user.id === userId);
  if (index >= 0) {
    data.users[index] = {
      ...data.users[index],
      isBanned: true,
      banType,
      banReason: reason.trim(),
    };
    writeUsersData(data);
  }

  if (!(await isAdminUsersSupabaseReady()) || !isValidBillingUuid(userId)) {
    return index >= 0 ? data.users[index] : null;
  }

  return runOptionalDbSync(
    "banUserForAdmin",
    () => banUserInSupabase(userId, banType, reason),
    index >= 0 ? data.users[index] : null
  );
}

export async function unbanUserForAdmin(userId: string): Promise<AdminUserRecord | null> {
  const data = readUsersData();
  const index = data.users.findIndex((user) => user.id === userId);
  if (index >= 0) {
    data.users[index] = {
      ...data.users[index],
      isBanned: false,
      banType: "none",
      banReason: undefined,
    };
    writeUsersData(data);
  }

  if (!(await isAdminUsersSupabaseReady()) || !isValidBillingUuid(userId)) {
    return index >= 0 ? data.users[index] : null;
  }

  return runOptionalDbSync(
    "unbanUserForAdmin",
    () => unbanUserInSupabase(userId),
    index >= 0 ? data.users[index] : null
  );
}

export function isAdminUsersPersistenceActive(): boolean {
  return usersTableAvailable;
}
