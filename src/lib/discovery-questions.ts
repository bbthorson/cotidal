import { VibeTag } from './data';

export type QuestionTier = 'calibration' | 'architecture' | 'context';

export interface QuestionOption {
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
}

export interface Question {
    id: string;
    tier: QuestionTier;
    text: string;
    type: 'narrative' | 'boolean' | 'image-grid';
    options: QuestionOption[];
}

export const thresholdQuestions: Question[] = [
    // --- SET 1: THE THRESHOLD (Calibration - Biological) ---
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
            { text: "Lemon Tart (Zest)", dx: 0, dy: 5, feedback: "Bright and acidic." },
            { text: "Dark Chocolate (Cacao)", dx: 4, dy: -3, feedback: "Rich and dry." },
            { text: "Crème Brûlée (Cream)", dx: -4, dy: -4, feedback: "Lush and sweet." }
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
    {
        id: 'licorice',
        tier: 'calibration', // Moved to calibration as it's a binary "filter" threshold
        type: 'boolean',
        text: "Black Jellybeans (Anise)?",
        options: [
            { text: "Delicious.", dx: 0, dy: 0, filterFlag: { key: 'dislikesAnise', value: false }, feedback: "The Oracle sees adventure." },
            { text: "Get them away.", dx: 0, dy: 0, filterFlag: { key: 'dislikesAnise', value: true } }
        ]
    }
];