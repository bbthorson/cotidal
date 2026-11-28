/**
 * The app as a stranger reaches it with nothing on the map: a bare `/` is
 * the front door for them (src/pages/index.astro), and any question of the
 * map, an empty search among them, is the app. A test that seeds a
 * coordinate on the device opens this, since the seed skips the presence
 * cookie `saveProfile` would write (tests/front-door.spec.ts covers that).
 */
export const appPath = '/?q=';
