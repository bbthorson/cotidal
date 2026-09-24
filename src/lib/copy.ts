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

export const footer = {
  note: 'Built on the AT Protocol.',
  drinkResponsibly: 'Please drink responsibly.',
} as const;
