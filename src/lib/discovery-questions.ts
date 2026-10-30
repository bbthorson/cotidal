import { VibeTag } from './data';

export type QuestionTier = 'calibration' | 'architecture' | 'context';
export type QuestionCategory = 'palate' | 'architecture' | 'ritual' | 'occasion';

export interface QuestionOption {
  text: string;
  note?: string; // Sensory descriptor for the ledger display
  dx: number;   // Rich (-10) <-> Crisp (+10)
  dy: number;   // Savory (-10) <-> Sweet (+10)

  vibeTags?: VibeTag[];
  imageSrc?: string;
  filterFlag?: {
    key: 'dislikesSmoke' | 'dislikesBitter' | 'dislikesAnise';
    value: boolean;
  };
  filterFlags?: Partial<Record<'dislikesSmoke' | 'dislikesBitter' | 'dislikesAnise', boolean>>;
}

export interface Question {
  id: string;
  tier: QuestionTier;
  category: QuestionCategory;
  sectionNumber: string; // e.g. "01", "02", "03", "04"
  text: string;
  subtitle?: string;     // Sensory subtitle on the ledger card
  /**
   * `triad`: tap the one you'd send back. `pair`: two options on one axis,
   * read as a comparison rather than a position (belief-state.ts).
   */
  type?: 'narrative' | 'boolean' | 'image-grid' | 'triad' | 'pair';
  options: QuestionOption[];
  primaryAxis: 'x' | 'y';
  isAIGenerated?: boolean;
}

/**
 * `label` is shown as the question's eyebrow and `short` in the quiz's stage
 * row. "Architecture" is internal vocabulary (AGENTS.md), so the interface
 * calls that stage "The Method".
 */
export const QUESTION_CATEGORIES: { id: QuestionCategory; index: string; label: string; short: string; description: string }[] = [
  { id: 'palate',       index: '01', label: 'The Palate',       short: 'Palate', description: 'Taste & Chemistry' },
  { id: 'architecture', index: '02', label: 'The Method',       short: 'Method', description: 'Method, Ice & Texture' },
  { id: 'ritual',       index: '03', label: 'The Ritual',       short: 'Ritual', description: 'Vessel & Aromatics' },
  { id: 'occasion',     index: '04', label: 'The Hour',         short: 'Hour',   description: 'Setting & Tempo' },
];

export const questions: Question[] = [
  // =========================================================================
  // THE SOMMELIER TRIADS (Negative Elimination: Cold Deterministic Baseline)
  // =========================================================================
  {
    id: 'triad_sugar_texture',
    tier: 'calibration',
    category: 'palate',
    sectionNumber: '01',
    text: "Which glass do you push away first?",
    subtitle: "Tap the one you’d send back.",
    type: 'triad',
    primaryAxis: 'y',
    options: [
      {
        text: "Sharp and mineral",
        note: "Lime, green apple, cold soda, a bone-dry finish",
        dx: -4,
        dy: 3
      },
      {
        text: "Dense and syrupy",
        note: "Fig, molasses, cream, candied stone fruit",
        dx: 4,
        dy: -4
      },
      {
        text: "Stark and briny",
        note: "Dry gin, sea spray, olive leaf, nothing soft about it",
        dx: -2,
        dy: 4
      }
    ]
  },
  {
    id: 'triad_bitter_botanical',
    tier: 'calibration',
    category: 'palate',
    sectionNumber: '01',
    text: "Which flavor would you cross off?",
    subtitle: "Tap the one you’d send back.",
    type: 'triad',
    primaryAxis: 'x',
    options: [
      {
        text: "Bitter roots and amaro",
        note: "Gentian, pine, artichoke, a hard bitter bite",
        dx: 2,
        dy: 3,
        filterFlag: { key: 'dislikesBitter', value: true }
      },
      {
        text: "Licorice and absinthe",
        note: "Black licorice, fennel, wormwood",
        dx: 1,
        dy: -1,
        filterFlag: { key: 'dislikesAnise', value: true }
      },
      {
        text: "Sweet and floral",
        note: "Elderflower, ripe pear, clover honey",
        dx: -2,
        dy: -4,
        filterFlags: { dislikesBitter: false, dislikesAnise: false }
      }
    ]
  },
  {
    id: 'triad_smoke_oak',
    tier: 'calibration',
    category: 'architecture',
    sectionNumber: '02',
    text: "Which spirit would you push away?",
    subtitle: "Tap the one you’d send back.",
    type: 'triad',
    primaryAxis: 'x',
    options: [
      {
        text: "Smoke and peat",
        note: "Mezcal, Islay scotch, bonfire ash, iodine",
        dx: 3,
        dy: 1,
        filterFlag: { key: 'dislikesSmoke', value: true }
      },
      {
        text: "Barrel and vanilla",
        note: "Charred oak, brown butter, vanilla bean",
        dx: 3,
        dy: -3,
        filterFlags: { dislikesSmoke: false }
      },
      {
        text: "Green and peppery",
        note: "Raw agave, green pepper, wet stone",
        dx: -3,
        dy: 1,
        filterFlags: { dislikesSmoke: false }
      }
    ]
  },
  {
    id: 'triad_proof_tempo',
    tier: 'calibration',
    category: 'ritual',
    sectionNumber: '03',
    text: "Which style do you push away?",
    subtitle: "Tap the one you’d send back.",
    type: 'triad',
    primaryAxis: 'x',
    options: [
      {
        text: "Straight and strong",
        note: "Spirit at room temperature, oily, no ice",
        dx: 4,
        dy: 0,
        vibeTags: ['classic', 'crushable']
      },
      {
        text: "Tall and fizzy",
        note: "Soda, plenty of ice, light as air",
        dx: -4,
        dy: 0,
        vibeTags: ['complex', 'polarizing']
      },
      {
        text: "Frothy and creamy",
        note: "Egg-white foam, a custard texture, nutmeg on top",
        dx: 2,
        dy: -3,
        vibeTags: ['classic', 'social']
      }
    ]
  },
  {
    id: 'coffee',
    tier: 'calibration',
    category: 'palate',
    sectionNumber: '01',
    text: "How do you take your coffee?",
    subtitle: "Roast, acid, and how much sugar.",
    primaryAxis: 'x',
    options: [
      {
        text: "Black, or espresso",
        note: "Pure roast, bold, a bitter finish",
        dx: -5,
        dy: -2
      },
      {
        text: "Milk and sugar",
        note: "Softer acid, round, a sweet finish",
        dx: -2,
        dy: 5
      }
    ]
  },
  {
    id: 'dessert',
    tier: 'calibration',
    category: 'palate',
    sectionNumber: '01',
    text: "Pick the end of a good dinner.",
    subtitle: "Something bright, or cocoa and cream.",
    primaryAxis: 'y',
    options: [
      {
        text: "Lemon tart",
        note: "Sharp citrus, bright curd, sweet crust",
        dx: 5,
        dy: 5
      },
      {
        text: "Dark chocolate",
        note: "Roasted cocoa, earthy, barely sweet",
        dx: -3,
        dy: -3
      },
      {
        text: "Crème brûlée",
        note: "Thick cream, vanilla, burnt sugar",
        dx: -5,
        dy: 8
      }
    ]
  },
  {
    id: 'bitter_tol',
    tier: 'calibration',
    category: 'palate',
    sectionNumber: '01',
    text: "Do you like the bite of tonic water?",
    subtitle: "That bitter, quinine edge.",
    primaryAxis: 'y',
    options: [
      {
        text: "Love the bite",
        note: "Bitter and herbal, and that’s the point",
        dx: 2,
        dy: -3,
        filterFlag: { key: 'dislikesBitter', value: false }
      },
      {
        text: "Too bitter for me",
        note: "Softer edges, please",
        dx: 0,
        dy: 0,
        filterFlag: { key: 'dislikesBitter', value: true }
      }
    ]
  },
  {
    id: 'smoke',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: "Do you want campfire smoke in your glass?",
    subtitle: "Islay scotch, mezcal, charred wood",
    primaryAxis: 'y',
    options: [
      {
        text: "Love it",
        note: "Peat, mezcal smoke, campfire",
        dx: -1,
        dy: -2,
        filterFlag: { key: 'dislikesSmoke', value: false },
        vibeTags: ['complex', 'bold']
      },
      {
        text: "No thanks",
        note: "Clean spirits, nothing charred",
        dx: 0,
        dy: 0,
        filterFlag: { key: 'dislikesSmoke', value: true }
      }
    ]
  },
  {
    id: 'flavor_revelation',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: "Which flavor pulls you in?",
    subtitle: "Licorice, or orange peel and spice.",
    primaryAxis: 'y',
    options: [
      {
        text: "Black licorice",
        note: "Pastis, fennel, absinthe",
        dx: -1,
        dy: -2,
        filterFlag: { key: 'dislikesAnise', value: false },
        vibeTags: ['polarizing']
      },
      {
        text: "Spiced orange",
        note: "Orange peel, baking spice",
        dx: 1,
        dy: 2,
        filterFlag: { key: 'dislikesAnise', value: true },
        vibeTags: ['spice']
      }
    ]
  },

  // =========================================================================
  // 02. ARCHITECTURE (Method, Dilution & Texture: shaken vs stirred, ice, fizz)
  // =========================================================================
  {
    id: 'texture',
    tier: 'architecture',
    category: 'architecture',
    sectionNumber: '02',
    text: "Fizzy or still?",
    subtitle: "Bubbles, or weight.",
    primaryAxis: 'x',
    options: [
      {
        text: "Fizzy",
        note: "Lively bubbles, a light finish",
        dx: 3,
        dy: 1,
        vibeTags: ['crushable']
      },
      {
        text: "Still",
        note: "Silky, weighty, slow",
        dx: -2,
        dy: 0,
        vibeTags: ['classic']
      }
    ]
  },
  {
    id: 'method',
    tier: 'architecture',
    category: 'architecture',
    sectionNumber: '02',
    text: "Shaken or stirred?",
    subtitle: "How the drink gets cold.",
    primaryAxis: 'x',
    options: [
      {
        text: "Shaken",
        note: "Cold and snappy, with a frothy top",
        dx: 3,
        dy: 1,
        vibeTags: ['crushable', 'visual']
      },
      {
        text: "Stirred",
        note: "Clear, weighty, silky",
        dx: -3,
        dy: -1,
        vibeTags: ['classic', 'prestige']
      }
    ]
  },
  {
    id: 'weather',
    tier: 'architecture',
    category: 'architecture',
    sectionNumber: '02',
    text: "Hot day or cold night?",
    subtitle: "Cooling off, or warming up.",
    primaryAxis: 'x',
    options: [
      {
        text: "Hot day",
        note: "Crushed ice, quick dilution, cooling off",
        dx: 2,
        dy: 0
      },
      {
        text: "Cold night",
        note: "Strong, with a warming finish",
        dx: -2,
        dy: -2,
        vibeTags: ['warm']
      }
    ]
  },

  // =========================================================================
  // 03. THE RITUAL (Vessel & Presentation: glassware, aromatics, garnishes)
  // =========================================================================
  {
    id: 'glassware',
    tier: 'architecture',
    category: 'ritual',
    sectionNumber: '03',
    text: "Stem or tumbler?",
    subtitle: "A stem keeps it cold. A tumbler gives it weight.",
    primaryAxis: 'x',
    options: [
      {
        text: "On a stem",
        note: "Coupe or Nick & Nora: stays cold, shows off the aroma",
        dx: 1,
        dy: 0,
        vibeTags: ['prestige', 'visual']
      },
      {
        text: "In a tumbler",
        note: "Double rocks glass, solid in the hand, one big rock",
        dx: -1,
        dy: -1,
        vibeTags: ['comfort', 'bold']
      }
    ]
  },
  {
    id: 'garnish_style',
    tier: 'context',
    category: 'ritual',
    sectionNumber: '03',
    text: "What goes on top?",
    subtitle: "A citrus twist, a briny olive, or nothing.",
    primaryAxis: 'y',
    options: [
      {
        text: "A citrus twist",
        note: "Lemon or grapefruit oils over the top",
        dx: 1,
        dy: 1,
        vibeTags: ['visual', 'classic']
      },
      {
        text: "An olive, or a pinch of salt",
        note: "Briny and savory, sharpens the palate",
        dx: -1,
        dy: -3,
        vibeTags: ['complex', 'bold']
      },
      {
        text: "Nothing",
        note: "No garnish. Let the spirit and the vermouth talk",
        dx: -2,
        dy: -1,
        vibeTags: ['classic']
      }
    ]
  },

  // =========================================================================
  // 04. THE HOUR (Occasion & Setting: tempo, golden hour, late nightcap)
  // =========================================================================
  {
    id: 'pacing',
    tier: 'context',
    category: 'occasion',
    sectionNumber: '04',
    text: "How fast are you going tonight?",
    subtitle: "The tempo of your glass.",
    primaryAxis: 'x',
    options: [
      {
        text: "Slowly",
        note: "Unhurried, melting slowly in the glass",
        dx: -1,
        dy: -1,
        vibeTags: ['complex', 'bold']
      },
      {
        text: "Out with people",
        note: "Lively, easy to keep drinking",
        dx: 1,
        dy: 1,
        vibeTags: ['social', 'crushable']
      }
    ]
  },
  {
    id: 'hour_tempo',
    tier: 'context',
    category: 'occasion',
    sectionNumber: '04',
    text: "Where are you in the evening?",
    subtitle: "The first drink, or the last.",
    primaryAxis: 'x',
    options: [
      {
        text: "The first one",
        note: "Light, bitter-sweet, sparkling, gets you hungry",
        dx: 3,
        dy: 1,
        vibeTags: ['social', 'crushable']
      },
      {
        text: "With dinner",
        note: "A structured classic that stands up to rich food",
        dx: -1,
        dy: -1,
        vibeTags: ['classic', 'complex']
      },
      {
        text: "The last one",
        note: "Strong, spirit-forward, a warm way to end the night",
        dx: -4,
        dy: 0,
        vibeTags: ['bold', 'comfort', 'warm']
      }
    ]
  },
  // =========================================================================
  // FORCED-CHOICE PAIRS (Precision: which side of a line, not where)
  // =========================================================================
  // Two options a few points apart on one axis, the other axis untouched. The
  // answer is read as a comparison — which side of the pair's midpoint the
  // user sits — not as a position (belief-state.ts, `answerQuestion`). The
  // selector reaches for them once an estimate is near one of their
  // midpoints, so the ladder is three overlapping pairs per axis. Sensations
  // only, never drink names: a name measures familiarity, not taste.
  {
    id: 'pair_x_deep',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: "Two stirred drinks. Which one?",
    subtitle: "Two glasses, close together. Go with your first instinct.",
    type: 'pair',
    primaryAxis: 'x',
    options: [
      {
        text: "Velvet weight",
        note: "Aged spirit, stirred long, coats the glass",
        dx: -4,
        dy: 0
      },
      {
        text: "Round, with a lift",
        note: "Some body, but a twist of citrus keeps it moving",
        dx: -1,
        dy: 0
      }
    ]
  },
  {
    id: 'pair_x_middle',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: "Which glass would you rather be handed?",
    subtitle: "Two glasses, close together. Go with your first instinct.",
    type: 'pair',
    primaryAxis: 'x',
    options: [
      {
        text: "Warm and rounded",
        note: "Barrel spice, soft edges, sipped slowly",
        dx: -2,
        dy: 0
      },
      {
        text: "Cool and lifted",
        note: "Fresh citrus, light body, a clean finish",
        dx: 2,
        dy: 0
      }
    ]
  },
  {
    id: 'pair_x_bright',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: "Two shaken drinks. Which one?",
    subtitle: "Two glasses, close together. Go with your first instinct.",
    type: 'pair',
    primaryAxis: 'x',
    options: [
      {
        text: "Fresh, with some body",
        note: "Citrus over a rounder base, bright but not sharp",
        dx: 1,
        dy: 0
      },
      {
        text: "Bracing and electric",
        note: "Hard-shaken, high acid, cold enough to ache",
        dx: 4,
        dy: 0
      }
    ]
  },
  {
    id: 'pair_y_dry',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: "Two dry drinks. Which one?",
    subtitle: "Two glasses, close together. Go with your first instinct.",
    type: 'pair',
    primaryAxis: 'y',
    options: [
      {
        text: "Bone dry and saline",
        note: "Brine, bitter herbs, not a trace of sugar",
        dx: 0,
        dy: -4
      },
      {
        text: "Dry, with a little give",
        note: "Mostly savory, a whisper of ripe fruit",
        dx: 0,
        dy: -1
      }
    ]
  },
  {
    id: 'pair_y_middle',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: "Which would you rather sip?",
    subtitle: "Two glasses, close together. Go with your first instinct.",
    type: 'pair',
    primaryAxis: 'y',
    options: [
      {
        text: "Herbal and dry",
        note: "Green herbs, mineral, a bitter finish",
        dx: 0,
        dy: -2
      },
      {
        text: "Ripe and juicy",
        note: "Stone fruit, a little honey, a soft finish",
        dx: 0,
        dy: 2
      }
    ]
  },
  {
    id: 'pair_y_lush',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: "Two sweeter drinks. Which one?",
    subtitle: "Two glasses, close together. Go with your first instinct.",
    type: 'pair',
    primaryAxis: 'y',
    options: [
      {
        text: "Fruit, kept in check",
        note: "Ripe fruit balanced by acid, sweet but never sticky",
        dx: 0,
        dy: 1
      },
      {
        text: "Lush and dessert-sweet",
        note: "Caramel, cream, the sweet end of the menu",
        dx: 0,
        dy: 4
      }
    ]
  },
];