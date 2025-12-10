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
    options: QuestionOption[];
};

export const drinkDatabase: Drink[] = [
    // --- TOP LEFT (Crisp + Sweet) ---
    { name: "Aperol Spritz", type: "Cocktail", x: -4, y: 8, smoke: false, bitter: true },
    { name: "German Riesling (Kabinett)", type: "Wine", x: -7, y: 9, smoke: false, bitter: false },
    { name: "Mai Tai", type: "Cocktail", x: -6, y: 4, smoke: false, bitter: false },
    { name: "Hefeweizen", type: "Beer", x: -3, y: 6, smoke: false, bitter: false },
    { name: "French 75", type: "Cocktail", x: -2, y: 8, smoke: false, bitter: false },
    { name: "Moscato d'Asti", type: "Wine", x: -9, y: 7, smoke: false, bitter: false },
    { name: "Mojito", type: "Cocktail", x: -5, y: 9, smoke: false, bitter: false },

    // --- TOP RIGHT (Crisp + Savory/Dry) ---
    { name: "Gin & Tonic", type: "Cocktail", x: 7, y: 9, smoke: false, bitter: true },
    { name: "Sancerre (Sauvignon Blanc)", type: "Wine", x: 6, y: 9, smoke: false, bitter: false },
    { name: "Pilsner Urquell", type: "Beer", x: 5, y: 8, smoke: false, bitter: true },
    { name: "Classic Martini (Dry)", type: "Cocktail", x: 9, y: 6, smoke: false, bitter: false },
    { name: "Brut Champagne", type: "Wine", x: 5, y: 10, smoke: false, bitter: false },
    { name: "Margarita (No Salt)", type: "Cocktail", x: 2, y: 7, smoke: false, bitter: false },
    { name: "Albariño", type: "Wine", x: 4, y: 9, smoke: false, bitter: false },

    // --- BOTTOM LEFT (Rich + Sweet) ---
    { name: "Espresso Martini", type: "Cocktail", x: -3, y: -6, smoke: false, bitter: true },
    { name: "Milk Stout", type: "Beer", x: -4, y: -5, smoke: false, bitter: false },
    { name: "Port (Tawny)", type: "Wine", x: -7, y: -7, smoke: false, bitter: false },
    { name: "White Russian", type: "Cocktail", x: -8, y: -8, smoke: false, bitter: false },
    { name: "Pedro Ximénez Sherry", type: "Wine", x: -10, y: -6, smoke: false, bitter: false },
    { name: "Rum & Coke", type: "Cocktail", x: -9, y: -2, smoke: false, bitter: false },
    { name: "Belgian Dubbel", type: "Beer", x: -5, y: -3, smoke: false, bitter: false },

    // --- BOTTOM RIGHT (Rich + Savory/Bitter/Smoky) ---
    { name: "Negroni", type: "Cocktail", x: 8, y: -4, smoke: false, bitter: true },
    { name: "Barolo (Nebbiolo)", type: "Wine", x: 8, y: -6, smoke: false, bitter: true },
    { name: "Islay Scotch (Neat)", type: "Spirit", x: 9, y: -5, smoke: true, bitter: false },
    { name: "Smoked Porter", type: "Beer", x: 5, y: -7, smoke: true, bitter: true },
    { name: "Manhattan", type: "Cocktail", x: 4, y: -5, smoke: false, bitter: true },
    { name: "Cabernet Sauvignon (Napa)", type: "Wine", x: 5, y: -6, smoke: false, bitter: true },
    { name: "Oaxacan Old Fashioned", type: "Cocktail", x: 6, y: -5, smoke: true, bitter: true },
    { name: "West Coast IPA", type: "Beer", x: 7, y: 2, smoke: false, bitter: true }
];

export const questions: Question[] = [
    {
        text: "It's 7:00 AM. How are you taking your coffee?",
        options: [
            { text: "Black. I like the roast.", dx: 3, dy: 0, tags: [] },
            { text: "Cream and Sugar (or a Latte).", dx: -3, dy: -2, tags: [] },
            { text: "I drink tea / sparkling water.", dx: 0, dy: 2, tags: [] }
        ]
    },
    {
        text: "You're at a bonfire. The wind shifts and you inhale some woodsmoke.",
        options: [
            { text: "I love that smell. Nostalgic.", dx: 2, dy: -2, tags: ['likesSmoke'] },
            { text: "Coughing fit. I hate it.", dx: 0, dy: 0, tags: ['noSmoke'] },
            { text: "Indifferent.", dx: 0, dy: 0, tags: [] }
        ]
    },
    {
        text: "Dessert time. Pick one:",
        options: [
            { text: "Lemon Sorbet.", dx: -2, dy: 4, tags: [] },
            { text: "Dark Chocolate Mousse (80% Cocoa).", dx: 4, dy: -4, tags: [] },
            { text: "Cheesecake with Strawberries.", dx: -4, dy: -2, tags: [] }
        ]
    },
    {
        text: "Pick a texture for your ideal beverage:",
        options: [
            { text: "Ice cold, bubbly, fizzy.", dx: 0, dy: 5, tags: [] },
            { text: "Velvety, smooth, coats the mouth.", dx: 0, dy: -5, tags: [] },
            { text: "Like water / juice.", dx: 0, dy: 1, tags: [] }
        ]
    },
    {
        text: "How do you feel about bitterness (like in grapefruit or tonic water)?",
        options: [
            { text: "Love the bite.", dx: 4, dy: 0, tags: ['likesBitter'] },
            { text: "It needs to be balanced with sugar.", dx: -2, dy: 0, tags: [] },
            { text: "Cannot stand it.", dx: -4, dy: 0, tags: ['noBitter'] }
        ]
    },
    {
        text: "Ideally, your drink should taste like...",
        options: [
            { text: "A fruit basket.", dx: -5, dy: 0, tags: [] },
            { text: "Herbs, spices, and earth.", dx: 5, dy: 0, tags: [] },
            { text: "Candy.", dx: -6, dy: 0, tags: [] }
        ]
    }
];
