/**
 * Single source of truth for user-facing marketing copy.
 *
 * Nothing in `src/components/marketing/` may contain a hard-coded string —
 * the voice lives here so it can be revised in one place. "Triangulation",
 * "Calibration", "Architecture" and "Context" remain valid *internal*
 * vocabulary (see AGENTS.md); they are deliberately absent from this file.
 */

import type { AskedIntensity, BaseSpirit, Glassware, GlmsAnchor } from './atproto/vocab';

export const site = {
  name: 'Cotidal',
  tagline: 'Every palate has a coordinate.',
  description:
    'Find the coordinate your taste actually sits on, and what to order once you know it.',
} as const;

export const nav = {
  skipToContent: 'Skip to content',
  home: 'Home',
  radio: 'Radio',
  map: 'Compass',
  register: 'Drinks',
  regions: 'The Four Regions',
  signIn: 'Sign in',
  signOut: 'Sign out',
  /** The header's account link where the page cannot know who is reading (prerendered). */
  account: 'Account',
  menu: 'Menu',
  footer: 'Site',
  log: 'Log',
  order: 'Order',
  bars: 'For Bars',
} as const;

/**
 * The bar along the foot of the app on a phone: listen, navigate, record.
 * Ordering is not a place, so it is a button (`OrderButton.astro`), not a tab.
 */
export const appBar = {
  label: 'App',
  radio: 'Radio',
  compass: 'Compass',
  log: 'Log',
  order: 'Order',
} as const;

/**
 * /radio: what is on the air — pours, newest first. Today that is your own;
 * the people you follow and the bars near you are Later, and say so.
 */
export const radio = {
  title: 'Radio',
  intro: 'Pours as they go out, newest first.',
  filterLabel: 'Tune to',
  filters: [
    { id: 'all', label: 'All' },
    { id: 'following', label: 'Following' },
    { id: 'nearby', label: 'Nearby' },
  ],
  followingLater: 'Later: pours from the people you follow on Bluesky.',
  nearbyLater: 'Later: pours at bars near you.',
  you: 'You',
  onDevice: 'On this device',
  empty: 'Nothing on the air yet. Order a drink, rate it, and it goes out here.',
  emptyCta: 'Order a drink',
  guestTitle: 'Tune in to the people you follow',
  guestBody: 'Sign in with Bluesky and Radio will carry their pours. Until then it carries yours, on this device.',
  today: 'Today',
  yesterday: 'Yesterday',
} as const;

/** /log: yours — where you are, what you have poured, and the account. */
export const logPage = {
  title: 'Log',
  guestEyebrow: 'On this device',
  guestTitle: 'Keep this log',
  guestBody: 'As a guest your coordinate and pours live on this device only. Sign in with Bluesky and they live in your own account, and move with you.',
  stats: {
    pours: 'Pours',
    bars: 'Bars',
    since: 'Since',
    best: 'Best so far',
  },
  logDirectly: 'Log one directly',
  settingsTitle: 'Account',
  publicMap: 'Your public map',
  assistants: 'Chat assistants',
  account: 'Sign out, start over',
  startOver: 'Start over',
} as const;

/**
 * /harbour: at a bar, deciding. Composed in steps like a post — where you
 * are, what's pouring, what to order — and the order is kept as a draft
 * until you rate it.
 */
export const harbour = {
  title: 'Harbour',
  steps: ['Where', 'Menu', 'Order'],
  stepOf: (n: number, total: number) => `${n} of ${total}`,
  back: 'Back',
  next: 'Next',
  whereTitle: 'Where are you?',
  whereBody: 'The bar, so the order and the rating land in the same place.',
  barLabel: 'Bar name',
  atHome: 'At home',
  recentLabel: 'Recently',
  menuTitle: 'What’s on the menu?',
  menuBody: 'Add what they pour. Anything on the map is placed; anything else is kept, unplaced.',
  addLabel: 'A drink on their menu',
  addPlaceholder: 'Last Word, house Negroni…',
  add: 'Add',
  remove: (name: string) => `Remove ${name}`,
  placed: 'On the map',
  unplaced: 'Not on the map',
  photoLater: 'Later: photograph the menu instead of typing it.',
  orderTitle: (where: string) => `What to order at ${where}`,
  orderTitleHome: 'What to pour at home',
  orderBody: 'Ranked by how close each drink sits to your coordinate.',
  unplacedTitle: 'Can’t place these yet',
  orderThis: 'Order this',
  orderedEyebrow: 'Ordered',
  orderedBody: 'Kept on this device until you rate it. Rate it once you’ve tasted it — that is what moves your coordinate.',
  rateNow: 'Rate it now',
  rateLater: 'Rate it later',
  coldTitle: 'Find your coordinate first.',
  coldBody: 'The harbour ranks a bar’s menu against your coordinate. A few questions place it.',
  coldCta: 'Find your coordinate',
  waiting: 'Waiting for your rating',
  rate: 'Rate it',
  dismiss: 'Set it aside',
} as const;

/** /account: who you are here, and the two things you can do about it. */
export const account = {
  title: 'Your account',
  signedInAs: 'Signed in as',
  /** When the session has no handle, only a DID. */
  signedIn: 'Signed in',
  links: {
    map: 'Your coordinate',
    log: 'Your pours',
    public: 'Your public map',
  },
  startOverTitle: 'Start over',
  startOverBody:
    'Retake the questions for a new coordinate. It replaces the one on your account; the pours you have logged stay in your ledger.',
  startOverCta: 'Retake the questions',
  signOutTitle: 'Sign out',
  signOutBody: 'Signing out also clears your coordinate from this device. It stays on your account.',
  guestTitle: 'Sign in to keep your coordinate.',
} as const;

export const hero = {
  edition: '[0, 0] · Origin point',
  headline: 'Every palate has',
  headlineAccent: 'a coordinate.',
  body:
    'Answer a few questions. A point appears on the chart. What surrounds it is what you should be ordering next.',
  primaryCta: 'Find your coordinate',
  primaryCtaReturning: 'Return to your map',
  /** Stated under the one primary action, so the cost is known up front. */
  cost: 'About two minutes · no account needed',
  /** The reading path: one tap away, never a second button. */
  readFirst: 'Read the four regions first',
  secondaryCta: 'Look at the map first',
  registerCta: 'Open the rutter',
} as const;

/**
 * The four quadrants of the palate map, named rather than explained.
 * Order matches reading order on the map: top-left, top-right, bottom-left,
 * bottom-right. Axis values are the sign of (x, y) in `src/lib/data.ts`.
 *
 * `id` is the stable handle code joins on — rename a quadrant here without
 * breaking `src/lib/quadrant.ts`, which maps coordinates onto these.
 */
export const quadrants = [
  {
    id: 'deep',
    name: 'The Deep',
    axis: 'Rich · Savory',
    gloss: 'Dark, bitter, and unhurried. Drinks that argue back.',
  },
  {
    id: 'salt-line',
    name: 'The Salt Line',
    axis: 'Crisp · Savory',
    gloss: 'Dry, mineral, and exact. Nothing hidden behind sugar.',
  },
  {
    id: 'eddy',
    name: 'The Eddy',
    axis: 'Rich · Sweet',
    gloss: 'Where the current slows and pools. Dense, warm, the last drink of the night.',
  },
  {
    id: 'surf',
    name: 'The Surf',
    axis: 'Crisp · Sweet',
    gloss: 'Bright, aerated, fast, and built for company.',
  },
] as const;

/**
 * Region ids before the water vocabulary, kept only so their URLs redirect
 * (`astro.config.mjs`). Nothing else may use them.
 */
export const formerQuadrantIds = { ember: 'deep', vault: 'eddy', orchard: 'surf' } as const;

/**
 * Section labels. The page reads as a printed menu, and a menu names its
 * sections — these are the equivalent of "Plates" and "Cocktails" at the head
 * of a column.
 */
export const sections = {
  map: 'The four regions',
  mapLabel: 'The chart',
  /** The reveal. The hero withholds the axes; this is where they land. */
  mapNote: 'Two axes — rich to crisp, savory to sweet. Four regions between them.',
  /**
   * A rutter is a mariner's book of sailing directions. It is the section's
   * name, not the link's: the header and links say "Drinks".
   */
  registerSpotlight: 'From the rutter',
  registerSpotlightLabel: 'On the record',
  registerSpotlightNote: 'Each entry separates what is on the record from what is only told.',
  /** The register's premise, stated as the reader's benefit. */
  registerCardLabel: 'Sourced, not repeated',
  /** From a region to its section of /drinks. */
  regionDrinks: 'Its drinks',
  principles: 'Your logbook, not ours',
  connect: 'Sign in',
} as const;

export const connect = {
  title: 'Keep your coordinate.',
  /** Landing page only; the in-app sheet goes straight from title to list. */
  lede: 'A palate isn’t static. Neither is your map.',
  body:
    'What you want at 6 PM in July isn’t what you want at midnight in November. Sign in to keep your starting point, take it to the bar, and watch your coordinate drift as you log what you drink.',
  label: 'Your Bluesky handle',
  placeholder: 'you.bsky.social',
  submit: 'Sign in with Bluesky',
  connecting: 'Opening Bluesky…',
  guest: 'Keep browsing as a guest',
  divider: 'or',
  disabled: 'Sign-in is not enabled in this environment.',
  /**
   * What signing in buys, in the order a guest will feel it. One list, used
   * by the landing page's sign-in section and the in-app sheet alike, so the
   * promise cannot drift between them. "Friends" says plainly it is later.
   */
  buys: [
    {
      title: 'Take it to the bar',
      body: 'Your coordinate follows you to any phone you sign in on. Pull up the drinks nearest you — or show the bartender the three closest instead of playing twenty questions.',
    },
    {
      title: 'Log a pour, track the drift',
      body: 'Record what you drank, where, and whether it landed. Your coordinate is reckoned from every entry, so you can watch your taste drift with the seasons.',
    },
    {
      title: 'Within hail',
      body: 'Later: where the people you already follow sit on the chart. For now, send anyone your map’s link and see the distance between you.',
    },
  ],
} as const;

/** The quiz's own chrome. The questions themselves live in discovery-questions.ts. */
export const quiz = {
  back: 'Back',
  backLabel: 'Back to the previous question',
  skip: 'Skip',
  skipLabel: 'Skip the questions and go to the menu',
  /** "3 of about 8" — honest, because the selector is adaptive. */
  countJoiner: 'of about',
  pushAway: 'Tap the one you’d send back.',
  loading: 'Locating your coordinate…',
} as const;

/** The reveal: the one screen where the product says who you are. */
export const reveal = {
  eyebrow: 'Your coordinate lands in',
  continue: 'See what to order',
  retake: 'Not you? Retake',
} as const;

/** The menu that replaces the old results dashboard. */
export const menu = {
  youAreIn: 'You are in',
  topPrefix: 'No. 1',
  topTitle: 'Your go-to',
  keepTitle: 'Keep this coordinate',
  keepBody: 'Log pours and watch it move.',
  signedInAs: 'Signed in as',
  share: 'Share to your feed',
  shared: 'Shared',
  startOver: 'Start over',
  startOverCancel: 'Keep it',
  empty: 'Nothing on the map fits these limits yet.',
} as const;

/** The chart: the whole map, your menu under it, and any drink on it. */
export const chart = {
  label: 'The chart',
  lensLabel: 'Show',
  lenses: [
    { id: 'drinks', label: 'Drinks' },
    { id: 'pours', label: 'Your pours' },
  ],
  findYours: 'Find your coordinate',
  poured: 'What you’ve poured',
  closeness: 'Closeness',
  lastPour: 'Your last pour',
  logThis: 'Log this',
  readEntry: 'Read the entry',
  close: 'Close',
  sameSpot: 'Also here',
  noPours: 'Nothing poured yet. Log a pour and it lands here.',
  offMap: (n: number) => (n === 1 ? '1 pour is of a drink not on the map.' : `${n} pours are of drinks not on the map.`),
  legendMenu: 'On your menu',
  legendElsewhere: 'Elsewhere',
  legendLiked: 'Liked (7+)',
  legendNot: 'Not for you',
} as const;

/** After a pour is logged: the payoff of signing in, shown every time. */
export const moved = {
  eyebrow: 'Logged',
  title: 'Your coordinate moved.',
  stillIn: 'Still in',
  nowIn: 'Now in',
  rankOnMenu: (n: number) => `Now No. ${n} on your menu`,
  offMenu: 'Not on your menu',
  newOnMenu: 'New on your menu',
  back: 'Back to your menu',
} as const;

export const principles = [
  {
    icon: 'book',
    title: 'A ship’s log, not a leaderboard',
    body:
      'Every pour you log is a dated entry signed by you — where you were, what it was, whether it landed. Nobody is gamifying your bar tab or ranking your taste.',
  },
  {
    icon: 'lock',
    title: 'Stored in your own repository',
    body:
      'Your coordinate, the answers behind it and every pour are written to your own Bluesky account on the AT Protocol — public there, and yours. Delete our app tomorrow and every entry stays with you.',
  },
  {
    icon: 'compass',
    title: 'An open record',
    body:
      'Your coordinate is a published record, not a row in our database. Any app built on the protocol can read it — today, that is this one.',
  },
] as const;

/**
 * The drinks register. The premise is the separation: cocktail origin stories
 * are overwhelmingly unsourced retelling, and a product that claims to measure
 * taste precisely should be the one that says which is which.
 */
export const drinks = {
  eyebrow: 'The rutter',
  title: 'What is actually known',
  intro:
    'Most of what gets said about a cocktail is repetition. Each entry in the rutter gives the build, places the drink on the chart, and separates what is on the record from what bartenders merely tell each other.',
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
} as const;

/**
 * `/regions/<id>`. The prose of each region lives in `src/content/regions/`;
 * these are the parts that are the same for all four, and they describe what
 * the product does rather than what a region means.
 */
export const regionPage = {
  backLabel: 'The four regions',
  orderingLabel: 'What it says about you',
  /** `axis` is a quadrant's axis label, e.g. "Rich · Savory". */
  ordering: (name: string, axis: string) =>
    `Your coordinate lands in ${name} when your answers lean ${axis
      .toLowerCase()
      .replace(' · ', ' and ')}. That is all it records: a position, worked out from the options you chose — not a type, and not a judgement of you. The menu ranks every drink by its distance from that point, so the nearer you sit to the drinks below, the sooner it reaches for them. Log what you actually drink and the point can move, across a border if that is where your pours take it.`,
  drinksLabel: 'The drinks here',
  /** Under the list: how a drink came to be in it. */
  placedNote:
    'A drink is here because the chart places it here. Places are set by hand, not computed from a recipe’s proportions.',
  sharedLabel: 'What they share',
  sharedNote: (total: number) =>
    `Counted from the ingredients of the ${total} drinks written up here; an ingredient given as alternatives counts toward each. Wines, beers and spirits served alone list what they are made from, and share nothing on this list.`,
  sharedCount: (count: number, total: number) => `${count} of ${total}`,
  otherLabel: 'The other three',
} as const;

export const returnVisit = {
  eyebrow: 'The Return Visit',
  title: 'Your map, and what moved it.',
  intro:
    'Every drink you log is a dated entry signed by you, and each one moves your coordinate toward what you actually enjoy.',
  coldTitle: 'The loop is: drink → log → the map changes.',
  coldBody:
    'Your coordinate is not a quiz result. It is a record in your own account, and it moves every time you log a pour.',
  signInCta: 'Sign in',
  quizCta: 'Find your coordinate first',
  guestCta: 'Try a pour as a guest',
  guestNote: 'As a guest, the pour stays on this device.',
  youAreIn: 'You are in',
  poursLabel: (n: number) => (n === 1 ? '1 pour' : `${n} pours`),
  menuLink: 'Your menu',
  regionLink: 'About this region',
  logEyebrow: 'New entry',
  logTitle: 'Rate it',
  ledgerEyebrow: 'Chronicle',
  ledgerTitle: 'What moved it',
  ledgerEmpty: 'No pours yet. Order a drink, rate it, and it lands here.',
  movedBack: 'Back to your ledger',
} as const;

/**
 * The one pour form and the one ledger, shared by the Log tab in /taste and
 * the return visit at /log. Ratings are the 9-point hedonic scale the pour
 * record stores (app.cotidal.pour), so what you tap is what is written.
 */
export const pour = {
  drinkLabel: 'What you’re drinking',
  drinkPlaceholder: 'A drink on the map, or anything else',
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
    'bright-citrus': 'Bright Citrus',
    'lime-peel': 'Lime Peel',
    'stone-fruit': 'Stone Fruit',
    'dark-cherry': 'Dark Cherry',
    'campfire-smoke': 'Campfire Smoke',
    'botanical-herb': 'Botanical Herb',
    'baking-spice': 'Baking Spice',
    'toasted-oak': 'Toasted Oak',
    'floral-blossom': 'Floral Blossom',
    'bittersweet-cocoa': 'Bittersweet Cocoa',
    'briny-mineral': 'Briny Mineral',
    'rich-velvet-body': 'Rich Velvet Body',
  },
  crosspost: 'Also post it to your Bluesky feed',
  submit: 'Log this pour',
  submitting: 'Logging…',
  signInToLog: 'Sign in to log a pour',
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

export const venuesCopy = {
  eyebrow: 'For bars',
  title: 'A bar claims itself by publishing one record.',
  subtitle:
    'Prove your domain as your AT Protocol handle, publish a venue record from that account, and the bar is yours on the protocol. No approval queue, no registry, nothing for us to grant.',
  todayTitle: 'What works today',
  today: [
    {
      title: 'The venue record',
      description:
        'app.cotidal.venue, held at rkey self in the bar’s own repository. The record is defined and any AT Protocol client can publish it. Cotidal does not read it yet.',
    },
    {
      title: 'Menus as posts',
      description:
        'app.cotidal.menu: a dated snapshot, re-published rather than edited, so a menu from March stays true about March. Defined; nothing here renders one yet.',
    },
    {
      title: 'Pours that name the bar',
      description:
        'A member’s pour records the bar by the name the drinker typed. When the bar later proves its domain, reconciling those pours to it is the app’s job — no one’s record is rewritten.',
    },
  ],
  laterTitle: 'Not built yet',
  later: [
    'Later: a page here that claims your venue and publishes your menu for you.',
    'Later: what your patrons have logged at your bar, and where their palates sit on the map.',
    'Later: your menu on your own domain, rendered from your own records.',
    'Later: syncing the menu from your point-of-sale system.',
    'Later: for bartenders, a profile that links the specs you wrote and counts where they are poured — adoption, never a score.',
  ],
  examplesTitle: 'Example menus',
  examplesSubtitle:
    'Drinks from well-known bars, placed on the map by us to show what a published menu would carry. These bars have published nothing here and are not affiliated with Cotidal.',
  exampleTag: 'Example',
  examplesSpecs: (n: number) => `On the map (${n})`,
} as const;

/**
 * `/p/<handle>` — someone's coordinate at a public URL, and, for a signed-in
 * visitor, theirs beside it. Two dots and the distance between them.
 */
export const publicMap = {
  eyebrow: 'A coordinate',
  title: (name: string) => `@${name}`,
  lands: 'Lands in',
  pours: (n: number) => (n === 1 ? 'Moved by 1 pour' : `Moved by ${n} pours`),
  quizOnly: 'From the questions alone',
  them: 'Them',
  you: 'You',
  distanceLabel: 'Between you',
  theirsLabel: 'They’d order, you wouldn’t',
  yoursLabel: 'You’d order, they wouldn’t',
  sharedLabel: 'One you’d both order',
  nearLabel: 'Close to this coordinate',
  selfNote:
    'This is your public map. The palate record behind it already lives in your own repository; this page only draws it.',
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
  readEntry: 'Read the entry',
  memberLink: 'Your public map',
  axes: { rich: 'Rich', crisp: 'Crisp', sweet: 'Sweet', savory: 'Savory' },
  plotLabel: (who: string) => `${who} on the palate map`,
} as const;

/**
 * `/assistants` — how to reach your palate from a chatbot. Also what a
 * browser sees at `/mcp`, the address the chatbot is given.
 */
export const assistants = {
  eyebrow: 'In your chatbot',
  title: 'Ask about your palate anywhere.',
  lede: 'Add Cotidal to Claude, or any chat assistant that takes an MCP server, and ask it what to order with your coordinate in hand.',
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
    'What to order from a menu you paste in.',
    'How far your map is from a friend’s.',
    'Where a drink sits on the map.',
    'To draft a pour you had, for you to log here.',
  ],
  askWith: (handle: string) => `Ask with your handle: “What does Cotidal say I should order? I’m @${handle}.”`,
  askWithGuest: 'Ask with your Bluesky handle: “What does Cotidal say I should order? I’m @you.bsky.social.”',
  readOnlyTitle: 'Only you log',
  readOnly:
    'The assistant reads the same public coordinate anyone can open at your public map. It can draft a pour, as a link to the form here, but only you log it: you check it, tap how it landed, and press the button. It cannot retake the questions or change your map.',
  /** On /account. */
  accountTitle: 'Use it in a chatbot',
  accountBody: 'Ask Claude, or another chat assistant, what to order with your coordinate.',
  accountCta: 'Set it up',
} as const;

/**
 * `/mcp` — the palate map as tools a chat assistant can call. Read-only: these
 * descriptions are read by the assistant, and through it by the person, so
 * they are interface copy like any other. Failures reuse `publicMap`'s words.
 */
export const mcp = {
  name: 'cotidal',
  instructions:
    'Cotidal places a person’s taste in drinks on a map: x runs Rich (−10) to Crisp (+10), y runs Savory (−10) to Sweet (+10). Each person’s palate is a public record on their Bluesky account, read by handle. Drinks are recommended by how close they sit to that coordinate, never by a score of the person. Use search_drinks to turn a drink someone names into the name Cotidal knows it by. Nothing you call changes anyone’s map: to log a pour, draft_pour returns a link the person opens to check it, rate it and log it themselves.',
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
        'The drinks on the Cotidal map closest to someone’s coordinate, nearest first, leaving out anything with a flavour they avoid.',
      count: 'How many drinks to return.',
      type: 'Only drinks of this kind.',
    },
    rankMenu: {
      title: 'Rank a menu',
      description:
        'Order the drinks on a menu by how close each sits to someone’s coordinate. Pass the drink names as they appear on the menu, one per item. Items Cotidal cannot place are returned as unplaced rather than guessed at, and drinks with a flavour the person avoids are flagged, not dropped.',
      items: 'Drink names from the menu, one per item.',
    },
    compare: {
      title: 'Compare two palates',
      description:
        'Put two people’s coordinates side by side: how far apart they are, a drink each would order that the other would not, and one they would both order. This compares maps; it never ranks the people on them.',
      other: 'The second person’s Bluesky handle or DID.',
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
    searchDrinks: {
      title: 'Search drinks',
      description:
        'Find drinks on the Cotidal map by name, with where each sits and the region it lands in.',
      query: 'Part of a drink’s name.',
    },
  },
  noPalate: (name: string) => `@${name} has an account, but has not published a palate yet.`,
  notFound: (input: string) => `“${input}” does not resolve to an account.`,
  invalid: (input: string) => `“${input}” is not a Bluesky handle or DID.`,
  unavailable: (name: string) => `${name}’s server did not respond in time. Try again in a moment.`,
  noMatches: (query: string) => `No drink on the map matches “${query}”.`,
  noDrink: 'A draft needs the drink’s name.',
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
export const coaster = {
  makeCode: 'Make my code',
  makeCodeNote: 'A coaster with your region on it and a code that opens this map.',
  memberTitle: 'Your code',
  memberLede:
    'Scan it and it opens your map. It points at your account rather than your handle, so it keeps working if your handle changes.',
  memberLabel: (name: string) => `A coaster for @${name}: their region, and a code that opens their map`,
  backToMap: 'Back to your map',
  regionLink: 'This region’s coaster',
  regionTitle: (region: string) => `${region}, on a coaster`,
  regionLede: 'Scan the code to read about the region, then find where you land.',
  regionLabel: (region: string) => `A coaster for ${region}, with a code that opens its page`,
  backToRegion: (region: string) => `Back to ${region}`,
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

export const footer = {
  note: 'Built on the AT Protocol.',
  drinkResponsibly: 'Please drink responsibly.',
} as const;

