# MCP

The palate map as tools a chat assistant can call, at `/mcp`: a Streamable
HTTP MCP server, so any assistant that takes a remote connector can use it.
In Claude: *Settings → Connectors → Add custom connector*, URL
`https://cotidal.app/mcp`. `/assistants` says this to members, and `/account`
links to it. A browser opening `/mcp` is shown that page at the same URL
(an MCP client never asks for HTML), so the address bar holds the address
to paste.

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
said (drink, where, what was off, tasting notes, a note), and the form opens
on it; they check it, tap the rating and log it as any other pour, through
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

## Not yet: writing from a chat

Drafting covers logging for now. If the extra step proves to be friction,
writing directly needs the assistant to act as the member, which means
`/mcp` becomes an OAuth authorization server for the assistant
(`@cloudflare/workers-oauth-provider`), handing sign-in to the existing
Bluesky flow. It also needs a way, in `@bbthorson/atproto-cf-auth`, to
restore a session from a DID rather than a cookie. The lock that keeps
parallel restores from racing a token refresh is already there (0.2.0,
`AUTH_LOCK`).

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
