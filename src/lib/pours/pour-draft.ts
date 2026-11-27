import { CATA, DEVIATIONS, type CataNote, type Deviation } from '../atproto/vocab';
import { geoLocation } from '../atproto/location';
import { RATE_LANDING_PATH, RATE_PARAM } from '../atproto/paths';

/**
 * A pour drafted somewhere else — a chat assistant, through `/mcp` — for the
 * member to confirm in the rating sheet (`/map?draft=1&…`). It travels in the link, so nothing
 * is stored and nothing is written until they press the button.
 *
 * It carries no rating, on purpose: the rating is what moves the coordinate,
 * and a model translating "it was fine" into the 9-point scale is guessing in
 * their name. They tap it themselves. Nor does it carry the member-only
 * detail fields or cross-posting, which stay their own choices.
 *
 * Everything here runs in the browser too (the form reads the draft), so it
 * imports vocabularies only.
 */

export interface PourDraft {
  drink: string;
  atHome?: boolean;
  bar?: string;
  /** Where the bar is, when it came from a map (Compass, through a bar's menu). */
  at?: { lat: number; lon: number };
  deviations?: Deviation[];
  cata?: CataNote[];
  note?: string;
}

/** The form's own limits: the drink and bar inputs keep 200, the note textarea 1000. */
export const DRAFT_LIMITS = { drink: 200, bar: 200, note: 1000 } as const;

/** Marks a link as a draft: `drink=` alone means nothing, `rate=` is the plain way to open the sheet. */
const MARKER = 'draft';

const known = <T extends string>(vocab: readonly T[], values: string[] | undefined): T[] =>
  [...new Set(values ?? [])].filter((v): v is T => (vocab as readonly string[]).includes(v));

const text = (value: string | null | undefined, max: number): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? [...trimmed].slice(0, max).join('') : undefined;
};

/**
 * Only what the form can show, cut to what it accepts: unknown ids are
 * dropped, not kept as free text, and a bar is dropped for a pour at home.
 * `null` when there is no drink, since the form cannot start without one.
 */
export function cleanDraft(input: {
  drink?: string | null;
  atHome?: boolean;
  bar?: string | null;
  lat?: number;
  lon?: number;
  deviations?: string[];
  cata?: string[];
  note?: string | null;
}): PourDraft | null {
  const drink = text(input.drink, DRAFT_LIMITS.drink);
  if (!drink) return null;
  const deviations = known(DEVIATIONS, input.deviations);
  const cata = known(CATA, input.cata);
  const bar = input.atHome ? undefined : text(input.bar, DRAFT_LIMITS.bar);
  const note = text(input.note, DRAFT_LIMITS.note);
  // A point only with a bar to belong to, and only one that parses.
  const at = bar && geoLocation(input.lat, input.lon) ? { lat: input.lat!, lon: input.lon! } : undefined;
  return {
    drink,
    ...(input.atHome ? { atHome: true } : {}),
    ...(bar ? { bar } : {}),
    ...(at ? { at } : {}),
    ...(deviations.length > 0 ? { deviations } : {}),
    ...(cata.length > 0 ? { cata } : {}),
    ...(note ? { note } : {}),
  };
}

const num = (value: string | null) => (value === null || value.trim() === '' ? undefined : Number(value));

const list = (value: string | null) => (value ? value.split(',').map((v) => v.trim()) : undefined);

/** The draft in a URL, or `null` when the URL is not a draft. */
export function parseDraft(params: URLSearchParams): PourDraft | null {
  if (params.get(MARKER) !== '1') return null;
  return cleanDraft({
    drink: params.get('drink'),
    atHome: params.get('at') === 'home',
    bar: params.get('bar'),
    lat: num(params.get('lat')),
    lon: num(params.get('lon')),
    deviations: list(params.get('off')),
    cata: list(params.get('notes')),
    note: params.get('note'),
  });
}

/** `/map?draft=1&…`, the link a draft is handed over in. */
export function draftPath(draft: PourDraft): string {
  const params = new URLSearchParams({ [MARKER]: '1', drink: draft.drink });
  if (draft.atHome) params.set('at', 'home');
  if (draft.bar) params.set('bar', draft.bar);
  if (draft.bar && draft.at) {
    params.set('lat', String(draft.at.lat));
    params.set('lon', String(draft.at.lon));
  }
  if (draft.deviations?.length) params.set('off', draft.deviations.join(','));
  if (draft.cata?.length) params.set('notes', draft.cata.join(','));
  if (draft.note) params.set('note', draft.note);
  return `${RATE_LANDING_PATH}?${params.toString()}`;
}

/**
 * What a URL asks the rating sheet to open on: a drink (`?rate=Negroni`; empty
 * for the drink closest to you) or a whole draft. Handled once, by
 * `useRateSheet`, on every app page.
 */
export interface RateRequest {
  drink?: string;
  draft?: PourDraft;
}

/** The rating the URL asks for, or `null` when it asks for none. */
export function parseRateRequest(params: URLSearchParams): RateRequest | null {
  const draft = parseDraft(params);
  if (draft) return { drink: draft.drink, draft };
  if (!params.has(RATE_PARAM)) return null;
  const drink = text(params.get(RATE_PARAM), DRAFT_LIMITS.drink);
  return drink ? { drink } : {};
}

/** The URL with the request taken out, once the sheet is closed. */
export function withoutRateRequest(url: URL): URL {
  const next = new URL(url);
  for (const key of [RATE_PARAM, MARKER, 'drink', 'at', 'bar', 'lat', 'lon', 'off', 'notes', 'note']) {
    next.searchParams.delete(key);
  }
  return next;
}
