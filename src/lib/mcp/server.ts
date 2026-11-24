import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { mcp, quadrants } from '../copy';
import { CATA, DEVIATIONS } from '../atproto/vocab';
import { DRAFT_LIMITS } from '../pour-draft';
import { regionPath } from '../quadrant';
import {
  comparePalates,
  draftPour,
  getBarMenu,
  getDrink,
  getPalate,
  logMemberPour,
  myBars,
  myFollows,
  myPours,
  rankMenu,
  recommendDrinks,
  recommendForGroup,
  searchDrinks,
  type ToolContext,
  type ToolResult,
} from './tools';

/**
 * The tools, prompts, and resources in `tools.ts`, registered on an MCP
 * server. Built per request: the endpoint is stateless (no MCP session,
 * nothing kept between calls), so a server is cheap and carries only the
 * request's context.
 */

const DRINK_TYPES = ['Cocktail', 'Wine', 'Beer', 'Spirit'] as const;

/** A string from a stranger: bounded before it reaches a lookup. */
const handle = (description: string) => z.string().trim().min(1).max(256).describe(description);

const menuEntrySchema = z.union([
  z.string().trim().min(1).max(400),
  z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(400).optional(),
    ingredients: z.array(z.string().trim().min(1).max(100)).max(25).optional(),
  }),
]);

function answer<T>(result: ToolResult<T>): CallToolResult {
  if (!result.ok) return { isError: true, content: [{ type: 'text', text: result.message }] };
  return {
    content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
    structuredContent: result.data as Record<string, unknown>,
  };
}

/** The tools that write as the member, and so need `pours:write` (step-up at `/mcp/me`). */
export const WRITE_TOOLS: readonly string[] = ['log_pour'];

export function createMcpServer(ctx: ToolContext): McpServer {
  const member = ctx.member;
  const server = new McpServer(
    { name: mcp.name, version: '0.2.0' },
    { instructions: `${mcp.about} ${member ? mcp.memberInstructions : mcp.instructions}` }
  );
  const t = mcp.tools;
  const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

  // At `/mcp/me` a handle may be left out to mean the member; at `/mcp` it is required.
  const who = member
    ? z.string().trim().min(1).max(256).optional().describe(mcp.memberHandle)
    : handle(t.getPalate.handle);
  const actor = (input: string | undefined) => input ?? member?.did ?? '';

  server.registerTool(
    'get_palate',
    {
      title: t.getPalate.title,
      description: t.getPalate.description,
      inputSchema: { handle: who },
      annotations: readOnly,
    },
    async ({ handle }) => answer(await getPalate(actor(handle), ctx))
  );

  server.registerTool(
    'recommend_drinks',
    {
      title: t.recommend.title,
      description: t.recommend.description,
      inputSchema: {
        handle: who,
        count: z.number().int().min(1).max(20).optional().describe(t.recommend.count),
        type: z.enum(DRINK_TYPES).optional().describe(t.recommend.type),
      },
      annotations: readOnly,
    },
    async ({ handle, count, type }) => answer(await recommendDrinks(actor(handle), { count, type }, ctx))
  );

  server.registerTool(
    'rank_menu',
    {
      title: t.rankMenu.title,
      description: t.rankMenu.description,
      inputSchema: {
        handle: who,
        items: z.array(menuEntrySchema).min(1).max(100).describe(t.rankMenu.items),
      },
      annotations: readOnly,
    },
    async ({ handle, items }) => answer(await rankMenu(actor(handle), items, ctx))
  );

  server.registerTool(
    'compare_palates',
    {
      title: t.compare.title,
      description: t.compare.description,
      inputSchema: { handle: who, other: handle(t.compare.other) },
      annotations: readOnly,
    },
    async ({ handle, other }) => answer(await comparePalates(actor(handle), other, ctx))
  );

  server.registerTool(
    'recommend_for_group',
    {
      title: t.recommendForGroup.title,
      description: t.recommendForGroup.description,
      inputSchema: {
        handles: z.array(z.string().trim().min(1).max(256)).min(1).max(8).describe(t.recommendForGroup.handles),
        count: z.number().int().min(1).max(15).optional().describe(t.recommendForGroup.count),
        type: z.enum(DRINK_TYPES).optional().describe(t.recommendForGroup.type),
      },
      annotations: readOnly,
    },
    async ({ handles, count, type }) => {
      const list = member && !handles.includes(member.did) && handles.length === 1 ? [member.did, ...handles] : handles;
      return answer(await recommendForGroup(list, { count, type }, ctx));
    }
  );

  server.registerTool(
    'get_drink',
    {
      title: t.getDrink.title,
      description: t.getDrink.description,
      inputSchema: { name: z.string().trim().min(1).max(200).describe(t.getDrink.name) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name }) => answer(getDrink(name, ctx))
  );

  server.registerTool(
    'get_bar_menu',
    {
      title: t.getBarMenu.title,
      description: t.getBarMenu.description,
      inputSchema: {
        bar: handle(t.getBarMenu.bar),
        handle: z.string().trim().min(1).max(256).optional().describe(member ? mcp.memberHandle : t.getPalate.handle),
      },
      annotations: readOnly,
    },
    async ({ bar, handle: drinker }) => answer(await getBarMenu(bar, drinker ?? member?.did, ctx))
  );

  server.registerTool(
    'draft_pour',
    {
      title: t.draftPour.title,
      description: t.draftPour.description,
      inputSchema: {
        drink: z.string().trim().min(1).max(DRAFT_LIMITS.drink).describe(t.draftPour.drink),
        atHome: z.boolean().optional().describe(t.draftPour.atHome),
        bar: z.string().trim().max(DRAFT_LIMITS.bar).optional().describe(t.draftPour.bar),
        whatWasOff: z.array(z.enum(DEVIATIONS)).max(DEVIATIONS.length).optional().describe(t.draftPour.whatWasOff),
        notes: z.array(z.enum(CATA)).max(CATA.length).optional().describe(t.draftPour.notes),
        note: z.string().trim().max(DRAFT_LIMITS.note).optional().describe(t.draftPour.note),
      },
      // It writes nothing: the link does nothing until the person logs it.
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (input) => answer(draftPour(input, ctx))
  );

  server.registerTool(
    'search_drinks',
    {
      title: t.searchDrinks.title,
      description: t.searchDrinks.description,
      inputSchema: { query: z.string().trim().min(1).max(100).describe(t.searchDrinks.query) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query }) => answer(searchDrinks(query, ctx))
  );

  if (member) {
    server.registerTool(
      'my_pours',
      {
        title: t.myPours.title,
        description: t.myPours.description,
        inputSchema: { count: z.number().int().min(1).max(50).optional().describe(t.myPours.count) },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ count }) => answer(await myPours(count, ctx))
    );

    server.registerTool(
      'my_bars',
      {
        title: t.myBars.title,
        description: t.myBars.description,
        inputSchema: {},
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async () => answer(await myBars(ctx))
    );

    server.registerTool(
      'my_follows',
      {
        title: t.myFollows.title,
        description: t.myFollows.description,
        inputSchema: {},
        annotations: readOnly,
      },
      async () => answer(await myFollows(ctx))
    );

    server.registerTool(
      'log_pour',
      {
        title: t.logPour.title,
        description: t.logPour.description,
        inputSchema: {
          drink: z.string().trim().min(1).max(DRAFT_LIMITS.drink).describe(t.draftPour.drink),
          hedonic: z.number().int().min(1).max(9).describe(t.logPour.hedonic),
          atHome: z.boolean().optional().describe(t.draftPour.atHome),
          bar: z.string().trim().max(DRAFT_LIMITS.bar).optional().describe(t.draftPour.bar),
          whatWasOff: z.array(z.enum(DEVIATIONS)).max(DEVIATIONS.length).optional().describe(t.draftPour.whatWasOff),
          notes: z.array(z.enum(CATA)).max(CATA.length).optional().describe(t.draftPour.notes),
          note: z.string().trim().max(DRAFT_LIMITS.note).optional().describe(t.draftPour.note),
          wouldOrderAgain: z.boolean().optional().describe(t.logPour.wouldOrderAgain),
        },
        // It writes a record and moves the coordinate; logging twice is two pours.
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      },
      async (input) => answer(await logMemberPour(input, ctx))
    );
  }

  // --- Prompts ---
  server.registerPrompt(
    'order-from-menu',
    {
      title: mcp.prompts.orderFromMenu.title,
      description: mcp.prompts.orderFromMenu.description,
      argsSchema: {
        handle: z.string().optional().describe(member ? mcp.memberHandle : t.getPalate.handle),
      },
    },
    ({ handle }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Read the menu I share (pasted text or photo). Extract every drink with its ingredients/description, call rank_menu${handle ? ` for ${handle}` : ''}, and recommend my top 3 picks with why each fits my coordinate and any avoided-flavour cautions on house cocktails.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'pick-for-the-table',
    {
      title: mcp.prompts.pickForTable.title,
      description: mcp.prompts.pickForTable.description,
      argsSchema: {
        handles: z.string().describe('Comma-separated Bluesky handles for the table.'),
        type: z.enum(DRINK_TYPES).optional().describe(t.recommendForGroup.type),
      },
    },
    ({ handles, type }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Call recommend_for_group for these handles: ${handles}${type ? ` (filtered to ${type})` : ''}. Suggest the best shared bottle or round that respects everyone’s aversions, and note the biggest taste contrast at the table.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'log-a-drink',
    {
      title: mcp.prompts.logDrink.title,
      description: mcp.prompts.logDrink.description,
      argsSchema: {
        drink: z.string().optional().describe('The drink you had, if already known.'),
      },
    },
    ({ drink }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: member
              ? `Help me log ${drink ? `the ${drink}` : 'a drink'} on Cotidal. Ask me how much I liked it on the 1–9 scale (never guess it), where I had it, and if anything was off, then call log_pour.`
              : `Help me draft ${drink ? `the ${drink}` : 'a drink'} to log on Cotidal. Ask where I had it and any notes or faults, then call draft_pour to give me a link where I can tap my rating.`,
          },
        },
      ],
    })
  );

  // --- Resources ---
  server.registerResource(
    'regions',
    'cotidal://regions',
    {
      title: mcp.resources.regionsTitle,
      description: mcp.resources.regionsDescription,
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            quadrants.map((q) => ({
              ...q,
              url: new URL(regionPath(q.id), ctx.origin).toString(),
            })),
            null,
            2
          ),
        },
      ],
    })
  );

  return server;
}
