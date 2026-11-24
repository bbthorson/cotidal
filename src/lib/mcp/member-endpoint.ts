import { insufficientScope, type OAuthResourceAuth } from '@cloudflare/workers-oauth-provider';
import { MEMBER_SCOPES, callsTool, memberFromContext } from './member-auth';
import { WRITE_TOOLS } from './server';
import { serveMcp } from './serve';
import type { MemberTools, ToolContext } from './tools';

/** What the OAuth provider hands `/mcp/me` (as `Astro.locals.cfContext`). */
export interface ProviderContext {
  props?: unknown;
  auth?: OAuthResourceAuth;
}

/**
 * `/mcp/me`: one member's MCP endpoint. The member is the DID in the grant's
 * props, and nothing in the request. Writing needs the wider grant, and is
 * asked for before the call runs: a `403 insufficient_scope` naming both
 * scopes, and the assistant asks the member again.
 */
export async function answerMember(
  request: Request,
  cf: ProviderContext | undefined,
  base: Omit<ToolContext, 'member'>,
  tools: (did: string) => MemberTools
): Promise<Response> {
  const member = memberFromContext(cf);
  if (!member || !cf?.auth) return new Response('Not found', { status: 404 });

  if (!cf.auth.scope.includes(MEMBER_SCOPES.write) && (await callsTool(request, WRITE_TOOLS))) {
    return insufficientScope(cf.auth, [MEMBER_SCOPES.read, MEMBER_SCOPES.write]);
  }
  return serveMcp(request, { ...base, member: tools(member.did) });
}
