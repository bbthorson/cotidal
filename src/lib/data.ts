export type VibeTag = 'bold' | 'classic' | 'visual' | 'social' | 'comfort' | 'complex' | 'sweet' | 'messy' | 'polarizing' | 'prestige' | 'warm' | 'spice' | 'crushable';

export type User = {
  x: number;
  y: number;
  filters: string[]; // e.g. 'noSmoke', 'noBitter', 'noAnise'
  dislikesAnise?: boolean; // Explicit field for type safety, mapped to filters
  vibeTags?: Record<string, number>;
};

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

export const drinkDatabase: Drink[] = [
    // --- QUADRANT 1: LUSH & LIVELY (Crisp & Sweet) [x > 0, y > 0] ---
    { name: "Aperol Spritz", type: "Cocktail", x: 6, y: 7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['visual', 'social', 'crushable'] },
    { name: "Daiquiri (Classic)", type: "Cocktail", x: 7, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Margarita (Tommy's Style)", type: "Cocktail", x: 6, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'classic', 'crushable'] },
    { name: "French 75", type: "Cocktail", x: 8, y: 6, hasSmoke: false, hasAnise: true, isBitter: false, tags: ['classic', 'social', 'visual', 'prestige'] },
    { name: "Moscow Mule", type: "Cocktail", x: 5, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'comfort', 'crushable'] },
    { name: "Mojito", type: "Cocktail", x: 7, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'visual', 'messy'] },
    { name: "Paloma", type: "Cocktail", x: 8, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'crushable', 'visual'] },
    { name: "Bramble", type: "Cocktail", x: 6, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'sweet', 'classic'] },
    { name: "Southside", type: "Cocktail", x: 7, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social'] },
    { name: "Tom Collins", type: "Cocktail", x: 9, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Whiskey Sour", type: "Cocktail", x: 3, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'comfort', 'bold'] },
    { name: "Pimm's Cup", type: "Cocktail", x: 7, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'visual', 'crushable'] },
    { name: "Hugo Spritz", type: "Cocktail", x: 9, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'social', 'crushable'] },
    { name: "Paper Plane", type: "Cocktail", x: 4, y: 4, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'classic', 'prestige'] },
    { name: "Jungle Bird", type: "Cocktail", x: 2, y: 6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'visual', 'bold'] },
    { name: "Tequila Sunrise", type: "Cocktail", x: 5, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'sweet', 'social'] },
    { name: "Sea Breeze", type: "Cocktail", x: 8, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'crushable'] },
    { name: "Caipirinha", type: "Cocktail", x: 6, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'bold', 'messy'] },
    { name: "German Riesling (Kabinett)", type: "Wine", x: 8, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Moscato d'Asti", type: "Wine", x: 9, y: 9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'comfort', 'sweet'] },
    { name: "Mai Tai", type: "Cocktail", x: 2, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'complex', 'visual'] },
    { name: "Naked & Famous", type: "Cocktail", x: 3, y: 1, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['complex', 'bold', 'visual'] },
    { name: "Division Bell", type: "Cocktail", x: 3, y: 2, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['complex', 'visual', 'bold'] },
    { name: "Mezcal Paloma", type: "Cocktail", x: 6, y: 2, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['social', 'crushable', 'complex'] },
    { name: "Bee's Knees", type: "Cocktail", x: 6, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'sweet'] },
    { name: "El Diablo", type: "Cocktail", x: 5, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'crushable', 'visual'] },

    // --- QUADRANT 2: DECADENT & DEEP (Rich & Sweet) [x < 0, y > 0] ---
    { name: "Espresso Martini", type: "Cocktail", x: -5, y: 6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['visual', 'social', 'bold', 'messy'] },
    { name: "White Russian", type: "Cocktail", x: -8, y: 9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'sweet', 'messy'] },
    { name: "Amaretto Sour", type: "Cocktail", x: -4, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'social', 'sweet'] },
    { name: "Grasshopper", type: "Cocktail", x: -9, y: 10, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['sweet', 'visual', 'comfort'] },
    { name: "Brandy Alexander", type: "Cocktail", x: -7, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'comfort', 'prestige'] },
    { name: "Mudslide", type: "Cocktail", x: -10, y: 10, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['sweet', 'messy', 'comfort'] },
    { name: "Irish Coffee", type: "Cocktail", x: -6, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'warm', 'bold'] },
    { name: "Port (Tawny)", type: "Wine", x: -7, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'classic', 'warm', 'spice'] },
    { name: "Pedro Ximénez Sherry", type: "Wine", x: -9, y: 9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'comfort', 'sweet', 'warm'] },
    { name: "Sauternes", type: "Wine", x: -8, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'prestige', 'sweet'] },
    { name: "Clover Club", type: "Cocktail", x: -3, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'visual', 'prestige'] },
    { name: "Sidecar", type: "Cocktail", x: -4, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold', 'prestige'] },
    { name: "Alexander", type: "Cocktail", x: -7, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'comfort'] },
    { name: "Pink Lady", type: "Cocktail", x: -3, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'classic', 'sweet'] },
    { name: "Aviation", type: "Cocktail", x: -2, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'complex', 'visual'] },
    { name: "French Martini", type: "Cocktail", x: -4, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'social', 'sweet'] },
    { name: "Cosmopolitan", type: "Cocktail", x: -3, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'classic', 'visual'] },
    { name: "Millionaire", type: "Cocktail", x: -5, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'prestige', 'complex'] },
    { name: "Milk Stout", type: "Beer", x: -4, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'bold', 'warm'] },
    { name: "Late-Harvest Riesling", type: "Wine", x: -8, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'complex', 'sweet'] },
    { name: "20th Century", type: "Cocktail", x: -3, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'complex', 'prestige'] },

    // --- QUADRANT 3: CRISP & CLEAN (Crisp & Savory) [x > 0, y < 0] ---
    { name: "Gin & Tonic", type: "Cocktail", x: 8, y: -5, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'social', 'crushable'] },
    { name: "Dry Martini", type: "Cocktail", x: 9, y: -8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold', 'prestige'] },
    { name: "Vodka Soda", type: "Cocktail", x: 10, y: -2, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'crushable'] },
    { name: "Gimlet (Gin)", type: "Cocktail", x: 7, y: -3, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold'] },
    { name: "Vesper", type: "Cocktail", x: 9, y: -7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'prestige', 'bold'] },
    { name: "50/50 Martini", type: "Cocktail", x: 8, y: -6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'complex', 'prestige'] },
    { name: "Gibson", type: "Cocktail", x: 9, y: -9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold', 'polarizing'] },
    { name: "Bamboo", type: "Cocktail", x: 7, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'classic', 'prestige'] },
    { name: "Adonis", type: "Cocktail", x: 6, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'classic'] },
    { name: "Sherry (Fino)", type: "Wine", x: 9, y: -9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'polarizing', 'classic'] },
    { name: "Sauvignon Blanc (Sancerre)", type: "Wine", x: 8, y: -4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Pilsner Urquell", type: "Beer", x: 7, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'social', 'crushable'] },
    { name: "Gose", type: "Beer", x: 8, y: -3, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'visual', 'polarizing'] },
    { name: "Dirty Martini", type: "Cocktail", x: 8, y: -9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'polarizing', 'bold'] },
    { name: "Greyhound (Gin)", type: "Cocktail", x: 7, y: -4, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['social', 'crushable'] },
    { name: "Rickey", type: "Cocktail", x: 9, y: -2, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'crushable'] },
    { name: "Americano (Cocktail)", type: "Cocktail", x: 6, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'social', 'complex'] },
    { name: "Spritz Veneziano (Dry)", type: "Cocktail", x: 7, y: -5, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['social', 'visual'] },
    { name: "Last Word", type: "Cocktail", x: 4, y: -4, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['complex', 'classic', 'prestige'] },
    { name: "Corpse Reviver No. 2", type: "Cocktail", x: 5, y: -3, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['classic', 'complex', 'prestige'] },
    { name: "Enzoni", type: "Cocktail", x: 5, y: -4, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'social', 'visual'] },

    // --- QUADRANT 4: BOLD & COMPLEX (Rich & Savory) [x < 0, y < 0] ---
    { name: "Negroni", type: "Cocktail", x: -6, y: -8, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'classic', 'complex', 'prestige', 'polarizing'] },
    { name: "Old Fashioned", type: "Cocktail", x: -7, y: -5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold', 'prestige'] },
    { name: "Manhattan", type: "Cocktail", x: -6, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'bold', 'prestige', 'warm'] },
    { name: "Boulevardier", type: "Cocktail", x: -8, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'complex', 'classic'] },
    { name: "Vieux Carré", type: "Cocktail", x: -9, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'bold', 'prestige'] },
    { name: "Sazerac", type: "Cocktail", x: -7, y: -7, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['classic', 'bold', 'complex'] },
    { name: "Penicillin", type: "Cocktail", x: -5, y: -4, hasSmoke: true, hasAnise: false, isBitter: false, tags: ['complex', 'bold', 'warm', 'spice'] },
    { name: "Oaxaca Old Fashioned", type: "Cocktail", x: -6, y: -4, hasSmoke: true, hasAnise: false, isBitter: false, tags: ['complex', 'bold', 'classic', 'prestige'] },
    { name: "Rob Roy", type: "Cocktail", x: -8, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'bold'] },
    { name: "Rusty Nail", type: "Cocktail", x: -9, y: -4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['bold', 'comfort', 'classic'] },
    { name: "Martinez", type: "Cocktail", x: -5, y: -5, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'complex', 'prestige'] },
    { name: "Bijou", type: "Cocktail", x: -6, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'classic', 'bold'] },
    { name: "Fernet-Branca", type: "Spirit", x: -10, y: -10, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['bold', 'complex', 'polarizing'] },
    { name: "Islay Scotch (Neat)", type: "Spirit", x: -9, y: -9, hasSmoke: true, hasAnise: false, isBitter: false, tags: ['bold', 'complex', 'polarizing', 'prestige', 'warm'] },
    { name: "Barolo (Nebbiolo)", type: "Wine", x: -7, y: -8, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['bold', 'complex', 'classic', 'prestige'] },
    { name: "Guinness", type: "Beer", x: -8, y: -5, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'comfort', 'classic'] },
    { name: "Smoked Porter", type: "Beer", x: -6, y: -7, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['bold', 'complex', 'comfort', 'polarizing', 'warm'] },
    { name: "Mezcal Negroni", type: "Cocktail", x: -7, y: -8, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['complex', 'bold', 'polarizing'] },
    { name: "Black Russian", type: "Cocktail", x: -6, y: -2, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['bold', 'comfort'] },
    { name: "Toronto", type: "Cocktail", x: -8, y: -9, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'complex', 'polarizing'] },
    { name: "Hanky Panky", type: "Cocktail", x: -5, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'complex', 'bold'] },
    { name: "Syrah (Northern Rhône)", type: "Wine", x: -7, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'bold', 'warm', 'spice'] },
    { name: "Absinthe Drip", type: "Spirit", x: -6, y: -2, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['polarizing', 'complex', 'visual'] },
    { name: "Sambuca (with coffee beans)", type: "Spirit", x: -2, y: -4, hasSmoke: false, hasAnise: true, isBitter: false, tags: ['sweet', 'classic', 'polarizing'] },
    { name: "Tipperary", type: "Cocktail", x: -7, y: -6, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['complex', 'bold', 'classic'] },
    { name: "Monte Carlo", type: "Cocktail", x: -7, y: -4, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'complex', 'comfort'] }
];

import { QuestionTier, QuestionOption, Question, questions } from './discovery-questions';
export type { QuestionTier, QuestionOption, Question };
export { questions };