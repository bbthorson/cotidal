import type { APIRoute } from 'astro';
import { z } from 'zod';
import { restoredDid } from '@/lib/atproto/session';
import { checkRateLimit } from '@/lib/rate-limit';
import { loadRegister } from '@/lib/drinks/register.server';
import { captureMenuLines, enrichWithClef } from '@/lib/drinks/menu-capture';
import type { MenuItem } from '@/lib/drinks/menu-rank';
import {
  generationHeaders,
  runVisionTranscribe,
  type GenerationOutcome,
} from '@/lib/generation';

/**
 * Capture a bar menu from a photo or pasted text (docs/generation.md).
 *
 * Order: validate -> authenticate -> meter -> call models.
 * - Guests and offline environments always get deterministic parsing for text.
 * - Photo transcription (Gemma 4 Vision) and Clef-flash house-cocktail
 *   enrichment are members-only and metered per DID.
 * - Always answers 200 with usable JSON; the reason travels in `x-generation`.
 */

const MAX_IMAGE_BASE64 = 5_600_000; // ~4 MiB decoded

const InputSchema = z
  .object({
    text: z.string().max(10_000).optional(),
    image: z.string().min(16).max(MAX_IMAGE_BASE64).optional(),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
  })
  .refine((d) => Boolean(d.text?.trim() || d.image), {
    message: 'Provide menu text or an image.',
  });

export interface SerializedCaptureItem {
  label: string;
  description?: string;
  section?: string;
  price?: string;
  nonAlcoholic?: boolean;
  drinkName: string | null;
  directional?: {
    x: number;
    y: number;
    quadrant: string;
    confidence: 'low' | 'medium';
    aversions: { smoke: boolean; bitter: boolean; anise: boolean };
    closestClassicName: string | null;
    nonAlcoholic?: boolean;
  } | null;
}

function serializeItems(items: MenuItem[]): SerializedCaptureItem[] {
  return items.map((i) => ({
    label: i.label,
    ...(i.description ? { description: i.description } : {}),
    ...(i.section ? { section: i.section } : {}),
    ...(i.price ? { price: i.price } : {}),
    ...(i.nonAlcoholic ? { nonAlcoholic: true } : {}),
    drinkName: i.drink?.name ?? null,
    ...(i.directional
      ? {
          directional: {
            x: i.directional.x,
            y: i.directional.y,
            quadrant: i.directional.quadrant,
            confidence: i.directional.confidence,
            aversions: i.directional.aversions,
            closestClassicName: i.directional.closestClassic?.name ?? null,
            ...(i.directional.nonAlcoholic ? { nonAlcoholic: true } : {}),
          },
        }
      : {}),
  }));
}

function respond(
  payload: {
    lines: string[];
    items: SerializedCaptureItem[];
    method: 'photo' | 'manual';
    requiresSignIn?: boolean;
  },
  outcome: GenerationOutcome
): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: generationHeaders(outcome),
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { text, image, mimeType = 'image/jpeg' } = parsed.data;
  const method: 'photo' | 'manual' = image ? 'photo' : 'manual';
  const register = await loadRegister();
  const textLines = text
    ? text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    : [];
  const deterministicItems = textLines.length > 0 ? captureMenuLines(textLines, register) : [];

  const did = await restoredDid(request);
  if (!did) {
    return respond(
      {
        lines: textLines,
        items: serializeItems(deterministicItems),
        method,
        ...(image ? { requiresSignIn: true } : {}),
      },
      'unauthenticated'
    );
  }

  if (!(await checkRateLimit(did))) {
    return respond(
      {
        lines: textLines,
        items: serializeItems(deterministicItems),
        method,
      },
      'rate-limited'
    );
  }

  let lines = textLines;
  let usedModel = false;

  if (image) {
    const transcribed = await runVisionTranscribe(image, mimeType);
    if (!transcribed || transcribed.length === 0) {
      return respond({ lines: [], items: [], method: 'photo' }, 'unavailable');
    }
    lines = transcribed;
    usedModel = true;
  }

  const baseItems = captureMenuLines(lines, register);
  const { items: enrichedItems, enriched } = await enrichWithClef(
    baseItems,
    undefined,
    image ? { data: image, mime_type: mimeType } : undefined
  );
  if (enriched > 0) usedModel = true;

  return respond(
    {
      lines,
      items: serializeItems(enrichedItems),
      method,
    },
    usedModel ? 'model' : 'unavailable'
  );
};
