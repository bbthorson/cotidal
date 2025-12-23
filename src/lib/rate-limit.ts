import { headers } from 'next/headers';
import { isRateLimited, defaultRateLimitConfig, type RateLimitConfig } from './rate-limit-logic';

export { isRateLimited };

export async function checkRateLimit(config: RateLimitConfig = defaultRateLimitConfig): Promise<boolean> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    return !isRateLimited(ip, config);
  } catch (error) {
    console.warn('Rate limit check failed (headers unavailable?)', error);
    // Fail open to avoid breaking functionality if headers context is missing
    return true;
  }
}
