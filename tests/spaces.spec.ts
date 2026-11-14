import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SpaceRef, isSpaceRefString, isSpaceAtUriString, parseAtUriString } from 'atproto-syntax-spaces';
import { SpacePermission } from 'atproto-oauth-scopes-spaces';
import {
  BAR_SPACE_POLICY,
  PATRON_BAR_SCOPE,
  VENUE_BAR_SCOPE,
  STAFF_BAR_SCOPE,
  barPourUri,
  barSpace,
  barSpaceVenue,
  candidateBarSpace,
  parseSpaceUri,
  pourBelongsInBarSpace,
  spaceScope,
} from '../src/lib/atproto/spaces';
import { BAR_SPACE_KEY, BAR_SPACE_TYPE, POUR_COLLECTION } from '../src/lib/atproto/vocab';

/*
 * The released @atproto/syntax cannot parse a space URI, so the Spaces alpha
 * of it (`atproto-syntax-spaces`) is the reference these are held to. When the
 * beta ships, repoint the alias; a change of URI shape fails here first.
 */

const VENUE = 'did:plc:ewvi7nxzyoun6zhxrhs64oiz';
const PATRON = 'did:plc:44ybard66vv44zksje25o7dz';
const RKEY = '3l3qo2vutsw2b';

test('Spaces: a bar space is the reference implementation’s space ref', () => {
  const ref = barSpace(VENUE);
  expect(ref).toBe(String(new SpaceRef(VENUE, BAR_SPACE_TYPE, BAR_SPACE_KEY)));
  expect(isSpaceRefString(ref)).toBe(true);
  expect(barSpaceVenue(ref)).toBe(VENUE);
});

test('Spaces: a shared pour’s URI is the reference implementation’s record URI', () => {
  const uri = barPourUri(VENUE, PATRON, RKEY);
  const reference = new SpaceRef(VENUE, BAR_SPACE_TYPE, BAR_SPACE_KEY).recordUri(PATRON, POUR_COLLECTION, RKEY);
  expect(uri).toBe(String(reference));
  expect(isSpaceAtUriString(uri)).toBe(true);
  expect(isSpaceRefString(uri)).toBe(false);
  expect(parseSpaceUri(uri)).toEqual({
    spaceDid: VENUE,
    spaceType: BAR_SPACE_TYPE,
    skey: BAR_SPACE_KEY,
    authorDid: PATRON,
    collection: POUR_COLLECTION,
    rkey: RKEY,
  });
  // A record in the space is not the space.
  expect(barSpaceVenue(uri)).toBeNull();
});

test('Spaces: parsing refuses what the reference refuses', () => {
  const cases = [
    `at://${VENUE}/space/${BAR_SPACE_TYPE}/${BAR_SPACE_KEY}`,
    `at://${VENUE}/space/${BAR_SPACE_TYPE}/${BAR_SPACE_KEY}/${PATRON}/${POUR_COLLECTION}/${RKEY}`,
    `at://attaboy.nyc/space/${BAR_SPACE_TYPE}/${BAR_SPACE_KEY}`, // handle authority
    `at://${VENUE}/space/${BAR_SPACE_TYPE}/${BAR_SPACE_KEY}/attaboy.nyc/${POUR_COLLECTION}/${RKEY}`,
    `at://${VENUE}/space/notansid/${BAR_SPACE_KEY}`,
    `at://${VENUE}/space/${BAR_SPACE_TYPE}`,
    `at://${VENUE}/space/${BAR_SPACE_TYPE}/${BAR_SPACE_KEY}/`,
    `at://${VENUE}/space/${BAR_SPACE_TYPE}/${BAR_SPACE_KEY}/${PATRON}/${POUR_COLLECTION}`,
    `at://${VENUE}/${POUR_COLLECTION}/${RKEY}`, // a public record
  ];
  for (const uri of cases) {
    const reference = parseAtUriString(uri);
    const ours = parseSpaceUri(uri) !== null;
    const theirs = reference.success && reference.value.isSpace;
    expect(ours, uri).toBe(theirs);
  }
});

test('Spaces: only a pour that names the bar belongs in its space', () => {
  const here = { venue: { entity: { name: 'Attaboy', domain: 'attaboy.nyc', did: VENUE } } };
  const elsewhere = { venue: { entity: { name: 'Elsewhere', did: PATRON } } };
  const unclaimed = { venue: { entity: { name: 'Attaboy', domain: 'attaboy.nyc' } } };
  const space = barSpace(VENUE);

  expect(pourBelongsInBarSpace(here, space)).toBe(true);
  expect(pourBelongsInBarSpace(elsewhere, space)).toBe(false);
  expect(pourBelongsInBarSpace(unclaimed, space)).toBe(false);
  expect(pourBelongsInBarSpace({}, space)).toBe(false);
  expect(pourBelongsInBarSpace(here, `at://${VENUE}/space/app.example.other/self`)).toBe(false);

  // An unclaimed bar has no space to share into.
  expect(candidateBarSpace(here.venue)).toBe(space);
  expect(candidateBarSpace(unclaimed.venue)).toBeNull();
  expect(candidateBarSpace(undefined)).toBeNull();
});

test('Spaces: the lexicon agrees with the constants and the policy keeps patrons apart', () => {
  const lexicon = JSON.parse(readFileSync(`src/lib/atproto/lexicons/${BAR_SPACE_TYPE}.json`, 'utf8'));
  expect(lexicon.defs.main.type).toBe('space');
  expect(lexicon.defs.main.key).toBe(`literal:${BAR_SPACE_KEY}`);
  expect(lexicon.defs.main.collections).toContain(POUR_COLLECTION);

  // Patrons write without being added, and do not read one another.
  expect(BAR_SPACE_POLICY.publicWrite).toBe(true);
  expect(BAR_SPACE_POLICY.publicRead).toBe(false);
  expect(BAR_SPACE_POLICY.publishMembers).toBe(false);
});

test('Spaces: scopes are the grant format', () => {
  expect(spaceScope(BAR_SPACE_TYPE)).toBe('space:app.cotidal.bar');
  expect(PATRON_BAR_SCOPE).toBe(
    'space:app.cotidal.bar?authority=*&collection=app.cotidal.pour&action=read_self&action=create&action=delete',
  );
  // A patron never holds `read`: that would cover every patron's pours.
  expect(PATRON_BAR_SCOPE).not.toMatch(/action=read(&|$)/);
  expect(VENUE_BAR_SCOPE).toBe('space:app.cotidal.bar?action=read&manage=create&manage=update&manage=delete');
  expect(STAFF_BAR_SCOPE).toBe('space:app.cotidal.bar?authority=*&action=read');
});

test('Spaces: each scope parses in the reference implementation and grants what it should', () => {
  // `atproto-oauth-scopes-spaces` is the Spaces alpha of @atproto/oauth-scopes,
  // the code a PDS uses to decide what a token may do.
  const grant = (scope: string) => {
    const permission = SpacePermission.fromString(scope);
    expect(permission, scope).not.toBeNull();
    expect(String(permission), scope).toBe(scope);
    return permission!;
  };
  const bar = { spaceType: BAR_SPACE_TYPE, authority: VENUE, skey: BAR_SPACE_KEY } as const;
  const sharePour = { ...bar, action: 'create', collection: POUR_COLLECTION } as const;
  const readAll = { ...bar, action: 'read' } as const;
  const readOwn = { ...bar, action: 'read_self' } as const;
  const openSpace = { ...bar, authority: 'self', manage: 'create' } as const;

  const patron = grant(PATRON_BAR_SCOPE);
  expect(patron.matches(sharePour)).toBe(true);
  expect(patron.matches(readOwn)).toBe(true);
  expect(patron.matches(readAll)).toBe(false);
  expect(patron.matches({ ...sharePour, collection: 'app.cotidal.palate' })).toBe(false);
  expect(patron.matches({ ...sharePour, spaceType: 'app.example.other' })).toBe(false);

  const staff = grant(STAFF_BAR_SCOPE);
  expect(staff.matches(readAll)).toBe(true);
  expect(staff.matches(sharePour)).toBe(false);

  const venue = grant(VENUE_BAR_SCOPE);
  expect(venue.matches(openSpace)).toBe(true);
  expect(venue.matches({ ...readAll, authority: 'self' })).toBe(true);
  // Its own space only: `authority` defaults to the signed-in account.
  expect(venue.matches(readAll)).toBe(false);
});
