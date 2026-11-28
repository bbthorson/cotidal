/** Map screen, compass/menu ranking, drinks, regions, comparisons, and public map copy. */


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
  againTitle: 'Again',
  againNote: 'Your highs',
  newTitle: 'New',
  newNote: 'Untried, ranked for you',
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
    directional: (region: string) => `Directional · ${region}`,
    unplaced: 'Not on the map',
    pasteToggle: 'Paste a whole menu',
    pasteLabel: 'Menu lines (one drink per line)',
    pastePlaceholder: 'Negroni\nPaper Tiger — mezcal, lime, agave\nLast Word',
    pasteAdd: 'Add menu',
    pasteCancel: 'Cancel',
    nearClassic: (name: string) => `Near ${name}`,
    clashes: (flavours: string[]) => `Has ${flavours.join(' and ')}`,
    scanPhoto: 'Scan a menu photo',
    scanningPhoto: 'Reading menu photo…',
    photoSignInNudge: 'Sign in with Bluesky to scan a menu photo — or paste the menu text above right now.',
    photoSignInAction: 'Sign in with Bluesky',
    photoEmpty: 'Could not read any drinks from that photo. Try pasting the text instead.',
    photoRateLimited: 'You have reached the photo scan limit for now. Paste the menu text instead.',
    rankedAt: (bar: string) => `What to have at ${bar}`,
    rankedHome: 'What to have',
    rankedBody: 'Ranked by your ratings of the drinks around each one, and where your answers put you.',
    drinkRose: (name: string, rank: number) => `${name} rose to No. ${rank} after your pour.`,
    reranked: 'Re-ranked after your pour.',
  },
} as const;

/**
 * `/`, the one app screen: your terrain on the map, one search in the header
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

/** `/`, Your map: you — where you are, how sure, the way you came, and what moved you. */
export const mapPage = {
  title: 'Your map',
  heading: 'Your map',
  guestEyebrow: 'On this device',
  guestTitle: 'Keep your map with you',
  guestBody: 'As a guest, your coordinate and pours stay on this device. Sign in with Bluesky and they come with you, saved to your own account.',
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
  ledgerTitle: 'Recent pours',
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

/**
 * What Your map and the rating sheet say to someone with no coordinate yet: what the loop
 * is, and the ways in.
 */
export const coldState = {
  title: 'Place your taste on the map',
  body: 'Start with a few quick questions, or rate a drink you just had. Every pour sharpens the map.',
  quizCta: 'Find your coordinate',
  signInCta: 'Sign in',
  guestCta: 'Rate one as a guest',
  guestNote: 'As a guest, it stays on this device.',
} as const;

/**
 * A drink picked on the map, kept on the device until it is rated: the strip
 * at the head of the card with inline rating cells.
 */
export const waitingPick = {
  atHome: 'At home',
  waiting: 'How is it?',
  pastWaiting: 'How was it?',
  justPicked: 'just picked',
  pickedMinutes: (mins: number) => `picked ${mins} min ago`,
  pickedHours: (hours: number) => (hours === 1 ? 'picked 1 hr ago' : `picked ${hours} hr ago`),
  lastNight: 'last night',
  pickedDays: (days: number) => `${days} days ago`,
  another: 'Another',
  didntHave: 'Didn’t have it',
  whatWasOff: 'What was off',
  dismiss: 'Set it aside',
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

/** The words on the map's axes. Set in caps where they are drawn. */
export const axes = { rich: 'Rich', crisp: 'Crisp', sweet: 'Sweet', savory: 'Savory' } as const;

/** A quadrant's axis label as words: "Rich · Savory" → "Rich and savory". */
export function axisWords(axis: string): string {
  const [a, b] = axis.split(' · ');
  return b ? `${a} and ${b.toLowerCase()}` : axis;
}

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
    return nearBy ? nearBy[0].toUpperCase() + nearBy.slice(1) : 'From your answers';
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
  /** The way back from a drink's own page: to the drink on the map. */
  backLabel: 'On the map',
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
  compareTitle: (title: string) => `See how ${title} fits your palate`,
  compareBody:
    'Every drink on the chart has a coordinate. Your map opens on this one; with no coordinate yet, a few questions place you first.',
  compareCta: 'See where it sits for you',
  /** Under a drink's entry: the drinks nearest it on the map. */
  nearLabel: 'Near it on the map',
} as const;

/**
 * A region on the map (`/?region=<id>`). The prose of each region lives in `src/content/regions/`;
 * these are the parts that are the same for all four, and they describe what
 * the product does rather than what a region means.
 */

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
 * One comparison (`compare.ts`, `Comparison.tsx`): a drink or a person against
 * a taste — yours, or the person's whose map it is. `whose` is "your" or
 * "@alice’s"; `who` is "you" or "@alice".
 */
export const compare = {
  /** `whose` for the reader's own map, and for someone else's. */
  yours: 'your',
  theirs: (who: string) => `${who}’s`,
  you: 'you',
  title: (whose: string) => `On ${whose} map`,
  fromLabel: 'From the nearest hill',
  wayLabel: 'Which way',
  drinkReach: (who: string, reach: boolean) =>
    reach ? `On the high ground: one ${who}’d reach for.` : `Outside the high ground: not one ${who}’d reach for yet.`,
  /** What is behind a person's comparison: the taste's own ratings of their top drinks. */
  personBehind: (whose: string, rated: readonly { name: string; hedonic: number }[]) =>
    rated.length
      ? `${whose[0].toUpperCase()}${whose.slice(1)} ratings of their top drinks: ${rated.map((r) => `${r.name} (${r.hedonic})`).join(', ')}`
      : `No ratings of their top drinks on ${whose} map yet.`,
  partLabel: 'Where you part',
} as const;

export const publicMap = {
  eyebrow: 'Public map',
  /** The eyebrow on your own: the name Settings and Your map give it. */
  selfEyebrow: 'Your link',
  coordinateLabel: 'Coordinate',
  title: (name: string) => `@${name}`,
  lands: 'Lands in',
  /** The readout's second cell: how many pours moved the map, or none yet. */
  poursLabel: 'Pours',
  quizOnly: 'None yet',
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
  /** On a made-up person's map (`sample-people.ts`): said before anything else. */
  sampleNote: 'A made-up person, to show what someone’s map looks like. Their ratings are invented.',
  /** Their taste in the axes' words (`leanings`), as the map's card says yours. */
  leanLabel: (self: boolean) => (self ? 'You lean' : 'Leans'),
  /** Their menu: the drinks highest on their terrain, each with what put it there. */
  menuLabel: (self: boolean) => (self ? 'Your menu' : 'Their menu'),
  /** What put a drink on their menu (`chart.reason`, said of them). */
  reason: (near: readonly { name: string; hedonic: number }[], rated?: number) => {
    const nearBy = near.length ? `near their ${near.map((e) => `${e.name} (${e.hedonic})`).join(' and ')}` : '';
    if (rated !== undefined) return nearBy ? `Rated ${rated} · ${nearBy}` : `Rated ${rated}`;
    return nearBy ? nearBy[0].toUpperCase() + nearBy.slice(1) : 'From their answers';
  },
  selfNote: 'This is your link: your map as anyone who opens it sees it, drawn from the record in your own Bluesky account.',
  linkLabel: 'Your link',
  guestTitle: 'Where do you land?',
  guestBody: 'Find your coordinate, then sign in and open this link again to see where your maps overlap.',
  guestCta: 'Find your coordinate',
  memberNoPalateBody: 'Finish the questions and your map will sit over theirs here.',
  noPalateTitle: 'No coordinate here yet.',
  noPalateBody: 'This account exists, but it has not published a palate.',
  notFoundTitle: 'Nobody by that name.',
  notFoundBody: 'That handle does not resolve to an account.',
  unavailableTitle: 'The record did not answer.',
  unavailableBody: 'Their server did not respond in time. Try again in a moment.',
  description: (name: string, leans: string) => `@${name} leans ${leans}. Where do you?`,
  plotLabel: (who: string) => `${who} on the palate map`,
  /** On your own map: comparing with someone. Opening theirs draws your terrain over it. */
  compareTitle: 'Compare palates',
  followsLede: 'People you follow who have a map, most in common first.',
  followsContrast: (drink: string) => `They’d reach for ${drink}`,
  compareHint: 'Or type any Bluesky handle to compare maps.',
  compareLabel: 'A Bluesky handle',
  comparePlaceholder: 'friend.bsky.social',
  compareSubmit: 'Compare',
} as const;

/** Unified map overlays (`Lens × Scope`): With someone, Table, Uncharted, Type filter, and Bar footprint. */
export const overlays = {
  barLabel: 'Map overlays',
  whereButton: 'At a bar',
  withButton: 'With someone',
  addAnother: 'Add to table',
  exploreButton: 'Uncharted',
  handleLabel: 'Bluesky handle',
  handlePlaceholder: 'friend.bsky.social',
  add: 'Add',
  adding: 'Loading…',
  cancel: 'Cancel',
  trySample: 'Or try a sample:',
  sampleSurf: 'surf.test',
  sampleDeep: 'deep.test',
  withChip: (handle: string) => `With @${handle}`,
  tableChip: (count: number) => `Table (${count})`,
  exploreChip: 'Uncharted',
  remove: (label: string) => `Remove ${label}`,
  clearAll: 'Clear overlays',
  types: {
    Cocktail: 'Cocktails',
    Wine: 'Wine',
    Beer: 'Beer',
    Spirit: 'Spirits',
  } as const,
  typeLabel: 'Filter by drink type',
  notFound: (actor: string) => `No palate found for ${actor}.`,
  alreadyAdded: (actor: string) => `${actor} is already on the map.`,
  maxTable: 'Up to 5 companions at a table.',
  /** Table lens card headings. */
  tableTitle: (count: number) => `For the table (${count})`,
  tableNote: 'Best worst-case across everyone’s ground',
  tableEmpty: 'No drink on the map clears everyone’s limits.',
  tableContrast: 'Widest contrast',
  /** Uncharted lens card headings. */
  exploreNearTitle: 'Near your taste, untried',
  exploreNearNote: 'High on your ground, never rated',
  exploreEdgeTitle: 'Just past your edge',
  exploreEdgeNote: 'A step beyond your usual ground',
  exploreEmpty: 'Nothing untried fits here.',
  /** Bar footprint summary in MenuView. */
  footprintTitle: 'Bar footprint',
  footprintBlindSpots: (regions: string[]) => `Thin in ${regions.join(', ')}`,
  footprintBalanced: 'Covers all four regions',
  groupMenuNote: (count: number) => `Ranked for the ${count} of you`,
} as const;
