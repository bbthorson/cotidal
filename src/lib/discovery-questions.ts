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
  feedback?: string;
}

export interface Question {
  id: string;
  tier: QuestionTier;
  category: QuestionCategory;
  sectionNumber: string; // e.g. "01", "02", "03", "04"
  text: string;
  subtitle?: string;     // Sensory subtitle on the ledger card
  type?: 'narrative' | 'boolean' | 'image-grid';
  options: QuestionOption[];
  primaryAxis: 'x' | 'y';
  informationGain: number;
  isAIGenerated?: boolean;
}

export const QUESTION_CATEGORIES: { id: QuestionCategory; index: string; label: string; description: string }[] = [
  { id: 'palate',       index: '01', label: 'The Palate',       description: 'Taste & Chemistry' },
  { id: 'architecture', index: '02', label: 'Architecture',     description: 'Method, Ice & Texture' },
  { id: 'ritual',       index: '03', label: 'The Ritual',       description: 'Vessel & Aromatics' },
  { id: 'occasion',     index: '04', label: 'The Hour',         description: 'Setting & Tempo' },
];

export const questions: Question[] = [
  // =========================================================================
  // 01. THE PALATE (Taste & Chemistry: sweet, acid, bitter, smoke, botanical)
  // =========================================================================
  {
    id: 'coffee',
    tier: 'calibration',
    category: 'palate',
    sectionNumber: '01',
    text: "How do you take your coffee?",
    subtitle: "Calibrating roast intensity, acid, and sugar tolerance",
    primaryAxis: 'x',
    informationGain: 5,
    options: [
      {
        text: "Black or Espresso.",
        note: "Pure roast, bold extraction, bitter finish",
        dx: -5,
        dy: -2,
        feedback: "A preference for the pure and bold."
      },
      {
        text: "With milk and sugar.",
        note: "Softened acid, rounded cream, sweet finish",
        dx: -2,
        dy: 5,
        feedback: "Seeking comfort and sweetness."
      }
    ]
  },
  {
    id: 'dessert',
    tier: 'calibration',
    category: 'palate',
    sectionNumber: '01',
    text: "Pick a finish to a perfect meal.",
    subtitle: "Gauging brightness versus deep cocoa and lush cream",
    primaryAxis: 'y',
    informationGain: 8,
    options: [
      {
        text: "Lemon Tart (Zest)",
        note: "Snappy citrus acid, bright curd, sweet crust",
        dx: 5,
        dy: 5,
        feedback: "Bright, acidic, and sweet."
      },
      {
        text: "Dark Chocolate (Cacao)",
        note: "Dry roasted cocoa, earth, low sweetness",
        dx: -3,
        dy: -3,
        feedback: "Rich and dry."
      },
      {
        text: "Crème Brûlée (Cream)",
        note: "Dense cream, lush vanilla, caramelized sugar",
        dx: -5,
        dy: 8,
        feedback: "Lush, rich, and sweet."
      }
    ]
  },
  {
    id: 'bitter_tol',
    tier: 'calibration',
    category: 'palate',
    sectionNumber: '01',
    text: "Do you enjoy the bite of Tonic water?",
    subtitle: "Botanical bitterness, gentian, and dry quinine",
    primaryAxis: 'y',
    informationGain: 3,
    options: [
      {
        text: "Love the bite.",
        note: "Herbal astringency and quinine welcome",
        dx: 2,
        dy: -3,
        filterFlag: { key: 'dislikesBitter', value: false },
        feedback: "The bitterness is welcomed."
      },
      {
        text: "Too bitter for me.",
        note: "Softened edges, low astringency preferred",
        dx: 0,
        dy: 0,
        filterFlag: { key: 'dislikesBitter', value: true },
        feedback: "Softening the edges."
      }
    ]
  },
  {
    id: 'smoke',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: "Does the smell of a campfire allure you?",
    subtitle: "Peated Islay malts, mezcal embers, and charred wood",
    primaryAxis: 'y',
    informationGain: 2,
    options: [
      {
        text: "Love it.",
        note: "Earthy peat, mezcal smoke, rich campfire",
        dx: -1,
        dy: -2,
        filterFlag: { key: 'dislikesSmoke', value: false },
        vibeTags: ['complex', 'bold'],
        feedback: "Smoky notes revealed."
      },
      {
        text: "No thanks.",
        note: "Clean distillation, crisp spirits uncharred",
        dx: 0,
        dy: 0,
        filterFlag: { key: 'dislikesSmoke', value: true },
        feedback: "Keeping it clean."
      }
    ]
  },
  {
    id: 'flavor_revelation',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: "Which flavor are you drawn to?",
    subtitle: "Alpine botanical licorice versus warm citrus peel",
    primaryAxis: 'y',
    informationGain: 2,
    options: [
      {
        text: "Black Licorice (Anise)",
        note: "Herbaceous pastis, fennel, absinthe botanical",
        dx: -1,
        dy: -2,
        filterFlag: { key: 'dislikesAnise', value: false },
        vibeTags: ['polarizing'],
        feedback: "Adventurous — I like it."
      },
      {
        text: "Spiced Orange (Citrus)",
        note: "Sun-ripened orange peel, baking spice warmth",
        dx: 1,
        dy: 2,
        filterFlag: { key: 'dislikesAnise', value: true },
        vibeTags: ['spice'],
        feedback: "Warmth and sunshine."
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
    text: "Fizzy or Still?",
    subtitle: "Aeration, highball carbonation, and liquid density",
    primaryAxis: 'x',
    informationGain: 3,
    options: [
      {
        text: "Fizzy & Refreshing",
        note: "Lively bubbles, effervescent lift, light palate",
        dx: 3,
        dy: 1,
        vibeTags: ['crushable'],
        feedback: "Effervescence awaits."
      },
      {
        text: "Still & Smooth",
        note: "Silky viscosity, spirit weight, contemplative",
        dx: -2,
        dy: 0,
        vibeTags: ['classic'],
        feedback: "Grounded and elegant."
      }
    ]
  },
  {
    id: 'method',
    tier: 'architecture',
    category: 'architecture',
    sectionNumber: '02',
    text: "Shaken or Stirred?",
    subtitle: "How the liquid is chilled, diluted, and combined",
    primaryAxis: 'x',
    informationGain: 4,
    options: [
      {
        text: "Shaken with vigor.",
        note: "Snappy cold bite, micro-ice aeration, frothy head",
        dx: 3,
        dy: 1,
        vibeTags: ['crushable', 'visual'],
        feedback: "Aerated and cold."
      },
      {
        text: "Stirred with patience.",
        note: "Heavy spirit clarity, gentle melt, velvet texture",
        dx: -3,
        dy: -1,
        vibeTags: ['classic', 'prestige'],
        feedback: "Crystal clarity and weight."
      }
    ]
  },
  {
    id: 'weather',
    tier: 'architecture',
    category: 'architecture',
    sectionNumber: '02',
    text: "What is your current climate vibe?",
    subtitle: "Thermal relief vs. inner hearth warmth",
    primaryAxis: 'x',
    informationGain: 2,
    options: [
      {
        text: "Heatwave (Need ice)",
        note: "Crushed ice, rapid dilution, cooling revival",
        dx: 2,
        dy: 0,
        feedback: "Cooling the spirit."
      },
      {
        text: "Blizzard (Need warmth)",
        note: "Spirit-forward proof, gentle warming finish",
        dx: -2,
        dy: -2,
        vibeTags: ['warm'],
        feedback: "Igniting the hearth."
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
    text: "Choose your vessel.",
    subtitle: "Stemware keeps liquid cold; rocks glasses give tactile weight",
    primaryAxis: 'x',
    informationGain: 1,
    options: [
      {
        text: "Stemmed & Elegant",
        note: "Coupe or Nick & Nora, elevated aromatics, zero warming",
        dx: 1,
        dy: 0,
        vibeTags: ['prestige', 'visual'],
        feedback: "A touch of ceremony."
      },
      {
        text: "Heavy & Grounded",
        note: "Double rocks glass, tactile weight in hand, single rock",
        dx: -1,
        dy: -1,
        vibeTags: ['comfort', 'bold'],
        feedback: "Substantial and real."
      }
    ]
  },
  {
    id: 'garnish_style',
    tier: 'context',
    category: 'ritual',
    sectionNumber: '03',
    text: "The finishing touch on the rim?",
    subtitle: "Aromatic perfume, mineral salinity, or naked unadorned spirit",
    primaryAxis: 'y',
    informationGain: 3,
    options: [
      {
        text: "Expressed citrus twist.",
        note: "Bright perfume of lemon or grapefruit oils over the crown",
        dx: 1,
        dy: 1,
        vibeTags: ['visual', 'classic'],
        feedback: "Aromatic essential oils."
      },
      {
        text: "Castelvetrano olive or saline.",
        note: "Briny mineral edge, savory depth that sharpens the palate",
        dx: -1,
        dy: -3,
        vibeTags: ['complex', 'bold'],
        feedback: "Brine and mineral tension."
      },
      {
        text: "Strictly unadorned.",
        note: "Zero garnish — letting the spirit and vermouth speak",
        dx: -2,
        dy: -1,
        vibeTags: ['classic'],
        feedback: "Uncompromising and pure."
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
    text: "What is the pacing of your evening?",
    subtitle: "Setting the tempo of your glass",
    primaryAxis: 'x',
    informationGain: 1,
    options: [
      {
        text: "Sipping slowly.",
        note: "Contemplative, unhurried, slow melt in the glass",
        dx: -1,
        dy: -1,
        vibeTags: ['complex', 'bold'],
        feedback: "Patience is a virtue."
      },
      {
        text: "Social & Spirited.",
        note: "Bright, energetic tempo, crushable companion",
        dx: 1,
        dy: 1,
        vibeTags: ['social', 'crushable'],
        feedback: "Energy and flow."
      }
    ]
  },
  {
    id: 'hour_tempo',
    tier: 'context',
    category: 'occasion',
    sectionNumber: '04',
    text: "What chapter of the evening is this?",
    subtitle: "The appetite-opening first drink vs. the final nightcap",
    primaryAxis: 'x',
    informationGain: 3,
    options: [
      {
        text: "The Golden Hour (Aperitivo).",
        note: "Low-ABV, bitter-sweet, sparkling, whetting the appetite",
        dx: 3,
        dy: 1,
        vibeTags: ['social', 'crushable'],
        feedback: "Starting light and sharp."
      },
      {
        text: "The Table Centerpiece.",
        note: "Structured classic, paired with rich food and debate",
        dx: -1,
        dy: -1,
        vibeTags: ['classic', 'complex'],
        feedback: "Holding court at the table."
      },
      {
        text: "The Midnight Nightcap.",
        note: "High proof, spirit-forward, warmth to close the night",
        dx: -4,
        dy: 0,
        vibeTags: ['bold', 'comfort', 'warm'],
        feedback: "A slow, deep parting glass."
      }
    ]
  }
];