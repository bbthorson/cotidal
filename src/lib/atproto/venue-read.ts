import { z } from 'zod';
import { MENU_COLLECTION, VENUE_COLLECTION } from './records';
import { resolvePublicRepo, type PublicActor, type ReadOptions } from './public-read';
import { domainMatchesHandle } from './venue-verify';
import { drinkOf } from '../drink-match';
import type { Drink } from '../data';

/** `app.cotidal.venue` is always held at literal rkey `self` in the venue's repo. */
const VENUE_RKEY = 'self';

/**
 * Reading a bar's public `app.cotidal.venue` (at `rkey: self`) and its
 * `currentMenu` (`app.cotidal.menu`) directly from the bar's AT Protocol
 * repository, with no session.
 */

const PublicVenueSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  website: z.string().max(500).optional(),
  currentMenu: z.object({ uri: z.string() }).optional(),
  createdAt: z.string().optional(),
});

const PublicMenuItemSchema = z.object({
  drink: z.object({ name: z.string().min(1).max(200) }),
  description: z.string().max(1000).optional(),
  price: z
    .object({
      amount: z.number().int().min(0),
      currency: z.string().length(3),
    })
    .optional(),
});

const PublicMenuSchema = z.object({
  title: z.string().max(200).optional(),
  publishedAt: z.string(),
  sections: z
    .array(
      z.object({
        name: z.string().max(200).optional(),
        items: z.array(PublicMenuItemSchema).max(200),
      })
    )
    .max(40)
    .optional(),
});

export interface PublicMenuItem {
  name: string;
  description: string | null;
  price: { amount: number; currency: string } | null;
  placed: Drink | null;
}

export interface PublicMenuSection {
  name: string | null;
  items: PublicMenuItem[];
}

export interface PublicMenu {
  title: string | null;
  publishedAt: string;
  sections: PublicMenuSection[];
}

export interface PublicVenue {
  name: string;
  description: string | null;
  website: string | null;
  /** True when the venue's website domain matches its bidirectionally verified AT Protocol handle. */
  domainVerified: boolean;
  menu: PublicMenu | null;
}

export type PublicVenueResult =
  | { status: 'invalid' }
  | { status: 'not-found' }
  | { status: 'unavailable'; actor: PublicActor | null }
  | { status: 'no-venue'; actor: PublicActor }
  | { status: 'ok'; actor: PublicActor; venue: PublicVenue };

/** Extract `{ collection, rkey }` from an `at://<did>/<collection>/<rkey>` URI belonging to `expectedDid`. */
function parseSameRepoMenuUri(uri: string, expectedDid: string): string | null {
  const prefix = `at://${expectedDid}/${MENU_COLLECTION}/`;
  if (!uri.startsWith(prefix)) return null;
  const rkey = uri.slice(prefix.length);
  return rkey && !rkey.includes('/') ? rkey : null;
}

function safeWebsite(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function readPublicVenue(
  input: string,
  options: ReadOptions = {}
): Promise<PublicVenueResult> {
  const repo = await resolvePublicRepo(input, options);
  if (repo.status !== 'ok') return repo;

  try {
    const { value } = await repo.getRecord(VENUE_COLLECTION, VENUE_RKEY);
    if (!value) return { status: 'no-venue', actor: repo.actor };

    const parsedVenue = PublicVenueSchema.safeParse(value);
    if (!parsedVenue.success) return { status: 'no-venue', actor: repo.actor };

    let menu: PublicMenu | null = null;
    const menuRkey = parsedVenue.data.currentMenu?.uri
      ? parseSameRepoMenuUri(parsedVenue.data.currentMenu.uri, repo.actor.did)
      : null;

    if (menuRkey) {
      const menuRec = await repo.getRecord(MENU_COLLECTION, menuRkey).catch(() => ({ status: 404, value: null }));
      if (menuRec.value) {
        const parsedMenu = PublicMenuSchema.safeParse(menuRec.value);
        if (parsedMenu.success) {
          menu = {
            title: parsedMenu.data.title ?? null,
            publishedAt: parsedMenu.data.publishedAt,
            sections: (parsedMenu.data.sections ?? []).map((sec) => ({
              name: sec.name ?? null,
              items: sec.items.map((item) => ({
                name: item.drink.name,
                description: item.description ?? null,
                price: item.price ?? null,
                placed: drinkOf(item.drink),
              })),
            })),
          };
        }
      }
    }

    const website = safeWebsite(parsedVenue.data.website);
    return {
      status: 'ok',
      actor: repo.actor,
      venue: {
        name: parsedVenue.data.name,
        description: parsedVenue.data.description ?? null,
        website,
        domainVerified: domainMatchesHandle(website, repo.actor.handle),
        menu,
      },
    };
  } catch (e) {
    console.error('readPublicVenue:', e);
    return { status: 'unavailable', actor: repo.actor };
  }
}
