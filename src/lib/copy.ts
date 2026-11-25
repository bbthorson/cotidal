/**
 * Single source of truth for interface copy.
 *
 * No page, layout or component may type words into its markup (eslint.config.mjs
 * rejects it) — the voice lives here so it can be revised in one place. "Triangulation",
 * "Calibration", "Architecture" and "Context" remain valid *internal*
 * vocabulary (see AGENTS.md); they are deliberately absent from this file.
 */

import type { AskedIntensity, BaseSpirit, Glassware, GlmsAnchor } from './atproto/vocab';

export const site = {
  name: 'Cotidal',
  tagline: 'Every palate has a coordinate.',
  description:
    'Find where your taste sits on the map, and what to drink next.',
} as const;

export const nav = {
  skipToContent: 'Skip to content',
  home: 'Home',
  register: 'Drinks',
  signIn: 'Sign in',
  menu: 'Menu',
  /** Beside your handle in a phone's Menu: where it goes. */
  settings: 'Settings',
  footer: 'Site',
  map: 'Map',
  bars: 'For bars',
  howItWorks: 'How it works',
} as const;

/**
 * Finding something on the map — a drink, a bar — and a bar's menu. The
 * names are Compass's, the screen the map replaced; the words are the map's.
 */
export const compass = {
  heading: 'Where to next',
  /** Before you have a position: the chart, one line, and the one way on. */
  startTitle: 'No position yet',
  startBody: 'Every drink is on the chart. A few questions put you on it too.',
  lookUp: 'or look up a drink',
  menuTitle: 'Your menu',
  menuNote: 'And what put it there',
  findYours: 'Find your coordinate',
  searchLabel: 'Search drinks and bars',
  placeholder: 'Negroni, mezcal, Attaboy…',
  mapLabel: 'Bars near you',
  you: 'You',
  showNear: 'Show bars near me',
  nearNote: 'Your approximate location (rounded to ~100 m) is sent to OpenStreetMap to find nearby bars. Cotidal keeps none of it.',
  locating: 'Finding bars near you…',
  denied: 'Location is off for this site. Search instead, or turn it on to see bars near you.',
  failed: 'OpenStreetMap did not answer.',
  unlocated: 'Your device could not find where you are.',
  retry: 'Try again',
  noneNear: 'OpenStreetMap has no bars mapped within about a kilometre.',
  nearTitle: 'Near you',
  kinds: { bar: 'Bar', pub: 'Pub', biergarten: 'Beer garden', nightclub: 'Club' },
  pouredHere: (n: number) => (n === 1 ? 'You have poured here once' : `You have poured here ${n} times`),
  pickHere: 'Pick a drink here',
  onOsm: 'On OpenStreetMap',
  drinksTitle: 'Drinks',
  noDrinks: 'No drink on the map by that name or ingredient.',
  rateUnlisted: (name: string) => `Rate ${name} anyway`,
  barsTitle: 'Bars',
  yourBars: 'Your bars',
  barPours: (n: number) => (n === 1 ? '1 pour' : `${n} pours`),
  pickAt: (bar: string) => `Pick a drink at ${bar}`,
  /** The entry to a menu with no bar to start from. */
  haveMenu: 'Have a menu?',
  /**
   * A menu on Compass, a bar's or not: what they pour, ranked for you, and
   * the pick kept until it is rated. It orders nothing: Cotidal is not
   * connected to the bar.
   */
  atMenu: {
    homeTitle: 'Have a menu?',
    body: 'Add what they pour. Anything on the map is placed and ranked for you; anything else is kept, unplaced.',
    barLabel: 'Bar name (optional)',
    addLabel: 'A drink on their menu',
    addPlaceholder: 'Last Word, house Negroni…',
    add: 'Add',
    remove: (name: string) => `Remove ${name}`,
    placed: 'On the map',
    unplaced: 'Not on the map',
    pasteToggle: 'Paste a whole menu',
    pasteLabel: 'Menu lines (one drink per line)',
    pastePlaceholder: 'Negroni\nPaper Tiger — mezcal, lime, agave\nLast Word',
    pasteAdd: 'Add menu',
    pasteCancel: 'Cancel',
    nearClassic: (name: string) => `Near ${name}`,
    clashes: (flavours: string[]) => `Has ${flavours.join(' and ')}`,
    photoLater: 'Later: photograph the menu directly here (or share a photo in your chat assistant today).',
    rankedAt: (bar: string) => `What to have at ${bar}`,
    rankedHome: 'What to have',
    rankedBody: 'Ranked by your ratings of the drinks around each one, and where your answers put you.',
  },
} as const;

/**
 * /map, the one app screen: your terrain on the map, one search in the header
 * over drinks and bars, and one card for everything else (`Explore.tsx`).
 */
export const explore = {
  title: 'Map',
  /** The map, read aloud. */
  mapLabel: 'Your map: every drink at its place, on the ground your answers and ratings make',
  /** The same map on a page that draws nobody's taste: a drink's, the front door. */
  chartLabel: 'The map: every drink at its place, rich to crisp and savory to sweet',
  /** The card, read aloud. */
  cardLabel: 'Where to next',
  /** The card's handle, read aloud, and its words on a phone. */
  more: 'More',
  less: 'Less',
  heading: 'Where to next',
  /** Before there is a coordinate, in the card's head. */
  noPosition: 'No position yet',
  backToStart: 'Where to next',
  yoursTitle: 'Your pours',
  barsNear: 'Bars near you',
  /** The bar open on the map, in the search box; and how to leave it. */
  leave: (bar: string) => `Leave ${bar}`,
  searchThisMenu: 'Search this menu',
  clear: 'Clear',
  /** A bar with nothing on its menu yet: the map is empty under it. */
  noMenu: 'No known menu',
  noMenuBody: 'Add what they pour and each drink drops onto your map.',
  /** Search results with nothing to show. */
  nothing: 'Nothing on the map by that name.',
  /** On the map, under a drink you rated: its name and your rating. */
  ratedMark: (name: string, hedonic: number) => `${name} · ${hedonic}`,
  /** The legend under the card's head. */
  legend: { liked: 'Liked (7+)', poured: 'Other pours', ground: 'Your high ground', pinned: 'On this menu' },
} as const;

/** /map, Your map: you — where you are, how sure, the way you came, and what moved you. */
export const mapPage = {
  title: 'Your map',
  heading: 'Your map',
  guestEyebrow: 'On this device',
  guestTitle: 'Keep your map with you',
  guestBody: 'As a guest, your coordinate and pours live on this device. Sign in with Bluesky and they’re kept in your own account, on any phone.',
  stats: {
    pours: 'Pours',
    bars: 'Bars',
    since: 'Since',
    moved: 'Moved in all',
  },
  /** Over the track figure, under the chart: the same track at a scale a half-point shows at. */
  upClose: 'The way you came, up close',
  /** The track figure, read aloud. */
  trackLabel: (pours: number) => `Your track, through ${pours === 1 ? 'one pour' : `${pours} pours`}`,
  /** What one pour did to your coordinate, at the end of its entry. */
  movedOf: (n: number) => `Moved ${n}`,
  held: 'Held',
  /** The last entry: where the track starts. */
  started: 'The questions',
  startedCentre: 'The centre of the chart',
  startedAt: (coordinate: string) => `Started at ${coordinate}`,

  /** The way into rating a drink that was not handed over (a pick, "Rate this", a chat's draft). */
  rateDrink: 'Rate a drink',
  ledgerTitle: 'What moved it',
  ledgerEmpty: 'No pours yet. Rate a drink and it lands here.',
  /** The three EKF readings beyond x/y, shown once at least 3 pours have trained them. */
  tolerancesTitle: 'Beyond the chart',
  tolerances: {
    bitter: 'Bitter',
    tannin: 'Structure',
    complexity: 'Complexity',
  },
  /** Under the ledger, for a member: comparing is at your link (`/p/<handle>`). */
  compareLink: 'Compare with someone',
} as const;

/** The rating sheet, over Compass or Your map: one pour, rated, and where the coordinate went. */
export const ratePage = {
  title: 'Rate a drink',
  heading: 'How was it?',
  /** For a screen reader: what the sheet that just opened is for. */
  description: 'Say how it was, and see where your coordinate goes.',
  close: 'Close',
} as const;

/**
 * What Your map and the rating sheet say to someone with no coordinate yet: what the loop
 * is, and the ways in.
 */
export const coldState = {
  title: 'Drink it, log it, watch the map move.',
  body: 'Your coordinate starts with a few questions, then it follows you. Every pour you log nudges it.',
  quizCta: 'Find your coordinate',
  signInCta: 'Sign in',
  guestCta: 'Rate one as a guest',
  guestNote: 'As a guest, it stays on this device.',
} as const;

/**
 * A drink picked on Compass, kept on the device until it is rated: the strip
 * on Compass and Your map that says so.
 */
export const waitingPick = {
  atHome: 'At home',
  waiting: 'Waiting to be rated',
  rate: 'Rate it',
  dismiss: 'Set it aside',
} as const;

/**
 * Starting over, which a guest finds at the foot of Your map and a member on
 * Settings; and the header's word for an account it cannot name.
 */
export const account = {
  title: 'Your account',
  /** The header's link where the page cannot know who is reading (prerendered). */
  neutral: 'Account',
  startOver: 'Start over',
  startOverBody:
    'Retake the questions for a new coordinate. It replaces the one you have; the pours you have logged stay in your log.',
  startOverCta: 'Retake the questions',
  startOverCancel: 'Keep it',
} as const;

/**
 * `/settings` — a member's account, as one screen of rows: who they are
 * signed in as (and signing out), their link (`/p/<handle>`), the chat assistants they
 * have let act as them, and starting over.
 */
export const settings = {
  title: 'Settings',
  signedInAs: 'Signed in with Bluesky as',
  signOut: 'Sign out',
  signOutNote: 'Signing out clears your coordinate from this device. It stays in your account, and connected assistants keep working.',

  mapTitle: 'Sharing',
  publicMap: 'Your link',
  publicMapBody: 'Your map as anyone who opens it sees it, and where you compare with people you follow.',
  open: 'Open',
  share: 'Share to your feed',
  shareBody: 'A Bluesky post with your region, the drink nearest you, and the link.',
  shareCta: 'Share',
  shared: 'Posted to your feed.',
  shareFailed: 'That did not go through. Try again.',
  shareNoMap: 'There is no map on your account to share yet. Answer the questions first.',

  assistantsTitle: 'Chat assistants',
  assistantsLede:
    'Assistants you have let use Cotidal as you. Disconnecting one revokes its access at once; to reconnect, you approve it again.',
  assistantsNone: 'No assistant is connected.',
  howToConnect: 'Connect one',
  /** When member connections are off here: what still works, and where to set it up. */
  assistantsOff: 'An assistant can read your map by your handle, with nothing to connect here.',
  howToSetUp: 'Set one up',
  unnamed: 'An assistant with no name',
  unverified: 'Name given by the assistant',
  verified: (domain: string) => `From ${domain}`,
  sendsTo: (host: string) => `Access goes to ${host}`,
  connectedOn: (date: string) => `Connected ${date}`,
  canRead: 'Reads your palate and your pours',
  canLog: 'Reads your palate and pours, and logs pours you tell it about',
  disconnect: 'Disconnect',
  disconnected:
    'Disconnected. Remove Cotidal from that assistant’s connectors too, or it will ask to connect again.',
  disconnectFailed: 'That did not go through. Try again.',
} as const;

export const hero = {
  headline: 'Every palate has',
  headlineAccent: 'a coordinate.',
  body:
    'A few questions put a point on the chart. Show it a bar’s menu and it says what to have.',
  primaryCta: 'Find your coordinate',
  /** Stated under the one primary action, so the cost is known up front. */
  cost: 'About two minutes · no account needed',
  /** A member at the front door already has a map: the one action opens it. */
  memberCta: 'Open your map',
  /** The card's head: what the map behind it is (`sample-palate.ts`), so nobody takes it for theirs. */
  sampleLabel: 'A sample palate, rated as it goes',
  /** Under the fold of the card, pulled up: how it works, briefly, then the whole account. */
  howTitle: 'How it works',
  howMore: 'How it works, in full',
  /** Then signing in, for someone who has a map on another device. */
  signInTitle: 'Already have a map?',
  signInBody: 'Sign in with Bluesky and it comes with you: your coordinate and your pours are kept in your own account.',
} as const;

export const quadrants = [
  {
    id: 'deep',
    name: 'The Deep',
    axis: 'Rich · Savory',
    gloss: 'Dark, bitter, unhurried. Negronis, Manhattans, amaro, peat. Drinks that argue back.',
  },
  {
    id: 'salt-line',
    name: 'The Salt Line',
    axis: 'Crisp · Savory',
    gloss: 'Dry, mineral, exact. Martinis, fino sherry, a gin and tonic. Nothing hidden behind sugar.',
  },
  {
    id: 'eddy',
    name: 'The Eddy',
    axis: 'Rich · Sweet',
    gloss: 'Dense, warm, slow. Port, cream, coffee. Where the current pools at the end of the night.',
  },
  {
    id: 'surf',
    name: 'The Surf',
    axis: 'Crisp · Sweet',
    gloss: 'Bright, cold, quick. Spritzes, daiquiris, mojitos. Built for company.',
  },
] as const;

/**
 * Section labels. The page reads as a printed menu, and a menu names its
 * sections — these are the equivalent of "Plates" and "Cocktails" at the head
 * of a column.
 */
/** The sign-in page's sections (`/sign-in`). */
export const sections = {
  principles: 'Whose log it is',
  connect: 'Sign in',
  whatItKeeps: 'What signing in keeps',
} as const;

export const connect = {
  title: 'Keep your map with you.',
  /** Compact subtitle inside the in-app sheet so the form stays above the fold. */
  sheetLede: 'Your coordinate, pours, and a link to your map — saved in your own Bluesky account.',
  /** The sign-in page's lede: what differs, which also says that nothing else does. */
  lede: 'As a guest, your coordinate and pours stay on this device. Sign in with Bluesky and they’re kept in your own account instead.',
  continueAs: 'Continue on this device',
  continueAsAccount: (name: string) => `Continue as ${name}`,
  forgetAccount: (handle: string) => `Forget @${handle} on this device`,
  orAnother: 'Or sign in with another handle',
  label: 'Your Bluesky handle',
  placeholder: 'you.bsky.social',
  suggestionsLabel: 'Matching Bluesky accounts',
  submit: 'Sign in with Bluesky',
  connecting: 'Opening Bluesky…',
  noAccountPrompt: 'New to Bluesky?',
  createAccount: 'Create an account',
  creating: 'Opening Bluesky…',
  guest: 'Keep browsing as a guest',
  disabled: 'Signing in is switched off for now. Everything else works.',
  /**
   * What signing in buys, in the order a guest will feel it. One list, used
   * by the landing page's sign-in section and the in-app sheet alike, so the
   * promise cannot drift between them. Only what a guest does not already
   * have: rating, the menu and the map all work signed out, on the device.
   * "Following" says plainly it is later.
   */
  buys: [
    {
      title: 'On any phone',
      // Whose account it is, and that it is public, is "Whose log it is"; this is only the phone.
      body: 'Your coordinate and every pour follow you to the next phone, and survive a cleared browser.',
    },
    {
      title: 'A map you can send',
      body: 'Your coordinate at a link of its own. A friend who opens it sees the distance between you, and a drink each of you would order that the other wouldn’t.',
    },
    {
      title: 'In your chat assistant',
      body: 'Ask a chat assistant what to drink, with your coordinate in hand. Later: the pours of the people you follow.',
    },
  ],
} as const;

/** The words on the map's axes. Set in caps where they are drawn. */
export const axes = { rich: 'Rich', crisp: 'Crisp', sweet: 'Sweet', savory: 'Savory' } as const;

/** The quiz's own chrome. The questions themselves live in discovery-questions.ts. */
export const quiz = {
  back: 'Back',
  backLabel: 'Back to the previous question',
  skip: 'Skip',
  skipLabel: 'Skip the questions and go to the menu',
  /** "3 of about 8" — honest, because the selector is adaptive. */
  countJoiner: 'of about',
  loading: 'Locating your coordinate…',
  /** The small chart over the running foot: where the answers so far put you, and how surely. */
  narrowing: 'On the map: where your answers point so far',
} as const;

/** The reveal: the one screen where the product says who you are. */
export const reveal = {
  eyebrow: 'Your coordinate lands in',
  continue: 'See your menu',
  retake: 'Not you? Retake the questions',
} as const;

/** Your menu on Compass: the top pick and the drinks after it. */
export const menu = {
  youAreIn: 'You are in',
  coldBody: 'Answer them and this list ranks every drink for you, then learns from what you rate. Until then, search away.',
  empty: 'Nothing on the map fits these limits yet.',
} as const;

/** The chart: the whole map, your menu under it, and any drink on it. */
export const chart = {
  label: 'The chart',
  /** Your map's chart: you, the way you came, and what you have poured. */
  yoursLabel: 'Your map',
  legendYou: 'You',
  legendPoured: 'Other pours',
  findYours: 'Find your coordinate',
  howFar: 'How far',
  legendTrack: 'Your track',
  legendShoal: 'Where you probably are',
  /** Which way a drink lies from you, in the axes' own words (`wayTo`). */
  way: { richer: 'richer', crisper: 'crisper', sweeter: 'sweeter', savory: 'more savory', here: 'right here' },
  wayOf: (words: string[]) => words.join(', '),
  /** How far, read aloud beside the figure. */
  farOf: (n: number) => `${n} away`,
  /** The mark for you on a map, read aloud. */
  you: 'Your coordinate',
  youIn: (region: string) => `Your coordinate, in ${region}`,
  youNowIn: (region: string) => `Your coordinate, now in ${region}`,
  lastPour: 'Your last pour',
  logThis: 'Rate this',
  pickThis: 'Pick this',
  readEntry: 'Read the entry',
  coldDrinkPrompt: 'Find your coordinate to see how close this sits to your palate.',
  close: 'Close',
  sameSpot: 'Also here',
  legendMenu: 'On your menu',
  legendElsewhere: 'Elsewhere',
  legendLiked: 'Liked (7+)',
  /**
   * Why a drink stands where it does on your menu: your own ratings, never a
   * predicted score (`relevanceOf`'s `evidence` and `rated`). Names come titled.
   */
  reason: (near: readonly { name: string; hedonic: number }[], rated?: number) => {
    const nearBy = near.length ? `near your ${near.map((e) => `${e.name} (${e.hedonic})`).join(' and ')}` : '';
    if (rated !== undefined) return nearBy ? `You gave it ${rated} · ${nearBy}` : `You gave it ${rated}`;
    return nearBy ? nearBy[0].toUpperCase() + nearBy.slice(1) : 'Near where your answers put you';
  },
} as const;

/**
 * Your taste in the axes' own words (`leanings` in `terrain.ts`): one phrase
 * per hill, never a region's name.
 */
export const taste = {
  label: 'You lean',
  axis: { rich: 'rich', crisp: 'crisp', sweet: 'sweet', savory: 'savory' },
  /** A hill in the middle of both axes. */
  middle: 'balanced',
  /** One hill's phrase: "crisp and sweet", "savory", "balanced". */
  phrase: (x: 'rich' | 'crisp' | null, y: 'sweet' | 'savory' | null) => {
    const words = [x && taste.axis[x], y && taste.axis[y]].filter(Boolean);
    return words.length ? words.join(' and ') : taste.middle;
  },
  /** Every hill's phrase, highest first. */
  phrases: (hills: readonly { x: 'rich' | 'crisp' | null; y: 'sweet' | 'savory' | null }[]) =>
    hills.map((h) => taste.phrase(h.x, h.y)).join(' · '),
} as const;

/** After a pour is logged: the payoff of signing in, shown every time. */
export const moved = {
  eyebrow: 'Logged',
  /** How far the pour moved you, to a tenth. */
  title: (distance: number) => `Moved ${distance}`,
  /** A pour on the map that moved you nowhere: a rating between 4 and 6. */
  heldTitle: 'Held.',
  held: 'A rating between 4 and 6 holds you where you are.',
  unlistedTitle: 'Logged.',
  unlisted: (name: string) => `${name} is not on the map yet, so your coordinate stayed where it was.`,
  stillIn: 'Still in',
  nowIn: 'Now in',
  rankOnMenu: (n: number) => `Now No. ${n} on your menu`,
  offMenu: 'Not on your menu',
  newOnMenu: 'New on your menu',
  back: 'Done',
} as const;

export const principles = [
  {
    icon: 'book',
    title: 'A dated log, signed by you',
    body:
      'Every pour you log is a dated entry, signed by you: where you were, what it was, whether it landed. Nobody is scoring your bar tab or ranking your taste.',
  },
  {
    icon: 'lock',
    title: 'Kept in your own account',
    body:
      'Sign in and your coordinate, the answers behind it and every pour are saved to your own Bluesky account, not to us. They’re public there, and they’re yours. If this app disappears tomorrow, your log stays with you.',
  },
  {
    icon: 'compass',
    title: 'An open record',
    body:
      'Your coordinate is saved in an open format, the way a blog has a feed. Any app built on the same protocol as Bluesky can read it, not only this one.',
  },
] as const;

/**
 * The drinks register. The premise is the separation: cocktail origin stories
 * are overwhelmingly unsourced retelling, and a product that claims to measure
 * taste precisely should be the one that says which is which.
 */
export const drinks = {
  eyebrow: 'Drinks',
  title: 'Every drink on the chart',
  intro:
    'Most of what gets said about a cocktail is repetition. Each entry gives the build, places the drink on the chart, and separates what is on the record from what bartenders only tell each other.',
  navLabel: 'Drinks',
  backLabel: 'All drinks',
  coordinateLabel: 'Coordinate',
  buildLabel: 'The build',
  documentedLabel: 'On the record',
  claimedLabel: 'Claimed, not established',
  sourcesLabel: 'Sources',
  optionalLabel: 'optional',
  glassLabel: 'Glass',
  methodLabel: 'Method',
  garnishLabel: 'Garnish',
  emptyQuadrant: 'Nothing written up here yet.',
  /** The regions as a filter on the list (`RegionFilter.astro`). */
  filterLabel: 'Filter by region',
  filterAll: 'All',
  /** Compare-to-palate band on `/drinks/<slug>` for readers arriving from search or assistants. */
  compareLabel: 'Your palate',
  compareTitle: (title: string) => `See how ${title} fits your palate.`,
  compareBody:
    'Every drink on the chart has a coordinate. Your map opens on this one; with no coordinate yet, a few questions place you first.',
  compareCta: 'See where it sits for you',
  /** Under a drink's entry: the drinks nearest it on the map. */
  nearLabel: 'Near it on the map',
} as const;

/**
 * `/drinks/regions/<id>`. The prose of each region lives in `src/content/regions/`;
 * these are the parts that are the same for all four, and they describe what
 * the product does rather than what a region means.
 */
/** A quadrant's axis label as words: "Rich · Savory" → "Rich and savory". */
export function axisWords(axis: string): string {
  const [a, b] = axis.split(' · ');
  return b ? `${a} and ${b.toLowerCase()}` : axis;
}

export const regionPage = {
  /** Over a region's title: where it sits in the site, then its axis in words ("Rich and savory"). */
  eyebrow: (axis: string) => `Drinks · ${axisWords(axis)}`,
  /** Over the region's prose, under its drinks. */
  aboutLabel: (name: string) => `About ${name}`,
  orderingLabel: 'What it says about you',
  /** `axis` is a quadrant's axis label, e.g. "Rich · Savory". */
  ordering: (name: string, axis: string) =>
    `Your coordinate lands in ${name} when your answers lean ${axisWords(axis).toLowerCase()}. That is all it is: a position, worked out from the options you picked. The menu starts from that point, so the closer you sit to the drinks below, the sooner it reaches for them. Log what you drink and the menu learns from your ratings, here and in any other part of the map you like.`,
  /** Under the list: how a drink came to be in it. */
  placedNote:
    'A drink is here because the chart places it here. Cocktails and spirits are placed by hand; wines and beers are placed from their style profile, never from a recipe’s proportions.',
  sharedLabel: 'What they share',
  sharedNote: (total: number) =>
    `Counted from the ingredients of the ${total} drinks written up here; an ingredient given as alternatives counts toward each. Wines, beers and spirits served alone list what they are made from, and share nothing on this list.`,
  sharedCount: (count: number, total: number) => `${count} of ${total}`,
} as const;

/**
 * The one pour form and the one ledger. Ratings are the 9-point hedonic scale the pour
 * record stores (app.cotidal.pour), so what you tap is what is written.
 */
export const pour = {
  drinkLabel: 'What you’re drinking',
  drinkPlaceholder: 'A drink on the map, or anything else',
  unlisted: (name: string) =>
    `${name} is not on the map yet. The pour goes in your log, but it cannot move your coordinate.`,
  suggestionsLabel: 'From your menu',
  nearLabel: 'Close to you',
  whereLabel: 'Where',
  atBar: 'At a bar',
  atHome: 'At home',
  barLabel: 'Bar name',
  barPlaceholder: 'Attaboy, Dante, your local',
  recentLabel: 'Recently',
  ratingLabel: 'How it landed',
  /** Index 0 is 1 on the scale. */
  hedonic: [
    'Dislike extremely',
    'Dislike very much',
    'Dislike moderately',
    'Dislike slightly',
    'Neither',
    'Like slightly',
    'Like moderately',
    'Like very much',
    'Like extremely',
  ],
  scoreOf: (n: number) => `${n} of 9`,
  deviationsLabel: 'What was off',
  optional: 'optional',
  deviations: {
    'too-sweet': 'Too sweet',
    'not-sweet-enough': 'Not sweet enough',
    'too-sour': 'Too sour',
    'not-sour-enough': 'Not sour enough',
    'too-bitter': 'Too bitter',
    'too-smoky': 'Too smoky',
    'too-anise': 'Too much anise',
    'too-rich': 'Too rich',
    'too-crisp': 'Too dry',
    'too-flat': 'Too flat',
    'too-fizzy': 'Too fizzy',
  },
  noteLabel: 'A note',
  notePlaceholder: 'The nose, the finish, who made it',
  moreDetail: 'More detail',
  spiritLabel: 'Base spirit',
  glassLabel: 'Glass',
  garnishLabel: 'Garnish',
  garnishPlaceholder: 'Orange peel, brandied cherry',
  /** The select's empty choice: nothing is recorded until something is picked. */
  notSet: '—',
  /** Base spirits by stored id (`BASE_SPIRITS` in vocab.ts). */
  spirits: {
    bourbon: 'Bourbon',
    rye: 'Rye',
    scotch: 'Scotch',
    gin: 'Gin',
    rum: 'Rum',
    tequila: 'Tequila',
    mezcal: 'Mezcal',
    vodka: 'Vodka',
    brandy: 'Cognac / Brandy',
    amaro: 'Amaro / Aperitif',
    'non-alcoholic': 'Non-alcoholic',
  } satisfies Record<BaseSpirit, string>,
  /** Glasses by stored id (`GLASSWARE` in vocab.ts). */
  glasses: {
    coupe: 'Coupe',
    'nick-and-nora': 'Nick & Nora',
    rocks: 'Rocks',
    highball: 'Highball',
    martini: 'Martini',
    'tiki-mug': 'Tiki mug',
  } satisfies Record<Glassware, string>,
  intensityLabel: 'How strong it tasted',
  intensityHint: 'Only the ones you move are kept.',
  intensities: {
    sweetness: 'Sweet',
    sourness: 'Sour',
    bitterness: 'Bitter',
    alcoholHeat: 'Alcohol heat',
  } satisfies Record<AskedIntensity, string>,
  notRated: 'Not rated',
  /** Below the scale's first anchor. */
  glmsNone: 'None',
  /** The gLMS anchors (`GLMS_ANCHORS` in vocab.ts), as the scale words them. */
  glms: {
    'barely-detectable': 'Barely detectable',
    weak: 'Weak',
    moderate: 'Moderate',
    strong: 'Strong',
    'very-strong': 'Very strong',
    'strongest-imaginable': 'Strongest imaginable',
  } satisfies Record<GlmsAnchor, string>,
  cataLabel: 'What you noticed',
  /**
   * Check-all-that-apply aroma and flavour notes, by the id a pour stores
   * (`CATA` in records.ts). Reword a label freely; never rename a key.
   */
  cata: {
    'bright-citrus': 'Bright citrus',
    'lime-peel': 'Lime peel',
    'stone-fruit': 'Stone fruit',
    'dark-cherry': 'Dark cherry',
    'campfire-smoke': 'Campfire smoke',
    'botanical-herb': 'Botanical herb',
    'baking-spice': 'Baking spice',
    'toasted-oak': 'Toasted oak',
    'floral-blossom': 'Floral blossom',
    'bittersweet-cocoa': 'Bittersweet cocoa',
    'briny-mineral': 'Briny mineral',
    'rich-velvet-body': 'Rich velvet body',
  },
  crosspost: 'Also post it to your Bluesky feed',
  submit: 'Log it',
  submitting: 'Logging…',
  needDrink: 'Name the drink first.',
  needBar: 'Name the bar, or choose “At home”.',
  needRating: 'Tap how it landed first.',
  /** Shown where a rating would be until one is tapped, on a drafted pour. */
  tapRating: 'Tap one',
  draftNote:
    'Drafted in your chat. Check each field and tap how it landed; nothing is saved until you log it.',
  failed: 'That pour did not save. Try again.',
  home: 'Home',
} as const;

/**
 * /how-it-works: how answers and ratings place and move a coordinate, said
 * as the code does it today (docs/brand.md, Claims). Every number here is a
 * constant in belief-state.ts or palate-state.ts, and
 * tests/unit/how-it-works.test.ts holds the two equal. Never the code's words:
 * no calibration, no latent, no triangulation.
 */
export const howItWorks = {
  eyebrow: 'How it works',
  title: 'How your answers and ratings move your point',
  lede:
    'Your coordinate comes from two things only: the answers you give and the drinks you rate. This is how each one counts, and where it is kept.',
  sections: [
    {
      id: 'questions',
      title: 'The questions',
      paragraphs: [
        'The first 4 questions are the same for everyone. After those, each question is chosen to tell us the most about where you sit, or to settle whether you avoid smoke, bitterness or anise.',
        'The questions stop once both directions on the chart are sure enough and those three aversions are settled: never fewer than 4, never more than 8.',
        'Each answer is weighed against every point on the chart: how likely is someone sitting there to pick what you picked? Your point is where all your answers agree best. The order makes no difference.',
        'People don’t answer like machines, so the chart also estimates how steady your answers are. When answers disagree, your point stays unsure rather than settling confidently halfway between them.',
      ],
    },
    {
      id: 'sure',
      title: 'How sure it is',
      paragraphs: [
        'The questions settle how sure your point is, as well as where it is. A point placed firmly moves less with your first ratings than one left loose.',
      ],
    },
    {
      id: 'ratings',
      title: 'Rating a drink',
      paragraphs: [
        'You rate a drink from 1 to 9. A 7 or higher pulls your point toward that drink, a 3 or lower pushes it away, and anything in between leaves it where it is.',
        'Each step shrinks as your point grows surer, so your hundredth rating moves it less than your first. One drink never moves your point more than a tenth of the way across the chart.',
        '“What was off” adds a fixed nudge: too sweet moves you toward savory, too rich toward crisp. Too smoky, too bitter or too anise marks a flavour you avoid, and those drinks leave your menu.',
        'A drink not on the map has no place to pull toward, so only “what was off” counts for it.',
      ],
    },
    {
      id: 'menu',
      title: 'Your menu',
      paragraphs: [
        'Your menu ranks drinks by your own ratings of the drinks around them. Near drinks you rated high, a drink comes up; near drinks you rated low, it goes down. Where you haven’t rated anything nearby, your answers decide: the closer a drink sits to where they put you, the higher it comes.',
        'You can like more than one part of the map. Ratings in two places make two places your menu reaches for, rather than a point halfway between them.',
        'A rating says most about the drink itself and less about its neighbours. It says less again about a different kind of drink: a cocktail you loved says less about the wine beside it than about the cocktail beside it.',
        'Only among drinks that stand about level do the kinds of drink your answers point to decide the order. Each drink on your menu says which of your ratings put it there.',
        'Anything you rated 3 or less last time comes off your menu, and so does any drink with a flavour you avoid.',
      ],
    },
    {
      id: 'unseen',
      title: 'What the chart doesn’t show',
      paragraphs: [
        'Each rating of a drink on the map also updates three readings that aren’t drawn on the chart: how you take bitterness, structure and complexity. They are saved with your coordinate and refine how your menu ranks drinks as your pours add up.',
      ],
    },
    {
      id: 'kept',
      title: 'What is kept, and where',
      paragraphs: [
        'Before you sign in, your coordinate, answers and ratings stay on this device.',
        'Once you sign in, your coordinate, every answer as you gave it and every drink you rate are saved to your own Bluesky account. They’re public there, and they’re yours. Retaking the questions adds a new set beside the old one.',
        'Signing out clears your coordinate from this device. It stays in your account.',
      ],
    },
    {
      id: 'not',
      title: 'What it doesn’t use',
      paragraphs: [
        'Only your answers and ratings move your point: not the season, the hour, the weather or what other people rate. No AI model places or moves it.',
      ],
    },
  ],
  laterTitle: 'How far to trust it',
  later: [
    'Today, how much each answer counts was set by testing the questions against simulated answers, not real ones.',
    'Later: checking saved answers against how people later rated drinks, to refine which questions work and how much each should count.',
  ],
  start: 'Find your coordinate',
} as const;

export const venuesCopy = {
  eyebrow: 'For bars',
  title: 'A bar claims itself by matching its URL to its DID.',
  subtitle:
    'Point your bar’s domain to your AT Protocol DID, publish a venue record from that account, and the bar is yours on the protocol. No approval queue, no registry, nothing for us to grant.',
  todayTitle: 'On the protocol today',
  today: [
    {
      title: 'URL matched to DID',
      description:
        'app.cotidal.venue, held at rkey self in the bar’s own repository. Claiming checks that your bar’s website domain resolves to your DID, then renders your bar live at /v/your-domain.',
    },
    {
      title: 'Menus as snapshots',
      description:
        'app.cotidal.menu: a dated snapshot, re-published rather than edited, so a menu from March stays true about March. Point currentMenu at it and Cotidal renders it with sensory coordinates.',
    },
    {
      title: 'Pours that name your bar',
      description:
        'Every pour a member logs records the bar by name. When you claim your domain, reconciling those pours to your bar happens without rewriting anyone’s record.',
    },
  ],
  laterTitle: 'Coming next',
  later: [
    'Later: address verification by mail — a postcard sent to the bar with a one-time code to prove you are at that address.',
    'Later: what your patrons have logged at your bar, and where their palates sit on the map.',
    'Later: your menu on your own domain, rendered from your own records.',
    'Later: syncing the menu from your point-of-sale system.',
    'Later: for bartenders, a profile that links the specs you wrote and counts where they are poured. Adoption, never a score.',
  ],
  examplesTitle: 'Example menus',
  examplesSubtitle:
    'Drinks from well-known bars, placed on the map by us to show what a published menu carries. These bars have published nothing here and are not affiliated with Cotidal.',
  exampleTag: 'Example',
  examplesSpecs: (n: number) => `On the map (${n})`,
  publishCta: 'Claim your bar',
} as const;

/** Claiming a bar on `/bars` (`#claim`): the self-serve venue claim & menu publisher. */
export const barPublish = {
  /** For anyone not signed in: claiming is done as the bar's own account. */
  signInToClaim: 'Sign in as your bar to claim it',
  lede: 'Sign in with your bar’s AT Protocol account and enter its website. We verify that the domain resolves to your DID, then write app.cotidal.venue at rkey self and a dated app.cotidal.menu snapshot to your repository.',
  publishingAs: 'Publishing as',
  nameLabel: 'Bar name',
  namePlaceholder: 'Attaboy',
  descriptionLabel: 'Short description (optional)',
  descriptionPlaceholder: 'Classic and bespoke cocktails on the Lower East Side.',
  websiteLabel: 'Bar website (must resolve to your DID)',
  websitePlaceholder: 'https://attaboy.nyc',
  menuTitleLabel: 'Menu title (optional)',
  menuTitlePlaceholder: 'Winter Cocktails',
  menuLinesLabel: 'Menu items (one drink per line, optional — ingredients)',
  menuLinesPlaceholder: 'Paper Plane — bourbon, Aperol, Amaro Nonino, lemon\nNegroni\nDry Martini',
  submit: 'Verify domain & publish',
  needName: 'Enter your bar’s name first.',
  needWebsite: 'Enter your bar’s website so we can verify its domain matches your DID.',
  invalidWebsite: 'Website must start with https:// or http://.',
  domainMismatch: (domain: string, did: string) =>
    `${domain} does not resolve to ${did}. Set your handle to ${domain} or serve your DID at https://${domain}/.well-known/atproto-did, then try again.`,
  domainCheckFailed: 'Could not check that domain right now. Try again in a moment.',
  publishFailed: 'Could not publish your venue record. Try again.',
  postcardNote:
    'Later: a second level of verification will mail a postcard with a one-time code to prove you are at that address.',
} as const;

/** `/v/<handle>` — live AT Protocol venue & menu page. */
export const venuePage = {
  eyebrow: 'Venue',
  menuTitle: 'Current menu',
  noMenu: 'This venue has claimed its handle, but has not published a menu yet.',
  noVenueTitle: 'No venue record here yet.',
  noVenueBody: 'This account exists, but it has not published an app.cotidal.venue record.',
  notFoundTitle: 'No bar by that handle.',
  notFoundBody: 'That handle does not resolve to an AT Protocol account.',
  unavailableTitle: 'The venue’s server did not answer.',
  unavailableBody: 'Try again in a moment.',
  publishedOn: (date: string) => `Published ${date}`,
  websiteLabel: 'Website',
  domainVerified: 'Domain verified',
  rankForMe: 'Rank this menu for my palate',
  onMap: 'On the map',
  unplaced: 'House pour',
} as const;

/**
 * `/p/<handle>` — someone's coordinate at a public URL, and, for a signed-in
 * visitor, theirs beside it. Two dots and the distance between them.
 */
/** A page that is not there (`src/pages/404.astro`). */
export const notFound = {
  title: 'Nothing charted here.',
  lede: 'That address does not lead to a page. The link may be old, or mistyped.',
  cta: 'Find your coordinate',
  drinks: 'or look through every drink',
} as const;

export const publicMap = {
  eyebrow: 'Public map',
  /** The eyebrow on your own: the name Settings and Your map give it. */
  selfEyebrow: 'Your link',
  coordinateLabel: 'Coordinate',
  title: (name: string) => `@${name}`,
  lands: 'Lands in',
  pours: (n: number) => (n === 1 ? 'Moved by 1 pour' : `Moved by ${n} pours`),
  quizOnly: 'From the questions alone',
  them: 'Them',
  you: 'You',
  /** Two tastes compared (`compareTerrains`, `with=`): said in drinks, leading with where they part. */
  betweenLabel: (a: string, b: string) => `Between ${a} and ${b}`,
  inCommon: (n: number, of: number) => (n === 0 ? `None of the top ${of} in common` : `${n} of the top ${of} in common`),
  /** How to read the map when it carries two tastes: the first as ground, the second as terracotta lines. */
  compareKey: (b: string, isYou: boolean) => `The shaded ground is this map; the terracotta lines are ${isYou ? 'yours' : `${b}’s`}.`,
  onlyLabel: (who: string, notWho: string) => `${who} would reach for, ${notWho} wouldn’t`,
  bothLabel: 'One for both',
  nearLabel: 'Close to this coordinate',
  /** `?drink=` on someone's map: the drink, and where it lies from them (`wayTo`). */
  drinkLabel: 'A drink on this map',
  drinkWay: (who: string, distance: number, words: string) => `${distance} from ${who}, ${words}`,
  drinkFromYou: 'you',
  drinkForYou: 'Where it sits for you',
  /** Their taste in the axes' words (`leanings`), as the map's card says yours. */
  leanLabel: (self: boolean) => (self ? 'You lean' : 'Leans'),
  /** Their menu: the drinks highest on their terrain, each with what put it there. */
  menuLabel: (self: boolean) => (self ? 'Your menu' : 'Their menu'),
  /** What put a drink on their menu (`chart.reason`, said of them). */
  reason: (near: readonly { name: string; hedonic: number }[], rated?: number) => {
    const nearBy = near.length ? `near their ${near.map((e) => `${e.name} (${e.hedonic})`).join(' and ')}` : '';
    if (rated !== undefined) return nearBy ? `Rated ${rated} · ${nearBy}` : `Rated ${rated}`;
    return nearBy ? nearBy[0].toUpperCase() + nearBy.slice(1) : 'Near where their answers put them';
  },
  selfNote: 'This is your link: your map as anyone who opens it sees it, drawn from the record in your own Bluesky account.',
  linkLabel: 'Your link',
  guestTitle: 'Where do you land?',
  guestBody: 'Find your own coordinate, then sign in and open this link again to see the distance between you.',
  guestCta: 'Find your coordinate',
  memberNoPalateBody: 'Finish the questions and your coordinate will sit beside theirs here.',
  noPalateTitle: 'No coordinate here yet.',
  noPalateBody: 'This account exists, but it has not published a palate.',
  notFoundTitle: 'Nobody by that name.',
  notFoundBody: 'That handle does not resolve to an account.',
  unavailableTitle: 'The record did not answer.',
  unavailableBody: 'Their server did not respond in time. Try again in a moment.',
  description: (name: string, region: string) => `@${name}’s palate lands in ${region}. Where does yours?`,
  plotLabel: (who: string) => `${who} on the palate map`,
  /** On your own map: comparing with someone. Opening theirs draws your dot beside it. */
  compareTitle: 'Compare palates',
  followsLede: 'People you follow who have a coordinate, nearest first.',
  followsContrast: (drink: string) => `They’d order ${drink}`,
  compareHint: 'Or type any Bluesky handle to see the distance between your maps.',
  compareLabel: 'A Bluesky handle',
  comparePlaceholder: 'friend.bsky.social',
  compareSubmit: 'Compare',
} as const;

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
    'palate:read': 'Answer from your palate without being told your handle: where it lands, what is near it, menus ranked for it.',
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
    'Cotidal places a person’s taste in drinks on a map: x runs Rich (−10) to Crisp (+10), y runs Savory (−10) to Sweet (+10). Each person’s palate is a public record on their Bluesky account, read by handle. Drinks are recommended by how close they sit to that coordinate, never by a score of the person. A distance is where a drink sits, not a forecast: say a drink is close to them and which way it lies (each result says, in Cotidal’s words), never that they will like it. To answer about a drink no list included, call get_drink with their handle rather than guess. Use search_drinks to turn a drink someone names into the name Cotidal knows it by.',
  instructions:
    'Nothing you call changes anyone’s map: to log a pour, draft_pour returns a link the person opens to check it, rate it and log it themselves.',
  tools: {
    getPalate: {
      title: 'Read a palate',
      description:
        'Read where someone’s taste lands on the Cotidal map, by Bluesky handle or DID: their coordinate, region, the flavours they avoid, how many pours have moved it, and the drinks closest to it.',
      handle: 'A Bluesky handle (alice.bsky.social, @alice) or a DID.',
    },
    recommend: {
      title: 'Recommend drinks',
      description:
        'The drinks on the Cotidal map closest to someone’s coordinate, nearest first, leaving out anything with a flavour they avoid. Each comes with its distance and which way it lies from them (“crisper, more savory”).',
      count: 'How many drinks to return.',
      type: 'Only drinks of this kind.',
    },
    rankMenu: {
      title: 'Rank a menu',
      description:
        'Order the drinks on a menu by how close each sits to someone’s coordinate. Pass each item as a drink name or an object with name and ingredients/description as written on the menu. Items Cotidal cannot place are returned as unplaced with any avoided-flavour cautions and closest known classic when the ingredients make it clear; placed drinks with an avoided flavour are flagged, not dropped.',
      items: 'Menu items: each a drink name, or { name, description?, ingredients? } as printed on the menu.',
    },
    compare: {
      title: 'Compare two palates',
      description:
        'Put two people’s coordinates side by side: how far apart they are, a drink each would order that the other would not, and one they would both order. This compares maps; it never ranks the people on them.',
      other: 'The second person’s Bluesky handle or DID.',
    },
    recommendForGroup: {
      title: 'Recommend for a group',
      description:
        'Find drinks or bottles a group of 2 to 8 people can share: respects every person’s avoided flavours and minimizes the worst-case distance across the table.',
      handles: 'Bluesky handles or DIDs for the people at the table (at least 2; on /mcp/me the signed-in member is included automatically if omitted).',
      count: 'How many shared drinks to return.',
      type: 'Only drinks of this kind.',
    },
    getDrink: {
      title: 'Read a drink',
      description:
        'Look up a drink on the Cotidal map by name: its coordinate, region, flavour flags, tags, and recipe build from the register. Given someone’s handle, also how far it sits from their coordinate, which way, and any flavour in it they avoid: use this for “what about X?” instead of guessing.',
      name: 'The drink’s name (use search_drinks if unsure).',
      handle: 'A Bluesky handle or DID, to measure the drink from their coordinate.',
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

/**
 * Posts written to the member's own Bluesky feed, at their request. Each is
 * followed by a link to their public map.
 */
export const feedPost = {
  palate: (region: string, topDrink: string) =>
    `My palate lands in ${region} on Cotidal, and my top match is ${topDrink}. See how far yours is from mine:`,
  /** In the pour form's own words: the hedonic label and its point on the 9-point scale. */
  pour: (drink: string, where: { atHome: boolean; venue: string | null }, hedonic: number) =>
    `${drink}${where.atHome ? ', poured at home' : where.venue ? ` at ${where.venue}` : ''}: ${pour.hedonic[hedonic - 1]} (${pour.scoreOf(hedonic)}). Logged on Cotidal:`,
} as const;

/** Coasters: a member's code, and one per region (docs/coasters.md). */
/**
 * The share cards: the image a link to `/`, a region, or someone's map
 * unfurls into (`src/pages/share/[card].astro`, `npm run images`). Alt text is
 * read aloud where the card is shown, so it says what is drawn.
 */
export const share = {
  siteAlt: 'The cotidal chart: four lines from a centre point, one band filled, a coordinate inside it.',
  regionAlt: (name: string) => `The cotidal chart with ${name} filled.`,
} as const;

export const coaster = {
  memberTitle: 'Your code',
  memberLede:
    'Scan it and it opens your map. It points at your account rather than your handle, so it keeps working if your handle changes.',
  memberLabel: (name: string) => `${name} on the map, with a code that opens their map`,
  /** Printing the page prints the code alone, at a coaster's size. */
  printNote: 'Print this page and the code prints on its own, the size of a coaster.',
  /** On your public map: where your code is. */
  findIt: 'Your code is in Settings.',
} as const;

/**
 * What a distance between two coordinates reads as. `under` is exclusive and
 * the list is ascending; the map's diagonal is about 28.3, so the last band
 * catches everything.
 */
export const distanceBands = [
  { under: 2, text: 'Practically the same glass.' },
  { under: 5, text: 'Neighbours. You’d trade sips.' },
  { under: 9, text: 'Same bar, different stools.' },
  { under: 14, text: 'Across the room from each other.' },
  { under: Infinity, text: 'Opposite ends of the map.' },
] as const;

/** Labels read only by assistive technology. */
export const a11y = {
  mainNav: 'Main navigation',
  breadcrumb: 'Breadcrumb',
  progress: 'Progress',
  answerOptions: 'Answer options',
} as const;

/**
 * What the app's own requests answer when they fail. Shown to people, so
 * they are interface copy; the server sends the same words back.
 */
export const apiErrors = {
  notConnected: 'You’re not signed in.',
  invalidRequest: 'That request was not understood.',
  invalidProfile: 'That coordinate didn’t look right.',
  invalidAnswers: 'Those answers didn’t look right.',
  invalidPour: 'That pour didn’t look right.',
  unknownAction: 'That request was not understood.',
  publishFailed: 'Couldn’t save your coordinate. Try again.',
  publishAnswersFailed: 'Couldn’t save your answers. Try again.',
  logFailed: 'That pour did not save. Try again.',
} as const;

export const footer = {
  note: 'Built on the AT Protocol.',
  drinkResponsibly: 'Please drink responsibly.',
} as const;

