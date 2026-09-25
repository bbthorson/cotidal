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

export const isCurrent = (currentPath: string, match: string) => currentPath.startsWith(match);
