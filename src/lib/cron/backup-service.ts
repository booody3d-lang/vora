import "server-only";

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ensureVoraDataDir, getVoraDataDir } from "@/lib/storage/data-dir";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import type { CronRunStatus } from "@/lib/cron/cron-runs-store";

/** JSON stores that must be included in snapshot payloads when present. */
const CRITICAL_BACKUP_FILES = [
  "subscription-data.json",
  "security-audit.json",
  "auth-data.json",
  "company-data.json",
  "company-jobs.json",
  "freelance-orders.json",
  "search-index.json",
] as const;

export interface BackupFileManifestEntry {
  name: string;
  sizeBytes: number;
  sha256: string;
  included: boolean;
  error?: string;
}

export interface BackupSnapshot {
  version: 1;
  createdAt: string;
  dataDir: string;
  supabasePersistence: boolean;
  note: string;
  files: BackupFileManifestEntry[];
  bundles: Record<string, unknown>;
}

export interface BackupRunResult {
  status: CronRunStatus;
  snapshot: BackupSnapshot;
  storage: {
    configured: boolean;
    uploaded: boolean;
    target?: string;
    error?: string;
  };
  localManifestPath?: string;
}

function sha256Hex(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function redactStorageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url.startsWith("s3://") ? "s3://…" : "configured";
  }
}

function listJsonFiles(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".json") && name !== "cron-runs.json")
      .sort();
  } catch {
    return [...CRITICAL_BACKUP_FILES];
  }
}

function readFileEntry(dir: string, name: string, includeContent: boolean): BackupFileManifestEntry {
  const filePath = path.join(dir, name);
  try {
    if (!fs.existsSync(filePath)) {
      return { name, sizeBytes: 0, sha256: "", included: false, error: "missing" };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return {
      name,
      sizeBytes: Buffer.byteLength(raw, "utf-8"),
      sha256: sha256Hex(raw),
      included: includeContent,
    };
  } catch (error) {
    return {
      name,
      sizeBytes: 0,
      sha256: "",
      included: false,
      error: error instanceof Error ? error.message : "read_failed",
    };
  }
}

function readBundle(dir: string, name: string): unknown | null {
  const filePath = path.join(dir, name);
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  } catch {
    return null;
  }
}

async function uploadSnapshotMetadata(url: string, snapshot: BackupSnapshot): Promise<{ ok: boolean; error?: string }> {
  if (url.startsWith("s3://")) {
    return {
      ok: false,
      error:
        "s3:// URLs require an external uploader or presigned HTTPS endpoint; snapshot saved locally only",
    };
  }

  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, error: "BACKUP_STORAGE_URL must be an HTTP(S) endpoint or s3:// bucket URI" };
  }

  try {
    const body = JSON.stringify({
      type: "vora-json-backup-manifest",
      snapshot,
    });
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!response.ok) {
      return { ok: false, error: `Upload failed with HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "upload_failed",
    };
  }
}

/** Export critical JSON data and optionally upload manifest metadata. */
export async function runBackupJob(): Promise<BackupRunResult> {
  const dir = ensureVoraDataDir();
  const discovered = listJsonFiles(dir);
  const targetNames = Array.from(new Set([...CRITICAL_BACKUP_FILES, ...discovered]));

  const bundles: Record<string, unknown> = {};
  const files: BackupFileManifestEntry[] = [];

  for (const name of targetNames) {
    const isCritical = (CRITICAL_BACKUP_FILES as readonly string[]).includes(name);
    const entry = readFileEntry(dir, name, isCritical);
    files.push(entry);

    if (isCritical && !entry.error) {
      const parsed = readBundle(dir, name);
      if (parsed !== null) {
        bundles[name] = parsed;
      }
    }
  }

  const snapshot: BackupSnapshot = {
    version: 1,
    createdAt: new Date().toISOString(),
    dataDir: getVoraDataDir(),
    supabasePersistence: isSupabasePersistenceEnabled(),
    note: isSupabasePersistenceEnabled()
      ? "Primary relational data is managed by Supabase point-in-time recovery; this snapshot covers local JSON dual-write stores."
      : "Local JSON stores only — configure Supabase for managed database backups.",
    files,
    bundles,
  };

  let localManifestPath: string | undefined;
  try {
    const backupsDir = path.join(dir, "backups");
    fs.mkdirSync(backupsDir, { recursive: true });
    localManifestPath = path.join(backupsDir, `manifest-${snapshot.createdAt.replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(localManifestPath, JSON.stringify(snapshot, null, 2));
  } catch (error) {
    console.error("[VORA Backup] failed to write local manifest:", error);
  }

  const storageUrl = process.env.BACKUP_STORAGE_URL?.trim();
  const storage = {
    configured: Boolean(storageUrl),
    uploaded: false as boolean,
    target: storageUrl ? redactStorageUrl(storageUrl) : undefined,
    error: undefined as string | undefined,
  };

  if (!storageUrl) {
    return {
      status: "partial",
      snapshot: {
        ...snapshot,
        bundles: Object.fromEntries(Object.keys(bundles).map((key) => [key, "[included locally]"])),
      },
      storage: {
        ...storage,
        error: "BACKUP_STORAGE_URL not configured; manifest saved locally only",
      },
      localManifestPath,
    };
  }

  const upload = await uploadSnapshotMetadata(storageUrl, snapshot);
  storage.uploaded = upload.ok;
  storage.error = upload.error;

  const includedCount = files.filter((file) => file.included && !file.error).length;
  const missingCritical = CRITICAL_BACKUP_FILES.filter(
    (name) => files.find((file) => file.name === name)?.error === "missing"
  );

  let status: CronRunStatus = "success";
  if (!upload.ok) {
    status = includedCount > 0 ? "partial" : "failed";
  } else if (missingCritical.length > 0) {
    status = "partial";
  }

  return {
    status,
    snapshot: {
      ...snapshot,
      bundles: Object.fromEntries(Object.keys(bundles).map((key) => [key, "[uploaded]"])),
    },
    storage,
    localManifestPath,
  };
}
