export type Drink = {
    name: string;
    type: "Cocktail" | "Wine" | "Beer" | "Spirit";
    x: number;
    y: number;
    smoke: boolean;
    bitter: boolean;
};

export type QuestionOption = {
    text: string;
    dx: number;
    dy: number;
    tags: string[];
}

export type Question = {
    text: string;
    insight?: string;
    options: QuestionOption[];
};

export const drinkDatabase: Drink[] = [
    // --- TOP LEFT (Lush & Lively: Crisp + Sweet) ---
    { name: "Aperol Spritz", type: "Cocktail", x: -4, y: 8, smoke: false, bitter: true },
    { name: "German Riesling (Kabinett)", type: "Wine", x: -7, y: 9, smoke: false, bitter: false },
    { name: "Mai Tai", type: "Cocktail", x: -6, y: 4, smoke: false, bitter: false },
    { name: "Hefeweizen", type: "Beer", x: -3, y: 6, smoke: false, bitter: false },
    { name: "French 75", type: "Cocktail", x: -2, y: 8, smoke: false, bitter: false },
    { name: "Moscato d'Asti", type: "Wine", x: -9, y: 7, smoke: false, bitter: false },
    { name: "Mojito", type: "Cocktail", x: -5, y: 9, smoke: false, bitter: false },
    { name: "Piña Colada", type: "Cocktail", x: -8, y: 5, smoke: false, bitter: false },
    { name: "Gewürztraminer", type: "Wine", x: -6, y: 6, smoke: false, bitter: false },
    { name: "Belgian Witbier", type: "Beer", x: -4, y: 7, smoke: false, bitter: false },

    // --- TOP RIGHT (Crisp & Clean: Crisp + Savory/Dry) ---
    { name: "Gin & Tonic", type: "Cocktail", x: 7, y: 9, smoke: false, bitter: true },
    { name: "Sancerre (Sauvignon Blanc)", type: "Wine", x: 6, y: 9, smoke: false, bitter: false },
    { name: "Pilsner Urquell", type: "Beer", x: 5, y: 8, smoke: false, bitter: true },
    { name: "Classic Martini (Dry)", type: "Cocktail", x: 9, y: 6, smoke: false, bitter: false },
    { name: "Brut Champagne", type: "Wine", x: 5, y: 10, smoke: false, bitter: false },
    { name: "Margarita (on the rocks, salt rim)", type: "Cocktail", x: 2, y: 7, smoke: false, bitter: false },
    { name: "Albariño", type: "Wine", x: 4, y: 9, smoke: false, bitter: false },
    { name: "Gose", type: "Beer", x: 3, y: 8, smoke: false, bitter: false },
    { name: "Vodka Soda with Lime", type: "Cocktail", x: 8, y: 10, smoke: false, bitter: false },
    { name: "Dry Vermouth (on the rocks)", type: "Wine", x: 9, y: 7, smoke: false, bitter: true },

    // --- BOTTOM LEFT (Decadent & Deep: Rich + Sweet) ---
    { name: "Espresso Martini", type: "Cocktail", x: -3, y: -6, smoke: false, bitter: true },
    { name: "Milk Stout", type: "Beer", x: -4, y: -5, smoke: false, bitter: false },
    { name: "Port (Tawny)", type: "Wine", x: -7, y: -7, smoke: false, bitter: false },
    { name: "White Russian", type: "Cocktail", x: -8, y: -8, smoke: false, bitter: false },
    { name: "Pedro Ximénez Sherry", type: "Wine", x: -10, y: -6, smoke: false, bitter: false },
    { name: "Rum & Coke", type: "Cocktail", x: -9, y: -2, smoke: false, bitter: false },
    { name: "Belgian Dubbel", type: "Beer", x: -5, y: -3, smoke: false, bitter: false },
    { name: "Amaretto Sour", type: "Cocktail", x: -6, y: -4, smoke: false, bitter: false },
    { name: "Late-Harvest Riesling", type: "Wine", x: -8, y: -5, smoke: false, bitter: false },
    { name: "Doppelbock", type: "Beer", x: -6, y: -7, smoke: false, bitter: false },

    // --- BOTTOM RIGHT (Bold & Complex: Rich + Savory/Bitter/Smoky) ---
    { name: "Negroni", type: "Cocktail", x: 8, y: -4, smoke: false, bitter: true },
    { name: "Barolo (Nebbiolo)", type: "Wine", x: 8, y: -6, smoke: false, bitter: true },
    { name: "Islay Scotch (Neat)", type: "Spirit", x: 9, y: -5, smoke: true, bitter: false },
    { name: "Smoked Porter", type: "Beer", x: 5, y: -7, smoke: true, bitter: true },
    { name: "Manhattan", type: "Cocktail", x: 4, y: -5, smoke: false, bitter: true },
    { name: "Cabernet Sauvignon (Napa)", type: "Wine", x: 5, y: -6, smoke: false, bitter: true },
    { name: "Oaxacan Old Fashioned", type: "Cocktail", x: 6, y: -5, smoke: true, bitter: true },
    { name: "West Coast IPA", type: "Beer", x: 7, y: 2, smoke: false, bitter: true },
    { name: "Fernet-Branca", type: "Spirit", x: 10, y: -3, smoke: false, bitter: true },
    { name: "Syrah (Northern Rhône)", type: "Wine", x: 7, y: -7, smoke: false, bitter: true }
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
            { text: "Love it! Give me all the lemons and limes.", dx: 0, dy: 5, tags: [] },
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
            { text: "Ice cold and crisp.", dx: 0, dy: 3, tags: [] }
        ]
    },
    {
        text: "Let's talk bitterness (IPA, Radicchio, Tonic Water).",
        insight: "Bitterness adds complexity and depth.",
        options: [
            { text: "Love the bite.", dx: 5, dy: 0, tags: ['likesBitter'] },
            { text: "I can handle a little.", dx: 1, dy: 0, tags: [] },
            { text: "Absolutely not.", dx: -4, dy: 0, tags: ['noBitter'] }
        ]
    },
    {
        text: "Campfire vibes?",
        insight: "Smoky flavors can be polarizing.",
        options: [
            { text: "Love the smell of a campfire.", dx: 2, dy: -2, tags: ['likesSmoke'] },
            { text: "Keep it clean and fresh.", dx: 0, dy: 2, tags: ['noSmoke'] }
        ]
    },
    {
        text: "What's the vibe for tonight?",
        insight: "Setting the mood is half the battle.",
        options: [
            { text: "Party time! Something fun and fruity.", dx: -3, dy: 2, tags: [] },
            { text: "Sophisticated and sipping slowly.", dx: 3, dy: -3, tags: [] },
            { text: "Relaxing on the patio.", dx: 1, dy: 3, tags: [] },
            { text: "Cozy by the fire.", dx: 1, dy: -4, tags: [] }
        ]
    }
];
