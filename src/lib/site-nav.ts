import { appBar, nav } from './copy';
import { QUESTIONS_PATH, RATE_PATH } from './atproto/paths';

/**
 * The one list of destinations. The header renders the ones marked `header`;
 * the footer renders the reading pages only (`app: false`), because the app
 * destinations and the account are always one tap away in the header, and
 * seven links wrapped into three ragged rows on a phone.
 *
 * `match` is the path prefix that marks an item current. "The Four Regions"
 * links to the landing section but is current on any `/regions/*` page.
 *
 * "For Bars" is the supply side, a different product from the drinker's app:
 * it is read from the footer and the landing page, not offered in the header
 * beside Radio, Compass and Log.
 */
export const destinations = [
  { href: '/radio', label: nav.radio, match: '/radio', app: true, header: true },
  { href: '/compass', label: nav.compass, match: '/compass', app: true, header: true },
  { href: '/log', label: nav.log, match: '/log', app: true, header: true },
  { href: '/drinks', label: nav.register, match: '/drinks', app: false, header: true },
  { href: '/#regions', label: nav.regions, match: '/regions', app: false, header: true },
  { href: '/bars', label: nav.bars, match: '/bars', app: false, header: false },
] as const;

export const signIn = { href: '/#connect', label: nav.signIn } as const;

/**
 * Every page that mounts an island and so carries the one sign-in sheet.
 * Inside the app, "Sign in" opens that sheet rather than sending the reader
 * back to the landing page's form; the island reads `?signin=1`. Everywhere
 * else the static form is the target, so it keeps working without JavaScript.
 */
const sheetPaths = ['/radio', '/compass', '/log', '/harbour', QUESTIONS_PATH, RATE_PATH];

export const signInHref = (currentPath: string) =>
  sheetPaths.some((p) => currentPath.startsWith(p)) ? `${currentPath}?signin=1` : signIn.href;

/** The bar along the foot of the app on a phone (`AppBar.astro`). */
export const appDestinations = [
  { href: '/radio', label: appBar.radio, match: '/radio' },
  { href: '/compass', label: appBar.compass, match: '/compass' },
  { href: '/log', label: appBar.log, match: '/log' },
] as const;

/** Where "Pick a drink" goes: the harbour, composed in steps. */
export const pickHref = '/harbour';

/** The questions that place a coordinate (`startOverPath` clears the old one first). */
export const questionsHref = QUESTIONS_PATH;

/** The harbour, already at a bar (a bar on Compass), and where it is when the map knows. */
export function harbourAt(bar: string, at?: { lat: number; lon: number }): string {
  const params = new URLSearchParams({ bar });
  if (at) {
    params.set('lat', String(at.lat));
    params.set('lon', String(at.lon));
  }
  return `${pickHref}?${params.toString()}`;
}

/** /rate with its form opened on a drink ("Log this" on the map). */
export const logPathFor = (drinkName: string) => `${RATE_PATH}?drink=${encodeURIComponent(drinkName)}`;

/** Where a member manages their account, and where a page that cannot know sends everyone. */
export const accountHref = '/log#account';

export const isCurrent = (currentPath: string, match: string) => currentPath.startsWith(match);
