/**
 * Client-safe auth flags. Demo bypass is permanently disabled platform-wide.
 */
export const DEMO_AUTH_ENABLED = false;

export function isDemoAuthEnabled(): boolean {
  return DEMO_AUTH_ENABLED;
}
