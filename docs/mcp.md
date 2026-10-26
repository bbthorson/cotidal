# MCP

The palate map as tools a chat assistant can call, at `/mcp`: a Streamable
HTTP MCP server, so any assistant that takes a remote connector can use it.
In Claude: *Settings → Connectors → Add custom connector*, URL
`https://cotidal.app/mcp`.

## What it does today: read

| Tool | Answers |
|---|---|
| `get_palate` | Someone's coordinate, region, the flavours they avoid, pours that moved it, the nearest drinks |
| `recommend_drinks` | The nearest drinks, optionally of one type, leaving out what they avoid |
| `rank_menu` | A menu's items ordered by distance; avoided flavours flagged and sunk, unknown drinks returned as unplaced |
| `compare_palates` | Two coordinates: the distance, a drink each would order, one they'd share |
| `search_drinks` | A drink someone names → the name the map knows it by |

Every tool reads public records the way `/p/<handle>` does
(`public-read.ts`), so none needs sign-in, and every answer is computed by
the same functions the page draws from (`src/lib/mcp/tools.ts` over
`overlap.ts`). The assistant on the other end is the only model involved,
and it only reads results: **a generated sentence may describe a result, never
produce one** (`docs/generation.md`) holds here too.

`rank_menu` matches a menu item to a drink by its full name or its name
without the parenthetical (`Daiquiri` → `Daiquiri (Classic)`), and nothing
looser. A wrong match would be ranked with confidence it has not earned; an
unplaced item is honest. The assistant can call `search_drinks` first.

The endpoint is stateless — no MCP session, a new server per request, plain
JSON answers — because nothing streams and nothing is kept.

## Not yet: write

Logging a pour from a chat needs the assistant to act as the member, which
means `/mcp` becomes an OAuth authorization server for the assistant
(`@cloudflare/workers-oauth-provider`), handing sign-in to the existing
Bluesky flow. It also needs two things from `@bbthorson/atproto-cf-auth`: a
way to restore a session from a DID rather than a cookie, and a lock that
holds across isolates, since parallel tool calls racing a token refresh
would sign the member out everywhere.

The rules the write path must keep:

- **A record holds what its author said.** The rating is required and asked
  for, never estimated by the assistant; every other field is absent unless
  the member said it, and "would order again" is written only when asked.
- **One pipeline.** The pour logic in `api/atproto-publish.ts` moves into a
  shared module first, so the page and the assistant cannot drift.
- **`PourContext` stays on the device.** Volume drunk and hours since eating
  are not accepted here either.
- **No quiz over chat.** Elicitation records are scored under a named
  `RESPONSE_MODEL`; free-text answers in a conversation are a different
  instrument.
