import { Agent } from '@atproto/api';
import { PALATE_COLLECTION, PALATE_RKEY, type PalateRecord } from './lexicon';
import { getAtprotoClient } from './client';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

export async function publishPalateProfile(
  did: string,
  profile: UserProfile
): Promise<{ uri: string; cid: string }> {
  const client = getAtprotoClient();
  if (!client) throw new Error('AT Protocol not configured');

  const session = await client.restore(did);
  const agent = new Agent(session);

  const now = new Date().toISOString();
  const record: PalateRecord = {
    $type: PALATE_COLLECTION,
    x: profile.x,
    y: profile.y,
    dislikesSmoke: profile.dislikesSmoke,
    dislikesBitter: profile.dislikesBitter,
    dislikesAnise: profile.dislikesAnise,
    vibeTags: profile.vibeTags,
    createdAt: now,
    updatedAt: now,
  };

  const response = await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: PALATE_COLLECTION,
    rkey: PALATE_RKEY,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

export async function shareToFeed(
  did: string,
  topDrink: string,
  quadrant: string,
  appUrl: string
): Promise<{ uri: string; cid: string }> {
  const client = getAtprotoClient();
  if (!client) throw new Error('AT Protocol not configured');

  const session = await client.restore(did);
  const agent = new Agent(session);

  const text = `I just discovered my cocktail palate on The Crystal Coupe! My flavor profile lands in ${quadrant} and my top match is ${topDrink}. Discover yours:`;
  const linkStart = text.length + 1;
  const linkText = appUrl;

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: 'app.bsky.feed.post',
    record: {
      $type: 'app.bsky.feed.post',
      text: `${text} ${linkText}`,
      facets: [
        {
          index: {
            byteStart: new TextEncoder().encode(text + ' ').byteLength,
            byteEnd: new TextEncoder().encode(text + ' ' + linkText).byteLength,
          },
          features: [
            {
              $type: 'app.bsky.richtext.facet#link',
              uri: appUrl,
            },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
    },
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

export async function getPalateProfile(did: string): Promise<PalateRecord | null> {
  const client = getAtprotoClient();
  if (!client) return null;

  try {
    const session = await client.restore(did);
    const agent = new Agent(session);

    const response = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: PALATE_COLLECTION,
      rkey: PALATE_RKEY,
    });

    return response.data.value as PalateRecord;
  } catch {
    return null;
  }
}
