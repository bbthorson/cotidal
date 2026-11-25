import { describe, expect, it } from 'vitest';
import { readFollowedPalates } from '@/lib/atproto/follows-overlap';
import type { PublicPalateResult } from '@/lib/atproto/public-read';

const ME = 'did:plc:me1111111111111111111111';
const ALICE = 'did:plc:alice1111111111111111111';
const BOB = 'did:plc:bob111111111111111111111';

describe('readFollowedPalates', () => {
  it('returns only the intersection of Bluesky follows who have published a palate, sorted nearest first', async () => {
    const fakeFetch = (async () =>
      new Response(
        JSON.stringify({
          follows: [
            { did: ALICE, handle: 'alice.bsky.social', displayName: 'Alice' },
            { did: BOB, handle: 'bob.bsky.social', displayName: 'Bob' },
            { did: 'did:plc:no-palate', handle: 'quiet.bsky.social' },
          ],
        }),
        { status: 200 }
      )) as unknown as typeof fetch;

    const palates: Record<string, PublicPalateResult> = {
      'alice.bsky.social': {
        status: 'ok',
        actor: { did: ALICE, handle: 'alice.bsky.social' },
        palate: { x: 5, y: 4, aversions: { smoke: false, bitter: false, anise: false }, pours: 3, updatedAt: null },
      },
      'bob.bsky.social': {
        status: 'ok',
        actor: { did: BOB, handle: 'bob.bsky.social' },
        palate: { x: -7, y: -6, aversions: { smoke: false, bitter: false, anise: false }, pours: 10, updatedAt: null },
      },
      'quiet.bsky.social': {
        status: 'no-palate',
        actor: { did: 'did:plc:no-palate', handle: 'quiet.bsky.social' },
      },
    };

    const result = await readFollowedPalates(
      ME,
      { x: 4, y: 3, aversions: { smoke: false, bitter: false, anise: false } },
      { fetch: fakeFetch, readPalate: async (actor) => palates[actor] ?? { status: 'not-found' } }
    );

    expect(result).toHaveLength(2);
    expect(result[0].handle).toBe('alice.bsky.social');
    expect(result[1].handle).toBe('bob.bsky.social');
    expect(result[0].distance).toBeLessThan(result[1].distance);
    expect(result[1].theirs).not.toBeNull();
    expect(result[0].path).toBe('/p/alice.bsky.social');
  });

  it('returns an empty list gracefully if getFollows fails', async () => {
    const fakeFetch = (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch;
    const result = await readFollowedPalates(
      ME,
      { x: 0, y: 0, aversions: { smoke: false, bitter: false, anise: false } },
      { fetch: fakeFetch }
    );
    expect(result).toEqual([]);
  });
});

describe('readFollowedPalates with a budget', () => {
  it('stops starting lookups once the budget is spent, and keeps what it read', async () => {
    const follows = Array.from({ length: 12 }, (_, i) => ({ did: `did:plc:f${i}`, handle: `f${i}.bsky.social` }));
    const fakeFetch = (async () => new Response(JSON.stringify({ follows }), { status: 200 })) as unknown as typeof fetch;
    let clock = 0;
    const read: string[] = [];
    const result = await readFollowedPalates(
      ME,
      { x: 0, y: 0, aversions: { smoke: false, bitter: false, anise: false } },
      {
        fetch: fakeFetch,
        budgetMs: 100,
        now: () => clock,
        readPalate: async (actor) => {
          read.push(actor);
          // Six lookups at 20 each spend the budget.
          clock += 20;
          return {
            status: 'ok',
            actor: { did: `did:plc:${actor}`, handle: actor },
            palate: { x: 1, y: 1, aversions: { smoke: false, bitter: false, anise: false }, pours: 0, updatedAt: null },
          };
        },
      }
    );
    // One batch of six began inside the budget; the second did not.
    expect(read).toHaveLength(6);
    expect(result).toHaveLength(6);
  });
});
