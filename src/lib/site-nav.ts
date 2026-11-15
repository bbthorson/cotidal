import { appBar, nav } from './copy';
import { QUESTIONS_PATH, RATE_PATH } from './atproto/paths';

/**
 * The one list of destinations. The header renders the ones marked `header`;
 * the footer renders the reading pages only (`app: false`), because the app
 * destinations and the account are always one tap away in the header, and
 * seven links wrapped into three ragged rows on a phone.
 *
 * `match` is the path prefix that marks an item current.
 *
 * "For Bars" is the supply side, a different product from the drinker's app:
 * it is read from the footer and the landing page, not offered in the header
 * beside Compass and Log.
 *
 * `footer` marks the reading pages the footer lists.
 *
 * There is no Regions item: a region is a filter on the drinks
 * (`/drinks/regions/<id>`), so Drinks is current there too.
 */
export const destinations = [
  { href: '/compass', label: nav.compass, match: '/compass', app: true, header: true, footer: false },
  { href: '/log', label: nav.log, match: '/log', app: true, header: true, footer: false },
  { href: '/drinks', label: nav.register, match: '/drinks', app: false, header: false, footer: true },
  { href: '/how-it-works', label: nav.howItWorks, match: '/how-it-works', app: false, header: false, footer: true },
  { href: '/bars', label: nav.bars, match: '/bars', app: false, header: false, footer: true },
] as const;

export const signIn = { href: '/#connect', label: nav.signIn } as const;

/**
 * Every page that mounts an island and so carries the one sign-in sheet.
 * Inside the app, "Sign in" opens that sheet rather than sending the reader
 * back to the landing page's form; the island reads `?signin=1`. Everywhere
 * else the static form is the target, so it keeps working without JavaScript.
 */
const sheetPaths = ['/compass', '/log', '/harbour', QUESTIONS_PATH, RATE_PATH];

export const signInHref = (currentPath: string) =>
  sheetPaths.some((p) => currentPath.startsWith(p)) ? `${currentPath}?signin=1` : signIn.href;

/** The bar along the foot of the app on a phone (`AppBar.astro`). */
export const appDestinations = [
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
