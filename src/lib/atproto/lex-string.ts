/**
 * Lexicon strings in Zod: limits counted the way the lexicon counts them, and
 * formats checked by the protocol's reference implementation.
 */
import { z } from 'zod';
import { isDatetimeString, isDatetimeStringLenient } from '@atproto/syntax';

/**
 * A lexicon string's limits. `maxLength` counts UTF-8 bytes and
 * `maxGraphemes` user-perceived characters — neither is what `.length` or
 * Zod's `.max()` count (UTF-16 code units), so a note in emoji or a
 * non-Latin script could pass those and still break the record's limits.
 */
export interface StringLimits {
  minLength?: number;
  maxLength?: number;
  maxGraphemes?: number;
  format?: 'datetime' | 'did' | 'at-uri' | 'cid' | 'uri';
}

/** What each `lexString` was built with, for the lexicon checker to compare. */
export const STRING_LIMITS = new WeakMap<z.ZodTypeAny, StringLimits>();

const encoder = new TextEncoder();
export const utf8Length = (s: string) => encoder.encode(s).length;

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
const graphemes = (s: string): string[] =>
  segmenter ? Array.from(segmenter.segment(s), (g) => g.segment) : Array.from(s);
export const graphemeLength = (s: string) => graphemes(s).length;

/**
 * String formats, checked by `@atproto/syntax` — the protocol's reference
 * implementation — rather than by look-alike regexes or Zod's own: Zod's
 * `.datetime({ offset: true })` accepts `-00:00`, `+0000` and a time with no
 * seconds, all of which the spec forbids (https://atproto.com/specs/lexicon#datetime).
 *
 * These are the checks `@atproto/lexicon` applies when it validates a record,
 * so what a schema here accepts is what any conforming reader accepts. That
 * includes datetimes, which the reference reads leniently. What this app
 * *writes* is held to the strict form instead: see `writtenDatetime`.
 */
type Format = NonNullable<StringLimits['format']>;
const FORMATS: Partial<Record<Format, (s: string) => boolean>> = {
  datetime: (s) => isDatetimeStringLenient(s),
};

/**
 * Add a format's check. Only `datetime` is built in, because it is the only
 * one the browser needs (the quiz's answers); records.ts registers the rest
 * before building the schemas that use them, which keeps their dependencies
 * (`@atproto/lex-data`, for CIDs) out of the client bundle.
 */
export function registerFormat(format: Format, check: (s: string) => boolean): void {
  FORMATS[format] = check;
}

/** A string checked the way its lexicon defines it. */
export function lexString(limits: StringLimits = {}) {
  // A format with no check would pass everything: fail when the schema is built instead.
  const formatCheck = limits.format ? FORMATS[limits.format] : undefined;
  if (limits.format && !formatCheck) throw new Error(`lexString: no check registered for format "${limits.format}"`);
  const schema = z.string().superRefine((value, ctx) => {
    const bytes = utf8Length(value);
    if (limits.minLength !== undefined && bytes < limits.minLength) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `shorter than ${limits.minLength} bytes` });
    }
    if (limits.maxLength !== undefined && bytes > limits.maxLength) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `longer than ${limits.maxLength} bytes` });
    }
    if (limits.maxGraphemes !== undefined && graphemeLength(value) > limits.maxGraphemes) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `longer than ${limits.maxGraphemes} characters` });
    }
    if (formatCheck && !formatCheck(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `not a valid ${limits.format}` });
    }
  });
  STRING_LIMITS.set(schema, limits);
  return schema;
}

export const datetime = () => lexString({ format: 'datetime' });

/**
 * A datetime as the spec says to generate one: upper-case `T`, seconds, an
 * explicit timezone, no `-00:00` — what `new Date().toISOString()` produces
 * (`2026-10-25T20:00:00.000Z`, millisecond precision and `Z`, the preferred
 * form). Reads accept anything the reference validator does; writes do not
 * add to the variety.
 */
export const writtenDatetime = () =>
  z.string().refine((s) => isDatetimeString(s), { message: 'not a strict atproto datetime' });

/**
 * Cut a string to fit a lexicon's limits, on a character boundary, so free
 * text is kept rather than refused. Bytes and graphemes are both honoured.
 */
export function fitString(value: string, maxLength: number, maxGraphemes?: number): string {
  let out = '';
  let bytes = 0;
  let count = 0;
  for (const g of graphemes(value)) {
    const size = utf8Length(g);
    if (bytes + size > maxLength || (maxGraphemes !== undefined && count + 1 > maxGraphemes)) break;
    out += g;
    bytes += size;
    count += 1;
  }
  return out;
}
