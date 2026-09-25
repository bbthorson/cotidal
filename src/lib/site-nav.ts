import { nav } from './copy';

/**
 * The one list of destinations. The header and footer both render from it, so
 * a page cannot appear in one and be missing from the other.
 *
 * `match` is the path prefix that marks an item current. "The Four Regions"
 * links to the landing section but is current on any `/regions/*` page.
 */
export const destinations = [
  { href: '/taste', label: nav.map, match: '/taste' },
  { href: '/log', label: nav.log, match: '/log' },
  { href: '/drinks', label: nav.register, match: '/drinks' },
  { href: '/#regions', label: nav.regions, match: '/regions' },
  { href: '/bars', label: nav.bars, match: '/bars' },
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

export const isCurrent = (currentPath: string, match: string) => currentPath.startsWith(match);
