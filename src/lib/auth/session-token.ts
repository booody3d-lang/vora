import "server-only";

import { createHash } from "crypto";

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseDeviceLabel(userAgent: string): string {
  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("iPad")) return "iPad";
  if (userAgent.includes("Android")) return "Android Device";
  if (userAgent.includes("Windows")) return "Windows PC";
  if (userAgent.includes("Mac")) return "Mac";
  if (userAgent.includes("Linux")) return "Linux PC";
  return "Unknown Device";
}

export function guessLocationFromIp(ip: string): string {
  if (ip.startsWith("127") || ip === "unknown" || ip === "::1") return "Riyadh, SA";
  return "Saudi Arabia";
}
