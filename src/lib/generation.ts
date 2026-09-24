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
 * Safely extract JSON from raw model output, handling fenced markdown blocks or raw JSON.
 */
export function extractJson<T = unknown>(rawText: string): T | null {
  try {
    const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      return JSON.parse(fenced[1].trim()) as T;
    }
    const jsonMatch = rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0].trim()) as T;
    }
    return JSON.parse(rawText.trim()) as T;
  } catch {
    return null;
  }
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
