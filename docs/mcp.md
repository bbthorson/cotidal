---
summary: The MCP server for chat assistants — public read tools at /mcp, drafting pours, the signed-in member endpoint /mcp/me with its OAuth flow, consent, scopes, and how to turn it on.
read_when: Changing an MCP tool, its description, the /mcp page, assistant sign-in or disconnecting assistants.
---

# MCP

`/mcp` is a stateless Streamable HTTP MCP server (a new server per request,
plain JSON, nothing kept). In Claude: *Settings → Connectors → Add custom
connector*, `https://cotidal.app/mcp`. A browser opening `/mcp` gets
instructions instead (`AssistantSteps`); Settings links to it.

## Read tools

| Tool | Answers |
|---|---|
| `get_palate` | How someone leans, what they avoid, pours rated, the top of their menu with what put each drink there |
| `recommend_drinks` | Their menu, optionally one type, minus avoided and low-rated; each with its reason and which way it lies (`wayTo`) |
| `rank_menu` | A menu ordered by their taste; avoided flavours flagged and sunk; unknowns returned unplaced |
| `compare_palates` | Shared top ten, a drink each would reach for that the other wouldn't, one for both |
| `recommend_for_group` | Drinks best for whoever they suit least; the two who part most |
| `get_drink` | One drink's place, flags and build; with a handle, what put it there for them and what in it they avoid |
| `search_drinks` | A named drink → the name the map knows |
| `get_bar_menu` | A claimed bar's venue and menu by handle or DID; with a drinker's handle (or at `/mcp/me`), ranked for them |
| `draft_pour` | A `/` link with a pour filled in, for the person to confirm |

Every tool but `draft_pour` reads public records as `/p/<handle>` does and
answers with the same functions (`src/lib/mcp/tools.ts` over
`taste-reading.ts`, `overlap.ts`). A person is their terrain, never a point
or a region; no tool returns a height or a predicted score: the order of a
list is the answer, and each drink says what put it there. Tool descriptions
are copy (`src/lib/copy/mcp.ts`).

A distance is where a drink sits, not a forecast, and the server's
instructions say so. (An assistant once said "Cotidal says you'll like dry
wines" and guessed about a drink no list included; `get_drink` with a handle
now answers for any drink.)

`rank_menu` returns the menu as one list in the order of the person's ground,
so an assistant never has to merge two. Each item says how it was placed
(`placement`): `catalog` is `matchDrink` and nothing looser, because a wrong
match would be ranked with unearned confidence; `ingredients` is an estimate
from what the menu lists (`placeDirectional`, with `confidence` and
`matchedIngredients`); `classic` stands where its closest classic does (named
for it, as "Adventure Negroni", or built on its defining ingredients). Inside
a band of `HEIGHT_BAND` a drink on the map goes before an estimate. Only an
item with nothing to place it by is `unplaced`. A `mapUrl`
(`/?menu=1&bar=…&item=…`) opens the menu as pins. The description asks
for one item per spirit choice ("tequila or mezcal"), so the tool ranks the
variants instead of the assistant guessing.

## Drafting a pour

`draft_pour` writes nothing. It returns `/?draft=1&…`
(`src/lib/pours/pour-draft.ts`), which opens rating in the map's card filled
in; the person taps a rating and logs it through `logPour`.

- **No rating.** It moves the coordinate, and a model mapping "it was fine"
  onto nine points is guessing in their name. A drafted form starts with none
  selected and won't log until one is tapped.
- **Only what the form shows:** unknown ids dropped, a bar dropped for a pour
  at home, text cut to the form's limits.
- **Once:** after logging, the draft leaves the form and the URL.

## Signing a member in: `/mcp/me`

`/mcp` stays public; writing and "my palate" without a handle happen at
`/mcp/me`, which needs sign-in. Two addresses because an MCP client offers
sign-in only to an endpoint that demands a token, which would shut out
strangers.

Cotidal is the OAuth authorization server, via
`@cloudflare/workers-oauth-provider` around the Worker (`withMemberSignIn`,
`src/lib/mcp/member-auth.ts`):

1. An unauthenticated `/mcp/me` gets a `401` naming
   `/.well-known/oauth-protected-resource/mcp/me`.
2. The assistant registers at `/oauth/register` and sends the person to
   `/oauth/authorize`.
3. Consent plus the ordinary Bluesky sign-in completes the grant with
   `props: { did }`.
4. The assistant trades the code at `/oauth/token`; the provider hands
   `/mcp/me` the DID as `ctx.props`, and the page reads the member from there
   only.
5. A writing tool restores the member's AT Protocol session with
   `auth.restore(did)` under `AUTH_LOCK`. The assistant never holds an AT
   Protocol token.

**Scopes:** `palate:read` always; `pours:write` to log, granted on consent or
by step-up (`insufficientScope`). A grant's `userId` is the DID
percent-encoded (`grantUserId`). The provider is built per origin, so a token
works only where it was issued. Until `OAUTH_KV` is bound, `/mcp/me` answers
`404`.

**Consent** (`/oauth/authorize`, `src/lib/mcp/authorize.server.ts`, no
script): the assistant's name (marked unverified if self-registered), where
access goes, a warning for a local app, and what Allow grants; logging pours
is a box, ticked by default. **Allow as @handle** if already signed in;
**Sign in with Bluesky and allow** holds the request server-side
(`beginUpstream`) and grants on `/oauth/callback`; **Deny** returns
`access_denied`. The consent handle and upstream `state` are bound to the
browser by `__Host-` cookies and work once.

**`/mcp/me` adds:** handles optional (meaning the member); `my_pours` (their
own log only); `log_pour` (through `logPour`, `hedonic` 1–9 required and
described as their answer, never an estimate; the rest through `cleanDraft`;
no cross-posting; needs `pours:write`).

**Sessions that last:** set `OAUTH_PRIVATE_KEY` (an ES256 private JWK) to
make sign-in a `private_key_jwt` client, which gets longer sessions:

```bash
node -e "import('@atproto/jwk-jose').then(async ({JoseKey}) => console.log(JSON.stringify((await JoseKey.generate(['ES256'], 'k1')).privateJwk)))"
```

With `ATPROTO_DB` (D1) bound, sessions live in D1 and are copied from KV as
they are seen (`movingStore`); remove the KV binding 30 days later.

**Turning it on:** `wrangler secret put OAUTH_PRIVATE_KEY`; `wrangler d1
create cotidal-auth` and uncomment `ATPROTO_DB`; `wrangler kv namespace
create cotidal-oauth` and uncomment `OAUTH_KV`; deploy; add
`https://cotidal.app/mcp/me` in Claude. `/mcp` then explains both addresses
(`memberMcpAddress`).

**Disconnecting:** Settings lists connected assistants (their claimed name,
where access goes, whether they may log, when). Disconnect revokes the grant
and its tokens (`src/lib/settings/assistants.server.ts`, `revokeGrant` by
`grantUserId`); the member comes from the session, never the form. Signing
out doesn't disconnect assistants.

## Rules for writing from chat

- **A record holds what its author said:** the rating is asked, never
  estimated; other fields are absent unless said.
- **One pipeline:** `logPour` (`src/lib/pours/pours.server.ts`) with the same
  `PourStore` as the page.
- **`PourContext` stays on the device;** not accepted here.
- **No quiz over chat:** free-text answers are a different instrument from
  the one `RESPONSE_MODEL` scores.
