/** Client-safe device fingerprint helper (no server-only dependencies). */
export function generateDeviceFingerprint(input: {
  userAgent: string;
  screenRes?: string;
  timezone?: string;
  language?: string;
}): string {
  const raw = [input.userAgent, input.screenRes, input.timezone, input.language].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `fp-${Math.abs(hash).toString(16)}`;
}
