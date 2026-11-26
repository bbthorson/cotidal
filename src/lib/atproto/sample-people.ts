import { ELICITATION_COLLECTION, PALATE_COLLECTION, POUR_COLLECTION } from './vocab';

/**
 * Made-up people, so someone's map can be seen and tested with no network:
 * their records as their repository would hold them, read through the same
 * parsers and the same taste reader as anyone's (`resolvePublicRepo`).
 *
 * Their handles are on `.test`, a top-level domain the handle spec keeps for
 * testing, which can never belong to a real person — so a sample can never
 * stand in for anyone. Their pages say they are made up and are kept out of
 * search.
 *
 *   /map?palate=deep.test                    one hill, in the Deep
 *   /map?palate=both.test                    two liked parts of the map
 *   /map?palate=deep.test&with=surf.test     two who part ways
 *   /map?palate=surf.test&drink=negroni      a drink they avoid
 *   /p/quiet.test                            someone with no palate
 */

interface SamplePerson {
  did: string;
  point: { x: number; y: number };
  aversions: { smoke: boolean; bitter: boolean; anise: boolean };
  /** Newest first, as a repository lists them. */
  pours: { drink: string; slug: string; rating: number }[];
}

const none = { smoke: false, bitter: false, anise: false };

export const SAMPLE_PEOPLE: Record<string, SamplePerson | { did: string; point: null }> = {
  'deep.test': {
    did: 'did:plc:sampledeepaaaaaaaaaaaaaa',
    point: { x: -5, y: -5 },
    aversions: none,
    pours: [
      { drink: 'Manhattan', slug: 'manhattan', rating: 9 },
      { drink: 'Old Fashioned', slug: 'old-fashioned', rating: 9 },
      { drink: 'Negroni', slug: 'negroni', rating: 8 },
      { drink: 'Daiquiri (Classic)', slug: 'daiquiri', rating: 3 },
      { drink: 'Aperol Spritz', slug: 'aperol-spritz', rating: 2 },
    ],
  },
  'surf.test': {
    did: 'did:plc:samplesurfaaaaaaaaaaaaaa',
    point: { x: 6, y: 4 },
    aversions: { ...none, bitter: true },
    pours: [
      { drink: 'Daiquiri (Classic)', slug: 'daiquiri', rating: 9 },
      { drink: 'Paloma', slug: 'paloma', rating: 8 },
      { drink: 'Mojito', slug: 'mojito', rating: 8 },
      { drink: 'Manhattan', slug: 'manhattan', rating: 3 },
    ],
  },
  'both.test': {
    did: 'did:plc:samplebothaaaaaaaaaaaaaa',
    point: { x: 0, y: 0 },
    aversions: none,
    pours: [
      { drink: 'Manhattan', slug: 'manhattan', rating: 9 },
      { drink: 'Old Fashioned', slug: 'old-fashioned', rating: 9 },
      { drink: 'Daiquiri (Classic)', slug: 'daiquiri', rating: 9 },
      { drink: 'Mojito', slug: 'mojito', rating: 9 },
    ],
  },
  'quiet.test': { did: 'did:plc:samplequietaaaaaaaaaaaaa', point: null },
};

/** Every sample person's revision: their records never change. */
const REV = '2222222222222';
const AT = '2026-11-01T20:00:00.000Z';

/** The sample person a handle or DID names, with their handle, or `null`. */
export function samplePerson(actor: string): { handle: string; person: (typeof SAMPLE_PEOPLE)[string] } | null {
  const key = actor.trim().replace(/^@/, '').toLowerCase();
  for (const [handle, person] of Object.entries(SAMPLE_PEOPLE)) {
    if (key === handle || key === person.did) return { handle, person };
  }
  return null;
}

/** Their records, as a repository would answer `getRecord`, `listRecords` and `getLatestCommit`. */
export function sampleRepository(person: (typeof SAMPLE_PEOPLE)[string]) {
  const palate =
    person.point === null
      ? null
      : {
          $type: PALATE_COLLECTION,
          mapCoordinates: { xHundredths: person.point.x * 100, yHundredths: person.point.y * 100 },
          aversions: (person as SamplePerson).aversions,
          dynamicState: { eventCount: (person as SamplePerson).pours.length },
          createdAt: AT,
        };
  const pours =
    person.point === null
      ? []
      : (person as SamplePerson).pours.map((p, i) => ({
          $type: POUR_COLLECTION,
          drink: { name: p.drink, slug: p.slug },
          rating: { hedonic: p.rating },
          createdAt: new Date(Date.parse(AT) - i * 86_400_000).toISOString(),
        }));
  return {
    async getRecord(collection: string): Promise<{ status: number; value: unknown | null }> {
      return collection === PALATE_COLLECTION && palate ? { status: 200, value: palate } : { status: 404, value: null };
    },
    async listRecords(collection: string, page: { limit?: number; cursor?: string } = {}): Promise<{ values: unknown[]; cursor: string | null }> {
      // No quiz on record: their ground starts from their point, as a palate with no quiz does.
      const all = collection === POUR_COLLECTION ? pours : collection === ELICITATION_COLLECTION ? [] : [];
      const from = Number(page.cursor ?? 0);
      const values = all.slice(from, from + (page.limit ?? 100));
      const next = from + values.length;
      return { values, cursor: next < all.length ? String(next) : null };
    },
    async latestRev(): Promise<string | null> {
      return REV;
    },
  };
}
