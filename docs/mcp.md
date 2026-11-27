# MCP

The palate map as tools a chat assistant can call, at `/mcp`: a Streamable
HTTP MCP server, so any assistant that takes a remote connector can use it.
In Claude: *Settings → Connectors → Add custom connector*, URL
`https://cotidal.app/mcp`. Once a member has a coordinate, `/map` links to
`/mcp` from under their account. A browser opening `/mcp` is shown the
instructions at that URL (an MCP client never asks for HTML), personalized
with their handle when signed in, so the address bar holds the address to paste.

## What it does today: read

| Tool | Answers |
|---|---|
| `get_palate` | Someone's taste: how they lean in the map's words, the flavours they avoid, pours rated, and the top of their menu, each drink with what put it there |
| `recommend_drinks` | Their menu, optionally of one type, leaving out what they avoid or rated low; each with what put it there and which way it lies from the nearest of their hilltops (`wayTo`, the words the menu uses) |
| `rank_menu` | A menu's items ordered by where each stands on their taste; avoided flavours flagged and sunk, unknown drinks returned as unplaced |
| `compare_palates` | Two tastes: how many of the first's top ten are in the second's, a drink each would reach for that the other would not, one for both |
| `recommend_for_group` | Drinks for a table, best for whoever they suit least; and the two whose tastes part most |
| `get_drink` | One drink: where it sits, its flags and build; given a handle, what put it where it stands for them, which way it lies, and what in it they avoid |
| `search_drinks` | A drink someone names → the name the map knows it by |
| `draft_pour` | A link to `/map` with the pour filled in, for the person to confirm |

Every tool but `draft_pour` reads public records the way `/p/<handle>` does
(`public-read.ts`, with their taste: `public-taste.ts`), so none needs
sign-in, and every answer is computed by the same functions the page draws
from (`src/lib/mcp/tools.ts` over `taste-reading.ts` and `overlap.ts`). A
person is their taste — ground from their questions and pours — never a
point or a region, and no tool hands over a height or a predicted score:
the order of a list is the answer, and each drink says what put it there. The assistant on the other end is the only model involved,
and it only reads results: **a generated sentence may describe a result, never
produce one** (`docs/generation.md`) holds here too.

A distance is where a drink sits, not a forecast that someone will like it,
and the server's instructions say so: an assistant asked "what wines would I
like?" once answered "Cotidal says you'll like dry, high-acid wines", and
guessed that an oaked Chardonnay was far away because no list it had included
one. The tools now give it Cotidal's own words for which way a drink lies,
and `get_drink` with a handle answers for any drink on the map.

`rank_menu` matches a menu item to a drink by its full name or its name
without the parenthetical (`Daiquiri` → `Daiquiri (Classic)`), and nothing
looser. A wrong match would be ranked with confidence it has not earned; an
unplaced item is honest. When an unplaced house cocktail lists its ingredients,
`rank_menu` attaches a deterministic `directional` placement (region,
confidence, matched primitives, and bearing) from the Ingredients Index plus
aversion cautions and closest structural classic, and returns a `mapUrl`
(`/map?menu=1&bar=…&item=…`) so a menu photographed in chat opens directly as
numbered pins on `/map`. The assistant can call `search_drinks` first.

The endpoint is stateless — no MCP session, a new server per request, plain
JSON answers — because nothing streams and nothing is kept.

## Drafting a pour: the person confirms in the app

`draft_pour` writes nothing. It returns `/map?draft=1&…` with what the person
said (drink, where, what was off, tasting notes, a note), and the rating sheet
opens over Your map on it; they check it, tap the rating and log it as any other pour, through
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
3. That page asks for consent and signs them in through the existing Bluesky
   flow, then completes the grant with `props: { did }` (below).
4. The assistant exchanges the code at `/oauth/token` and calls `/mcp/me`
   with the token. The provider checks it and hands the page the DID as
   `ctx.props` (`Astro.locals.cfContext`); the page reads the member from
   there and from nothing in the request.
5. A tool that writes restores the member's AT-Proto session with
   `auth.restore(did)` (`@bbthorson/atproto-cf-auth` 0.5) under the existing
   `AUTH_LOCK`. The assistant never holds an AT-Proto token.

Scopes: `palate:read` is the baseline every client asks for first, and
`pours:write` lets it log pours: granted on the consent page, or asked for by
step-up (`insufficientScope`) when `log_pour` is called without it. A grant's `userId` is the DID percent-encoded
(`grantUserId`), because the provider refuses `:`; it is how a member's
assistants are listed and revoked.

The provider is built per origin, as the sign-in's `client_id` is, so one
deploy serves workers.dev, the custom domain and loopback; a token is good
only on the origin that issued it. It stays off, and `/mcp/me` answers `404`,
until the `OAUTH_KV` namespace is bound (`wrangler.toml`).

### The consent page

`/oauth/authorize` (src/lib/mcp/authorize.server.ts, drawn by
`src/pages/oauth/authorize.astro`, no JavaScript) shows what the MCP spec
asks for: the assistant's name (marked unverified for a self-registered
client), the host access is sent to, a warning when that is an app on this
computer, and what Allow grants. Reading the member's palate is always
granted; logging pours is a box, ticked by default, so an assistant that asks
only for the baseline can still be let write without a second round trip,
and a member who unticks it is asked again by step-up the first time.

- **Allow as @handle** (a member already signed in here): granted at once, if
  their AT-Proto session still restores.
- **Sign in with Bluesky and allow**: the approved request is held
  server-side (`beginUpstream`), the ordinary sign-in runs with
  `returnTo=/oauth/callback?state=…`, and the callback grants for whoever the
  sign-in just signed in. A session older than the sign-in, or a sign-in that
  came back with `auth_error`, answers `access_denied`.
- **Deny**: back to the assistant with `access_denied`.

The consent handle and the upstream `state` are each bound to the browser by
a `__Host-` cookie and work once.

### What `/mcp/me` adds

- Every handle is optional and means the member.
- `my_pours`: the member's own log, newest first. Nobody else's log is read,
  at either address.
- `log_pour`: writes through `logPour` with the member's restored session.
  `hedonic` (1–9, the form's own labels) is required and described as their
  answer, never an estimate; the rest goes through `cleanDraft`, as a draft
  does; nothing is cross-posted. Needs `pours:write`.

### Sessions that last

A grant is only as good as the AT-Proto session behind it, which has to
outlive weeks between visits.

- **Confidential client.** Set `OAUTH_PRIVATE_KEY` (a Worker secret) to an
  ES256 private JWK and sign-in becomes a `private_key_jwt` client, which
  authorization servers give much longer sessions. Make one with
  `node -e "import('@atproto/jwk-jose').then(async ({JoseKey}) => console.log(JSON.stringify((await JoseKey.generate(['ES256'], 'k1')).privateJwk)))"`.
  Sessions made before the key keep the method they were made with; if an
  authorization server refuses one at its next refresh, that member signs in
  once more.
- **D1.** With `ATPROTO_DB` bound, sessions are kept in D1, where the refresh
  lock is a guarantee; members already in KV are copied across as they are
  seen (`movingStore`). Remove the KV binding 30 days later.

### Turning it on

1. `wrangler secret put OAUTH_PRIVATE_KEY` with a key made as above.
2. `wrangler d1 create cotidal-auth`, and uncomment `ATPROTO_DB` with its id.
3. `wrangler kv namespace create cotidal-oauth`, and uncomment `OAUTH_KV`.
4. Deploy, then add `https://cotidal.app/mcp/me` as a connector in Claude.

`/mcp` (to a browser) explains both addresses, yours
first, once `/mcp/me` is on (`memberMcpAddress`, the same check the routes
make); until then it shows the one read-only address, as before.

### Disconnecting an assistant

`/settings` (linked from the account on `/map`) lists the assistants a member
has connected: the name each gave (marked as its own claim), where its access
goes, whether it may log pours, and when. Disconnect revokes the grant and
every token under it (`src/lib/settings/assistants.server.ts`, over
`listUserGrants` / `revokeGrant` keyed by `grantUserId`), so the assistant's
next call gets a `401`. The member is taken from their session, never the
form, and a grant id that is not theirs revokes nothing. Signing out does not
disconnect assistants: it ends this browser's session, not the AT-Proto
session they use.

The rules the write path keeps:

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
