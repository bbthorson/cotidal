import { settings as copy } from '../copy';
import { readPublicPalate } from '../atproto/public-read';
import { memberCodeUrl, qrPath } from '../map/coaster';
import { sampleTerrain } from '../palate/terrain';
import { ratingsOf, terrainOf } from '../palate/taste-reading';
import { oauthSession } from '../atproto/session';
import { publicMapPath } from '../atproto/paths';
import { getPalateProfile, shareToFeed } from '../atproto/publish';
import { authorizeContext } from '../mcp/authorize-context.server';
import { disconnectAssistant, listAssistants, type ConnectedAssistant } from '../settings/assistants.server';
import { quadrantFor } from '../map/coordinates';
import { closestDrinks } from '../drinks/search';
import { loadRegister } from '../drinks/register.server';
import { titleOf } from '../drinks/register';

export interface MemberAccount {
  did: string;
  handle: string | null;
}

/**
 * Handle POST form actions on `/settings` (`intent=share` or disconnecting an
 * assistant grant) and return the Post/Redirect/Get target path.
 */
export async function handleSettingsPost(request: Request, url: URL, account: MemberAccount): Promise<string> {
  const form = await request.formData().catch(() => null);
  if (form?.get('intent') === 'share') {
    let outcome = 'shared';
    try {
      const session = await oauthSession(request);
      const palate = session ? await getPalateProfile(session) : null;
      const at = palate?.mapCoordinates;
      if (!session || !at) {
        outcome = 'nomap';
      } else {
        const nearest = closestDrinks(at, 1)[0];
        const register = await loadRegister();
        const mapUrl = new URL(publicMapPath(session.did), url.origin).toString();
        await shareToFeed(session, nearest ? titleOf(register, nearest.name) : '', quadrantFor(at.x, at.y).name, mapUrl);
      }
    } catch (e) {
      console.error('Could not share to the feed:', e);
      outcome = 'sharefailed';
    }
    return `/settings?${outcome}=1#map`;
  }

  let outcome = 'disconnected';
  try {
    const context = await authorizeContext(url);
    if (!context) throw new Error('Assistants are off here');
    await disconnectAssistant(context.oauth, account.did, String(form?.get('grant') ?? ''));
  } catch (e) {
    console.error('Could not disconnect an assistant:', e);
    outcome = 'failed';
  }
  return `/settings?${outcome}=1#assistants`;
}

/**
 * Load all server-side view data for `/settings`.
 */
export async function loadSettingsPage(url: URL, account: MemberAccount) {
  const context = await authorizeContext(url);
  let assistants: ConnectedAssistant[] | null = null;
  let listFailed = false;
  if (context) {
    try {
      assistants = await listAssistants(context.oauth, account.did);
    } catch (e) {
      console.error('Could not list connected assistants:', e);
      listFailed = true;
    }
  }

  const has = (key: string) => url.searchParams.has(key);
  const assistantNotice = has('disconnected') ? copy.disconnected : has('failed') ? copy.disconnectFailed : null;
  const mapNotice = has('shared')
    ? { text: copy.shared, error: false }
    : has('sharefailed')
      ? { text: copy.shareFailed, error: true }
      : has('nomap')
        ? { text: copy.shareNoMap, error: true }
        : null;

  const palate = await readPublicPalate(account.did, { taste: true });
  const ground =
    palate.status === 'ok'
      ? sampleTerrain(terrainOf(palate.taste?.start ?? null, palate.palate, palate.taste?.pours ?? []), 0.5)
      : null;
  const rated = palate.status === 'ok' ? ratingsOf(palate.taste?.pours ?? []) : new Map<string, number>();
  const codeHref = memberCodeUrl(url.origin, account.did);
  const qr = qrPath(codeHref);

  return {
    assistantsEnabled: !!context,
    assistants,
    listFailed,
    assistantNotice,
    mapNotice,
    ground,
    rated,
    codeHref,
    qr,
    name: account.handle ? `@${account.handle}` : account.did,
    mapHref: publicMapPath(account.handle ?? account.did),
  };
}
