import type { VibeTag } from './data';

/**
 * Example menus for /bars: well-known bars' drinks, placed on the map by us to
 * show what a published `app.cotidal.menu` would carry. Not sightings, and not
 * published by the bars themselves.
 */

export type SeededMenuItem = {
  name: string;
  description: string;
  x: number; // Rich (-10) to Crisp (+10)
  y: number; // Savory (-10) to Sweet (+10)
  price: {
    amount: number; // cents
    currency: string;
  };
  tags: VibeTag[];
  creator?: string;
  isHouseOriginal?: boolean;
};

export type SeededVenue = {
  id: string; // url slug e.g. "attaboy-nyc"
  name: string;
  domain: string; // reconciliation key (e.g. "attaboy.nyc")
  city: string;
  region: string;
  country: string;
  neighborhood: string;
  address: string;
  website: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  summary: string;
  menu: SeededMenuItem[];
};

export const venueDatabase: SeededVenue[] = [
  // --- NEW YORK ---
  {
    id: 'attaboy-nyc',
    name: 'Attaboy',
    domain: 'attaboy.nyc',
    city: 'New York',
    region: 'NY',
    country: 'USA',
    neighborhood: 'Lower East Side',
    address: '134 Eldridge St, New York, NY 10002',
    website: 'https://attaboy.nyc',
    coordinates: { lat: 40.7188, lng: -73.9918 },
    summary:
      'The legendary bespoke speakeasy in the former Milk & Honey space, founded by Michael McIlroy and Sam Ross.',
    menu: [
      {
        name: 'Penicillin',
        description: 'Blended scotch, fresh lemon, honey-ginger syrup, Islay single malt float.',
        x: 0,
        y: 1,
        price: { amount: 2200, currency: 'USD' },
        tags: ['classic', 'complex', 'bold'],
        creator: 'Sam Ross (2005)',
        isHouseOriginal: true,
      },
      {
        name: 'Paper Plane',
        description: 'Equal parts bourbon, Aperol, Amaro Nonino Quintessentia, and fresh lemon juice.',
        x: 4,
        y: 4,
        price: { amount: 2200, currency: 'USD' },
        tags: ['classic', 'complex', 'prestige'],
        creator: 'Sam Ross (2008)',
        isHouseOriginal: true,
      },
      {
        name: 'Green Zone',
        description: 'Dry gin, Green Chartreuse, fresh cucumber juice, lime, and a pinch of salt.',
        x: 6,
        y: -2,
        price: { amount: 2200, currency: 'USD' },
        tags: ['crushable', 'complex', 'visual'],
        creator: 'Michael McIlroy',
        isHouseOriginal: true,
      },
    ],
  },
  {
    id: 'death-and-co-nyc',
    name: 'Death & Co',
    domain: 'deathandcompany.com',
    city: 'New York',
    region: 'NY',
    country: 'USA',
    neighborhood: 'East Village',
    address: '433 E 6th St, New York, NY 10009',
    website: 'https://deathandcompany.com',
    coordinates: { lat: 40.7259, lng: -73.9847 },
    summary:
      'The foundational craft cocktail temple that redefined American beverage standards and modern classic recipes.',
    menu: [
      {
        name: 'Oaxaca Old Fashioned',
        description: 'Reposado tequila, mezcal, agave nectar, Angostura bitters, flamed orange peel.',
        x: -6,
        y: -4,
        price: { amount: 2300, currency: 'USD' },
        tags: ['bold', 'classic', 'warm'],
        creator: 'Phil Ward (2007)',
        isHouseOriginal: true,
      },
      {
        name: 'Naked & Famous',
        description: 'Equal parts mezcal, Aperol, Yellow Chartreuse, and fresh lime juice.',
        x: 3,
        y: 1,
        price: { amount: 2300, currency: 'USD' },
        tags: ['complex', 'bold', 'visual'],
        creator: 'Joaquín Simó (2011)',
        isHouseOriginal: true,
      },
      {
        name: 'Conference',
        description: 'Bourbon, rye, Calvados, and Cognac stirred with demerara syrup and two bitters.',
        x: -8,
        y: -2,
        price: { amount: 2400, currency: 'USD' },
        tags: ['bold', 'comfort', 'complex'],
        creator: 'Brian Miller (2007)',
        isHouseOriginal: true,
      },
    ],
  },
  {
    id: 'katana-kitten-nyc',
    name: 'Katana Kitten',
    domain: 'katanakitten.com',
    city: 'New York',
    region: 'NY',
    country: 'USA',
    neighborhood: 'West Village',
    address: '531 Hudson St, New York, NY 10014',
    website: 'https://katanakitten.com',
    coordinates: { lat: 40.7354, lng: -74.0068 },
    summary:
      'Japanese-American highball and izakaya bar directed by Masahiro Urushido, celebrated for surgical precision.',
    menu: [
      {
        name: 'Hinoki Martini',
        description: 'Vodka, gin, junmai daiginjo sake, fino sherry, hinoki tree aromatic essence.',
        x: 7,
        y: -8,
        price: { amount: 2200, currency: 'USD' },
        tags: ['classic', 'prestige', 'complex'],
        creator: 'Masahiro Urushido',
        isHouseOriginal: true,
      },
      {
        name: 'Toki Highball',
        description: 'Suntory Toki whisky, hyper-pressurized seltzer, hand-cut clear ice, lemon oil.',
        x: 9,
        y: -5,
        price: { amount: 1900, currency: 'USD' },
        tags: ['crushable', 'classic', 'social'],
        creator: 'Masahiro Urushido',
        isHouseOriginal: true,
      },
      {
        name: 'Panda Fizz',
        description: 'Poire Williams eau de vie, Calpico, pandan cordiale, seltzer, grated nutmeg.',
        x: 5,
        y: 6,
        price: { amount: 2100, currency: 'USD' },
        tags: ['visual', 'social', 'sweet'],
        creator: 'Masahiro Urushido',
        isHouseOriginal: true,
      },
    ],
  },
  {
    id: 'double-chicken-please-nyc',
    name: 'Double Chicken Please',
    domain: 'doublechickenplease.com',
    city: 'New York',
    region: 'NY',
    country: 'USA',
    neighborhood: 'Lower East Side',
    address: '115 Allen St, New York, NY 10002',
    website: 'https://doublechickenplease.com',
    coordinates: { lat: 40.7196, lng: -73.9902 },
    summary:
      'GN Chan and Faye Chen’s culinary cocktail lounge, engineering deconstructed dishes into drinkable form.',
    menu: [
      {
        name: 'Redeye Gravy',
        description: 'Bourbon, coffee butter, prosciutto, corn, walnut, wild mushroom stock.',
        x: -5,
        y: -6,
        price: { amount: 2400, currency: 'USD' },
        tags: ['complex', 'bold', 'polarizing'],
        creator: 'GN Chan',
        isHouseOriginal: true,
      },
      {
        name: 'Cold Pizza',
        description: 'Don Fulano blanco tequila, burnt toast, tomato water, basil, honey, clarified egg white.',
        x: 2,
        y: -3,
        price: { amount: 2400, currency: 'USD' },
        tags: ['complex', 'visual', 'polarizing'],
        creator: 'GN Chan',
        isHouseOriginal: true,
      },
      {
        name: 'Key Lime Pie',
        description: 'White rum, coconut milk, winter melon, lime, graham cracker distillate.',
        x: 1,
        y: 8,
        price: { amount: 2300, currency: 'USD' },
        tags: ['sweet', 'comfort', 'visual'],
        creator: 'Faye Chen',
        isHouseOriginal: true,
      },
    ],
  },
  {
    id: 'employees-only-nyc',
    name: 'Employees Only',
    domain: 'employeesonlynyc.com',
    city: 'New York',
    region: 'NY',
    country: 'USA',
    neighborhood: 'West Village',
    address: '510 Hudson St, New York, NY 10014',
    website: 'https://employeesonlynyc.com',
    coordinates: { lat: 40.7337, lng: -74.0067 },
    summary:
      'The seminal 2004 West Village industry retreat credited with reviving speakeasy hospitality and high-speed service.',
    menu: [
      {
        name: 'Amelia',
        description: 'Vodka, St. Germain elderflower liqueur, fresh lemon juice, muddled blackberries.',
        x: 5,
        y: 7,
        price: { amount: 2100, currency: 'USD' },
        tags: ['sweet', 'visual', 'social'],
        creator: 'Dushan Zaric',
        isHouseOriginal: true,
      },
      {
        name: 'Mata Hari',
        description: 'VSOP Cognac, chai-infused sweet vermouth, pomegranate juice, dried rosebuds.',
        x: -3,
        y: 4,
        price: { amount: 2200, currency: 'USD' },
        tags: ['complex', 'warm', 'spice'],
        creator: 'Dushan Zaric & Jason Kosmas',
        isHouseOriginal: true,
      },
      {
        name: 'EO Manhattan',
        description: 'Rye whiskey, sweet vermouth, Grand Marnier, Fernet Branca dash, Angostura.',
        x: -7,
        y: -4,
        price: { amount: 2200, currency: 'USD' },
        tags: ['bold', 'classic', 'warm'],
        creator: 'Employees Only',
        isHouseOriginal: true,
      },
    ],
  },

  // --- LONDON ---
  {
    id: 'connaught-bar-london',
    name: 'Connaught Bar',
    domain: 'the-connaught.co.uk',
    city: 'London',
    region: 'Greater London',
    country: 'UK',
    neighborhood: 'Mayfair',
    address: 'Carlos Place, Mayfair, London W1K 2AL',
    website: 'https://www.the-connaught.co.uk/restaurants-bars/connaught-bar/',
    coordinates: { lat: 51.5098, lng: -0.1504 },
    summary:
      'Agostino Perrone and Giorgio Bargiani’s five-star hotel bar renowned for the tableside Martini trolley.',
    menu: [
      {
        name: 'Connaught Martini',
        description: 'Tanqueray No. Ten gin, bespoke vermouth blend, tailored aromatic bitters dropper.',
        x: 8,
        y: -8,
        price: { amount: 2800, currency: 'GBP' },
        tags: ['prestige', 'classic', 'visual'],
        creator: 'Agostino Perrone',
        isHouseOriginal: true,
      },
      {
        name: 'Faraway Collins',
        description: 'Dry gin, eucalyptus, yuzu juice, sugar, soda, fresh green chili.',
        x: 7,
        y: 3,
        price: { amount: 2500, currency: 'GBP' },
        tags: ['crushable', 'complex', 'spice'],
        creator: 'Giorgio Bargiani',
        isHouseOriginal: true,
      },
    ],
  },
  {
    id: 'tayer-elementary-london',
    name: 'Tayēr + Elementary',
    domain: 'tayer-elementary.com',
    city: 'London',
    region: 'Greater London',
    country: 'UK',
    neighborhood: 'Shoreditch',
    address: '152 Old St, London EC1V 9BW',
    website: 'https://tayer-elementary.com',
    coordinates: { lat: 51.5256, lng: -0.0911 },
    summary:
      'Monica Berg and Alex Kratena’s minimalist duality: draft cocktails upfront, hyper-seasonal culinary bar in the rear.',
    menu: [
      {
        name: 'One-Sip Martini',
        description: 'Vodka, vermouth, sherry, served icy with a blue cheese-stuffed olive.',
        x: 8,
        y: -7,
        price: { amount: 600, currency: 'GBP' },
        tags: ['bold', 'classic', 'polarizing'],
        creator: 'Alex Kratena & Monica Berg',
        isHouseOriginal: true,
      },
      {
        name: 'Palo Santo & Jasmine',
        description: 'Blanco tequila, distilled palo santo, cold-brew jasmine tea, white verjus.',
        x: 4,
        y: 1,
        price: { amount: 1600, currency: 'GBP' },
        tags: ['complex', 'crushable', 'prestige'],
        creator: 'Monica Berg',
        isHouseOriginal: true,
      },
    ],
  },
  {
    id: 'swift-london',
    name: 'Swift',
    domain: 'barswift.com',
    city: 'London',
    region: 'Greater London',
    country: 'UK',
    neighborhood: 'Soho',
    address: '12 Old Compton St, London W1D 4TQ',
    website: 'https://barswift.com',
    coordinates: { lat: 51.5133, lng: -0.1315 },
    summary:
      'Mia Johansson and Bobby Hiddleston’s bustling Soho aperitivo bar upstairs and moody whisky den downstairs.',
    menu: [
      {
        name: 'Swift Irish Coffee',
        description: 'Jameson Caskmates, freshly brewed rich filter coffee, demerara, hand-whipped double cream.',
        x: -6,
        y: 5,
        price: { amount: 1400, currency: 'GBP' },
        tags: ['warm', 'comfort', 'classic'],
        creator: 'Bobby Hiddleston',
        isHouseOriginal: true,
      },
      {
        name: 'Skerryvore',
        description: 'Single malt scotch, peated malt, apricot liqueur, white cacao, orgeat, lemon.',
        x: -3,
        y: 3,
        price: { amount: 1600, currency: 'GBP' },
        tags: ['complex', 'bold', 'sweet'],
        creator: 'Swift Bar Team',
        isHouseOriginal: true,
      },
    ],
  },

  // --- NEW ORLEANS ---
  {
    id: 'carousel-bar-nola',
    name: 'The Carousel Bar & Lounge',
    domain: 'hotelmonteleone.com',
    city: 'New Orleans',
    region: 'LA',
    country: 'USA',
    neighborhood: 'French Quarter',
    address: '214 Royal St, New Orleans, LA 70130',
    website: 'https://hotelmonteleone.com/entertainment/carousel-bar/',
    coordinates: { lat: 29.9546, lng: -90.0683 },
    summary:
      'The historic 25-seat rotating carousel lounge inside Hotel Monteleone, birthplace of the Vieux Carré.',
    menu: [
      {
        name: 'Vieux Carré',
        description: 'Rye whiskey, Cognac, sweet vermouth, Bénédictine, Angostura and Peychaud’s bitters.',
        x: -7,
        y: 2,
        price: { amount: 2000, currency: 'USD' },
        tags: ['classic', 'bold', 'warm'],
        creator: 'Walter Bergeron (1938)',
        isHouseOriginal: true,
      },
    ],
  },
  {
    id: 'french-75-bar-nola',
    name: "Arnaud's French 75 Bar",
    domain: 'arnaudsrestaurant.com',
    city: 'New Orleans',
    region: 'LA',
    country: 'USA',
    neighborhood: 'French Quarter',
    address: '813 Bienville St, New Orleans, LA 70112',
    website: 'https://www.arnaudsrestaurant.com/bars/french-75/',
    coordinates: { lat: 29.9555, lng: -90.0691 },
    summary:
      'Chris Hannah’s James Beard Award-winning French Quarter institution celebrating Cognac tradition.',
    menu: [
      {
        name: 'French 75 (Cognac Style)',
        description: 'Courvoisier VS Cognac, fresh lemon juice, simple syrup, topped with Champagne.',
        x: 8,
        y: 4,
        price: { amount: 1800, currency: 'USD' },
        tags: ['classic', 'prestige', 'social'],
        creator: 'Chris Hannah',
        isHouseOriginal: true,
      },
    ],
  },

  // --- SAN FRANCISCO ---
  {
    id: 'smugglers-cove-sf',
    name: "Smuggler's Cove",
    domain: 'smugglerscovesf.com',
    city: 'San Francisco',
    region: 'CA',
    country: 'USA',
    neighborhood: 'Hayes Valley',
    address: '650 Gough St, San Francisco, CA 94102',
    website: 'https://www.smugglerscovesf.com',
    coordinates: { lat: 37.7794, lng: -122.4232 },
    summary:
      'Martin Cate’s world-renowned rum repository and historical tiki temple with over 700 rare rums.',
    menu: [
      {
        name: "Smuggler's Rum Barrel",
        description: 'Multi-island rum blend, allspice dram, fresh lime, grapefruit, honey syrup.',
        x: -2,
        y: 7,
        price: { amount: 2000, currency: 'USD' },
        tags: ['bold', 'complex', 'sweet'],
        creator: 'Martin Cate',
        isHouseOriginal: true,
      },
      {
        name: 'Tradewinds',
        description: 'Dark rum, high-proof light rum, apricot liqueur, coconut cream, fresh lemon.',
        x: -4,
        y: 8,
        price: { amount: 1800, currency: 'USD' },
        tags: ['sweet', 'comfort', 'visual'],
        creator: 'Martin Cate',
        isHouseOriginal: true,
      },
    ],
  },
  {
    id: 'trick-dog-sf',
    name: 'Trick Dog',
    domain: 'trickdogbar.com',
    city: 'San Francisco',
    region: 'CA',
    country: 'USA',
    neighborhood: 'Mission District',
    address: '3010 20th St, San Francisco, CA 94110',
    website: 'https://trickdogbar.com',
    coordinates: { lat: 37.7592, lng: -122.4112 },
    summary:
      'The Bon Vivants’ Mission powerhouse, famous for rotating themed menus that reshape industry packaging.',
    menu: [
      {
        name: 'Mission Highball',
        description: 'Oaxacan mezcal, green apple cordial, cold-pressed celery juice, sparkling water.',
        x: 7,
        y: -2,
        price: { amount: 1900, currency: 'USD' },
        tags: ['crushable', 'complex', 'visual'],
        creator: 'The Bon Vivants',
        isHouseOriginal: true,
      },
    ],
  },

  // --- CHICAGO ---
  {
    id: 'violet-hour-chicago',
    name: 'The Violet Hour',
    domain: 'theviolethour.com',
    city: 'Chicago',
    region: 'IL',
    country: 'USA',
    neighborhood: 'Wicker Park',
    address: '1520 N Damen Ave, Chicago, IL 60622',
    website: 'https://www.theviolethour.com',
    coordinates: { lat: 41.9095, lng: -87.6778 },
    summary:
      'Toby Maloney’s hidden velvet-draped cocktail sanctum that sparked the Midwestern mixology renaissance.',
    menu: [
      {
        name: 'Juliet & Romeo',
        description: 'Beefeater gin, fresh lime, mint, cucumber, rosewater drops, Angostura garnish.',
        x: 7,
        y: 3,
        price: { amount: 1800, currency: 'USD' },
        tags: ['classic', 'visual', 'crushable'],
        creator: 'Toby Maloney',
        isHouseOriginal: true,
      },
      {
        name: 'Art of Choking',
        description: 'Cynar amaro, overproof rum, Green Chartreuse, fresh lime, demerara.',
        x: -5,
        y: -3,
        price: { amount: 1900, currency: 'USD' },
        tags: ['bold', 'polarizing', 'complex'],
        creator: 'Toby Maloney',
        isHouseOriginal: true,
      },
    ],
  },

  // --- TOKYO ---
  {
    id: 'bar-high-five-tokyo',
    name: 'Bar High Five',
    domain: 'barhighfive.com',
    city: 'Tokyo',
    region: 'Kanto',
    country: 'Japan',
    neighborhood: 'Ginza',
    address: 'B1F, Efuro Building, 5-4-15 Ginza, Chuo-ku, Tokyo',
    website: 'http://www.barhighfive.com',
    coordinates: { lat: 35.6713, lng: 139.7635 },
    summary:
      'Hidetsugu Ueno’s intimate Ginza sanctuary, famed for hand-carved ice diamonds and bespoke omakase cocktails.',
    menu: [
      {
        name: 'White Lady (Ueno Cut)',
        description: 'Dry gin, Cointreau, fresh lemon juice, atomized orange blossom water.',
        x: 8,
        y: 2,
        price: { amount: 2400, currency: 'JPY' },
        tags: ['classic', 'prestige', 'crushable'],
        creator: 'Hidetsugu Ueno',
        isHouseOriginal: true,
      },
      {
        name: 'Black Rose',
        description: 'Aged dark rum, coffee liqueur, chilled Earl Grey black tea infusion.',
        x: -6,
        y: 3,
        price: { amount: 2400, currency: 'JPY' },
        tags: ['complex', 'warm', 'comfort'],
        creator: 'Hidetsugu Ueno',
        isHouseOriginal: true,
      },
    ],
  },
];
