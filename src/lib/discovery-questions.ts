import { VibeTag } from './data';

export type QuestionTier = 'calibration' | 'architecture' | 'context';

export interface QuestionOption {
    text: string;
    dx: number; // Sweet <-> Dry/Bitter
    dy: number; // Rich <-> Crisp/Sour

    // For Tier 3 & Filters
    vibeTags?: VibeTag[];
    imageSrc?: string;
    filterFlag?: {
        key: 'dislikesSmoke' | 'dislikesBitter' | 'dislikesAnise';
        value: boolean;
    };

    feedback?: string; // Immediate toast feedback
}

export interface Question {
    id: string;
    tier: QuestionTier;
    text: string;
    type: 'narrative' | 'boolean' | 'image-grid';
    options: QuestionOption[];
}

export const questions: Question[] = [
    // --- TIER 1: CALIBRATION (Biological - Broad Quadrant) ---
    {
        id: 'coffee',
        tier: 'calibration',
        type: 'narrative',
        text: "How do you take your coffee?",
        options: [
            { text: "Black or Espresso.", dx: 5, dy: 0, feedback: "A preference for the pure and bold." },
            { text: "With milk and sugar.", dx: -5, dy: 0, feedback: "Seeking comfort and sweetness." }
        ]
    },
    {
        id: 'dessert',
        tier: 'calibration',
        type: 'narrative',
        text: "Pick a finish to a perfect meal.",
        options: [
            { text: "Lemon Tart (Zest)", dx: 0, dy: 5, feedback: "Bright and acidic." },
            { text: "Dark Chocolate (Cacao)", dx: 4, dy: -3, feedback: "Rich and dry." },
            { text: "Crème Brûlée (Cream)", dx: -4, dy: -4, feedback: "Lush and sweet." }
        ]
    },
    {
        id: 'bitter_tol',
        tier: 'calibration',
        type: 'boolean',
        text: "Do you enjoy the bite of Tonic water?",
        options: [
            { text: "Love the bite.", dx: 2, dy: 0, filterFlag: { key: 'dislikesBitter', value: false }, feedback: "The bitterness is welcomed." },
            { text: "Too bitter for me.", dx: 0, dy: 0, filterFlag: { key: 'dislikesBitter', value: true }, feedback: "Softening the edges." }
        ]
    },

    // --- TIER 2: ARCHITECTURE (Structural - Refinement) ---
    {
        id: 'texture',
        tier: 'architecture',
        type: 'narrative',
        text: "Fizzy or Still?",
        options: [
            { text: "Fizzy & Refreshing", dx: 0, dy: 3, vibeTags: ['crushable'], feedback: "Effervescence awaits." },
            { text: "Still & Smooth", dx: 0, dy: -2, vibeTags: ['classic'], feedback: "Grounded and elegant." }
        ]
    },
    {
        id: 'weather',
        tier: 'architecture',
        type: 'narrative',
        text: "What is your current climate vibe?",
        options: [
            { text: "Heatwave (Need ice)", dx: 0, dy: 2, feedback: "Cooling the spirit." },
            { text: "Blizzard (Need warmth)", dx: 0, dy: -3, vibeTags: ['warm'], feedback: "Igniting the hearth." }
        ]
    },
    {
        id: 'glassware',
        tier: 'architecture',
        type: 'narrative',
        text: "Choose your vessel.",
        options: [
            { text: "Stemmed & Elegant", dx: 1, dy: 0, vibeTags: ['prestige', 'visual'], feedback: "A touch of ceremony." },
            { text: "Heavy & Grounded", dx: -1, dy: -1, vibeTags: ['comfort', 'bold'], feedback: "Substantial and real." }
        ]
    },

    // --- TIER 3: CONTEXT (Environmental & Specifics - The Revelation) ---
    {
        id: 'smoke',
        tier: 'context',
        type: 'boolean',
        text: "Does the smell of a campfire allure you?",
        options: [
            { text: "Love it.", dx: 1, dy: 0, filterFlag: { key: 'dislikesSmoke', value: false }, vibeTags: ['complex', 'bold'], feedback: "Smoky notes revealed." },
            { text: "No thanks.", dx: 0, dy: 0, filterFlag: { key: 'dislikesSmoke', value: true }, feedback: "Keeping it clean." }
        ]
    },
    {
        id: 'flavor_revelation',
        tier: 'context',
        type: 'narrative',
        text: "Which essence calls to you more?",
        options: [
            { text: "Black Licorice (Anise)", dx: 1, dy: -1, filterFlag: { key: 'dislikesAnise', value: false }, vibeTags: ['polarizing'], feedback: "The Oracle sees adventure." },
            { text: "Spiced Orange (Citrus)", dx: -1, dy: 1, filterFlag: { key: 'dislikesAnise', value: true }, vibeTags: ['spice'], feedback: "Warmth and sunshine." }
        ]
    },
    {
        id: 'pacing',
        tier: 'context',
        type: 'narrative',
        text: "What is the pacing of your evening?",
        options: [
            { text: "Sipping slowly.", dx: 1, dy: -1, vibeTags: ['complex', 'bold'], feedback: "Patience is a virtue." },
            { text: "Social & Spirited.", dx: -1, dy: 1, vibeTags: ['social', 'crushable'], feedback: "Energy and flow." }
        ]
    }
];
