import type { APIRoute, GetStaticPaths } from 'astro';
import { loadRegionEntry } from '../../lib/region-entry.server';
import { QUADRANT_ORDER, type QuadrantId } from '../../lib/quadrant';

/** A region's entry as data (`regionEntryPath`), prerendered: what the map's card fetches when a region is opened. */
export const prerender = true;

export const getStaticPaths = (() => QUADRANT_ORDER.map((id) => ({ params: { id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) =>
  new Response(JSON.stringify(await loadRegionEntry(params.id as QuadrantId)), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
