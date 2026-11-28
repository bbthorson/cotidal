import { pour } from './pours';

/** Site chrome, landing page, how-it-works, sharing, and global status/error copy. */


export const site = {
  name: 'Cotidal',
  tagline: 'Every palate has a coordinate.',
  description:
    'Find where your taste sits on the map, and what to drink next.',
} as const;

export const nav = {
  skipToContent: 'Skip to content',
  home: 'Home',
  signIn: 'Sign in',
  menu: 'Menu',
  /** Beside your handle in a phone's Menu: where it goes. */
  settings: 'Settings',
  footer: 'Site',
  map: 'Map',
  bars: 'For bars',
  howItWorks: 'How it works',
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
  sampleLabel: 'A sample palate',
  /** Under the fold of the card, pulled up: how it works, briefly, then the whole account. */
  howTitle: 'How it works',
  /** Then signing in, for someone who has a map on another device. */
  signInTitle: 'Already have a map?',
  signInBody: 'Sign in with Bluesky and it comes with you: your coordinate and your pours are kept in your own account.',
} as const;

/** The sign-in page's sections (`/sign-in`). */
export const sections = {
  principles: 'Whose log it is',
  connect: 'Sign in',
  whatItKeeps: 'What signing in keeps',
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
 * How it works, the front door's card pulled up (`/?about=1#how-it-works`): how answers and ratings place and move a coordinate, said
 * as the code does it today (docs/brand.md, Claims). Every number here is a
 * constant in belief-state.ts or palate-state.ts, and
 * tests/unit/how-it-works.test.ts holds the two equal. Never the code's words:
 * no calibration, no latent, no triangulation.
 */
export const howItWorks = {
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
        'Before you sign in, your coordinate, answers and ratings stay on this device — and come with you when you sign in.',
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
} as const;

/** A page that is not there (`src/pages/404.astro`). */
export const notFound = {
  title: 'Nothing charted here.',
  lede: 'That address does not lead to a page. The link may be old, or mistyped.',
  cta: 'Find your coordinate',
  drinks: 'Every drink is on the map',
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
  /** At the foot of a page, for a reader with no coordinate yet (`MapPage`), on pages whose own action is something else. */
  findYoursLead: 'Your taste isn’t on the map yet.',
  findYoursCta: 'Find your coordinate',
} as const;
