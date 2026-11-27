import { pour } from './pours';

/** Chat assistant setup, OAuth consent, and MCP tool descriptions/messages. */


/**
 * How to reach a palate from a chat assistant: linked from `/map` once a
 * member has a coordinate, and what a browser sees at `/mcp`.
 */
export const assistants = {
  eyebrow: 'Chat assistants',
  title: 'Ask your chat assistant what to drink.',
  lede: 'Connect Cotidal to Claude or any assistant that supports MCP. Share a bar’s menu, ask what to drink, compare with a friend, or log a pour with your coordinate in hand.',
  urlLabel: 'The address to add',
  stepsTitle: 'In Claude',
  steps: [
    'Open Settings, then Connectors.',
    'Choose Add custom connector.',
    'Name it Cotidal and paste the address above.',
  ],
  otherClients: 'Other assistants that accept an MCP server URL take the same address.',
  canTitle: 'What you can ask',
  can: [
    'Where your palate lands, and what is closest to it.',
    'Which drink to pick from a menu you paste or photograph.',
    'How far your map is from a friend’s.',
    'Where a drink sits on the map.',
    'To draft a pour you had, for you to log here.',
  ],
  askWith: (handle: string) => `Ask with your handle: “What does Cotidal say I should drink? I’m @${handle}.”`,
  askWithGuest: 'Ask with your Bluesky handle: “What does Cotidal say I should drink? I’m @you.bsky.social.”',
  /** On someone else's map: what to ask your own assistant about them. */
  visitorAsk: (handle: string) => `Ask your chat assistant: “How far is my map from @${handle}’s?”`,
  setUp: 'Set it up',
  /** Where `/mcp/me` is on: the two addresses, yours first. */
  memberUrlLabel: 'Your own address',
  memberUrlNote:
    'Recommended. Your assistant signs you in once, knows whose palate it is, and can log a pour you tell it about.',
  publicUrlLabel: 'Anyone’s map',
  publicUrlNote: 'No sign-in. Reads any public palate by handle, and drafts pours as links for you to log here.',
  memberSteps: [
    'Open Settings, then Connectors.',
    'Choose Add custom connector.',
    'Name it Cotidal and paste your own address.',
    'Choose Connect. Cotidal opens: sign in with Bluesky and choose Allow.',
  ],
  memberOtherClients:
    'Other assistants that accept an MCP server URL take the same addresses. Anyone’s map needs no sign-in, so it skips the last step.',
  memberCan: [
    'What to drink tonight, without saying who you are.',
    'Which drink to pick from a menu you paste or photograph.',
    'To log a pour you had: tell it the drink and how much you liked it.',
    'What you have had lately, and how each one landed.',
    'How far your map is from a friend’s.',
  ],
  memberAsk: 'Ask: “What should I drink tonight?” It already knows it’s you.',
  memberLimitsTitle: 'Only what you tell it',
  memberLimits:
    'It logs a pour only when you tell it about one, with the rating you give: it asks rather than guesses. It cannot retake the questions, edit or delete a pour, or post to Bluesky. Untick logging on the approval screen to keep it read-only, or disconnect it anytime in Settings.',
  readOnlyTitle: 'Only you log',
  readOnly:
    'The assistant reads the same public coordinate anyone can open at your link. It can draft a pour as a link to the form here, but only you log it: you check it, tap how it landed, and press the button. It cannot retake the questions or change your map.',
} as const;

/**
 * `/oauth/authorize` — letting a chat assistant act for a member at `/mcp/me`.
 * The client's name and host come from the assistant itself: the page shows
 * them as data, never as a claim Cotidal makes.
 */
export const assistantConsent = {
  eyebrow: 'Chat assistant',
  title: (client: string) => `Let ${client} use Cotidal as you?`,
  verified: (domain: string) => `Published by ${domain}.`,
  unverified: 'This assistant gave its own name when it registered. Cotidal cannot check it.',
  sendsTo: 'Access goes to',
  loopback:
    'That is an app on this computer, and any app here could be listening. Continue only if you just started connecting one.',
  canTitle: 'It will be able to',
  scopes: {
    'palate:read': 'Answer from your palate without being told your handle: how you lean, the top of your menu, menus ranked for you.',
    'pours:write':
      'Log a pour you tell it about, with the rating you give it. Nothing else: it cannot change your answers, edit a pour or post to Bluesky.',
  } as Record<string, string>,
  unknownScope: (scope: string) => `Something Cotidal does not offer: ${scope}`,
  continueAs: (handle: string) => `Allow as @${handle}`,
  orSomeoneElse: 'Or sign in as someone else',
  signInAndAllow: 'Sign in with Bluesky and allow',
  deny: 'Deny',
  revoke: 'To stop it later, remove Cotidal from the assistant’s connectors.',
  refusedTitle: 'This request can’t go ahead',
} as const;

/**
 * `/mcp` — the palate map as tools a chat assistant can call. Read-only: these
 * descriptions are read by the assistant, and through it by the person, so
 * they are interface copy like any other. Failures reuse `publicMap`'s words.
 */
export const mcp = {
  name: 'cotidal',
  /** What both endpoints say first; each adds how a pour gets logged there. */
  about:
    'Cotidal places a person’s taste in drinks on a map: x runs Rich (−10) to Crisp (+10), y runs Savory (−10) to Sweet (+10). Each person’s taste is read from public records on their Bluesky account, by handle: the questions they answered and every drink they rated make ground over the map, higher where they would reach and lower where they would not, and a person can have more than one high place. Drinks are recommended by where they stand on that ground, never by a score of the person. Say what put a drink there and which way it lies (each result says, in Cotidal’s words: “Near their Manhattan (9)”, “crisper, more savory”), never that they will like it. To answer about a drink no list included, call get_drink with their handle rather than guess. Use search_drinks to turn a drink someone names into the name Cotidal knows it by.',
  instructions:
    'Nothing you call changes anyone’s map: to log a pour, draft_pour returns a link the person opens to check it, rate it and log it themselves.',
  tools: {
    getPalate: {
      title: 'Read a palate',
      description:
        'Read someone’s taste on the Cotidal map, by Bluesky handle or DID: how they lean in the map’s words, the flavours they avoid, how many pours they have rated, and the top of their menu with what put each drink there.',
      handle: 'A Bluesky handle (alice.bsky.social, @alice) or a DID.',
    },
    recommend: {
      title: 'Recommend drinks',
      description:
        'The drinks standing highest on someone’s taste, highest first, leaving out anything with a flavour they avoid or that they rated low. Each comes with what put it there (“Near their Manhattan (9)”) and which way it lies from the nearest of their high places (“crisper, more savory”).',
      count: 'How many drinks to return.',
      type: 'Only drinks of this kind.',
    },
    rankMenu: {
      title: 'Rank a menu',
      description:
        'Order the drinks on a menu by where each stands on someone’s taste, highest first, each with what put it there. Pass each item as a drink name or an object with name and ingredients/description as written on the menu. Items Cotidal cannot place are returned as unplaced with any avoided-flavour cautions and closest known classic when the ingredients make it clear; placed drinks with an avoided flavour are flagged, not dropped.',
      items: 'Menu items: each a drink name, or { name, description?, ingredients? } as printed on the menu.',
    },
    compare: {
      title: 'Compare two palates',
      description:
        'Put two people’s tastes side by side: how many of the first’s top ten drinks are in the second’s, a drink each would reach for that the other would not, and one they would both. This compares maps; it never ranks the people on them.',
      other: 'The second person’s Bluesky handle or DID.',
    },
    recommendForGroup: {
      title: 'Recommend for a group',
      description:
        'Find drinks or bottles a group of 2 to 8 people can share: respects every person’s avoided flavours, leaves out what anyone rated low, and puts first the drinks that suit best the person at the table they suit least. Also names the two whose tastes part most.',
      handles: 'Bluesky handles or DIDs for the people at the table (at least 2; on /mcp/me the signed-in member is included automatically if omitted).',
      count: 'How many shared drinks to return.',
      type: 'Only drinks of this kind.',
    },
    getDrink: {
      title: 'Read a drink',
      description:
        'Look up a drink on the Cotidal map by name: its coordinate, region, flavour flags, tags, and recipe build from the register. Given someone’s handle, also what put it where it stands for them, how far and which way it lies from the nearest of their high places, and any flavour in it they avoid: use this for “what about X?” instead of guessing.',
      name: 'The drink’s name (use search_drinks if unsure).',
      handle: 'A Bluesky handle or DID, to read the drink against their taste.',
    },
    getBarMenu: {
      title: 'Read a bar’s menu',
      description:
        'Read a claimed bar’s live AT Protocol venue and menu by its Bluesky/domain handle. When a drinker’s handle is also given (or on /mcp/me), ranks the bar’s menu for their palate automatically.',
      bar: 'The bar’s Bluesky or domain handle (e.g. attaboy.nyc) or DID.',
    },
    draftPour: {
      title: 'Draft a pour',
      description:
        'Draft a drink the person had, for them to log in Cotidal. Returns a link to the pour form, filled in with what they told you; they check it, tap how much they liked it, and log it. Nothing is saved until they do. There is no rating here on purpose: never estimate one or say it was recorded. Include only what they said: no guessed bar, notes or faults.',
      drink: 'The drink, as Cotidal names it if it is on the map (use search_drinks), otherwise as they said it.',
      atHome: 'They made it at home.',
      bar: 'Where they had it, if they said.',
      whatWasOff: 'Faults they named, as these ids.',
      notes: 'What they tasted in it, as these ids.',
      note: 'Anything else they said about it, in their words.',
    },
    myPours: {
      title: 'Read my pours',
      description:
        'The signed-in member’s own pours, newest first: the drink, how much they liked it on the 9-point scale, where, what was off and what they tasted. Nobody else’s log can be read.',
      count: 'How many pours to return, up to 50.',
    },
    myBars: {
      title: 'Read my bars',
      description:
        'Summarize the bars the signed-in member has logged pours at: visit count, average rating, last visit, and top drinks at each bar.',
    },
    myFollows: {
      title: 'People I follow on Cotidal',
      description:
        'Find people the signed-in member follows on Bluesky who have published a Cotidal palate, with distance, contrast drinks, and a shared pick for each.',
    },
    logPour: {
      title: 'Log a pour',
      description:
        'Log a drink the signed-in member had, to their own account, and move their coordinate. Call it only after they have told you how much they liked it: hedonic is their answer on the 9-point scale, never your estimate. Include only what they said: no guessed bar, notes or faults, and wouldOrderAgain only if you asked them.',
      // The form's own labels, so the scale the assistant asks on is the one the form shows.
      hedonic: `How much they liked it, as they said: ${pour.hedonic.map((label, i) => `${i + 1} ${label}`).join(', ')}.`,
      wouldOrderAgain: 'Whether they would order it again, only if you asked them.',
    },
    searchDrinks: {
      title: 'Search drinks',
      description:
        'Find drinks on the Cotidal map by name, with where each sits and the region it lands in.',
      query: 'Part of a drink’s name.',
    },
  },
  prompts: {
    orderFromMenu: {
      title: 'Order from a menu',
      description: 'Read a pasted or photographed bar menu, rank it against a Cotidal palate, and recommend the top picks.',
    },
    pickForTable: {
      title: 'Pick for the table',
      description: 'Compare a group of palates and pick a shared bottle or round that works for everyone.',
    },
    logDrink: {
      title: 'Log a drink',
      description: 'Walk through logging a pour on Cotidal by asking for the 1–9 rating and optional notes.',
    },
  },
  resources: {
    regionsTitle: 'Cotidal regions',
    regionsDescription: 'The four regions of the Cotidal palate chart, their axes, and glosses.',
  },
  needGroup: 'Group recommendations need at least two Bluesky handles.',
  noDrinkFound: (name: string) => `No drink on the map matches “${name}”.`,
  noPalate: (name: string) => `@${name} has an account, but has not published a palate yet.`,
  notFound: (input: string) => `“${input}” does not resolve to an account.`,
  invalid: (input: string) => `“${input}” is not a Bluesky handle or DID.`,
  unavailable: (name: string) => `${name}’s server did not respond in time. Try again in a moment.`,
  noMatches: (query: string) => `No drink on the map matches “${query}”.`,
  noDrink: 'A draft needs the drink’s name.',
  /** `/mcp/me` only: the member the assistant was signed in as. */
  memberInstructions:
    'You are signed in to Cotidal as one member. Leave out the handle to mean them. log_pour writes a pour to their own Bluesky account and moves their coordinate, so call it only for a drink they told you they had, with the rating they gave: ask how much they liked it on the 9-point scale and never estimate it. Include only what they said. my_pours reads their own log; nobody else’s log can be read.',
  memberHandle: 'A Bluesky handle or DID. Leave it out to mean the member you are signed in as.',
  memberOnly: 'Only for the member this assistant is signed in as, at /mcp/me.',
  sessionGone:
    'Their Bluesky session on Cotidal has ended, so nothing was read or written. They can sign in on Cotidal again, then reconnect this assistant.',
  needRating: 'A pour needs the rating they gave, a whole number from 1 to 9. Ask them; do not estimate it.',
  logged: 'Logged to their own account. Their coordinate has moved; tell them where it is now.',
  draftReady: 'Drafted. Nothing is logged yet: they open the link, tap how much they liked it, and log it.',
  unplaced: 'Not on the Cotidal map, so it cannot be placed.',
  avoids: (flavours: string[]) => `Has ${flavours.join(' and ')}, which they avoid.`,
  flavours: { smoke: 'smoke', bitter: 'bitterness', anise: 'anise' },
} as const;
