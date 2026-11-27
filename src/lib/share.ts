import type { QuadrantId } from './map/coordinates';
// copy.ts, not quadrant.ts: `npm run images` loads this under plain Node,
// which needs the extension and has no `./copy` to resolve.
import { quadrants } from './copy/map.ts';

/**
 * The share cards. Each is a prerendered page (`/share/<card>`) captured to
 * a PNG under `public/share/` by `npm run images`, so no image is drawn
 * at request time and the Worker carries no rasteriser. One for the site,
 * one per region: `/p/<handle>` unfurls into its region's card, as a coaster
 * shows a region and not a dot — a coordinate moves with every pour, and a
 * card cached by a scraper does not.
 */

/** The size scrapers ask for (1.91:1). The page is half this, captured at 2×. */
export const SHARE_SIZE = { width: 1200, height: 630 } as const;

export type ShareCard = 'site' | QuadrantId;

export const SHARE_CARDS: readonly ShareCard[] = ['site', ...quadrants.map((q) => q.id)];

export const sharePagePath = (card: ShareCard) => `/share/${card}`;
export const shareImagePath = (card: ShareCard) => `/share/${card}.png`;

export const SHARE_IMAGES = { site: shareImagePath('site') } as const;
