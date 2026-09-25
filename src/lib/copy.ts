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
  signIn: 'Sign In',
  log: 'Log a Pour',
  bars: 'For Bars',
} as const;

export const hero = {
  eyebrow: 'A reading of your taste',
  edition: 'Specimen No. 1',
  headline: 'Every palate has',
  headlineAccent: 'a coordinate.',
  body:
    'Answer a few questions. A point appears. What surrounds it is what you should be ordering.',
  primaryCta: 'Find your coordinate',
  primaryCtaReturning: 'Return to your map',
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
  title: 'Carry it with you',
  body:
    'Your coordinate is written to your own account, not ours. Sign in to keep it, log what you drink, and find the people whose maps overlap yours.',
  placeholder: 'you.bsky.social',
  submit: 'Sign in with Bluesky',
  divider: 'or',
  disabled: 'Sign-in is not enabled in this environment.',
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
    'Every drink you log is a dated entry signed by you. Each pour adjusts your coordinate, pulling your taste profile toward what you actually enjoy.',
  coldTitle: 'The loop is: drink → log → the map changes.',
  coldBody:
    'Your palate is not a static quiz result. It is a decentralised record on the AT Protocol that moves every time you log a pour.',
  signInCta: 'Sign in to access your ledger',
  quizCta: 'Find your coordinate first',
  guestCta: 'Test a pour as guest',
  logEyebrow: 'New entry',
  logTitle: 'Log a pour',
  ledgerEyebrow: 'Chronicle',
  ledgerTitle: 'What moved it',
  ledgerEmpty: 'No pours logged yet. Pour a glass, note how it lands, and log it above.',
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
} as const;

export const footer = {
  note: 'Built on the AT Protocol.',
  drinkResponsibly: 'Please drink responsibly.',
} as const;

