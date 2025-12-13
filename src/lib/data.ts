export type VibeTag = 'bold' | 'classic' | 'visual' | 'social' | 'comfort' | 'complex' | 'sweet' | 'messy' | 'polarizing' | 'prestige' | 'warm' | 'spice' | 'crushable';

export type User = {
  x: number;
  y: number;
  filters: string[]; // e.g. 'noSmoke', 'noBitter', 'noAnise'
  dislikesAnise?: boolean; // Explicit field for type safety, mapped to filters
  vibeTags?: Record<string, number>;
};

export type ContextType = "usual" | "business" | "party" | "holiday";

export type Drink = {
    name: string;
    type: "Cocktail" | "Wine" | "Beer" | "Spirit";
    x: number;
    y: number;
    hasSmoke: boolean;
    hasAnise: boolean;
    isBitter: boolean;
    tags: VibeTag[];
};

// --- NEW QUESTION TYPES ---

export type QuestionTier = 'calibration' | 'architecture' | 'context';

export type QuestionOption = {
    text: string;
    dx: number; // Sweet <-> Dry/Bitter (Tier 1)
    dy: number; // Rich <-> Crisp/Sour (Tier 2)

    // For Tier 3 & Filters
    vibeTags?: VibeTag[];
    imageSrc?: string;
    filterFlag?: {
        key: 'dislikesSmoke' | 'dislikesBitter' | 'dislikesAnise';
        value: boolean;
    };

    feedback?: string; // Immediate toast feedback
};

export type Question = {
    id: string;
    tier: QuestionTier;
    text: string;
    type: 'narrative' | 'boolean' | 'image-grid';
    options: QuestionOption[];
};

export const drinkDatabase: Drink[] = [
    // --- TOP LEFT (Lush & Lively: Crisp + Sweet) ---
    { name: "Aperol Spritz", type: "Cocktail", x: -4, y: 8, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['visual', 'social', 'crushable'] },
    { name: "German Riesling (Kabinett)", type: "Wine", x: -7, y: 9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Mai Tai", type: "Cocktail", x: -6, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'social', 'bold', 'messy', 'spice'] },
    { name: "Hefeweizen", type: "Beer", x: -3, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'classic', 'crushable'] },
    { name: "French 75", type: "Cocktail", x: -2, y: 8, hasSmoke: false, hasAnise: true, isBitter: false, tags: ['classic', 'social', 'visual', 'prestige'] }, // Gin often has anise notes, but French 75 usually doesn't emphasize it. However, let's stick to obvious ones.
    { name: "Moscato d'Asti", type: "Wine", x: -9, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'comfort', 'sweet'] },
    { name: "Mojito", type: "Cocktail", x: -5, y: 9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'visual', 'messy'] },
    { name: "Piña Colada", type: "Cocktail", x: -8, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'visual', 'social', 'messy', 'sweet'] },
    { name: "Gewürztraminer", type: "Wine", x: -6, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'visual', 'spice'] },
    { name: "Belgian Witbier", type: "Beer", x: -4, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'spice'] },

    // --- TOP RIGHT (Crisp & Clean: Crisp + Savory/Dry) ---
    { name: "Gin & Tonic", type: "Cocktail", x: 7, y: 9, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'social', 'crushable'] },
    { name: "Sancerre (Sauvignon Blanc)", type: "Wine", x: 6, y: 9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Pilsner Urquell", type: "Beer", x: 5, y: 8, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'social', 'crushable'] },
    { name: "Classic Martini (Dry)", type: "Cocktail", x: 9, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold', 'prestige'] },
    { name: "Brut Champagne", type: "Wine", x: 5, y: 10, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'visual', 'prestige'] },
    { name: "Margarita (on the rocks, salt rim)", type: "Cocktail", x: 2, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'classic', 'messy', 'crushable'] },
    { name: "Albariño", type: "Wine", x: 4, y: 9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'visual', 'crushable'] },
    { name: "Gose", type: "Beer", x: 3, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'visual', 'polarizing'] },
    { name: "Vodka Soda with Lime", type: "Cocktail", x: 8, y: 10, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'crushable'] },
    { name: "Dry Vermouth (on the rocks)", type: "Wine", x: 9, y: 7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'complex', 'polarizing'] },

    // --- BOTTOM LEFT (Decadent & Deep: Rich + Sweet) ---
    { name: "Espresso Martini", type: "Cocktail", x: -3, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['visual', 'social', 'bold', 'messy'] },
    { name: "Milk Stout", type: "Beer", x: -4, y: -5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'bold', 'warm'] },
    { name: "Port (Tawny)", type: "Wine", x: -7, y: -7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'classic', 'warm', 'spice'] },
    { name: "White Russian", type: "Cocktail", x: -8, y: -8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'sweet', 'messy'] },
    { name: "Pedro Ximénez Sherry", type: "Wine", x: -10, y: -6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'comfort', 'sweet', 'warm'] },
    { name: "Rum & Coke", type: "Cocktail", x: -9, y: -2, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'social', 'crushable'] },
    { name: "Belgian Dubbel", type: "Beer", x: -5, y: -3, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'comfort', 'warm', 'spice'] },
    { name: "Amaretto Sour", type: "Cocktail", x: -6, y: -4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'social', 'sweet'] },
    { name: "Late-Harvest Riesling", type: "Wine", x: -8, y: -5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'complex', 'sweet'] },
    { name: "Doppelbock", type: "Beer", x: -6, y: -7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['bold', 'comfort', 'warm'] },

    // --- BOTTOM RIGHT (Bold & Complex: Rich + Savory/Bitter/Smoky) ---
    { name: "Negroni", type: "Cocktail", x: 8, y: -4, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'classic', 'complex', 'prestige', 'polarizing'] },
    { name: "Barolo (Nebbiolo)", type: "Wine", x: 8, y: -6, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['bold', 'complex', 'classic', 'prestige'] }, // Nebbiolo can have anise/tar notes
    { name: "Islay Scotch (Neat)", type: "Spirit", x: 9, y: -5, hasSmoke: true, hasAnise: false, isBitter: false, tags: ['bold', 'complex', 'polarizing', 'prestige', 'warm'] },
    { name: "Smoked Porter", type: "Beer", x: 5, y: -7, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['bold', 'complex', 'comfort', 'polarizing', 'warm'] },
    { name: "Manhattan", type: "Cocktail", x: 4, y: -5, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'bold', 'prestige', 'warm'] },
    { name: "Cabernet Sauvignon (Napa)", type: "Wine", x: 5, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'bold', 'prestige'] },
    { name: "Oaxacan Old Fashioned", type: "Cocktail", x: 6, y: -5, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['complex', 'bold', 'visual', 'polarizing', 'prestige'] },
    { name: "West Coast IPA", type: "Beer", x: 7, y: 2, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'classic', 'polarizing'] },
    { name: "Fernet-Branca", type: "Spirit", x: 10, y: -3, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['bold', 'complex', 'polarizing'] }, // Definitely Anise/Mint
    { name: "Syrah (Northern Rhône)", type: "Wine", x: 7, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'bold', 'warm', 'spice'] },

    // Added specific Anise drinks for completeness as implied by the task
    { name: "Sazerac", type: "Cocktail", x: 8, y: -3, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['classic', 'bold', 'complex'] },
    { name: "Absinthe Drip", type: "Spirit", x: 6, y: -2, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['polarizing', 'complex', 'visual'] },
    { name: "Sambuca (with coffee beans)", type: "Spirit", x: -2, y: -4, hasSmoke: false, hasAnise: true, isBitter: false, tags: ['sweet', 'classic', 'polarizing'] }
];

export const questions: Question[] = [
    // --- SET 1: CALIBRATION (Biological) ---
    {
        id: 'coffee',
        tier: 'calibration',
        type: 'narrative',
        text: "How do you take your coffee?",
        options: [
            { text: "Black or Espresso.", dx: 5, dy: 0, feedback: "Starting bold." },
            { text: "With milk and sugar.", dx: -5, dy: 0, feedback: "Comfort first." }
        ]
    },
    {
        id: 'dessert',
        tier: 'calibration',
        type: 'narrative',
        text: "Pick a finish.",
        options: [
            { text: "Lemon Tart (Zesty)", dx: 0, dy: 5, feedback: "Bright and acidic." },
            { text: "Dark Chocolate (Bitter)", dx: 4, dy: -3, feedback: "Rich and dry." },
            { text: "Crème Brûlée (Creamy)", dx: -4, dy: -4, feedback: "Lush and sweet." }
        ]
    },
    {
        id: 'bitter_tol',
        tier: 'calibration',
        type: 'boolean',
        text: "Tonic water?",
        options: [
            { text: "Love the bite.", dx: 2, dy: 0, filterFlag: { key: 'dislikesBitter', value: false } },
            { text: "Too bitter for me.", dx: 0, dy: 0, filterFlag: { key: 'dislikesBitter', value: true } }
        ]
    },

    // --- SET 2: ARCHITECTURE (Structural) ---
    {
        id: 'texture',
        tier: 'architecture',
        type: 'narrative',
        text: "Fizzy or Still?",
        options: [
            { text: "Fizzy & Refreshing", dx: 0, dy: 4, vibeTags: ['crushable'] },
            { text: "Still & Smooth", dx: 0, dy: -3, vibeTags: ['classic'] }
        ]
    },
    {
        id: 'weather',
        tier: 'architecture',
        type: 'narrative',
        text: "Current weather vibe?",
        options: [
            { text: "Heatwave (Need ice)", dx: 0, dy: 3, feedback: "Cooling down." },
            { text: "Blizzard (Need warmth)", dx: 0, dy: -4, feedback: "Warming up." }
        ]
    },
    {
        id: 'glassware',
        tier: 'architecture',
        type: 'narrative', // Using narrative for simplicity as images weren't provided for this specific one in the prompt, but user mentioned "Glassware preference" in Phase 1 list.
        text: "Pick a vessel.",
        options: [
            { text: "Stemmed & Elegant", dx: 1, dy: 0, vibeTags: ['visual', 'prestige'] },
            { text: "Heavy & Grounded", dx: -1, dy: -2, vibeTags: ['comfort', 'bold'] }
        ]
    },

    // --- SET 3: CONTEXT (Filters & Vibes) ---
    {
        id: 'smoke',
        tier: 'context',
        type: 'boolean',
        text: "Campfire smell?",
        options: [
            { text: "Love it.", dx: 2, dy: 0, filterFlag: { key: 'dislikesSmoke', value: false }, feedback: "Smoky notes unlocked." },
            { text: "No thanks.", dx: 0, dy: 0, filterFlag: { key: 'dislikesSmoke', value: true } }
        ]
    },
    {
        id: 'licorice',
        tier: 'context',
        type: 'boolean',
        text: "Black Jellybeans (Anise)?",
        options: [
            { text: "Delicious.", dx: 0, dy: 0, filterFlag: { key: 'dislikesAnise', value: false }, feedback: "Absinthe is on the table." },
            { text: "Get them away.", dx: 0, dy: 0, filterFlag: { key: 'dislikesAnise', value: true } }
        ]
    },
    {
        id: 'pacing',
        tier: 'context',
        type: 'narrative',
        text: "What's the pacing?",
        options: [
            { text: "Sipping slowly.", dx: 1, dy: -1, vibeTags: ['complex', 'bold'] },
            { text: "Crushable & fast.", dx: -1, dy: 2, vibeTags: ['crushable', 'social'] }
        ]
    }
];
