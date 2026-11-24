# MCP

The palate map as tools a chat assistant can call, at `/mcp`: a Streamable
HTTP MCP server, so any assistant that takes a remote connector can use it.
In Claude: *Settings → Connectors → Add custom connector*, URL
`https://cotidal.app/mcp`. A member reads this under their account at the foot of `/log`
(`/log#assistant`), with their handle in the example. A browser opening `/mcp` is shown the same
instructions at that URL (an MCP client never asks for HTML), so the address
bar holds the address to paste.

## What it does today: read

| Tool | Answers |
|---|---|
| `get_palate` | Someone's coordinate, region, the flavours they avoid, pours that moved it, the nearest drinks |
| `recommend_drinks` | The nearest drinks, optionally of one type, leaving out what they avoid |
| `rank_menu` | A menu's items ordered by distance; avoided flavours flagged and sunk, unknown drinks returned as unplaced |
| `compare_palates` | Two coordinates: the distance, a drink each would order, one they'd share |
| `search_drinks` | A drink someone names → the name the map knows it by |
| `draft_pour` | A link to `/log` with the pour filled in, for the person to confirm |

Every tool but `draft_pour` reads public records the way `/p/<handle>` does
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

## Drafting a pour: the person confirms in the app

`draft_pour` writes nothing. It returns `/log?draft=1&…` with what the person
said (drink, where, what was off, tasting notes, a note), and the rating sheet
opens over Log on it; they check it, tap the rating and log it as any other pour, through
the same `logPour`. The draft lives only in the link (`src/lib/pour-draft.ts`),
so there is nothing to store, sign in for or protect.

- **No rating.** The rating moves the coordinate, and a model mapping "it was
  fine" onto the 9-point scale is guessing in their name. The tool has no
  field for it, and a drafted form starts with none selected and will not
  log until one is tapped. (An ordinary form still starts at 7.)
- **Only what the form shows.** Unknown fault and note ids are dropped, a bar
  is dropped for a pour at home, and text is cut to the form's limits. The
  member-only detail fields and cross-posting stay their own choices.
- **Once.** After it is logged the draft leaves the form's state and the URL,
  so the form that comes back, or a reload, cannot offer it again.

## Signing a member in: `/mcp/me`

`/mcp` stays public. Writing as a member, and answering "my palate" without a
handle, happen at a second address, `/mcp/me`, which needs the assistant to
sign the member in. Keeping two addresses keeps the public reads open to
anyone: an endpoint that answers without a token is never offered a sign-in by
an MCP client, and one that demands a token shuts out strangers.

Cotidal is the OAuth authorization server the assistant talks to, through
`@cloudflare/workers-oauth-provider` wrapped around the Worker in
`src/worker.ts` (`withMemberSignIn`, `src/lib/mcp/member-auth.ts`):

1. An unauthenticated request to `/mcp/me` gets a `401` naming
   `/.well-known/oauth-protected-resource/mcp/me`, which names this origin as
   its authorization server.
2. The assistant registers at `/oauth/register` and sends the person to
   `/oauth/authorize`.
3. That page signs them in through the existing Bluesky flow
   (`auth.authorize` with the pending request in its sealed `context`) and,
   in `onSignIn`, completes the grant with `props: { did }`.
4. The assistant exchanges the code at `/oauth/token` and calls `/mcp/me`
   with the token. The provider checks it and hands the page the DID as
   `ctx.props` (`Astro.locals.cfContext`); the page reads the member from
   there and from nothing in the request.
5. A tool that writes restores the member's AT-Proto session with
   `auth.restore(did)` (`@bbthorson/atproto-cf-auth` 0.5) under the existing
   `AUTH_LOCK`. The assistant never holds an AT-Proto token.

Scopes: `palate:read` is the baseline every client asks for first;
`pours:write` is asked for by step-up (`insufficientScope`) only when a tool
that logs a pour is called. A grant's `userId` is the DID percent-encoded
(`grantUserId`), because the provider refuses `:`; it is how a member's
assistants are listed and revoked.

The provider is built per origin, as the sign-in's `client_id` is, so one
deploy serves workers.dev, the custom domain and loopback; a token is good
only on the origin that issued it. It stays off, and `/mcp/me` answers `404`,
until the `OAUTH_KV` namespace is bound (`wrangler.toml`).

Done: the wrapper, discovery, registration, tokens, and `/mcp/me` serving
`/mcp`'s tools to a signed-in member. To do: the `/oauth/authorize` page and
its consent screen, tools that default to the member and write, a
confidential AT-Proto client (`privateKeys`) so the Bluesky session outlives
a few weeks of chat, and sessions in D1 rather than KV so parallel tool calls
cannot read a refreshed token late.

The rules the write path must keep:

- **A record holds what its author said.** The rating is required and asked
  for, never estimated by the assistant; every other field is absent unless
  the member said it, and "would order again" is written only when asked.
- **One pipeline.** Logging a pour is `logPour` in `src/lib/pours.server.ts`,
  which the page's route already calls; the assistant's tool calls it too,
  through the same `PourStore`, so the two cannot drift.
- **`PourContext` stays on the device.** Volume drunk and hours since eating
  are not accepted here either.
- **No quiz over chat.** Elicitation records are scored under a named
  `RESPONSE_MODEL`; free-text answers in a conversation are a different
  instrument.
