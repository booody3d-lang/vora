import "server-only";

import fs from "fs";
import path from "path";
import { ensureVoraDataDir } from "@/lib/storage/data-dir";

const memoryStores = new Map<string, unknown>();

function filePath(fileName: string): string {
  return path.join(ensureVoraDataDir(), fileName);
}

/** Read JSON persistence with /tmp on Vercel and in-memory fallback when disk writes fail. */
export function readJsonStore<T>(fileName: string, initial: () => T): T {
  const cached = memoryStores.get(fileName);
  if (cached) {
    return cached as T;
  }

  const target = filePath(fileName);

  try {
    if (fs.existsSync(target)) {
      const parsed = JSON.parse(fs.readFileSync(target, "utf-8")) as T;
      memoryStores.set(fileName, parsed);
      return parsed;
    }
  } catch (error) {
    console.error(`[json-store] read failed for ${fileName}:`, error);
  }

  const seed = initial();
  memoryStores.set(fileName, seed);
  writeJsonStore(fileName, seed);
  return seed;
}

export function writeJsonStore<T>(fileName: string, data: T): void {
  memoryStores.set(fileName, data);

  try {
    fs.writeFileSync(filePath(fileName), JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`[json-store] write failed for ${fileName}:`, error);
  }
}

export function jsonStorePath(fileName: string): string {
  return filePath(fileName);
}
