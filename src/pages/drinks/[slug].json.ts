import { getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';
import { drinkEntryData } from '../../lib/drinks/drink-entry.server';

/**
 * A drink's entry as data (`drinkEntryPath`), prerendered beside its page:
 * what the map's card fetches when a drink is opened, so the island carries
 * no write-up it has not been asked for.
 */
export const prerender = true;

export const getStaticPaths = (async () => {
  const entries = await getCollection('drinks');
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(drinkEntryData(props.entry)), { headers: { 'content-type': 'application/json; charset=utf-8' } });
