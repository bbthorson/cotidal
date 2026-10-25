/**
 * Single source of truth for user-facing marketing copy.
 *
 * Nothing in `src/components/marketing/` may contain a hard-coded string —
 * the voice lives here so it can be revised in one place. "Triangulation",
 * "Calibration", "Architecture" and "Context" remain valid *internal*
 * vocabulary (see AGENTS.md); they are deliberately absent from this file.
 */

export const site = {
  name: 'The Crystal Coupe',
  mark: 'CC',
  tagline: 'Every palate has a coordinate.',
  description:
    'Find the coordinate your taste actually sits on, and what to order once you know it.',
} as const;

export const nav = {
  skipToContent: 'Skip to content',
  home: 'Home',
  map: 'Palate Map',
  register: 'The Register',
  regions: 'The Four Regions',
  signIn: 'Sign in',
  menu: 'Menu',
  log: 'Log a Pour',
  bars: 'For Bars',
} as const;

export const hero = {
  edition: 'Specimen No. 1',
  headline: 'Every palate has',
  headlineAccent: 'a coordinate.',
  body:
    'Answer a few questions. A point appears. What surrounds it is what you should be ordering.',
  primaryCta: 'Find your coordinate',
  primaryCtaReturning: 'Return to your map',
  /** Stated under the one primary action, so the cost is known up front. */
  cost: 'About two minutes · no account needed',
  /** The reading path: one tap away, never a second button. */
  readFirst: 'Read the four regions first',
  secondaryCta: 'Look at the map first',
  registerCta: 'Explore the register',
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
    id: 'ember',
    name: 'The Ember',
    axis: 'Rich · Savory',
    gloss: 'Bitter, aged, and unhurried. Drinks that argue back.',
  },
  {
    id: 'salt-line',
    name: 'The Salt Line',
    axis: 'Crisp · Savory',
    gloss: 'Dry, mineral, and exact. Nothing hidden behind sugar.',
  },
  {
    id: 'vault',
    name: 'The Vault',
    axis: 'Rich · Sweet',
    gloss: 'Dense and warm. The last drink of the night.',
  },
  {
    id: 'orchard',
    name: 'The Orchard',
    axis: 'Crisp · Sweet',
    gloss: 'Bright, fast, and built for company.',
  },
] as const;

/**
 * Section labels. The page reads as a printed menu, and a menu names its
 * sections — these are the equivalent of "Plates" and "Cocktails" at the head
 * of a column.
 */
export const sections = {
  map: 'The four regions',
  /** The reveal. The hero withholds the axes; this is where they land. */
  mapNote: 'Two axes — rich to crisp, savory to sweet. Four regions between them.',
  registerSpotlight: 'From the register',
  registerSpotlightNote: 'Each entry separates what is on the record from what is merely told.',
  principles: 'What you keep',
  connect: 'Sign in',
} as const;

export const connect = {
  title: 'Keep this coordinate.',
  body:
    'Your coordinate is written to your own account, not ours. Sign in to keep it, log what you drink, and watch it move.',
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
      title: 'It’s saved to your account',
      body: 'Your coordinate and the answers behind it, written to your own Bluesky repository. It stays yours if you leave.',
    },
    {
      title: 'Log a pour, watch it move',
      body: 'Rate what you drink; your coordinate and menu follow.',
    },
    {
      title: 'Compare with friends',
      body: 'Later: people you already follow who have a coordinate.',
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
  /** Four drinking occasions, switched in one place rather than stacked. */
  contexts: [
    { id: 'usual', label: 'Usual', title: 'Your go-to' },
    { id: 'party', label: 'Night out', title: 'For a night out' },
    { id: 'business', label: 'Impress', title: 'Making an impression' },
    { id: 'holiday', label: 'Holiday', title: 'Holiday warmth' },
  ],
  contextsLabel: 'Occasion',
  topPrefix: 'No. 1',
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
    icon: 'lock',
    title: 'Yours, not ours',
    body:
      'Your palate lives in your own repository on the AT Protocol. Delete our app tomorrow and the profile still belongs to you.',
  },
  {
    icon: 'book',
    title: 'A record, not a score',
    body:
      'Every drink you log is a dated entry signed by you — where you were, what it was, whether it landed. Nobody is being ranked.',
  },
  {
    icon: 'compass',
    title: 'Portable by design',
    body:
      'The same coordinate works anywhere that speaks the protocol: another bar, another client, another app entirely.',
  },
] as const;

/**
 * The drinks register. The premise is the separation: cocktail origin stories
 * are overwhelmingly unsourced retelling, and a product that claims to measure
 * taste precisely should be the one that says which is which.
 */
export const drinks = {
  eyebrow: 'The register',
  title: 'What is actually known',
  intro:
    'Most of what gets said about a cocktail is repetition. Each entry separates what is on the record from what is only told, gives the build, and places the drink on the map.',
  navLabel: 'The register',
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
 * record stores (app.crystalcoupe.pour), so what you tap is what is written.
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
  sensoryLabel: 'How it tasted, 0 to 5',
  sensory: {
    bitter: 'Bitter',
    sweet: 'Sweet',
    sour: 'Sour',
    spiritForward: 'Spirit-forward',
    citrus: 'Citrus',
    herbal: 'Herbal',
  },
  cataLabel: 'What you noticed',
  /** Check-all-that-apply aroma and flavour notes. Stored as written. */
  cata: [
    'Bright Citrus',
    'Lime Peel',
    'Stone Fruit',
    'Dark Cherry',
    'Campfire Smoke',
    'Botanical Herb',
    'Baking Spice',
    'Toasted Oak',
    'Floral Blossom',
    'Bittersweet Cocoa',
    'Briny Mineral',
    'Rich Velvet Body',
  ],
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
  eyebrow: 'The Front Door',
  title: 'The single source of truth for the bars that make culture.',
  subtitle:
    'Sync with Toast. Publish to your own domain and Google Maps. Guide guests by palate at the table, and turn your bar into a sovereign AT Protocol Space.',
  doorsTitle: 'The Five Front Doors',
  doors: [
    {
      label: 'Front Door I',
      title: 'The Taste-Guided Table QR',
      description:
        'No clunky PDFs or spreadsheet menus. Patrons scan a table coaster to browse drinks by flavor quadrant, see their personal palate match, and tap once to order on Toast.',
    },
    {
      label: 'Front Door II',
      title: 'Automated POS & 86 Sync',
      description:
        'Pull menus, categories, and prices directly from Toast or Square. 86 an ingredient in your POS, and it immediately dims across the QR menu and your website.',
    },
    {
      label: 'Front Door III',
      title: 'Google Maps & Search Presence',
      description:
        'Direct Google Business Profile integration updates your official menu link, hours, and structured items. Deep schema.org indexing makes every cocktail discoverable.',
    },
    {
      label: 'Front Door IV',
      title: 'Hosted Web & Custom Domain',
      description:
        'Replace slow, $30/month Squarespace sites with a blazingly fast, paper-styled website on your own domain (e.g. attaboy.nyc). Statically rendered with zero script bloat.',
    },
    {
      label: 'Front Door V',
      title: 'Bar as an AT Protocol Space',
      description:
        'Your physical location becomes a sovereign social anchor. Guests see mutuals who visited, compare table palate overlap, and sign pours into a decentralized guestbook.',
    },
  ],
  makerTitle: 'For Bartenders & Drink Designers',
  makerSubtitle:
    'The craft deserves more than an informal resume and uncredited cocktail specs.',
  makerFeatures: [
    {
      label: 'The Living CV',
      title: 'Portable Recipe & Adoption Ledger',
      description:
        'Claim your residency history and sign your authored specs. Track verified adoption across bars worldwide without degrading star ratings.',
    },
    {
      label: 'The Back Bar',
      title: 'Private Peer Community',
      description:
        'A gated network for verified cocktail makers to peer-review draft specs, exchange prep techniques, and coordinate guest shifts.',
    },
  ],
  tiersTitle: 'Plans & Capabilities',
  freeTier: {
    title: 'Venue Profile',
    badge: 'Free Forever',
    description:
      'Everything required to claim your sovereign identity and publish on the open protocol.',
    features: [
      'Handle-as-domain claim (attaboy.nyc)',
      'Canonical AT Protocol menu publishing',
      'Directory listing on Crystal Coupe search',
      'Patron sighting & pour aggregation ledger',
      'Recipe attribution & author credits',
    ],
  },
  proTier: {
    title: 'Branded Bar Suite',
    badge: '$49 / month',
    description:
      'The full operating system connecting your POS, table QR, custom domain, and Google Maps.',
    features: [
      'Live Toast / Square / Clover bi-directional sync',
      'Real-time 86 status automatic sync',
      'Hosted custom domain website (attaboy.nyc)',
      'Google Maps & Google Business Profile sync',
      'Taste-guided Table QR with 1-tap Toast ordering',
      'Palate Density demand analytics & dead-spot reports',
      'Interactive AT Protocol Space & guestbook curation',
      'Social specimen card & Instagram Story exporter',
    ],
  },
  lookupEyebrow: 'Domain Verification',
  lookupTitle: 'Claim your venue',
  lookupDescription:
    'Venues verify ownership through handle-as-domain (e.g. deathandco.com). Publishing an official venue record instantly reconciles all historical patron sightings to your account.',
  domainPlaceholder: 'yourbar.com',
  checkDomainCta: 'Preview venue sightings',
  earlyAccessNotice:
    'The B2B suite is currently accepting beverage programs for private beta onboarding. Claim your handle to reserve your domain.',
  waitlistCta: 'Request early access',
  seededTitle: 'The Anchor Register',
  seededSubtitle:
    'Historical sightings and canonical specs awaiting domain reconciliation. When a venue proves its domain handle, its sightings light up retroactively.',
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

