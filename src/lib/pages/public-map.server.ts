import type { Drink } from '../drinks/data';
import { compare as compareCopy, publicMap, site, taste as taste_ } from '../copy';
import { readPublicPalate, type PublicPalateResult } from '../atproto/public-read';
import { publicMapPath } from '../atproto/paths';
import { oauthSession } from '../atproto/session';
import { readFollowedPalates, type FollowedOverlap } from '../atproto/follows-overlap';
import type { MapPoint } from '../palate/overlap';
import { compareWith } from '../palate/compare';
import { leanings, sampleTerrain } from '../palate/terrain';
import { evidenceFor, menuOf, ratingsOf, terrainOf } from '../palate/taste-reading';
import { loadRegister } from '../drinks/register.server';
import { titleOf } from '../drinks/register';
import { readMapView } from '../map/map-url';

/**
 * Server-side loader for `/p/[actor]` (and `/map?palate=...` rewrites).
 * Resolves the subject palate, optional comparison palate (`with=` or signed-in
 * visitor), follows overlap on self-view, HTTP status/cache headers, and all
 * derived view-model fields.
 */
export async function loadPublicMapPage(actorParam: string, url: URL, request: Request) {
  const result = await readPublicPalate(actorParam, { taste: true });
  const { drink: viewDrink, with: withParam } = readMapView(url.searchParams);

  const session = result.status === 'ok' ? await oauthSession(request) : null;
  const isSelf = !!session && result.status === 'ok' && session.did === result.actor.did;

  const subject: MapPoint | null =
    result.status === 'ok'
      ? { x: result.palate.x, y: result.palate.y, aversions: result.palate.aversions }
      : null;

  const groundOf = (r: PublicPalateResult) =>
    r.status === 'ok' ? terrainOf(r.taste?.start ?? null, r.palate, r.taste?.pours ?? []) : null;

  const otherActor = withParam ?? (session && !isSelf ? session.did : null);
  const otherResult =
    subject && otherActor && result.status === 'ok' && otherActor !== result.actor.did && otherActor !== result.actor.handle
      ? await readPublicPalate(otherActor, { taste: true })
      : null;
  const other = otherResult?.status === 'ok' ? otherResult : null;
  const otherIsYou = !!session && !!other && other.actor.did === session.did;
  const otherTerrain = other ? groundOf(other) : null;
  const otherGround = otherTerrain ? sampleTerrain(otherTerrain, 0.5) : null;

  const readerHasNoMap = !isSelf && (!session || (!withParam && !other));
  const isSample = (result.status === 'ok' || result.status === 'no-palate') && result.actor.sample === true;
  const subjectWho = isSelf ? publicMap.drinkFromYou : publicMap.title(result.status === 'ok' ? (result.actor.handle ?? result.actor.did) : '');
  const otherWho = other ? (otherIsYou ? publicMap.drinkFromYou : publicMap.title(other.actor.handle ?? other.actor.did)) : '';
  const subjectWhose = isSelf ? compareCopy.yours : compareCopy.theirs(subjectWho);

  const terrain = groundOf(result);
  const follows: FollowedOverlap[] =
    isSelf && session && subject && terrain
      ? await readFollowedPalates(session.did, { terrain, aversions: subject.aversions }, { budgetMs: 2500 })
      : [];
  const register = subject ? await loadRegister() : {};

  const taste = result.status === 'ok' ? (result.taste ?? null) : null;
  const ground = terrain ? sampleTerrain(terrain, 0.5) : null;
  const lean = terrain ? leanings(terrain, 2) : [];
  const rated = ratingsOf(taste?.pours ?? []);

  const reasonFor = (d: Drink) =>
    terrain
      ? publicMap.reason(
          evidenceFor(terrain, d).map((e) => ({ ...e, name: titleOf(register, e.name) })),
          rated.get(d.name)
        )
      : '';

  const subjectSide = terrain && subject ? { terrain, aversions: subject.aversions, point: { x: subject.x, y: subject.y } } : null;
  const comparison =
    subjectSide && otherTerrain && other
      ? compareWith(subjectSide, {
          kind: 'person',
          side: { terrain: otherTerrain, aversions: other.palate.aversions, point: { x: other.palate.x, y: other.palate.y } },
        })
      : null;
  const menu = terrain && subject && !comparison ? menuOf(terrain, subject.aversions, rated) : [];

  const entryHref = (drink: Drink) => {
    const entry = register[drink.name];
    return entry ? `/drinks/${entry.slug}` : null;
  };
  const titleFor = (drink: Drink) => titleOf(register, drink.name);

  const name =
    result.status === 'ok' || result.status === 'no-palate'
      ? (result.actor.handle ?? result.actor.did)
      : result.status === 'unavailable' && result.actor
        ? (result.actor.handle ?? result.actor.did)
        : null;

  const selfLink =
    isSelf && result.status === 'ok'
      ? new URL(publicMapPath(result.actor.handle ?? result.actor.did), url).toString()
      : null;

  const httpStatus =
    result.status === 'invalid' || result.status === 'not-found' || result.status === 'no-palate'
      ? 404
      : result.status === 'unavailable'
        ? 503
        : 200;

  const cacheControl = session ? 'private, no-store' : 'public, max-age=60, s-maxage=300';
  const pageTitle = name ? `${publicMap.title(name)} · ${site.name}` : site.name;
  const description = name && lean.length > 0 ? publicMap.description(name, taste_.phrases(lean)) : site.description;
  const canonical = result.status === 'ok' ? publicMapPath(result.actor.handle ?? result.actor.did) : undefined;
  const subjectHandle = result.status === 'ok' ? result.actor.handle : null;

  return {
    result,
    viewDrink,
    withParam,
    session,
    isSelf,
    subject,
    other,
    otherIsYou,
    otherGround,
    readerHasNoMap,
    isSample,
    subjectWho,
    otherWho,
    subjectWhose,
    follows,
    ground,
    lean,
    rated,
    reasonFor,
    subjectSide,
    comparison,
    menu,
    entryHref,
    titleFor,
    titleOfName: (n: string) => titleOf(register, n),
    name,
    selfLink,
    httpStatus,
    cacheControl,
    pageTitle,
    description,
    canonical,
    subjectHandle,
  };
}
