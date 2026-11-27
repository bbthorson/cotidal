/**
 * Single source of truth for interface copy, organized by surface:
 * - `site.ts`: landing page, chrome, how-it-works, sharing, global errors
 * - `map.ts`: map screen, drinks, regions, comparisons, public map
 * - `pours.ts`: discovery quiz, pour form, post-pour reveal
 * - `account.ts`: sign-in, settings, venues/bars
 * - `mcp.ts`: chat assistants, OAuth consent, MCP tools
 *
 * No page, layout or component may type words into its markup (eslint.config.mjs
 * rejects it).
 */
export * from './site';
export * from './map';
export * from './pours';
export * from './account';
export * from './mcp';
