import { nav } from './copy';

/**
 * The one list of destinations. The header renders all of it; the footer
 * renders the reading pages only (`app: false`), because the two app
 * destinations and the account are always one tap away in the header, and
 * seven links wrapped into three ragged rows on a phone.
 *
 * `match` is the path prefix that marks an item current. "The Four Regions"
 * links to the landing section but is current on any `/regions/*` page.
 */
export const destinations = [
  { href: '/taste', label: nav.map, match: '/taste', app: true },
  { href: '/log', label: nav.log, match: '/log', app: true },
  { href: '/drinks', label: nav.register, match: '/drinks', app: false },
  { href: '/#regions', label: nav.regions, match: '/regions', app: false },
  { href: '/bars', label: nav.bars, match: '/bars', app: false },
] as const;

export const signIn = { href: '/#connect', label: nav.signIn } as const;

/**
 * Inside the app, "Sign in" opens the one sign-in sheet rather than sending
 * the reader back to the landing page's form. The island reads the query
 * parameter; everywhere else the static form is the target, so it keeps
 * working without JavaScript.
 */
export const signInHref = (currentPath: string) =>
  currentPath.startsWith('/taste') ? '/taste?signin=1' : signIn.href;

/** /log with its form opened on a drink ("Log this" on the map). */
export const logPathFor = (drinkName: string) => `/log?drink=${encodeURIComponent(drinkName)}`;

/** Where a member manages their account, and where a page that cannot know sends everyone. */
export const accountHref = '/account';

export const isCurrent = (currentPath: string, match: string) => currentPath.startsWith(match);
