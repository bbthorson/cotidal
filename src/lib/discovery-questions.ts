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
    primaryAxis: 'x' | 'y';     // which axis this question most informs
    informationGain: number;     // max |delta| across options on primary axis
}

export const questions: Question[] = [
    // --- TIER 1: CALIBRATION (Biological - Broad Quadrant) ---
    // X: Rich (-10) to Crisp (10)
    // Y: Savory (-10) to Sweet (10)
    {
        id: 'coffee',
        tier: 'calibration',
        type: 'narrative',
        text: "How do you take your coffee?",
        primaryAxis: 'x',
        informationGain: 5,
        options: [
            { text: "Black or Espresso.", dx: -5, dy: -2, feedback: "A preference for the pure and bold." },
            { text: "With milk and sugar.", dx: -2, dy: 5, feedback: "Seeking comfort and sweetness." }
        ]
    },
    {
        id: 'dessert',
        tier: 'calibration',
        type: 'narrative',
        text: "Pick a finish to a perfect meal.",
        primaryAxis: 'y',
        informationGain: 8,
        options: [
            { text: "Lemon Tart (Zest)", dx: 5, dy: 5, feedback: "Bright, acidic, and sweet." },
            { text: "Dark Chocolate (Cacao)", dx: -3, dy: -3, feedback: "Rich and dry." },
            { text: "Crème Brûlée (Cream)", dx: -5, dy: 8, feedback: "Lush, rich, and sweet." }
        ]
    },
    {
        id: 'bitter_tol',
        tier: 'calibration',
        type: 'boolean',
        text: "Do you enjoy the bite of Tonic water?",
        primaryAxis: 'y',
        informationGain: 3,
        options: [
            { text: "Love the bite.", dx: 2, dy: -3, filterFlag: { key: 'dislikesBitter', value: false }, feedback: "The bitterness is welcomed." },
            { text: "Too bitter for me.", dx: 0, dy: 0, filterFlag: { key: 'dislikesBitter', value: true }, feedback: "Softening the edges." }
        ]
    },

    // --- TIER 2: ARCHITECTURE (Structural - Refinement) ---
    {
        id: 'texture',
        tier: 'architecture',
        type: 'narrative',
        text: "Fizzy or Still?",
        primaryAxis: 'x',
        informationGain: 3,
        options: [
            { text: "Fizzy & Refreshing", dx: 3, dy: 1, vibeTags: ['crushable'], feedback: "Effervescence awaits." },
            { text: "Still & Smooth", dx: -2, dy: 0, vibeTags: ['classic'], feedback: "Grounded and elegant." }
        ]
    },
    {
        id: 'weather',
        tier: 'architecture',
        type: 'narrative',
        text: "What is your current climate vibe?",
        primaryAxis: 'x',
        informationGain: 2,
        options: [
            { text: "Heatwave (Need ice)", dx: 2, dy: 0, feedback: "Cooling the spirit." },
            { text: "Blizzard (Need warmth)", dx: -2, dy: -2, vibeTags: ['warm'], feedback: "Igniting the hearth." }
        ]
    },
    {
        id: 'glassware',
        tier: 'architecture',
        type: 'narrative',
        text: "Choose your vessel.",
        primaryAxis: 'x',
        informationGain: 1,
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
        primaryAxis: 'y',
        informationGain: 2,
        options: [
            { text: "Love it.", dx: -1, dy: -2, filterFlag: { key: 'dislikesSmoke', value: false }, vibeTags: ['complex', 'bold'], feedback: "Smoky notes revealed." },
            { text: "No thanks.", dx: 0, dy: 0, filterFlag: { key: 'dislikesSmoke', value: true }, feedback: "Keeping it clean." }
        ]
    },
    {
        id: 'flavor_revelation',
        tier: 'context',
        type: 'narrative',
        text: "Which flavor are you drawn to?",
        primaryAxis: 'y',
        informationGain: 2,
        options: [
            { text: "Black Licorice (Anise)", dx: -1, dy: -2, filterFlag: { key: 'dislikesAnise', value: false }, vibeTags: ['polarizing'], feedback: "Adventurous — I like it." },
            { text: "Spiced Orange (Citrus)", dx: 1, dy: 2, filterFlag: { key: 'dislikesAnise', value: true }, vibeTags: ['spice'], feedback: "Warmth and sunshine." }
        ]
    },
    {
        id: 'pacing',
        tier: 'context',
        type: 'narrative',
        text: "What is the pacing of your evening?",
        primaryAxis: 'x',
        informationGain: 1,
        options: [
            { text: "Sipping slowly.", dx: -1, dy: -1, vibeTags: ['complex', 'bold'], feedback: "Patience is a virtue." },
            { text: "Social & Spirited.", dx: 1, dy: 1, vibeTags: ['social', 'crushable'], feedback: "Energy and flow." }
        ]
    }
];