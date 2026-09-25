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
      body: 'Written to your own Bluesky repository. It stays yours if you leave.',
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
  venueLabel: 'Where you’re drinking',
  venuePlaceholder: 'A bar name, or leave blank',
  venueRecent: 'Recently',
  venueClear: 'Clear',
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
  eyebrow: 'The Supply Side',
  title: 'An open protocol for the bars that make culture.',
  subtitle:
    'No Yelp extortion. No unindexed PDFs. Publish your menu directly to your domain and the AT Protocol, measure genuine palate density, and claim portable credit for your specs.',
  pillars: [
    {
      label: 'Pillar I',
      title: 'Menu as Canonical Publication',
      description:
        'Publish once to your own domain and repository. Your menu renders cleanly across the open web, indexed by flavor coordinates rather than raw keyword searches.',
    },
    {
      label: 'Pillar II',
      title: 'Palate Intelligence',
      description:
        'Move beyond sales volume and angry review stars. See the sensory distribution of your actual guests across the four palate regions, and pinpoint unserved flavor demand.',
    },
    {
      label: 'Pillar III',
      title: 'Recipe Syndication & Credit',
      description:
        'When your signature cocktails become modern classics poured worldwide, track verified adoption and pours across bars rather than watching your work go uncredited.',
    },
    {
      label: 'Pillar IV',
      title: 'Direct-to-Regulars Broadcast',
      description:
        'Because your identity is verified by your domain handle, guests who save your venue subscribe directly to your feed. No algorithmic tax to announce seasonal menus or guest shifts.',
    },
  ],
  lookupEyebrow: 'Domain Verification',
  lookupTitle: 'Claim your venue',
  lookupDescription:
    'Venues verify ownership through handle-as-domain (e.g. deathandco.com). Publishing an official venue record instantly reconciles all historical patron sightings to your account.',
  domainPlaceholder: 'yourbar.com',
  checkDomainCta: 'Preview venue sightings',
  earlyAccessNotice:
    'The venue publishing suite is in active development. If you direct a cocktail program and want early access to palate density analytics, join the registry below.',
  waitlistCta: 'Request early access',
} as const;

export const footer = {
  note: 'Built on the AT Protocol.',
  drinkResponsibly: 'Please drink responsibly.',
} as const;

