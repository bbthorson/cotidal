import { Agent } from '@atproto/api';
import {
  ELICITATION_COLLECTION,
  type ElicitationRecord,
  PALATE_COLLECTION,
  PALATE_RKEY,
  POUR_COLLECTION,
  LEGACY_PALATE_COLLECTION,
  LEGACY_POUR_COLLECTION,
  decodePalate,
  encodePalate,
  type Palate,
  PourWriteSchema,
  readPour,
  type PourRecord,
} from './records';
import type { OAuthSession } from '@bbthorson/atproto-cf-auth/server';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { derivePalateRecord } from '../sensory';
import { feedPost } from '../copy';
import { fitString, graphemeLength, utf8Length } from './lex-string';

/** `app.bsky.feed.post#text`: 300 graphemes, 3000 bytes. */
const POST_MAX_GRAPHEMES = 300;
const POST_MAX_BYTES = 3000;

/**
 * The user's own palate record, from the current namespace or, failing that,
 * the one before the rename. `null` when neither holds a palate.
 */
async function readOwnPalate(agent: Agent, did: string): Promise<Palate | null> {
  for (const collection of [PALATE_COLLECTION, LEGACY_PALATE_COLLECTION]) {
    try {
      const response = await agent.com.atproto.repo.getRecord({ repo: did, collection, rkey: PALATE_RKEY });
      const palate = decodePalate(response.data.value);
      if (palate) return palate;
    } catch {
      // Not in this collection; try the next.
    }
  }
  return null;
}

export async function publishPalateProfile(
  session: OAuthSession,
  profile: UserProfile
): Promise<{ uri: string; cid: string }> {
  const agent = new Agent(session);

  // Load the existing profile, if any, to preserve sensory updates.
  const existing = await readOwnPalate(agent, session.did);

  const record = encodePalate(derivePalateRecord(profile, existing));

  const response = await agent.com.atproto.repo.putRecord({
    repo: session.did,
    collection: PALATE_COLLECTION,
    rkey: PALATE_RKEY,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}


/**
 * A post: `text`, then `url` as a link. The text is cut to fit Bluesky's 300
 * graphemes with the link, never the link itself.
 */
export function feedPostRecord(text: string, url: string, now: Date = new Date()) {
  const body = fitString(
    text,
    POST_MAX_BYTES - utf8Length(url) - 1,
    POST_MAX_GRAPHEMES - graphemeLength(url) - 1
  ).trimEnd();
  const prefix = `${body} `;
  return {
    $type: 'app.bsky.feed.post',
    text: `${prefix}${url}`,
    facets: [
      {
        index: {
          byteStart: utf8Length(prefix),
          byteEnd: utf8Length(prefix + url),
        },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }],
      },
    ],
    createdAt: now.toISOString(),
  };
}

/** A post on the member's own feed. */
export async function postToFeed(
  session: OAuthSession,
  text: string,
  url: string
): Promise<{ uri: string; cid: string }> {
  const response = await new Agent(session).com.atproto.repo.createRecord({
    repo: session.did,
    collection: 'app.bsky.feed.post',
    record: feedPostRecord(text, url),
  });
  return { uri: response.data.uri, cid: response.data.cid };
}

/** The palate, shared from the menu: where it lands and the top drink, linking `mapUrl`. */
export async function shareToFeed(
  session: OAuthSession,
  topDrink: string,
  quadrant: string,
  mapUrl: string
): Promise<{ uri: string; cid: string }> {
  return postToFeed(session, feedPost.palate(quadrant, topDrink), mapUrl);
}

/** The signed-in user's palate, decoded from either encoding or namespace. */
export async function getPalateProfile(session: OAuthSession): Promise<Palate | null> {
  try {
    return await readOwnPalate(new Agent(session), session.did);
  } catch {
    return null;
  }
}

export async function publishRawPalateRecord(
  session: OAuthSession,
  palate: Palate
): Promise<{ uri: string; cid: string }> {
  const agent = new Agent(session);

  const response = await agent.com.atproto.repo.putRecord({
    repo: session.did,
    collection: PALATE_COLLECTION,
    rkey: PALATE_RKEY,
    record: encodePalate(palate),
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

export async function publishPour(
  session: OAuthSession,
  pour: Omit<PourRecord, '$type'>
): Promise<{ uri: string; cid: string }> {
  const agent = new Agent(session);

  // The last check before a signed, unrewritable record: it says what its
  // lexicon says, or it is not written.
  const record = PourWriteSchema.parse({ ...pour, $type: POUR_COLLECTION });

  const response = await agent.com.atproto.repo.createRecord({
    repo: session.did,
    collection: POUR_COLLECTION,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

/**
 * The user's pours, newest first, from the current namespace and the one
 * before the rename, so a ledger started before it keeps its history.
 */
export async function getPours(session: OAuthSession, limit?: number): Promise<PourRecord[]> {
  const agent = new Agent(session);
  const max = limit || 50;
  const lists = await Promise.all(
    [POUR_COLLECTION, LEGACY_POUR_COLLECTION].map(async (collection) => {
      try {
        const response = await agent.com.atproto.repo.listRecords({
          repo: session.did,
          collection,
          limit: max,
          reverse: true,
        });
        return response.data.records
          .map((r) => readPour(r.value))
          .filter((p): p is PourRecord => p !== null);
      } catch (e) {
        if (collection === POUR_COLLECTION) console.error('Failed to get pours:', e);
        return [];
      }
    })
  );
  return lists
    .flat()
    // By instant, not by string: `+02:00` and `Z` order differently as text.
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, max);
}

/**
 * A completed quiz's answers, as a new record. Never updated: a retake is
 * another record, so the log keeps every quiz the author took.
 */
export async function publishElicitation(
  session: OAuthSession,
  record: ElicitationRecord
): Promise<{ uri: string; cid: string }> {
  const agent = new Agent(session);
  const response = await agent.com.atproto.repo.createRecord({
    repo: session.did,
    collection: ELICITATION_COLLECTION,
    record: { ...record, $type: ELICITATION_COLLECTION },
  });
  return { uri: response.data.uri, cid: response.data.cid };
}
