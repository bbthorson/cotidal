import { Agent } from '@atproto/api';
import {
  PALATE_COLLECTION,
  PALATE_RKEY,
  POUR_COLLECTION,
  type PalateRecord,
  type PourRecord,
} from './records';
import type { OAuthSession } from '@bbthorson/atproto-cf-auth/server';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { derivePalateRecord } from '../sensory';

export async function publishPalateProfile(
  session: OAuthSession,
  profile: UserProfile
): Promise<{ uri: string; cid: string }> {
  const agent = new Agent(session);

  // Try to load existing profile to preserve sensory updates
  let existing: PalateRecord | null = null;
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: session.did,
      collection: PALATE_COLLECTION,
      rkey: PALATE_RKEY,
    });
    existing = response.data.value as PalateRecord;
  } catch {
    // Ignore error if record doesn't exist yet
  }

  const record = derivePalateRecord(profile, existing);

  const response = await agent.com.atproto.repo.putRecord({
    repo: session.did,
    collection: PALATE_COLLECTION,
    rkey: PALATE_RKEY,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}


export async function shareToFeed(
  session: OAuthSession,
  topDrink: string,
  quadrant: string,
  appUrl: string
): Promise<{ uri: string; cid: string }> {
  const agent = new Agent(session);

  const text = `My palate lands in ${quadrant} on The Crystal Coupe, and my top match is ${topDrink}. See how far yours is from mine:`;
  const linkText = appUrl;

  const response = await agent.com.atproto.repo.createRecord({
    repo: session.did,
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

export async function getPalateProfile(session: OAuthSession): Promise<PalateRecord | null> {
  try {
    const agent = new Agent(session);

    const response = await agent.com.atproto.repo.getRecord({
      repo: session.did,
      collection: PALATE_COLLECTION,
      rkey: PALATE_RKEY,
    });

    return response.data.value as PalateRecord;
  } catch {
    return null;
  }
}

export async function publishRawPalateRecord(
  session: OAuthSession,
  record: PalateRecord
): Promise<{ uri: string; cid: string }> {
  const agent = new Agent(session);

  const response = await agent.com.atproto.repo.putRecord({
    repo: session.did,
    collection: PALATE_COLLECTION,
    rkey: PALATE_RKEY,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

export async function publishPour(
  session: OAuthSession,
  pour: Omit<PourRecord, '$type'>
): Promise<{ uri: string; cid: string }> {
  const agent = new Agent(session);

  const record: PourRecord = {
    $type: POUR_COLLECTION,
    ...pour,
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: session.did,
    collection: POUR_COLLECTION,
    record,
  });

  return { uri: response.data.uri, cid: response.data.cid };
}

export async function getPours(session: OAuthSession, limit?: number): Promise<PourRecord[]> {
  try {
    const agent = new Agent(session);

    const response = await agent.com.atproto.repo.listRecords({
      repo: session.did,
      collection: POUR_COLLECTION,
      limit: limit || 50,
      reverse: true, // Show newest first
    });

    return response.data.records.map((r) => r.value as PourRecord);
  } catch (e) {
    console.error('Failed to get pours:', e);
    return [];
  }
}

// Backwards compatibility aliases
export const publishDrinkLog = publishPour;
export const getDrinkLogs = getPours;
