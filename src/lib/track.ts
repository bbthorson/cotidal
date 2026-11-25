import { applyPour, createInitialPalateState, fromDynamicRecord, projectTo2D, toDynamicRecord, type PalateState } from './palate-state';
import { axesFromResponses } from './belief-state';
import { drinkOf } from './drink-match';
import type { PourRecord } from './atproto/records';
import type { ElicitationRecord } from './atproto/elicitation-record';

/**
 * Your track: where your coordinate has been, from where the questions put
 * you through each pour since. Nothing stores it. It is replayed from the
 * records that made it — the quiz's answers and the pours — through the same
 * `applyPour` that moved the coordinate, so it cannot drift from them.
 *
 * A replay that does not arrive where you are is not drawn: pours logged
 * before a retake, a guest's pours left on another device, a model changed
 * since. `replayTrack` answers `null` then, and the chart shows only where
 * you are now.
 */

/** Where a track starts: a coordinate, how sure of it, and when (pours before then are not on it). */
export interface TrackStart {
  x: number;
  y: number;
  variance?: { x: number; y: number };
  aversions?: { smoke: boolean; bitter: boolean; anise: boolean };
  /** ISO time; `null` for a start with no quiz, which every pour follows. */
  at: string | null;
}

export interface TrackPoint {
  x: number;
  y: number;
  /** How far you probably are from this point, in map units: the shoal's radius. */
  spread: number;
  /** The pour that moved you here; `null` for the start. */
  pour: PourRecord | null;
  /** How far that pour moved you, to a tenth; 0 when it held you where you were. */
  moved: number;
}

/** How a pour's new state is kept until the next: the member's record and the guest's device each round it their own way. */
export type Keeping = 'record' | 'device';

/** How close the replay must land to where you are for its track to be drawn. */
export const TRACK_TOLERANCE = 0.25;

/** No quiz: a guest who tried a pour first starts at the centre. */
export const CENTRE_START: TrackStart = { x: 0, y: 0, at: null };

/** Where a quiz's logged answers put you: its answers refitted, rounded as the quiz rounds its result. */
export function quizStart(record: ElicitationRecord, aversions?: TrackStart['aversions']): TrackStart {
  const axes = axesFromResponses(
    record.answers.map((a) => ({
      kind: a.kind,
      chosen: a.chosen,
      options: a.options.map((o) => ({ dx: o.dxTenths / 10, dy: o.dyTenths / 10 })),
    }))
  );
  const tenth = (v: number) => Math.max(-10, Math.min(10, Math.round(v * 10) / 10));
  return {
    x: tenth(axes.x.mean),
    y: tenth(axes.y.mean),
    variance: { x: axes.x.variance, y: axes.y.variance },
    aversions,
    at: record.createdAt,
  };
}

/** The shoal's radius: the root of the mean variance on the map's two axes. */
export function spreadOf(state: PalateState): number {
  return Math.sqrt((state.covariance[0][0] + state.covariance[1][1]) / 2);
}

/**
 * A state as the next pour finds it: written and read back. Only the
 * covariance's diagonal survives, in hundredths; a guest's device also keeps
 * the coordinate at the tenth it shows (`guestShift`).
 */
function kept(state: PalateState, keeping: Keeping): PalateState {
  const record = toDynamicRecord(state);
  if (keeping === 'device') {
    const at = projectTo2D(state);
    record.latentVector[0] = at.x;
    record.latentVector[1] = at.y;
  }
  return fromDynamicRecord(record);
}

/**
 * Your track, oldest first, or `null` when replaying it does not arrive at
 * `now`. `pours` in any order; those at or before the start are left out.
 */
export function replayTrack(
  start: TrackStart,
  pours: readonly PourRecord[],
  now: { x: number; y: number },
  keeping: Keeping
): TrackPoint[] | null {
  const from = start.at === null ? -Infinity : Date.parse(start.at);
  const since = pours
    .filter((p) => Date.parse(p.createdAt) > from)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const initial = createInitialPalateState({
    x: start.x,
    y: start.y,
    variance: start.variance,
    dislikesSmoke: start.aversions?.smoke,
    dislikesBitter: start.aversions?.bitter,
    dislikesAnise: start.aversions?.anise,
  });
  // A member's quiz result is written as a record before the first pour reads it; a guest's first pour starts from it as it is.
  let state = keeping === 'record' ? kept(initial, keeping) : initial;
  const points: TrackPoint[] = [{ x: start.x, y: start.y, spread: spreadOf(state), pour: null, moved: 0 }];

  for (const pour of since) {
    const moved = applyPour(
      state,
      drinkOf(pour.drink) ?? undefined,
      {
        hedonic: pour.rating.hedonic,
        glmsValence: pour.rating.glmsValence,
        perceivedIntensities: pour.perceivedIntensities,
        cata: pour.cata,
      },
      pour.deviations ?? []
    );
    // The coordinate is read before the state is kept, as both paths read it.
    const at = projectTo2D(moved);
    const next = kept(moved, keeping);
    const prev = points[points.length - 1];
    points.push({
      x: at.x,
      y: at.y,
      spread: spreadOf(next),
      pour,
      moved: Math.round(Math.hypot(at.x - prev.x, at.y - prev.y) * 10) / 10,
    });
    state = next;
  }

  const last = points[points.length - 1];
  return Math.hypot(last.x - now.x, last.y - now.y) <= TRACK_TOLERANCE ? points : null;
}

/** How far the whole track has run, to a tenth. */
export function distanceRun(track: readonly TrackPoint[]): number {
  return Math.round(track.reduce((sum, p) => sum + p.moved, 0) * 10) / 10;
}
