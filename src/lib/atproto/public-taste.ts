import { ElicitationRecordSchema } from './elicitation-record';
import { readPour } from './records';
import { ELICITATION_COLLECTION, POUR_COLLECTION } from './vocab';
import type { PublicRepoResult } from './public-read';
import { quizStart } from '../palate/track';
import type { TerrainPour, TerrainStart } from '../palate/terrain';

/**
 * Someone's taste, as the map draws it, from what they said: their latest
 * questions (`app.cotidal.elicitation`) and every pour they rated
 * (`app.cotidal.pour`), read from their public repository with no session.
 *
 * The terrain is computed from these (`buildTerrain`) and never stored as a
 * record of its own (docs/map-first.md, The map's address): a record holds
 * what its author said, and the reading of it improves when the model does.
 *
 * Reading every pour is many requests, so what is read is cached by the
 * repository's latest revision (`latestRev`): a page view after nothing has
 * changed reads one small record, not the whole log. Pages are read newest
 * first and stop at `MAX_POURS`, so a long log draws its latest pours.
 */

/** The most pours read for one map: newest first, a few pages. */
export const MAX_POURS = 500;
const PAGE = 100;

export interface PublicTaste {
  /** Where their latest questions put them, and how sure they were; `null` with no quiz on record. */
  start: TerrainStart | null;
  /** Their rated pours, as the terrain needs them. */
  pours: TerrainPour[];
}

/** Where a taste is kept between page views: the Workers cache in production, nothing elsewhere. */
export interface TasteCache {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

/** The Workers cache, when there is one (`caches.default`); otherwise none. */
export function defaultTasteCache(): TasteCache | null {
  const store = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  if (!store) return null;
  const url = (key: string) => `https://taste.cotidal.internal/${encodeURIComponent(key)}`;
  return {
    async get(key) {
      const hit = await store.match(url(key));
      return hit ? hit.text() : null;
    },
    async put(key, value) {
      // Keyed by revision, so an entry is never wrong, only unused once the repository changes.
      await store.put(url(key), new Response(value, { headers: { 'Cache-Control': 'public, max-age=604800' } }));
    },
  };
}

type OkRepo = Extract<PublicRepoResult, { status: 'ok' }>;

/**
 * Their taste, or `null` when it cannot be read (an unreachable PDS). Never
 * throws: a map with no taste still draws their point.
 */
export async function readPublicTaste(
  repo: OkRepo,
  options: { aversions?: { smoke: boolean; bitter: boolean; anise: boolean }; cache?: TasteCache | null } = {}
): Promise<PublicTaste | null> {
  const cache = options.cache === undefined ? defaultTasteCache() : options.cache;
  try {
    const rev = cache ? await repo.latestRev() : null;
    const key = rev ? `${repo.actor.did}@${rev}` : null;
    if (cache && key) {
      const hit = await cache.get(key);
      if (hit) return JSON.parse(hit) as PublicTaste;
    }

    const [quizPage, pours] = await Promise.all([repo.listRecords(ELICITATION_COLLECTION, { limit: 1 }), readPours(repo)]);
    const quiz = quizPage.values[0] ? ElicitationRecordSchema.safeParse(quizPage.values[0]) : null;
    const taste: PublicTaste = {
      start: quiz?.success ? quizStart(quiz.data, options.aversions) : null,
      pours,
    };

    if (cache && key) await cache.put(key, JSON.stringify(taste)).catch(() => {});
    return taste;
  } catch (e) {
    console.error('readPublicTaste:', e);
    return null;
  }
}

async function readPours(repo: OkRepo): Promise<TerrainPour[]> {
  const out: TerrainPour[] = [];
  let cursor: string | undefined;
  while (out.length < MAX_POURS) {
    const page = await repo.listRecords(POUR_COLLECTION, { limit: PAGE, cursor });
    for (const value of page.values) {
      const pour = readPour(value);
      if (!pour) continue;
      out.push({ drink: { name: pour.drink.name, ...(pour.drink.slug ? { slug: pour.drink.slug } : {}) }, rating: { hedonic: pour.rating.hedonic } });
      if (out.length >= MAX_POURS) break;
    }
    if (!page.cursor || page.values.length === 0) break;
    cursor = page.cursor;
  }
  return out;
}
