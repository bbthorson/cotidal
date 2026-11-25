import { account as accountCopy, nav } from './copy';
import { QUESTIONS_PATH } from './atproto/paths';

/**
 * The one list of destinations. The header renders the ones marked `header`;
 * the footer renders the reading pages only (`app: false`), because the app
 * destinations and the account are always one tap away in the header, and
 * seven links wrapped into three ragged rows on a phone.
 *
 * `match` is the path prefix that marks an item current.
 *
 * The app is one screen, the map. "For Bars" is the supply side, a
 * different product from the drinker's app: it is read from the footer and
 * the landing page, not offered in the header.
 *
 * `footer` marks the reading pages the footer lists; `menu` the ones a
 * phone's folded Menu lists under the map, and the header lists beside the
 * map's search from `lg` (the map has no footer, so these are how they are
 * reached from it).
 *
 * There is no Regions item: a region is a filter on the drinks
 * (`/drinks/regions/<id>`), so Drinks is current there too.
 */
export const mapHref = '/map';
export const drinksHref = '/drinks';
export const barsHref = '/bars';
export const drinkMapHref = (slug: string) => `${mapHref}?drink=${encodeURIComponent(slug)}`;

export const destinations = [
  { href: mapHref, label: nav.map, match: mapHref, app: true, header: true, menu: false, footer: false, memberOnly: false },
  { href: drinksHref, label: nav.register, match: drinksHref, app: false, header: false, menu: true, footer: true, memberOnly: true },
  { href: '/how-it-works', label: nav.howItWorks, match: '/how-it-works', app: false, header: false, menu: true, footer: true, memberOnly: false },
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
const sheetPaths = [mapHref, QUESTIONS_PATH];

export const signInHref = (currentPath: string) =>
  sheetPaths.some((p) => currentPath.startsWith(p)) ? `${currentPath}?signin=1` : signIn.href;

/** The questions that place a coordinate (`startOverPath` clears the old one first). */
export const questionsHref = QUESTIONS_PATH;
/** The questions, from a drink: they finish (or, with a coordinate already, go straight) on that drink on the map. */
export const DRINK_PARAM = 'drink';
export const questionsForDrink = (slug: string) => `${QUESTIONS_PATH}?${DRINK_PARAM}=${encodeURIComponent(slug)}`;

/** Where a member manages their account, and where a page that cannot know sends everyone. */
export const accountHref = '/settings';

export const isCurrent = (currentPath: string, match: string) => currentPath.startsWith(match);

/**
 * The account control says what the server knows (`accountFor`). A member
 * sees their handle, which opens Settings, where signing out is, so no bar
 * repeats it. A guest sees Sign in. A prerendered page was built before
 * anyone visited, so it cannot know, and says Account rather than guess.
 * Both bars draw it from here: `SiteHeader` on a reading page, `AppBar` in a
 * map page's card.
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
