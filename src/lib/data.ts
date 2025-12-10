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
        text: "What\'s your ideal vacation?",
        options: [
            { text: "A tropical beach getaway.", dx: -5, dy: 3, tags: [] },
            { text: "Exploring a bustling city\'s food scene.", dx: 2, dy: -2, tags: [] },
            { text: "A cozy cabin in the mountains.", dx: 3, dy: -4, tags: ['likesSmoke'] },
            { text: "A relaxing trip to a vineyard.", dx: 1, dy: 2, tags: [] }
        ]
    },
    {
        text: "Pick a scent.",
        options: [
            { text: "Freshly cut grass.", dx: 2, dy: 4, tags: [] },
            { text: "Old books and leather.", dx: 4, dy: -3, tags: [] },
            { text: "A crackling campfire.", dx: 2, dy: -2, tags: ['likesSmoke'] },
            { text: "A bakery in the morning.", dx: -4, dy: -2, tags: [] }
        ]
    },
    {
        text: "You\'re at a party. Where are you?",
        options: [
            { text: "On the dance floor.", dx: -2, dy: 3, tags: [] },
            { text: "In a quiet corner, having a deep conversation.", dx: 3, dy: -3, tags: [] },
            { text: "By the snacks, trying a bit of everything.", dx: -1, dy: -1, tags: [] },
            { text: "Outside, enjoying the fresh air.", dx: 1, dy: 2, tags: [] }
        ]
    },
    {
        text: "Choose a super power.",
        options: [
            { text: "Ability to talk to animals.", dx: -1, dy: 1, tags: [] },
            { text: "Super strength and endurance.", dx: 2, dy: -3, tags: [] },
            { text: "Teleportation.", dx: 1, dy: 3, tags: [] },
            { text: "Reading minds.", dx: 4, dy: -1, tags: [] }
        ]
    },
    {
        text: "How do you approach a new project?",
        options: [
            { text: "Dive right in and figure it out as I go.", dx: 0, dy: 2, tags: [] },
            { text: "Plan every detail before I start.", dx: 2, dy: -1, tags: [] },
            { text: "Collaborate with others to brainstorm ideas.", dx: -2, dy: 1, tags: [] },
            { text: "I trust my gut feeling.", dx: 0, dy: 0, tags: [] }
        ]
    },
    {
        text: "What kind of art do you prefer?",
        options: [
            { text: "Bright, colorful pop art.", dx: -4, dy: 2, tags: [] },
            { text: "Classic, detailed renaissance paintings.", dx: 3, dy: -2, tags: [] },
            { text: "Abstract sculptures.", dx: 5, dy: 0, tags: ['likesBitter'] },
            { text: "Black and white photography.", dx: 1, dy: -1, tags: [] }
        ]
    },
    {
        text: "It\'s movie night. What are you watching?",
        options: [
            { text: "A light-hearted romantic comedy.", dx: -3, dy: 1, tags: [] },
            { text: "A complex, thought-provoking thriller.", dx: 4, dy: -2, tags: [] },
            { text: "An action-packed adventure.", dx: 1, dy: 0, tags: [] },
            { text: "A visually stunning nature documentary.", dx: 0, dy: 3, tags: [] }
        ]
    },
    {
        text: "A friend offers you a piece of dark chocolate.",
        options: [
            { text: "The darker the better!", dx: 4, dy: -2, tags: ['likesBitter'] },
            { text: "Only if it has something sweet with it.", dx: -2, dy: 0, tags: [] },
            { text: "No thanks, it\'s too bitter for me.", dx: -5, dy: 1, tags: ['noBitter'] }
        ]
    }
];
