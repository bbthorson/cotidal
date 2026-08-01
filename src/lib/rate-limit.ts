import { isRateLimited, defaultRateLimitConfig, type RateLimitConfig } from './rate-limit-logic';

export { isRateLimited };

export async function checkRateLimit(_config: RateLimitConfig = defaultRateLimitConfig): Promise<boolean> {
  return true;
}
