import { GLMS_ANCHORS, type AskedIntensity, type BaseSpirit, type CataNote, type Deviation, type Glassware } from '@/lib/atproto/vocab';
import type { PourRecord } from '@/lib/atproto/records';
import { geoLocation } from '@/lib/atproto/location';
import type { LogDrinkOptions } from '@/lib/api-client';
import type { PourDraft } from '@/lib/pour-draft';
import { pour } from '@/lib/copy';

/**
 * A pour as the rating sheet takes it, from the form's fields to what is sent
 * or kept. Plain functions, so the form and the sheet only hold state and
 * draw; everything here is tested in `tests/unit/pour-entry.test.ts`.
 */

/** What the form hands back. `hedonic` is the stored 9-point scale. */
export interface PourEntry {
  drinkName: string;
  hedonic: number;
  isHomePour: boolean;
  venue: string;
  deviations: Deviation[];
  cata?: CataNote[];
  note: string;
  crosspost: boolean;
  /** Only what the drinker set: an untouched field is absent, never a default. */
  detail?: {
    baseSpirit?: BaseSpirit;
    glassware?: Glassware;
    garnish?: string;
    /** gLMS, 0–100 (`perceivedIntensities` on the pour). */
    intensities?: Partial<Record<AskedIntensity, number>>;
  };
}

/** The form's fields as they stand, untrimmed; `hedonic` is `null` until tapped. */
export interface PourFields {
  drinkName: string;
  isHomePour: boolean;
  venue: string;
  hedonic: number | null;
  deviations: Deviation[];
  cata: CataNote[];
  note: string;
  crosspost: boolean;
  baseSpirit: BaseSpirit | '';
  glassware: Glassware | '';
  garnish: string;
  intensities: Partial<Record<AskedIntensity, number>>;
}

/** The detail fields the drinker set, or nothing. */
export function chosenDetail(fields: Pick<PourFields, 'baseSpirit' | 'glassware' | 'garnish' | 'intensities'>): PourEntry['detail'] {
  const { baseSpirit, glassware, garnish, intensities } = fields;
  const detail: NonNullable<PourEntry['detail']> = {
    ...(baseSpirit ? { baseSpirit } : {}),
    ...(glassware ? { glassware } : {}),
    ...(garnish.trim() ? { garnish: garnish.trim() } : {}),
    ...(Object.keys(intensities).length > 0 ? { intensities } : {}),
  };
  return Object.keys(detail).length > 0 ? detail : undefined;
}

/** The field a missing answer belongs to, so the form can say it there. */
export type PourField = 'drink' | 'where' | 'rating';

/**
 * The entry the fields add up to, or what is missing and where. Cross-posting
 * and the detail fields are a member's only: a guest's are dropped, not sent.
 */
export function entryFromFields(
  fields: PourFields,
  isMember: boolean
): { entry: PourEntry } | { error: string; field: PourField } {
  if (!fields.drinkName.trim()) return { error: pour.needDrink, field: 'drink' };
  if (!fields.isHomePour && !fields.venue.trim()) return { error: pour.needBar, field: 'where' };
  if (fields.hedonic === null) return { error: pour.needRating, field: 'rating' };
  return {
    entry: {
      drinkName: fields.drinkName.trim(),
      hedonic: fields.hedonic,
      isHomePour: fields.isHomePour,
      venue: fields.venue.trim(),
      deviations: fields.deviations,
      cata: fields.cata.length > 0 ? fields.cata : undefined,
      note: fields.note.trim(),
      crosspost: isMember && fields.crosspost,
      detail: isMember ? chosenDetail(fields) : undefined,
    },
  };
}

/**
 * The server's 0–10 rating for a hedonic score. It maps back with
 * round(rating × 0.8 + 1), so the stored score is exactly the one tapped.
 */
export const hedonicToRating = (hedonic: number) => (hedonic - 1) * 1.25;

/** What the log route is sent for an entry. One mapping for the one form. */
export function toLogOptions(entry: PourEntry): LogDrinkOptions {
  return {
    drinkName: entry.drinkName,
    rating: hedonicToRating(entry.hedonic),
    isHomePour: entry.isHomePour,
    location: entry.isHomePour ? 'Home Pour' : entry.venue,
    venue: entry.isHomePour ? undefined : { name: entry.venue },
    deviations: entry.deviations,
    cata: entry.cata,
    note: entry.note || undefined,
    crosspostToFeed: entry.crosspost,
    baseSpirit: entry.detail?.baseSpirit,
    glassware: entry.detail?.glassware,
    garnish: entry.detail?.garnish,
    perceivedIntensities: entry.detail?.intensities,
  };
}

/** The gLMS word for a position on the scale: the highest anchor at or below it. */
export function glmsWord(value: number): string {
  const anchor = [...GLMS_ANCHORS].reverse().find((a) => value >= a.at);
  return anchor ? pour.glms[anchor.id] : pour.glmsNone;
}

/**
 * Where the bar is, from the map — only while the pour is still at the bar
 * the draft named. A pour at home, or at another bar typed over it, has none.
 */
export function barPointFor(entry: PourEntry, draft: PourDraft | undefined): { lat: number; lon: number } | null {
  return !entry.isHomePour && draft?.at && draft.bar === entry.venue.trim() ? draft.at : null;
}

/** A guest's pour, as kept on the device: the same record shape a member's repository holds. */
export function guestPourRecord(
  entry: PourEntry,
  { slug, at, createdAt }: { slug: string | undefined; at: { lat: number; lon: number } | null; createdAt: string }
): PourRecord {
  return {
    $type: 'app.cotidal.pour',
    drink: { name: entry.drinkName, slug },
    venue: entry.isHomePour
      ? undefined
      : { entity: { name: entry.venue }, ...(at ? { address: geoLocation(at.lat, at.lon, entry.venue) ?? undefined } : {}) },
    rating: { hedonic: entry.hedonic },
    deviations: entry.deviations.length > 0 ? entry.deviations : undefined,
    cata: entry.cata && entry.cata.length > 0 ? entry.cata : undefined,
    note: entry.note || undefined,
    isHomePour: entry.isHomePour,
    createdAt,
  };
}

/**
 * What a pour did to your menu: the drink's rank on it now (1-based, or
 * `null` if it is not on it), and a drink that was not on it before.
 */
export function menuChange(
  menuBefore: string[],
  menuNow: string[],
  drinkName: string
): { rank: number | null; newcomer: string | null } {
  const at = menuNow.findIndex((n) => n.toLowerCase() === drinkName.toLowerCase());
  return {
    rank: at >= 0 ? at + 1 : null,
    newcomer: menuNow.find((n, i) => i !== at && !menuBefore.includes(n)) ?? null,
  };
}
