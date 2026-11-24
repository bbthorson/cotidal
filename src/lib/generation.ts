/**
 * The generative surface: one model id, one header, and the copy served when
 * the model is not called. See docs/generation.md.
 *
 * Model ids are a drift surface — the two routes previously named different
 * models and one of them was no longer available to new API projects, which
 * fails indistinguishably from success because every path has a fallback.
 * They are named here once.
 */

import { aiBinding } from './runtime';

/**
 * Pinned deliberately. Cloudflare Workers AI model running on edge GPUs.
 * See docs/generation.md.
 */
export const GENERATION_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/**
 * AI Gateway ID for routing, caching, and observability in Cloudflare.
 */
export const AI_GATEWAY_ID = 'crystal-coupe-gateway';

export interface WorkersAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface WorkersAiOptions {
  messages: WorkersAiMessage[];
  maxTokens?: number;
}

/**
 * Run inference via Cloudflare Workers AI.
 *
 * Primary path: Native `env.AI` binding in Cloudflare Workers, routed through AI Gateway.
 * Local/dev path: If off-platform, checks for `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
 * Fallback: If neither binding nor credentials exist (e.g. tests or vanilla local dev), returns null.
 */
export async function runWorkersAi(options: WorkersAiOptions): Promise<string | null> {
  const binding = await aiBinding();
  if (binding) {
    const res = await binding.run(
      GENERATION_MODEL,
      {
        messages: options.messages,
        max_tokens: options.maxTokens ?? 256,
      },
      {
        gateway: {
          id: AI_GATEWAY_ID,
          skipCache: false,
        },
      }
    );
    if (typeof res?.response === 'string') {
      return res.response.trim();
    }
  }

  // Off-platform REST fallback if credentials are provided in environment
  const accountId = typeof process !== 'undefined' ? process.env?.CLOUDFLARE_ACCOUNT_ID : undefined;
  const apiToken = typeof process !== 'undefined' ? process.env?.CLOUDFLARE_API_TOKEN : undefined;

  if (accountId && apiToken) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${GENERATION_MODEL}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'cf-aig-gateway': AI_GATEWAY_ID,
        },
        body: JSON.stringify({
          messages: options.messages,
          max_tokens: options.maxTokens ?? 256,
        }),
      });

      if (!res.ok) {
        console.error('Workers AI REST call failed with status:', res.status);
        return null;
      }

      const data = (await res.json()) as { result?: { response?: string } };
      if (typeof data?.result?.response === 'string') {
        return data.result.response.trim();
      }
    } catch (err) {
      console.error('Workers AI REST fallback error:', err);
      return null;
    }
  }

  return null;
}

/**
 * Cloudflare Clef decision model on Workers AI: returns calibrated
 * probabilities for typed questions (`noul`, `choice`, `score`) in one pass
 * with zero generated text (~39 ms median on `clef-flash`).
 */
export const CLEF_MODEL = '@cf/cloudflare/clef-flash';

export type ClefQuestion =
  | { id: string; type: 'noul'; instructions: string }
  | { id: string; type: 'choice'; instructions: string; choices: { id: string; description: string }[] }
  | { id: string; type: 'score'; instructions: string; levels: { score: number; description: string }[] };

export interface ClefAnswer {
  /** For `noul`: probability of yes (0..1). */
  probability?: number;
  /** For `score`: probability-weighted expected score. */
  score?: number;
  /** Confidence (0..1) when reported by the model. */
  confidence?: number;
  /** For `choice`: winning option id. */
  choice?: string;
}

export type ClefAnswers = Record<string, ClefAnswer>;

/**
 * Run Cloudflare Clef via Workers AI binding (or REST fallback when local
 * credentials are set). Returns `null` when unavailable so callers always fall
 * back deterministically (docs/generation.md).
 */
export async function runClefDecision(
  state: string,
  questions: readonly ClefQuestion[]
): Promise<ClefAnswers | null> {
  const payload = { state, questions };
  const binding = await aiBinding();
  if (binding) {
    const res = (await binding.run(CLEF_MODEL, payload, {
      gateway: { id: AI_GATEWAY_ID, skipCache: false },
    })) as { answers?: ClefAnswers } | null;
    if (res?.answers && typeof res.answers === 'object') return res.answers;
  }

  const accountId = typeof process !== 'undefined' ? process.env?.CLOUDFLARE_ACCOUNT_ID : undefined;
  const apiToken = typeof process !== 'undefined' ? process.env?.CLOUDFLARE_API_TOKEN : undefined;
  if (accountId && apiToken) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLEF_MODEL}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'cf-aig-gateway': AI_GATEWAY_ID,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { result?: { answers?: ClefAnswers } };
      if (data?.result?.answers && typeof data.result.answers === 'object') return data.result.answers;
    } catch (err) {
      console.error('Workers AI Clef REST fallback error:', err);
      return null;
    }
  }

  return null;
}

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
