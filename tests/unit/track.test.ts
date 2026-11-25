import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { answerQuestion, beliefToProfile, createInitialBelief } from '@/lib/belief-state';
import { questions } from '@/lib/discovery-questions';
import { toElicitationRecord } from '@/lib/elicitation';
import { CENTRE_START, distanceRun, quizStart, replayTrack, TRACK_TOLERANCE, type TrackStart } from '@/lib/track';
import { buildPour, palateAfterPour } from '@/lib/pours.server';
import { derivePalateRecord } from '@/lib/sensory';
import { decodePalate, encodePalate, type PourRecord } from '@/lib/atproto/records';
import { guestShift } from '@/lib/guest-palate';
import { guestPourRecord, toLogOptions, type PourEntry } from '@/lib/pour-entry';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

/**
 * The track is replayed, never stored, so it is only as good as its replay:
 * these hold it to the two paths that actually move a coordinate — the
 * server's for a member, the device's for a guest — step by step.
 */

const entry = (drinkName: string, hedonic: number, deviations: PourEntry['deviations'] = []): PourEntry => ({
  drinkName,
  hedonic,
  isHomePour: true,
  venue: '',
  deviations,
  note: '',
  crosspost: false,
});

const pours: PourEntry[] = [
  entry('Negroni', 8),
  entry('Margarita', 4),
  entry('Penicillin', 9),
  entry('Manhattan', 8),
  entry('Aperol Spritz', 3),
  entry('House Sour', 7, ['too-sweet']),
  entry('Daiquiri', 2),
  entry('Martinez', 9),
];

const quizProfile: UserProfile = {
  x: -1.5,
  y: -0.5,
  dislikesSmoke: false,
  dislikesBitter: false,
  dislikesAnise: true,
  vibeTags: {},
  variance: { x: 6, y: 6 },
};
const quizAt = '2026-11-10T20:00:00.000Z';
const start: TrackStart = {
  x: quizProfile.x,
  y: quizProfile.y,
  variance: quizProfile.variance,
  aversions: { smoke: false, bitter: false, anise: true },
  at: quizAt,
};
const timeOf = (i: number) => new Date(Date.parse(quizAt) + (i + 1) * 86_400_000);

describe('a member: the server path', () => {
  // As the server does it: the quiz's palate written, then each pour read, moved and written back.
  let palate = decodePalate(encodePalate(derivePalateRecord(quizProfile)))!;
  const records: PourRecord[] = [];
  const positions = [{ x: palate.mapCoordinates.x, y: palate.mapCoordinates.y }];
  pours.forEach((e, i) => {
    const built = buildPour(toLogOptions(e), timeOf(i));
    if (!built.ok) throw new Error(built.error);
    palate = decodePalate(encodePalate(palateAfterPour(palate, built.pour, timeOf(i))))!;
    records.push(built.pour.record);
    positions.push({ x: palate.mapCoordinates.x, y: palate.mapCoordinates.y });
  });

  test('the replay passes through every coordinate the pours wrote', () => {
    const track = replayTrack(start, records, palate.mapCoordinates, 'record');
    expect(track).not.toBeNull();
    expect(JSON.stringify(track!.map((p) => [p.x, p.y]))).toBe(JSON.stringify(positions.map((p) => [p.x, p.y])));
  });

  test('the start needs no aversions: the quiz record has none, and the track is the same', () => {
    const withAversions = replayTrack(start, records, palate.mapCoordinates, 'record')!;
    const without = replayTrack({ ...start, aversions: undefined }, records, palate.mapCoordinates, 'record');
    expect(without?.map((p) => [p.x, p.y])).toEqual(withAversions.map((p) => [p.x, p.y]));
  });

  test('a pour in the middle of the scale holds you where you were', () => {
    const track = replayTrack(start, records, palate.mapCoordinates, 'record')!;
    expect(track[2].pour?.drink.name).toBe('Margarita');
    expect(track[2].moved).toBe(0);
    expect(distanceRun(track)).toBeGreaterThan(0);
  });

  test('pours from before the quiz are not on its track', () => {
    const earlier = { ...records[0], createdAt: '2026-11-01T00:00:00.000Z' };
    const track = replayTrack(start, [earlier, ...records], palate.mapCoordinates, 'record');
    expect(track).toHaveLength(pours.length + 1);
  });

  test('a replay that does not arrive where you are is not drawn', () => {
    const elsewhere = { x: palate.mapCoordinates.x + TRACK_TOLERANCE + 0.1, y: palate.mapCoordinates.y };
    expect(replayTrack(start, records, elsewhere, 'record')).toBeNull();
    // A pour missing from the middle (another device's) lands it elsewhere too.
    expect(replayTrack(start, records.filter((_, i) => i !== 0), palate.mapCoordinates, 'record')).toBeNull();
  });

  test('the shoal narrows, if slowly', () => {
    const track = replayTrack(start, records, palate.mapCoordinates, 'record')!;
    expect(track[track.length - 1].spread).toBeLessThan(track[0].spread);
  });
});

describe('a guest: the device path', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    // device-store reads only in a browser.
    (globalThis as { window?: unknown }).window = globalThis;
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    delete (globalThis as { window?: unknown }).window;
  });

  function guestRun(first: UserProfile) {
    let profile = first;
    const records: PourRecord[] = [];
    const positions = [{ x: profile.x, y: profile.y }];
    pours.forEach((e, i) => {
      profile = guestShift(profile, e);
      records.push(guestPourRecord(e, { slug: undefined, at: null, createdAt: timeOf(i).toISOString() }));
      positions.push({ x: profile.x, y: profile.y });
    });
    return { profile, records, positions };
  }

  test('the replay passes through every coordinate the device kept', () => {
    const { profile, records, positions } = guestRun(quizProfile);
    const track = replayTrack(start, records, profile, 'device');
    expect(track).not.toBeNull();
    expect(JSON.stringify(track!.map((p) => [p.x, p.y]))).toBe(JSON.stringify(positions.map((p) => [p.x, p.y])));
  });

  test('a guest who tried a pour first starts at the centre', () => {
    const centre: UserProfile = { x: 0, y: 0, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };
    const { profile, records, positions } = guestRun(centre);
    const track = replayTrack(CENTRE_START, records, profile, 'device');
    expect(JSON.stringify(track!.map((p) => [p.x, p.y]))).toBe(JSON.stringify(positions.map((p) => [p.x, p.y])));
  });
});

test('Quiz start: the logged answers put you where the quiz did', () => {
  let belief = createInitialBelief();
  for (const [i, q] of questions.slice(0, 7).entries()) belief = answerQuestion(belief, q, q.options[i % q.options.length]);
  const record = toElicitationRecord(belief.responses, quizAt)!;
  const profile = beliefToProfile(belief);
  const s = quizStart(record);
  expect({ x: s.x, y: s.y }).toEqual({ x: profile.x, y: profile.y });
  expect(s.variance!.x).toBeCloseTo(profile.variance!.x, 6);
  expect(s.variance!.y).toBeCloseTo(profile.variance!.y, 6);
  expect(s.at).toBe(quizAt);
});
