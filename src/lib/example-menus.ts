import type { VibeTag } from './data';

/**
 * Example menus for /bars: well-known bars' drinks, placed on the map by us to
 * show what a published `app.cotidal.menu` would carry. Not sightings, and not
 * published by the bars themselves — illustration for that one page, not data:
 * nothing else may import it, and nothing here is a bar's claim on anything.
 */

type ExampleMenuItem = {
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

type ExampleVenue = {
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
  menu: ExampleMenuItem[];
};

export const exampleVenues: ExampleVenue[] = [
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
];
