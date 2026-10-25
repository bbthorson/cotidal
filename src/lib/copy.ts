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
  map: 'Palate Map',
  register: 'Drinks',
  regions: 'The Four Regions',
  signIn: 'Sign in',
  menu: 'Menu',
  log: 'Log a Pour',
  bars: 'For Bars',
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
  signOut: 'Sign out',
  refineTitle: 'Tell us what you avoid',
  refineBody:
    'Anything you avoid, crave or swear by. Your coordinate moves to match, and the change is written to your account.',
  refinePlaceholder: 'Red wine gives me headaches. I love a dry martini. Nothing that tastes of licorice.',
  refineSubmit: 'Move my coordinate',
  refining: 'Moving…',
  refineResult: 'What changed',
  startOver: 'Start over',
  empty: 'Nothing on the map fits these limits yet.',
  tabs: { menu: 'Menu', map: 'Map', log: 'Log a pour' },
  tabsLabel: 'Your coordinate',
} as const;

/** The Map tab: the whole map, and any drink on it. */
export const mapTab = {
  lensLabel: 'Show',
  lenses: [
    { id: 'all', label: 'Everything' },
    { id: 'menu', label: 'Your menu' },
    { id: 'pours', label: 'Your pours' },
  ],
  hint: 'Tap a dot to see the drink.',
  nearest: 'Nearest to you',
  onMenu: 'On your menu',
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
  logTitle: 'Log a pour',
  ledgerEyebrow: 'Chronicle',
  ledgerTitle: 'What moved it',
  ledgerEmpty: 'No pours logged yet. Pour a glass, note how it lands, and log it above.',
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

