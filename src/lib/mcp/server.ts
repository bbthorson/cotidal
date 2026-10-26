import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { mcp } from '../copy';
import {
  comparePalates,
  getPalate,
  rankMenu,
  recommendDrinks,
  searchDrinks,
  type ToolContext,
  type ToolResult,
} from './tools';

/**
 * The tools in `tools.ts`, registered on an MCP server. Built per request:
 * the endpoint is stateless (no MCP session, nothing kept between calls), so
 * a server is cheap and carries only the request's context.
 */

const DRINK_TYPES = ['Cocktail', 'Wine', 'Beer', 'Spirit'] as const;

/** A string from a stranger: bounded before it reaches a lookup. */
const handle = (description: string) => z.string().trim().min(1).max(256).describe(description);

function answer<T>(result: ToolResult<T>): CallToolResult {
  if (!result.ok) return { isError: true, content: [{ type: 'text', text: result.message }] };
  return {
    content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
    structuredContent: result.data as Record<string, unknown>,
  };
}

export function createMcpServer(ctx: ToolContext): McpServer {
  const server = new McpServer(
    { name: mcp.name, version: '0.1.0' },
    { instructions: mcp.instructions }
  );
  const t = mcp.tools;
  const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

  server.registerTool(
    'get_palate',
    {
      title: t.getPalate.title,
      description: t.getPalate.description,
      inputSchema: { handle: handle(t.getPalate.handle) },
      annotations: readOnly,
    },
    async ({ handle }) => answer(await getPalate(handle, ctx))
  );

  server.registerTool(
    'recommend_drinks',
    {
      title: t.recommend.title,
      description: t.recommend.description,
      inputSchema: {
        handle: handle(t.getPalate.handle),
        count: z.number().int().min(1).max(20).optional().describe(t.recommend.count),
        type: z.enum(DRINK_TYPES).optional().describe(t.recommend.type),
      },
      annotations: readOnly,
    },
    async ({ handle, count, type }) => answer(await recommendDrinks(handle, { count, type }, ctx))
  );

  server.registerTool(
    'rank_menu',
    {
      title: t.rankMenu.title,
      description: t.rankMenu.description,
      inputSchema: {
        handle: handle(t.getPalate.handle),
        items: z.array(z.string().trim().min(1).max(200)).min(1).max(100).describe(t.rankMenu.items),
      },
      annotations: readOnly,
    },
    async ({ handle, items }) => answer(await rankMenu(handle, items, ctx))
  );

  server.registerTool(
    'compare_palates',
    {
      title: t.compare.title,
      description: t.compare.description,
      inputSchema: { handle: handle(t.getPalate.handle), other: handle(t.compare.other) },
      annotations: readOnly,
    },
    async ({ handle, other }) => answer(await comparePalates(handle, other, ctx))
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

  return server;
}
