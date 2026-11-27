import type { AskedIntensity, BaseSpirit, Glassware, GlmsAnchor } from '../atproto/vocab';

/** Discovery quiz, reveal, pour logging form, and post-pour moved reveal copy. */


/** The rating sheet, over Compass or Your map: one pour, rated, and where the coordinate went. */
export const ratePage = {
  title: 'Rate a drink',
  heading: 'How was it?',
  /** For a screen reader: what the sheet that just opened is for. */
  description: 'Say how it was, and see where your coordinate goes.',
  close: 'Close',
} as const;

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
  groundRaised: (region: string) => `Raised your ground in ${region}.`,
  groundLowered: (region: string) => `Lowered your ground in ${region}.`,
  back: 'Done',
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
    'Never again',
    'Not for me',
    'Didn’t work',
    'Not quite',
    'Fine',
    'Good',
    'Liked it',
    'Really liked it',
    'A favorite',
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
