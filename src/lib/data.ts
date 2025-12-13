export type VibeTag = 'bold' | 'classic' | 'visual' | 'social' | 'comfort' | 'complex' | 'sweet' | 'messy' | 'polarizing' | 'prestige' | 'warm' | 'spice' | 'crushable';

export type User = {
  x: number;
  y: number;
  filters: string[];
};

export type ContextType = "usual" | "business" | "party" | "holiday";

export type Drink = {
    name: string;
    type: "Cocktail" | "Wine" | "Beer" | "Spirit";
    x: number;
    y: number;
    hasSmoke: boolean;
    isBitter: boolean;
    tags: VibeTag[];
};

// --- NEW QUESTION TYPES ---

export type QuestionTier = 'palate_x' | 'palate_y' | 'vibe';

export type QuestionOption = {
    text: string;
    dx: number; // Sweet <-> Dry/Bitter (Tier 1)
    dy: number; // Rich <-> Crisp/Sour (Tier 2)

    // For Tier 3 & Filters
    vibeTags?: VibeTag[];
    imageSrc?: string;
    filterFlag?: {
        key: 'dislikesSmoke' | 'dislikesBitter';
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
    { name: "Aperol Spritz", type: "Cocktail", x: -4, y: 8, hasSmoke: false, isBitter: true, tags: ['visual', 'social', 'crushable'] },
    { name: "German Riesling (Kabinett)", type: "Wine", x: -7, y: 9, hasSmoke: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Mai Tai", type: "Cocktail", x: -6, y: 4, hasSmoke: false, isBitter: false, tags: ['visual', 'social', 'bold', 'messy', 'spice'] },
    { name: "Hefeweizen", type: "Beer", x: -3, y: 6, hasSmoke: false, isBitter: false, tags: ['social', 'classic', 'crushable'] },
    { name: "French 75", type: "Cocktail", x: -2, y: 8, hasSmoke: false, isBitter: false, tags: ['classic', 'social', 'visual', 'prestige'] },
    { name: "Moscato d'Asti", type: "Wine", x: -9, y: 7, hasSmoke: false, isBitter: false, tags: ['social', 'comfort', 'sweet'] },
    { name: "Mojito", type: "Cocktail", x: -5, y: 9, hasSmoke: false, isBitter: false, tags: ['social', 'visual', 'messy'] },
    { name: "Piña Colada", type: "Cocktail", x: -8, y: 5, hasSmoke: false, isBitter: false, tags: ['comfort', 'visual', 'social', 'messy', 'sweet'] },
    { name: "Gewürztraminer", type: "Wine", x: -6, y: 6, hasSmoke: false, isBitter: false, tags: ['complex', 'visual', 'spice'] },
    { name: "Belgian Witbier", type: "Beer", x: -4, y: 7, hasSmoke: false, isBitter: false, tags: ['classic', 'social', 'spice'] },

    // --- TOP RIGHT (Crisp & Clean: Crisp + Savory/Dry) ---
    { name: "Gin & Tonic", type: "Cocktail", x: 7, y: 9, hasSmoke: false, isBitter: true, tags: ['classic', 'social', 'crushable'] },
    { name: "Sancerre (Sauvignon Blanc)", type: "Wine", x: 6, y: 9, hasSmoke: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Pilsner Urquell", type: "Beer", x: 5, y: 8, hasSmoke: false, isBitter: true, tags: ['classic', 'social', 'crushable'] },
    { name: "Classic Martini (Dry)", type: "Cocktail", x: 9, y: 6, hasSmoke: false, isBitter: false, tags: ['classic', 'bold', 'prestige'] },
    { name: "Brut Champagne", type: "Wine", x: 5, y: 10, hasSmoke: false, isBitter: false, tags: ['classic', 'social', 'visual', 'prestige'] },
    { name: "Margarita (on the rocks, salt rim)", type: "Cocktail", x: 2, y: 7, hasSmoke: false, isBitter: false, tags: ['social', 'classic', 'messy', 'crushable'] },
    { name: "Albariño", type: "Wine", x: 4, y: 9, hasSmoke: false, isBitter: false, tags: ['social', 'visual', 'crushable'] },
    { name: "Gose", type: "Beer", x: 3, y: 8, hasSmoke: false, isBitter: false, tags: ['complex', 'visual', 'polarizing'] },
    { name: "Vodka Soda with Lime", type: "Cocktail", x: 8, y: 10, hasSmoke: false, isBitter: false, tags: ['social', 'crushable'] },
    { name: "Dry Vermouth (on the rocks)", type: "Wine", x: 9, y: 7, hasSmoke: false, isBitter: true, tags: ['classic', 'complex', 'polarizing'] },

    // --- BOTTOM LEFT (Decadent & Deep: Rich + Sweet) ---
    { name: "Espresso Martini", type: "Cocktail", x: -3, y: -6, hasSmoke: false, isBitter: true, tags: ['visual', 'social', 'bold', 'messy'] },
    { name: "Milk Stout", type: "Beer", x: -4, y: -5, hasSmoke: false, isBitter: false, tags: ['comfort', 'bold', 'warm'] },
    { name: "Port (Tawny)", type: "Wine", x: -7, y: -7, hasSmoke: false, isBitter: false, tags: ['comfort', 'classic', 'warm', 'spice'] },
    { name: "White Russian", type: "Cocktail", x: -8, y: -8, hasSmoke: false, isBitter: false, tags: ['comfort', 'sweet', 'messy'] },
    { name: "Pedro Ximénez Sherry", type: "Wine", x: -10, y: -6, hasSmoke: false, isBitter: false, tags: ['complex', 'comfort', 'sweet', 'warm'] },
    { name: "Rum & Coke", type: "Cocktail", x: -9, y: -2, hasSmoke: false, isBitter: false, tags: ['comfort', 'social', 'crushable'] },
    { name: "Belgian Dubbel", type: "Beer", x: -5, y: -3, hasSmoke: false, isBitter: false, tags: ['complex', 'comfort', 'warm', 'spice'] },
    { name: "Amaretto Sour", type: "Cocktail", x: -6, y: -4, hasSmoke: false, isBitter: false, tags: ['visual', 'social', 'sweet'] },
    { name: "Late-Harvest Riesling", type: "Wine", x: -8, y: -5, hasSmoke: false, isBitter: false, tags: ['comfort', 'complex', 'sweet'] },
    { name: "Doppelbock", type: "Beer", x: -6, y: -7, hasSmoke: false, isBitter: false, tags: ['bold', 'comfort', 'warm'] },

    // --- BOTTOM RIGHT (Bold & Complex: Rich + Savory/Bitter/Smoky) ---
    { name: "Negroni", type: "Cocktail", x: 8, y: -4, hasSmoke: false, isBitter: true, tags: ['bold', 'classic', 'complex', 'prestige', 'polarizing'] },
    { name: "Barolo (Nebbiolo)", type: "Wine", x: 8, y: -6, hasSmoke: false, isBitter: true, tags: ['bold', 'complex', 'classic', 'prestige'] },
    { name: "Islay Scotch (Neat)", type: "Spirit", x: 9, y: -5, hasSmoke: true, isBitter: false, tags: ['bold', 'complex', 'polarizing', 'prestige', 'warm'] },
    { name: "Smoked Porter", type: "Beer", x: 5, y: -7, hasSmoke: true, isBitter: true, tags: ['bold', 'complex', 'comfort', 'polarizing', 'warm'] },
    { name: "Manhattan", type: "Cocktail", x: 4, y: -5, hasSmoke: false, isBitter: true, tags: ['classic', 'bold', 'prestige', 'warm'] },
    { name: "Cabernet Sauvignon (Napa)", type: "Wine", x: 5, y: -6, hasSmoke: false, isBitter: true, tags: ['classic', 'bold', 'prestige'] },
    { name: "Oaxacan Old Fashioned", type: "Cocktail", x: 6, y: -5, hasSmoke: true, isBitter: true, tags: ['complex', 'bold', 'visual', 'polarizing', 'prestige'] },
    { name: "West Coast IPA", type: "Beer", x: 7, y: 2, hasSmoke: false, isBitter: true, tags: ['bold', 'classic', 'polarizing'] },
    { name: "Fernet-Branca", type: "Spirit", x: 10, y: -3, hasSmoke: false, isBitter: true, tags: ['bold', 'complex', 'polarizing'] },
    { name: "Syrah (Northern Rhône)", type: "Wine", x: 7, y: -7, hasSmoke: false, isBitter: true, tags: ['complex', 'bold', 'warm', 'spice'] }
];

export const questions: Question[] = [
    // --- TIER 1: The Sugar Axis (Determine X) ---
    {
        id: 'coffee',
        tier: 'palate_x',
        type: 'narrative',
        text: "How sweet is your morning cup?",
        options: [
            { text: "Black. Bitter. Strong.", dx: 5, dy: 0, feedback: "Starting bold." },
            { text: "Just a splash of milk.", dx: 2, dy: 0 },
            { text: "I need at least two sugars.", dx: -5, dy: 0, feedback: "We'll keep it approachable." }
        ]
    },
    {
        id: 'chocolate',
        tier: 'palate_x',
        type: 'narrative',
        text: "Pick a chocolate bar.",
        options: [
            { text: "Milk Chocolate (Creamy & Sweet)", dx: -3, dy: 0 },
            { text: "Sea Salt & Caramel (Salty & Sweet)", dx: 0, dy: 0 },
            { text: "85% Dark Cacao (Bitter & Dry)", dx: 4, dy: 0 }
        ]
    },

    // --- TIER 2: The Texture/Acid Axis (Determine Y) ---
    {
        id: 'weather',
        tier: 'palate_y',
        type: 'narrative',
        text: "It's the perfect weather outside. What are you feeling?",
        options: [
            { text: "A heatwave. I need ice.", dx: 0, dy: 5, feedback: "Let's cool you down." },
            { text: "A blizzard. I need a blanket.", dx: 0, dy: -5, feedback: "Warming you up." },
            { text: "A mild spring evening.", dx: 0, dy: 0 }
        ]
    },
    {
        id: 'texture',
        tier: 'palate_y',
        type: 'narrative',
        text: "Choose a mouthfeel.",
        options: [
            { text: "Sharp bubbles (Champagne/Soda)", dx: 0, dy: 4 },
            { text: "Heavy and velvet (Cream/Syrup)", dx: 0, dy: -4 },
            { text: "Silky and smooth (Stirred)", dx: 0, dy: -1 }
        ]
    },

    // --- TIER 3: The Filters & Vibes (Nuance) ---
    {
        id: 'smoke',
        tier: 'vibe',
        type: 'boolean',
        text: "Campfire smoke?",
        options: [
            { text: "Love it.", dx: 2, dy: 0, filterFlag: { key: 'dislikesSmoke', value: false }, feedback: "Unlocking the Mezcal cabinet." },
            { text: "No thanks.", dx: 0, dy: 0, filterFlag: { key: 'dislikesSmoke', value: true } }
        ]
    },
    {
        id: 'bitter',
        tier: 'vibe',
        type: 'boolean',
        text: "Bitterness (IPA, Tonic, Radicchio)?",
        options: [
            { text: "I love the bite.", dx: 2, dy: 0, filterFlag: { key: 'dislikesBitter', value: false } },
            { text: "Absolutely not.", dx: 0, dy: 0, filterFlag: { key: 'dislikesBitter', value: true } }
        ]
    },
    {
        id: 'vibe_visual',
        tier: 'vibe',
        type: 'image-grid',
        text: "If your soul had a texture, what would it be?",
        options: [
           { text: 'Polished Marble & Steel', dx: 0, dy: 0, vibeTags: ['classic', 'bold'], imageSrc: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=400' },
           { text: 'Worn Leather & Old Books', dx: 0, dy: 0, vibeTags: ['complex', 'comfort'], imageSrc: 'https://images.unsplash.com/photo-1544216717-3f1132231a96?auto=format&fit=crop&q=80&w=400' },
           { text: 'Crushed Velvet & Silk', dx: 0, dy: 0, vibeTags: ['comfort', 'sweet'], imageSrc: 'https://images.unsplash.com/photo-1571596489392-12f5a6dc6d3c?auto=format&fit=crop&q=80&w=400' },
           { text: 'Neon Light & Glitter', dx: 0, dy: 0, vibeTags: ['visual', 'social'], imageSrc: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=400' },
        ]
    }
];
