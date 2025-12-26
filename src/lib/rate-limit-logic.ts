export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 10,
};

// Security: Prevent unbounded memory growth (DoS)
const MAX_LIMIT = 50000;
const CLEANUP_WINDOW_MS = 60 * 1000; // 1 minute

const ipRateLimits = new Map<string, { count: number; resetTime: number }>();
let lastCleanupTime = Date.now();

export function _getMapSize() {
  return ipRateLimits.size;
}

function pruneExpiredEntries() {
  const now = Date.now();
  // Only prune if enough time has passed to avoid iterating too often (CPU DoS prevention)
  if (now - lastCleanupTime < CLEANUP_WINDOW_MS) {
    return;
  }

  lastCleanupTime = now;

  for (const [ip, record] of ipRateLimits.entries()) {
    if (now > record.resetTime) {
      ipRateLimits.delete(ip);
    }
  }
}

export function isRateLimited(ip: string, config = defaultRateLimitConfig): boolean {
  // Opportunistic cleanup based on time
  pruneExpiredEntries();

  // If map is full, immediately evict the oldest entry to make space (O(1))
  // We do NOT scan the whole map here to avoid CPU exhaustion under load.
  if (ipRateLimits.size >= MAX_LIMIT) {
     const firstKey = ipRateLimits.keys().next().value;
     if (firstKey !== undefined) {
       ipRateLimits.delete(firstKey);
     }
  }

  const now = Date.now();
  const record = ipRateLimits.get(ip);

  if (!record || now > record.resetTime) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + config.windowMs });
    return false;
  }

  if (record.count >= config.max) {
    return true;
  }

  record.count += 1;
  return false;
}
