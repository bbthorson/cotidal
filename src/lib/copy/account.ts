/** Account, settings, sign-in connect flow, and bar/venue publishing copy. */


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
    'Disconnected. Remove Cotidal from that assistant’s settings too, or it will ask to connect again.',
  disconnectFailed: 'That did not go through. Try again.',
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
      body: 'Your map at a link of its own. A friend who opens it sees where your tastes overlap, and a drink each of you would reach for that the other wouldn’t.',
    },
    {
      title: 'In your chat assistant',
      body: 'Ask a chat assistant what to drink, with your coordinate in hand. Later: the pours of the people you follow.',
    },
  ],
} as const;

export const venuesCopy = {
  eyebrow: 'For bars',
  title: 'Claim your bar with your own domain.',
  subtitle:
    'Connect your bar’s website to your Bluesky account and publish your menu directly. No approval queue, no middleman, nothing for us to grant.',
  todayTitle: 'On the protocol today',
  today: [
    {
      title: 'Website matched to your account',
      description:
        'A venue record held in your bar’s own account. Claiming checks that your bar’s website domain resolves to that account, then renders your bar live at /v/your-domain.',
    },
    {
      title: 'Menus as snapshots',
      description:
        'Each menu is published as a dated snapshot rather than overwritten, so a menu from March stays true about March. Cotidal renders your current menu with sensory coordinates.',
    },
    {
      title: 'Pours that name your bar',
      description:
        'Every pour a member logs records the bar by name. When you claim your domain, reconciling those pours to your bar happens without rewriting anyone’s record.',
    },
  ],
  laterTitle: 'Coming next',
  later: [
    'Later: address confirmation by mail — a postcard sent to the bar with a one-time code to prove you are at that address.',
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
  lede: 'Sign in with your bar’s Bluesky account and enter its website. We check that the domain resolves to your account, then publish your venue record and a dated menu snapshot to your repository.',
  publishingAs: 'Publishing as',
  nameLabel: 'Bar name',
  namePlaceholder: 'Attaboy',
  descriptionLabel: 'Short description (optional)',
  descriptionPlaceholder: 'Classic and bespoke cocktails on the Lower East Side.',
  websiteLabel: 'Bar website (must match your account’s domain)',
  websitePlaceholder: 'https://attaboy.nyc',
  hoursLabel: 'Hours (optional)',
  hoursPlaceholder: 'Mo-Su 17:00-02:00',
  reservationsLabel: 'Reservations link (optional)',
  reservationsPlaceholder: 'https://resy.com/cities/ny/...',
  menuStyleLabel: 'Menu style',
  menuStyleWritten: 'Written menu',
  menuStyleBespoke: 'Bespoke / bartender’s choice (no printed menu)',
  osmIdLabel: 'OpenStreetMap ID (optional)',
  osmIdPlaceholder: 'node/123456789',
  fsqIdLabel: 'Foursquare Open Places ID (optional)',
  fsqIdPlaceholder: '4b5c6d7e8f9a0b1c2d3e4f5a',
  menuTitleLabel: 'Menu title (optional)',
  menuTitlePlaceholder: 'Winter Cocktails',
  menuLinesLabel: 'Menu items (one drink per line, optional — ingredients)',
  menuLinesPlaceholder: 'Paper Plane — bourbon, Aperol, Amaro Nonino, lemon\nNegroni\nDry Martini',
  submit: 'Check domain and publish',
  needName: 'Enter your bar’s name first.',
  needWebsite: 'Enter your bar’s website so we can check its domain matches your account.',
  invalidWebsite: 'Website must start with https:// or http://.',
  invalidReservations: 'Reservations link must start with https:// or http://.',
  domainMismatch: (domain: string, did: string) =>
    `${domain} does not resolve to ${did}. Set your handle to ${domain} or serve your DID at https://${domain}/.well-known/atproto-did, then try again.`,
  domainCheckFailed: 'Could not check that domain right now. Try again in a moment.',
  publishFailed: 'Could not publish your venue record. Try again.',
  postcardNote:
    'Later: a second step will mail a postcard with a one-time code to confirm you are at that address.',
} as const;

/** `/v/<handle>` & `/v/osm/<type>/<id>` — live AT Protocol and unclaimed OSM venue pages. */
export const venuePage = {
  eyebrow: 'Venue',
  unclaimedEyebrow: 'Unclaimed venue',
  unclaimedTag: 'Unclaimed · OpenStreetMap',
  fsqTag: 'Foursquare linked',
  bespokeTag: 'Bespoke · no menu',
  placePageLabel: 'Place page',
  menuTitle: 'Current menu',
  noMenu: 'This venue has claimed its handle, but has not published a menu yet.',
  bespokeMenu:
    'Bespoke cocktail bar — drinks are made to order rather than from a printed menu. Tell the bartender your coordinate.',
  noVenueTitle: 'No bar claimed here yet.',
  noVenueBody: 'This account exists, but it has not claimed a bar yet.',
  notFoundTitle: 'No bar by that handle.',
  notFoundBody: 'That handle does not resolve to an account.',
  osmNotFoundTitle: 'No place at that OpenStreetMap ID.',
  osmNotFoundBody: 'Check the link or search for the bar on the map.',
  unavailableTitle: 'The venue’s server did not answer.',
  unavailableBody: 'Try again in a moment.',
  osmUnavailableTitle: 'OpenStreetMap did not answer.',
  publishedOn: (date: string) => `Published ${date}`,
  websiteLabel: 'Website',
  menuLinkLabel: 'Menu',
  phoneLabel: 'Phone',
  reservationsLabel: 'Reservations',
  domainVerified: 'Domain matched',
  rankForMe: 'Rank this menu for you',
  captureOnMap: 'Open on the map & paste menu',
  claimBar: 'Claim this bar',
  claimBody:
    'Own or run this bar? Claim it with your domain handle to publish your live menu and link your OpenStreetMap and Foursquare IDs.',
  detailsTitle: 'Place details',
  addressLabel: 'Address',
  hoursLabel: 'Hours',
  outdoorSeatingLabel: 'Outdoor seating',
  placeIdsLabel: 'Open place IDs',
  yes: 'Yes',
  no: 'No',
  sightingsTitle: 'Menu & palate footprint',
  noSightings:
    'No patron menu sighting is linked to this place yet. If this bar has a written menu, paste or photograph it on the map to rank it for your palate; if it pours bespoke drinks to order, tell the bartender your coordinate.',
  openMapLink: 'Open on the map',
  onMap: 'On the map',
  unplaced: 'House pour',
} as const;

/**
 * `/p/<handle>` — someone's coordinate at a public URL, and, for a signed-in
 * visitor, theirs beside it. Two dots and the distance between them.
 */
