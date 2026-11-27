import { account as accountCopy, nav } from './copy';
import { QUIZ_PARAM } from './atproto/paths';
import { viewHref } from './map/map-url';

/**
 * The one list of destinations. The app bar renders the ones marked `header`
 * and `menu`; the footer renders the reading pages only (`app: false`),
 * because the app destinations and the account are always one tap away in
 * the app bar, and seven links wrapped into three ragged rows on a phone.
 *
 * `match` is the path prefix that marks an item current.
 *
 * The app is one screen, the map. "For Bars" is the supply side, a
 * different product from the drinker's app: it is read from the footer and
 * the landing page, not offered in the header.
 *
 * `footer` marks the reading pages the footer lists; `menu` the ones the
 * app bar lists beside the map (folded under Menu on a phone, as tabs from
 * `lg`), since the app screens have no footer.
 *
 * There is no Drinks or Regions item: every drink is on the map, and opens
 * in its card with its whole entry; a region is a filter on the map
 * (`/map?region=<id>`). A drink's own page (`drinkPagePath`) is for search
 * and for a link sent to someone, not for browsing.
 */
export const mapHref = '/map';
export const barsHref = '/bars';
/** A drink on your map: the map's address (`map-url.ts`). */
export const drinkMapHref = (slug: string) => viewHref(mapHref, { drink: slug });
/** A drink's own page: its entry, prerendered and script-free, for search and for a link sent to someone. */
export const drinkPagePath = (slug: string) => `/drinks/${slug}`;

export const destinations = [
  { href: mapHref, label: nav.map, match: mapHref, app: true, header: true, menu: false, footer: false, memberOnly: false },
  // How it works is the front door's card, pulled up: an anchor there, never a page of its own, and never "current".
  { href: '/#how-it-works', label: nav.howItWorks, match: '#how-it-works', app: false, header: false, menu: true, footer: true, memberOnly: false },
  { href: barsHref, label: nav.bars, match: barsHref, app: false, header: false, menu: false, footer: true, memberOnly: false },
] as const;

export const isVisibleDestination = (
  destination: (typeof destinations)[number],
  accountKind: 'member' | 'guest' | 'unknown'
) => !destination.memberOnly || accountKind === 'member';

export const signIn = { href: '/sign-in', label: nav.signIn } as const;

/**
 * Every page that mounts an island and so carries the one sign-in sheet.
 * Inside the app, "Sign in" opens that sheet rather than sending the reader
 * back to the landing page's form; the island reads `?signin=1`. Everywhere
 * else the static form is the target, so it keeps working without JavaScript.
 */
const sheetPaths = [mapHref];

export const signInHref = (currentPath: string) =>
  sheetPaths.some((p) => currentPath.startsWith(p)) ? `${currentPath}?signin=1` : signIn.href;

/** The questions that place a coordinate: a state of the map's card (`startOverPath` clears the old one first). */
export const questionsHref = `${mapHref}?${QUIZ_PARAM}=1`;
/** The questions, from a drink: they finish (or, with a coordinate already, go straight) on that drink on the map. */
export const questionsForDrink = (slug: string) => `${viewHref(mapHref, { drink: slug })}&${QUIZ_PARAM}=1`;

/** Where a member manages their account, and where a page that cannot know sends everyone. */
export const accountHref = '/settings';

export const isCurrent = (currentPath: string, match: string) => currentPath.startsWith(match);

/**
 * The account control says what the server knows (`accountFor`). A member
 * sees their handle, which opens Settings, where signing out is, so no bar
 * repeats it. A guest sees Sign in. A prerendered page was built before
 * anyone visited, so it cannot know, and says Account rather than guess.
 * The app bar (`AppBar`) draws it, at the top of every page's card.
 */
export function accountControl(
  account: { kind: 'member'; handle: string | null } | { kind: 'guest' } | { kind: 'unknown' },
  currentPath: string
): { href: string; label: string; isHandle: boolean; opensSettings: boolean; current: boolean } {
  const current = isCurrent(currentPath, accountHref);
  if (account.kind === 'member')
    return {
      href: accountHref,
      label: account.handle ? `@${account.handle}` : accountCopy.neutral,
      isHandle: !!account.handle,
      opensSettings: true,
      current,
    };
  if (account.kind === 'guest') return { href: signInHref(currentPath), label: signIn.label, isHandle: false, opensSettings: false, current };
  return { href: accountHref, label: accountCopy.neutral, isHandle: false, opensSettings: false, current };
}
