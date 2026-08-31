/**
 * The generative surface: one model id, one header, and the copy served when
 * the model is not called. See docs/generation.md.
 *
 * Model ids are a drift surface — the two routes previously named different
 * models and one of them was no longer available to new API projects, which
 * fails indistinguishably from success because every path has a fallback.
 * They are named here once.
 */

/** Pinned deliberately. Check Google's deprecation list before changing it. */
export const GENERATION_MODEL = 'gemini-2.5-flash-lite';

/**
 * Why a response says what it says. These routes always answer with usable
 * content — a model outage, a missing key, a guest, and a throttled member all
 * read as working software — so the reason travels in a header rather than in
 * a status code the client would have to special-case.
 */
export const GENERATION_HEADER = 'x-generation';

export type GenerationOutcome =
  /** The model wrote it. */
  | 'model'
  /** No restorable session: generation is for members. */
  | 'unauthenticated'
  /** A member over their allowance. */
  | 'rate-limited'
  /** No key configured, or the model call failed. */
  | 'unavailable';

export function generationHeaders(outcome: GenerationOutcome): Record<string, string> {
  return { 'Content-Type': 'application/json', [GENERATION_HEADER]: outcome };
}

export interface FallbackProfile {
  x: number;
  y: number;
}

/**
 * What a guest reads. Written to be read rather than to hold a place: it is
 * derived from their actual coordinate and is the whole product for anyone not
 * signed in, so it may not sound like an error.
 */
export function explanationFallback(drinkName: string, profile: FallbackProfile): string {
  const axis = profile.x > 0 ? 'crisp' : 'rich';
  const palate = profile.y > 0 ? 'sweet' : 'savory';
  return `You lean ${axis} and ${palate} — a ${drinkName} sits right in that corner of the map.`;
}

/** The archetype route's contract: always a usable drink shape, never a failure. */
export const ARCHETYPE_FALLBACK = {
  x: 0,
  y: 0,
  hasSmoke: false,
  hasAnise: false,
  isBitter: false,
  tags: ['classic'],
  oracleReasoning: "Couldn't get a full read on this one, but it's a classic.",
} as const;
