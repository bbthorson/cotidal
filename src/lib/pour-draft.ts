import { CATA, DEVIATIONS, type CataNote, type Deviation } from './atproto/vocab';

/**
 * A pour drafted somewhere else — a chat assistant, through `/mcp` — for the
 * member to confirm in the form at `/log`. It travels in the link, so nothing
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
  deviations?: Deviation[];
  cata?: CataNote[];
  note?: string;
}

/** The form's own limits: the drink and bar inputs keep 200, the note textarea 1000. */
export const DRAFT_LIMITS = { drink: 200, bar: 200, note: 1000 } as const;

/** Marks a link as a draft, so `/log?drink=` from "Log this" keeps its old meaning. */
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
  return {
    drink,
    ...(input.atHome ? { atHome: true } : {}),
    ...(bar ? { bar } : {}),
    ...(deviations.length > 0 ? { deviations } : {}),
    ...(cata.length > 0 ? { cata } : {}),
    ...(note ? { note } : {}),
  };
}

const list = (value: string | null) => (value ? value.split(',').map((v) => v.trim()) : undefined);

/** The draft in a `/log` URL, or `null` when the URL is not a draft. */
export function parseDraft(params: URLSearchParams): PourDraft | null {
  if (params.get(MARKER) !== '1') return null;
  return cleanDraft({
    drink: params.get('drink'),
    atHome: params.get('at') === 'home',
    bar: params.get('bar'),
    deviations: list(params.get('off')),
    cata: list(params.get('notes')),
    note: params.get('note'),
  });
}

/** `/log?draft=1&…`, the link a draft is handed over in. */
export function draftPath(draft: PourDraft): string {
  const params = new URLSearchParams({ [MARKER]: '1', drink: draft.drink });
  if (draft.atHome) params.set('at', 'home');
  if (draft.bar) params.set('bar', draft.bar);
  if (draft.deviations?.length) params.set('off', draft.deviations.join(','));
  if (draft.cata?.length) params.set('notes', draft.cata.join(','));
  if (draft.note) params.set('note', draft.note);
  return `/log?${params.toString()}`;
}

/** The URL with the draft taken out, once it has been logged or set aside. */
export function withoutDraft(url: URL): URL {
  const next = new URL(url);
  for (const key of [MARKER, 'drink', 'at', 'bar', 'off', 'notes', 'note']) next.searchParams.delete(key);
  return next;
}
