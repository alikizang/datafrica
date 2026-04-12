/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding window approach with TTL-based cleanup.
 * Suitable for single-instance deployments (Firebase App Hosting).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param key - Unique identifier for the rate limit bucket (e.g., IP address, user ID, or route+IP combo)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed, remaining requests, and reset time
 *
 * @example
 * ```ts
 * const ip = request.headers.get("x-forwarded-for") || "unknown";
 * const { allowed, remaining } = checkRateLimit(`api-route:${ip}`, { maxRequests: 30, windowSeconds: 60 });
 * if (!allowed) {
 *   return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = store.get(key);

  // No existing entry or window expired -> start fresh
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  // Within window
  entry.count += 1;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Get rate limit headers to include in the response.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
