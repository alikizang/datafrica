/**
 * Device fingerprinting utility for anti-abuse protection.
 * Uses FingerprintJS to generate a stable browser fingerprint hash
 * that persists across sessions (same browser + device).
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cachedVisitorId: string | null = null;

/**
 * Get the device fingerprint hash. Caches the result for the session.
 */
export async function getFingerprint(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId;

  const fp = await FingerprintJS.load();
  const result = await fp.get();
  cachedVisitorId = result.visitorId;
  return cachedVisitorId;
}
