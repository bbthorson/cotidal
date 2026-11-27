import { describe, expect, it } from 'vitest';
import { COORDINATE_COOKIE, coordinateCookie, hasDeviceCoordinate } from '../../src/lib/device-presence';

/** The cookie says only that a coordinate is here: `1` or absent, never the coordinate. */
describe('device presence', () => {
  it('reads the mark among other cookies, and nothing else as it', () => {
    expect(hasDeviceCoordinate(null)).toBe(false);
    expect(hasDeviceCoordinate('')).toBe(false);
    expect(hasDeviceCoordinate(`a=b; ${COORDINATE_COOKIE}=1; bsky_sid=x`)).toBe(true);
    expect(hasDeviceCoordinate(`${COORDINATE_COOKIE}=`)).toBe(false);
    expect(hasDeviceCoordinate(`${COORDINATE_COOKIE}=0`)).toBe(false);
    expect(hasDeviceCoordinate(`x${COORDINATE_COOKIE}=1`)).toBe(false);
  });

  it('writes presence and its removal, site-wide', () => {
    expect(coordinateCookie(true)).toMatch(new RegExp(`^${COORDINATE_COOKIE}=1; Path=/; Max-Age=\\d+; SameSite=Lax$`));
    expect(coordinateCookie(false)).toContain('Max-Age=0');
    expect(hasDeviceCoordinate(coordinateCookie(true).split(';')[0])).toBe(true);
    expect(hasDeviceCoordinate(coordinateCookie(false).split(';')[0])).toBe(false);
  });
});
