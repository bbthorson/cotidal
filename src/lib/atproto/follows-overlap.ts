import { readPublicPalate, type PublicPalateResult, type ReadOptions } from './public-read';
import { publicMapPath } from './paths';
import { compareTerrains, type TerrainSide } from '../overlap';
import { leanings } from '../terrain';
import { terrainOf } from '../taste-reading';
import { taste as tasteCopy } from '../copy';

/**
 * Social overlap via the user's existing Bluesky follow graph — never a second
 * social graph built inside Cotidal.
 *
 * Reads public `app.bsky.graph.getFollows`, checks each followed account for a
 * published `app.cotidal.palate`, and surfaces ONLY the intersection, leading
 * with contrast drinks. Each is read with their taste (`public-taste.ts`)
 * and compared as ground (`compareTerrains`), as their map compares them.
 */

const PUBLIC_BSKY_API = 'https://public.api.bsky.app';
const TIMEOUT_MS = 4000;
const MAX_FOLLOWS = 30;
const CONCURRENCY = 6;

export interface FollowedOverlap {
  did: string;
  handle: string;
  displayName: string | null;
  /** Their taste in the axes' words (`leanings`): "crisp and sweet · rich and savory". */
  leans: string;
  /** How many of their top ten drinks are in yours (`compareTerrains`). */
  inCommon: number;
  theirs: string | null;
  yours: string | null;
  shared: string | null;
  path: string;
}

interface BskyFollow {
  did?: string;
  handle?: string;
  displayName?: string;
}

async function fetchFollows(did: string, fetchImpl: typeof fetch): Promise<BskyFollow[]> {
  const url = new URL('/xrpc/app.bsky.graph.getFollows', PUBLIC_BSKY_API);
  url.searchParams.set('actor', did);
  url.searchParams.set('limit', String(MAX_FOLLOWS));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url.toString(), { signal: controller.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { follows?: BskyFollow[] };
    return Array.isArray(data.follows) ? data.follows.slice(0, MAX_FOLLOWS) : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export interface FollowsOverlapOptions extends ReadOptions {
  readPalate?: (actor: string) => Promise<PublicPalateResult>;
  /**
   * Stop starting new lookups once this many milliseconds have passed, and
   * answer with the follows read so far. A page that renders the list on the
   * server sets it, so a slow follow graph cannot hold the page back.
   */
  budgetMs?: number;
  /** The clock, for tests. */
  now?: () => number;
}

/**
 * Return the intersection of `did`'s Bluesky follows who have published a
 * Cotidal palate, compared against `viewer`'s taste, most in common first.
 * Never throws.
 */
export async function readFollowedPalates(
  did: string,
  viewer: TerrainSide,
  options: FollowsOverlapOptions = {}
): Promise<FollowedOverlap[]> {
  const fetchImpl = options.fetch ?? fetch;
  const readPalate = options.readPalate ?? ((actor: string) => readPublicPalate(actor, { ...options, taste: true }));

  const now = options.now ?? Date.now;
  const deadline = options.budgetMs === undefined ? Infinity : now() + options.budgetMs;

  const follows = await fetchFollows(did, fetchImpl);
  if (follows.length === 0) return [];

  const out: FollowedOverlap[] = [];
  for (let i = 0; i < follows.length && now() < deadline; i += CONCURRENCY) {
    const batch = follows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (f) => {
        const actor = f.handle || f.did;
        if (!actor || f.did === did) return null;
        const res = await readPalate(actor).catch(() => ({ status: 'unavailable' as const, actor: null }));
        if (res.status !== 'ok') return null;
        const terrain = terrainOf(res.taste?.start ?? null, res.palate, res.taste?.pours ?? []);
        const overlap = compareTerrains({ terrain, aversions: res.palate.aversions }, viewer);
        const handle = res.actor.handle ?? f.handle ?? res.actor.did;
        return {
          did: res.actor.did,
          handle,
          displayName: f.displayName?.trim() || null,
          leans: tasteCopy.phrases(leanings(terrain, 2)),
          inCommon: overlap.inCommon,
          theirs: overlap.firstOnly?.name ?? null,
          yours: overlap.secondOnly?.name ?? null,
          shared: overlap.shared?.name ?? null,
          path: publicMapPath(handle),
        } satisfies FollowedOverlap;
      })
    );
    for (const item of results) if (item) out.push(item);
  }

  return out.sort((a, b) => b.inCommon - a.inCommon || a.handle.localeCompare(b.handle));
}
