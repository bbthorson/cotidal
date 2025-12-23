export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 10,
};

const ipRateLimits = new Map<string, { count: number; resetTime: number }>();

export function isRateLimited(ip: string, config = defaultRateLimitConfig): boolean {
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
