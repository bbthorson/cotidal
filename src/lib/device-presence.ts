/**
 * Whether this device holds a coordinate, said to the server in one cookie.
 *
 * A guest's palate lives only in the browser (`device-store.ts`), so without
 * this the server could not tell a returning guest from a stranger, and `/`
 * would have to ship a script to find out. The cookie carries presence only,
 * never the coordinate: its value is `1` or it is absent. It is written and
 * cleared beside the profile, by `device-store.ts` alone; the server reads it
 * (`hasDeviceCoordinate`) to choose between the front door and the app.
 */
export const COORDINATE_COOKIE = 'cotidal_coordinate';

/** A year: as long as a guest's coordinate is likely to sit on the device. */
const MAX_AGE = 60 * 60 * 24 * 365;

/** The `document.cookie` assignment that marks (or unmarks) this device. */
export const coordinateCookie = (present: boolean): string =>
  present
    ? `${COORDINATE_COOKIE}=1; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
    : `${COORDINATE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;

/** Whether a request's `Cookie` header says this device holds a coordinate. */
export function hasDeviceCoordinate(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((part) => {
    const [name, ...rest] = part.trim().split('=');
    return name === COORDINATE_COOKIE && rest.join('=') === '1';
  });
}
