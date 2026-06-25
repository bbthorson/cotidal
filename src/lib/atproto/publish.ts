import { Agent } from '@atproto/api';
import { PALATE_COLLECTION, PALATE_RKEY, DRINK_LOG_COLLECTION, type PalateRecord, type DrinkLogRecord } from './lexicon';
import { getAtprotoClient } from './client';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { derivePalateRecord } from '../sensory';

export async function publishPalateProfile(
  did: string,
  profile: UserProfile
): Promise<{ uri: string; cid: string }> {
  const client = getAtprotoClient();
  if (!client) throw new Error('AT Protocol not configured');

  const session = await client.restore(did);
  const agent = new Agent(session);

  // Try to load existing profile to preserve sensory updates
  let existing: PalateRecord | null = null;
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: PALATE_COLLECTION,
      rkey: PALATE_RKEY,
    });
    existing = response.data.value as PalateRecord;
  } catch {
    // Ignore error if record doesn't exist yet
  }

  const record = derivePalateRecord(profile, existing);

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

export async function publishRawPalateRecord(
  did: string,
  record: PalateRecord
): Promise<{ uri: string; cid: string }> {
  const client = getAtprotoClient();
  if (!client) throw new Error('AT Protocol not configured');

  const session = await client.restore(did);
  const agent = new Agent(session);

  const response = await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: PALATE_COLLECTION,
    rkey: PALATE_RKEY,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

export async function publishDrinkLog(
  did: string,
  log: Omit<DrinkLogRecord, '$type'>
): Promise<{ uri: string; cid: string }> {
  const client = getAtprotoClient();
  if (!client) throw new Error('AT Protocol not configured');

  const session = await client.restore(did);
  const agent = new Agent(session);

  const record: DrinkLogRecord = {
    $type: DRINK_LOG_COLLECTION,
    ...log,
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: DRINK_LOG_COLLECTION,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

export async function getDrinkLogs(did: string, limit?: number): Promise<DrinkLogRecord[]> {
  const client = getAtprotoClient();
  if (!client) return [];

  try {
    const session = await client.restore(did);
    const agent = new Agent(session);

    const response = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: DRINK_LOG_COLLECTION,
      limit: limit || 50,
      reverse: true, // Show newest first
    });

    return response.data.records.map(r => r.value as DrinkLogRecord);
  } catch (e) {
    console.error('Failed to get drink logs:', e);
    return [];
  }
}
