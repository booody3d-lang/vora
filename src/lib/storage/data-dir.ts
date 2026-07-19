import fs from "fs";
import os from "os";
import path from "path";

/** Writable data root — uses /tmp on Vercel where the project dir is read-only. */
export function getVoraDataDir(): string {
  if (process.env.VORA_DATA_DIR) {
    return process.env.VORA_DATA_DIR;
  }
  if (process.env.VERCEL === "1" || process.env.VERCEL === "true") {
    return path.join(os.tmpdir(), "vora");
  }
  return path.join(process.cwd(), ".data", "vora");
}

export function ensureVoraDataDir(): string {
  const dir = getVoraDataDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
