/**
 * The generative surface: model ids, one header, and the copy served when
 * a model is not called. See docs/generation.md.
 *
 * Model ids are a drift surface — the two routes previously named different
 * models and one of them was no longer available to new API projects, which
 * fails indistinguishably from success because every path has a fallback.
 * They are named here once.
 */

import { aiBinding } from './runtime';

/**
 * Pinned deliberately. Cloudflare Workers AI models running on edge GPUs.
 * See docs/generation.md.
 */
export const GENERATION_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/**
 * Cloudflare Clef-flash (9B multimodal decision model): prefill-only, returns
 * calibrated probabilities over bounded questions with zero generated prose.
 */
export const CLEF_MODEL = '@cf/cloudflare/clef-flash';

/**
 * Google Gemma 4 26B-A4B (4B active MoE, native Vision, Zero data retention on
 * Cloudflare Workers AI): transcribes menu photos into raw drink lines.
 */
export const VISION_MODEL = '@cf/google/gemma-4-26b-a4b-it';

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

function restCredentials(): { accountId: string; apiToken: string } | null {
  const accountId = typeof process !== 'undefined' ? process.env?.CLOUDFLARE_ACCOUNT_ID : undefined;
  const apiToken = typeof process !== 'undefined' ? process.env?.CLOUDFLARE_API_TOKEN : undefined;
  return accountId && apiToken ? { accountId, apiToken } : null;
}

async function runModelRaw(
  model: string,
  payload: Record<string, unknown>,
  skipCache = false
): Promise<Record<string, unknown> | null> {
  const binding = await aiBinding();
  if (binding) {
    const res = await binding.run(model, payload, {
      gateway: { id: AI_GATEWAY_ID, skipCache },
    });
    return res && typeof res === 'object' ? res : null;
  }

  const creds = restCredentials();
  if (creds) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/${model}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.apiToken}`,
          'Content-Type': 'application/json',
          'cf-aig-gateway': AI_GATEWAY_ID,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error(`Workers AI REST call (${model}) failed with status:`, res.status);
        return null;
      }
      const data = (await res.json()) as { result?: Record<string, unknown> };
      return data?.result && typeof data.result === 'object' ? data.result : null;
    } catch (err) {
      console.error(`Workers AI REST fallback (${model}) error:`, err);
      return null;
    }
  }

  return null;
}

/**
 * Run text inference via Cloudflare Workers AI (`GENERATION_MODEL`).
 * Returns `null` when neither binding nor REST credentials exist.
 */
export async function runWorkersAi(options: WorkersAiOptions): Promise<string | null> {
  const res = await runModelRaw(GENERATION_MODEL, {
    messages: options.messages,
    max_tokens: options.maxTokens ?? 256,
  });
  return typeof res?.response === 'string' ? res.response.trim() : null;
}

/** A single typed question for Cloudflare Clef (`noul`, `choice`, or `score`). */
export type ClefQuestion =
  | { type: 'noul'; instructions: string }
  | { type: 'choice'; instructions: string; options: string[] }
  | { type: 'score'; instructions: string; levels: number };

export interface ClefRequest {
  /** Text or structured state to evaluate. */
  state: string | Record<string, unknown>;
  /** 1 to 64 typed questions keyed by id. */
  questions: Record<string, ClefQuestion>;
  /** Optional base64-encoded PNG/JPEG/WebP images (up to 4). */
  images?: { data: string; mime_type: 'image/jpeg' | 'image/png' | 'image/webp' }[];
}

export interface ClefAnswer {
  /** For `noul`: probability of yes (0–1). */
  probability?: number;
  /** For `choice`: selected option string. */
  choice?: string;
  /** For `choice`: probability of the selected option (0–1). */
  confidence?: number;
  /** For `choice` or `score`: probability distribution across options/levels. */
  probabilities?: Record<string, number> | number[];
  /** For `score`: probability-weighted expected score. */
  score?: number;
}

export interface ClefResponse {
  answers: Record<string, ClefAnswer>;
}

/**
 * Run Cloudflare Clef-flash (`CLEF_MODEL`) for bounded, calibrated decisions.
 * Returns `null` when off-platform without credentials or on failure.
 */
export async function runClef(request: ClefRequest): Promise<ClefResponse | null> {
  const payload: Record<string, unknown> = {
    model: 'clef-flash',
    state: request.state,
    questions: request.questions,
    ...(request.images?.length ? { images: request.images } : {}),
  };
  const res = await runModelRaw(CLEF_MODEL, payload);
  const answers = res?.answers ?? res?.results;
  if (!answers || typeof answers !== 'object') return null;
  return { answers: answers as Record<string, ClefAnswer> };
}

/**
 * Transcribe a bar menu photo into raw drink lines (`## Section`, `Name — ingredients · $18`,
 * or `Name · $18`) using Gemma 4 Vision (`VISION_MODEL`). Returns `null` when unavailable.
 */
export async function runVisionTranscribe(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<string[] | null> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  const res = await runModelRaw(
    VISION_MODEL,
    {
      messages: [
        {
          role: 'system',
          content:
            'You transcribe drink menus from photos. Output ONLY the drink section headers and drinks, one per line. Prefix each drink section header with "## " (for example "## Cocktails", "## Non-Alcoholic", "## Sunset Hour"). For each drink, if it lists ingredients, format it as "Drink Name — ingredient, ingredient, ingredient"; append the price if shown (for example " · $18"). Otherwise output "Drink Name" (with price if shown). Omit food items and commentary.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcribe every drink section header ("## Section") and every drink on this menu, one per line, keeping prices when shown.',
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.1,
    },
    true
  );

  // Gemma 4 on Workers AI may return OpenAI-style `choices[0].message.content` or `response`.
  let text: string | null = null;
  if (typeof res?.response === 'string') {
    text = res.response;
  } else if (Array.isArray(res?.choices)) {
    const first = res.choices[0] as { message?: { content?: unknown } } | undefined;
    if (typeof first?.message?.content === 'string') text = first.message.content;
  }
  if (!text) return null;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[•·\-*–—]\s*/, ''))
    .filter((l) => l.length > 0 && l.length <= 200);
  return lines.length > 0 ? lines : null;
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
