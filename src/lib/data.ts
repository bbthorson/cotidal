export type VibeTag = 'bold' | 'classic' | 'visual' | 'social' | 'comfort' | 'complex' | 'sweet';

export type Drink = {
    name: string;
    type: "Cocktail" | "Wine" | "Beer" | "Spirit";
    x: number;
    y: number;
    hasSmoke: boolean;
    isBitter: boolean;
    tags: VibeTag[];
};

export type QuestionOption = {
    text: string;
    dx: number;
    dy: number;
    tags: string[];
    feedback?: string;
    flags?: {
        dislikesSmoke?: boolean;
        dislikesBitter?: boolean;
    };
}

export type Question = {
    text: string;
    insight?: string;
    options: QuestionOption[];
};

export const drinkDatabase: Drink[] = [
    // --- TOP LEFT (Lush & Lively: Crisp + Sweet) ---
    { name: "Aperol Spritz", type: "Cocktail", x: -4, y: 8, hasSmoke: false, isBitter: true, tags: ['visual', 'social'] },
    { name: "German Riesling (Kabinett)", type: "Wine", x: -7, y: 9, hasSmoke: false, isBitter: false, tags: ['classic', 'social'] },
    { name: "Mai Tai", type: "Cocktail", x: -6, y: 4, hasSmoke: false, isBitter: false, tags: ['visual', 'social', 'bold'] },
    { name: "Hefeweizen", type: "Beer", x: -3, y: 6, hasSmoke: false, isBitter: false, tags: ['social', 'classic'] },
    { name: "French 75", type: "Cocktail", x: -2, y: 8, hasSmoke: false, isBitter: false, tags: ['classic', 'social', 'visual'] },
    { name: "Moscato d'Asti", type: "Wine", x: -9, y: 7, hasSmoke: false, isBitter: false, tags: ['social', 'comfort'] },
    { name: "Mojito", type: "Cocktail", x: -5, y: 9, hasSmoke: false, isBitter: false, tags: ['social', 'visual'] },
    { name: "Piña Colada", type: "Cocktail", x: -8, y: 5, hasSmoke: false, isBitter: false, tags: ['comfort', 'visual', 'social'] },
    { name: "Gewürztraminer", type: "Wine", x: -6, y: 6, hasSmoke: false, isBitter: false, tags: ['complex', 'visual'] },
    { name: "Belgian Witbier", type: "Beer", x: -4, y: 7, hasSmoke: false, isBitter: false, tags: ['classic', 'social'] },

    // --- TOP RIGHT (Crisp & Clean: Crisp + Savory/Dry) ---
    { name: "Gin & Tonic", type: "Cocktail", x: 7, y: 9, hasSmoke: false, isBitter: true, tags: ['classic', 'social'] },
    { name: "Sancerre (Sauvignon Blanc)", type: "Wine", x: 6, y: 9, hasSmoke: false, isBitter: false, tags: ['classic', 'social'] },
    { name: "Pilsner Urquell", type: "Beer", x: 5, y: 8, hasSmoke: false, isBitter: true, tags: ['classic', 'social'] },
    { name: "Classic Martini (Dry)", type: "Cocktail", x: 9, y: 6, hasSmoke: false, isBitter: false, tags: ['classic', 'bold'] },
    { name: "Brut Champagne", type: "Wine", x: 5, y: 10, hasSmoke: false, isBitter: false, tags: ['classic', 'social', 'visual'] },
    { name: "Margarita (on the rocks, salt rim)", type: "Cocktail", x: 2, y: 7, hasSmoke: false, isBitter: false, tags: ['social', 'classic'] },
    { name: "Albariño", type: "Wine", x: 4, y: 9, hasSmoke: false, isBitter: false, tags: ['social', 'visual'] },
    { name: "Gose", type: "Beer", x: 3, y: 8, hasSmoke: false, isBitter: false, tags: ['complex', 'visual'] },
    { name: "Vodka Soda with Lime", type: "Cocktail", x: 8, y: 10, hasSmoke: false, isBitter: false, tags: ['social'] },
    { name: "Dry Vermouth (on the rocks)", type: "Wine", x: 9, y: 7, hasSmoke: false, isBitter: true, tags: ['classic', 'complex'] },

    // --- BOTTOM LEFT (Decadent & Deep: Rich + Sweet) ---
    { name: "Espresso Martini", type: "Cocktail", x: -3, y: -6, hasSmoke: false, isBitter: true, tags: ['visual', 'social', 'bold'] },
    { name: "Milk Stout", type: "Beer", x: -4, y: -5, hasSmoke: false, isBitter: false, tags: ['comfort', 'bold'] },
    { name: "Port (Tawny)", type: "Wine", x: -7, y: -7, hasSmoke: false, isBitter: false, tags: ['comfort', 'classic'] },
    { name: "White Russian", type: "Cocktail", x: -8, y: -8, hasSmoke: false, isBitter: false, tags: ['comfort', 'sweet'] },
    { name: "Pedro Ximénez Sherry", type: "Wine", x: -10, y: -6, hasSmoke: false, isBitter: false, tags: ['complex', 'comfort'] },
    { name: "Rum & Coke", type: "Cocktail", x: -9, y: -2, hasSmoke: false, isBitter: false, tags: ['comfort', 'social'] },
    { name: "Belgian Dubbel", type: "Beer", x: -5, y: -3, hasSmoke: false, isBitter: false, tags: ['complex', 'comfort'] },
    { name: "Amaretto Sour", type: "Cocktail", x: -6, y: -4, hasSmoke: false, isBitter: false, tags: ['visual', 'social'] },
    { name: "Late-Harvest Riesling", type: "Wine", x: -8, y: -5, hasSmoke: false, isBitter: false, tags: ['comfort', 'complex'] },
    { name: "Doppelbock", type: "Beer", x: -6, y: -7, hasSmoke: false, isBitter: false, tags: ['bold', 'comfort'] },

    // --- BOTTOM RIGHT (Bold & Complex: Rich + Savory/Bitter/Smoky) ---
    { name: "Negroni", type: "Cocktail", x: 8, y: -4, hasSmoke: false, isBitter: true, tags: ['bold', 'classic', 'complex'] },
    { name: "Barolo (Nebbiolo)", type: "Wine", x: 8, y: -6, hasSmoke: false, isBitter: true, tags: ['bold', 'complex', 'classic'] },
    { name: "Islay Scotch (Neat)", type: "Spirit", x: 9, y: -5, hasSmoke: true, isBitter: false, tags: ['bold', 'complex'] },
    { name: "Smoked Porter", type: "Beer", x: 5, y: -7, hasSmoke: true, isBitter: true, tags: ['bold', 'complex', 'comfort'] },
    { name: "Manhattan", type: "Cocktail", x: 4, y: -5, hasSmoke: false, isBitter: true, tags: ['classic', 'bold'] },
    { name: "Cabernet Sauvignon (Napa)", type: "Wine", x: 5, y: -6, hasSmoke: false, isBitter: true, tags: ['classic', 'bold'] },
    { name: "Oaxacan Old Fashioned", type: "Cocktail", x: 6, y: -5, hasSmoke: true, isBitter: true, tags: ['complex', 'bold', 'visual'] },
    { name: "West Coast IPA", type: "Beer", x: 7, y: 2, hasSmoke: false, isBitter: true, tags: ['bold', 'classic'] },
    { name: "Fernet-Branca", type: "Spirit", x: 10, y: -3, hasSmoke: false, isBitter: true, tags: ['bold', 'complex'] },
    { name: "Syrah (Northern Rhône)", type: "Wine", x: 7, y: -7, hasSmoke: false, isBitter: true, tags: ['complex', 'bold'] }
];

export const questions: Question[] = [
    {
        text: "How do you take your morning coffee (or tea)?",
        insight: "This helps us gauge your tolerance for bitterness and preference for richness.",
        options: [
            { text: "Black. Like my soul.", dx: 3, dy: 0, tags: [] },
            { text: "Lots of cream and sugar.", dx: -3, dy: -2, tags: [] },
            { text: "Oat milk latte.", dx: -1, dy: -2, tags: [] },
            { text: "Green tea or lemon water.", dx: 1, dy: 3, tags: [] }
        ]
    },
    {
        text: "It's dessert time. What are you grabbing?",
        insight: "Testing your sweet tooth vs. savory cravings.",
        options: [
            { text: "Lemon Sorbet.", dx: -1, dy: 4, tags: [] },
            { text: "Dark Chocolate Mousse.", dx: 2, dy: -4, tags: [] },
            { text: "Cheesecake.", dx: -2, dy: -3, tags: [] },
            { text: "Cheese board.", dx: 4, dy: -1, tags: [] }
        ]
    },
    {
        text: "How do you feel about sour/tart flavors?",
        insight: "Acidity is a key component in cocktails, brightening up the drink.",
        options: [
            { text: "Love it! Give me all the lemons and limes.", dx: 0, dy: 5, tags: [], feedback: "Puckering up!" },
            { text: "It's okay in moderation.", dx: 0, dy: 1, tags: [] },
            { text: "No thanks, gives me heartburn.", dx: 0, dy: -3, tags: [] }
        ]
    },
    {
        text: "What texture do you prefer in a drink?",
        insight: "Mouthfeel changes the perception of flavor.",
        options: [
            { text: "Bubbly and effervescent.", dx: 0, dy: 4, tags: [] },
            { text: "Silky and smooth.", dx: 0, dy: -2, tags: [] },
            { text: "Thick and creamy.", dx: 0, dy: -4, tags: [] },
            { text: "Ice cold and crisp.", dx: 0, dy: 3, tags: [], feedback: "Refreshing choice." }
        ]
    },
    {
        text: "Let's talk bitterness (IPA, Radicchio, Tonic Water).",
        insight: "Bitterness adds complexity and depth.",
        options: [
            { text: "Love the bite.", dx: 5, dy: 0, tags: [], flags: { dislikesBitter: false } },
            { text: "I can handle a little.", dx: 1, dy: 0, tags: [], flags: { dislikesBitter: false } },
            { text: "Absolutely not.", dx: -4, dy: 0, tags: [], flags: { dislikesBitter: true } }
        ]
    },
    {
        text: "Campfire vibes?",
        insight: "Smoky flavors can be polarizing.",
        options: [
            { text: "Love the smell of a campfire.", dx: 2, dy: -2, tags: [], flags: { dislikesSmoke: false }, feedback: "Noted. Unlocking the Mezcal cabinet." },
            { text: "Keep it clean and fresh.", dx: 0, dy: 2, tags: [], flags: { dislikesSmoke: true } }
        ]
    }
];
