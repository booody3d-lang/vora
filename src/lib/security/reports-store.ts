import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import type { ContentReport } from "@/types/security";

const REPORTS_FILE = "content-reports.json";

function readReports(): ContentReport[] {
  return readJsonStore<ContentReport[]>(REPORTS_FILE, () => []);
}

function writeReports(reports: ContentReport[]) {
  writeJsonStore(REPORTS_FILE, reports);
}

export function addReport(report: ContentReport) {
  const reports = readReports();
  reports.unshift(report);
  writeReports(reports);
}

export function getReports(): ContentReport[] {
  return readReports();
}
