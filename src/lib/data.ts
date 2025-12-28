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

import { QuestionTier, QuestionOption, Question, thresholdQuestions } from './discovery-questions';
export type { QuestionTier, QuestionOption, Question };

export const questions: Question[] = [
    ...thresholdQuestions,
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
        type: 'narrative',
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
