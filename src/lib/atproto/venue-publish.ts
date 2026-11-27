import { Agent } from '@atproto/api';
import type { OAuthSession } from '@bbthorson/atproto-cf-auth/server';
import {
  MENU_COLLECTION,
  MenuRecordSchema,
  VENUE_COLLECTION,
  VenueRecordSchema,
  type MenuRecord,
  type VenueRecord,
} from './records';
import { splitMenuLine } from '../drinks/ingredient-match';

const VENUE_RKEY = 'self';

export interface PublishVenueInput {
  name: string;
  description?: string;
  website?: string;
  hours?: string;
  reservationsUrl?: string;
  menuStyle?: 'written' | 'bespoke';
  externalIds?: { osm?: string; fsq?: string };
  menuTitle?: string;
  menuLines?: string;
}

/**
 * Parse pasted menu lines (`Name` or `Name — ingredients`) into an immutable
 * `app.cotidal.menu` record validated against `MenuRecordSchema`.
 */
export function buildMenuRecord(
  did: string,
  input: { venueName: string; title?: string; lines: string },
  now: Date = new Date()
): MenuRecord | null {
  const parsedItems = input.lines
    .split(/\r?\n/)
    .map((line) => splitMenuLine(line))
    .filter((x) => x.name.length > 0)
    .slice(0, 200);

  if (parsedItems.length === 0) return null;

  const iso = now.toISOString();
  return MenuRecordSchema.parse({
    $type: MENU_COLLECTION,
    venue: {
      entity: {
        name: input.venueName.trim(),
        did,
      },
    },
    ...(input.title?.trim() ? { title: input.title.trim() } : {}),
    publishedAt: iso,
    sections: [
      {
        items: parsedItems.map((item) => ({
          drink: { name: item.name },
          ...(item.description ? { description: item.description } : {}),
        })),
      },
    ],
    createdAt: iso,
  });
}

/**
 * Build an `app.cotidal.venue` record (`rkey: self`) validated against
 * `VenueRecordSchema`.
 */
export function buildVenueRecord(
  input: {
    name: string;
    description?: string;
    website?: string;
    hours?: string;
    reservationsUrl?: string;
    menuStyle?: 'written' | 'bespoke';
    externalIds?: { osm?: string; fsq?: string };
  },
  currentMenu?: { name: string; uri: string; cid?: string },
  now: Date = new Date()
): VenueRecord {
  const iso = now.toISOString();
  const osm = input.externalIds?.osm?.trim();
  const fsq = input.externalIds?.fsq?.trim();
  const externalIds = osm || fsq ? { ...(osm ? { osm } : {}), ...(fsq ? { fsq } : {}) } : undefined;
  return VenueRecordSchema.parse({
    $type: VENUE_COLLECTION,
    name: input.name.trim(),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(input.website?.trim() ? { website: input.website.trim() } : {}),
    ...(input.hours?.trim() ? { hours: input.hours.trim() } : {}),
    ...(input.reservationsUrl?.trim() ? { reservationsUrl: input.reservationsUrl.trim() } : {}),
    ...(input.menuStyle ? { menuStyle: input.menuStyle } : {}),
    ...(externalIds ? { externalIds } : {}),
    ...(currentMenu ? { currentMenu } : {}),
    createdAt: iso,
  });
}

/**
 * Write an immutable `app.cotidal.menu` snapshot (when menu lines are given)
 * and claim/update `app.cotidal.venue` at `rkey: self` in the bar's own repo.
 */
export async function publishVenueAndMenu(
  session: OAuthSession,
  input: PublishVenueInput
): Promise<{ venueUri: string; menuUri: string | null }> {
  const agent = new Agent(session);
  const now = new Date();

  let currentMenu: { name: string; uri: string; cid?: string } | undefined;
  const menuRecord = input.menuLines?.trim()
    ? buildMenuRecord(session.did, { venueName: input.name, title: input.menuTitle, lines: input.menuLines }, now)
    : null;

  if (menuRecord) {
    const res = await agent.com.atproto.repo.createRecord({
      repo: session.did,
      collection: MENU_COLLECTION,
      record: menuRecord,
    });
    currentMenu = {
      name: input.menuTitle?.trim() || `${input.name.trim()} Menu`,
      uri: res.data.uri,
      cid: res.data.cid,
    };
  }

  const venueRecord = buildVenueRecord(
    {
      name: input.name,
      description: input.description,
      website: input.website,
      hours: input.hours,
      reservationsUrl: input.reservationsUrl,
      menuStyle: input.menuStyle,
      externalIds: input.externalIds,
    },
    currentMenu,
    now
  );

  const venueRes = await agent.com.atproto.repo.putRecord({
    repo: session.did,
    collection: VENUE_COLLECTION,
    rkey: VENUE_RKEY,
    record: venueRecord,
  });

  return { venueUri: venueRes.data.uri, menuUri: currentMenu?.uri ?? null };
}
