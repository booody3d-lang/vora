import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";

const DATA_FILE = "presence-data.json";
const ONLINE_THRESHOLD_MS = 60_000;

interface PresenceDataFile {
  lastSeen: Record<string, string>;
}

function readData(): PresenceDataFile {
  const data = readJsonStore(DATA_FILE, () => ({ lastSeen: {} }));
  if (!data.lastSeen) data.lastSeen = {};
  return data;
}

function writeData(data: PresenceDataFile) {
  writeJsonStore(DATA_FILE, data);
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
