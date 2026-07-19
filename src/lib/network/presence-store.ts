import "server-only";

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data", "vora");
const DATA_FILE = path.join(DATA_DIR, "presence-data.json");
const ONLINE_THRESHOLD_MS = 60_000;

interface PresenceDataFile {
  lastSeen: Record<string, string>;
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): PresenceDataFile {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial: PresenceDataFile = { lastSeen: {} };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as PresenceDataFile;
  if (!data.lastSeen) data.lastSeen = {};
  return data;
}

function writeData(data: PresenceDataFile) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function touchPresence(accountId: string): void {
  const data = readData();
  data.lastSeen[accountId] = new Date().toISOString();
  writeData(data);
}

export function isAccountOnline(accountId: string): boolean {
  const data = readData();
  const lastSeen = data.lastSeen[accountId];
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() <= ONLINE_THRESHOLD_MS;
}

export function getOnlineStatus(accountIds: string[]): Record<string, boolean> {
  const data = readData();
  const now = Date.now();
  const result: Record<string, boolean> = {};

  for (const id of accountIds) {
    const lastSeen = data.lastSeen[id];
    result[id] = lastSeen
      ? now - new Date(lastSeen).getTime() <= ONLINE_THRESHOLD_MS
      : false;
  }

  return result;
}
