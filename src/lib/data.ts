import { VIBE_TAGS } from './atproto/vocab';
import { placeStyle, type StyleProfile } from './placement';

/** Declared once, in vocab.ts, because the palate lexicon lists them as `knownValues`. */
export type VibeTag = (typeof VIBE_TAGS)[number];

/** The three EKF readings not drawn on the 2D chart (`latentVector[2..4]`). */
export interface Tolerances {
  bitter: number;
  tannin: number;
  complexity: number;
  eventCount: number;
}

export type User = {
  x: number;
  y: number;
  filters: string[]; // e.g. 'noSmoke', 'noBitter', 'noAnise'
  dislikesAnise?: boolean; // Explicit field for type safety, mapped to filters
  vibeTags?: Record<string, number>;
  tolerances?: Tolerances;
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
    /**
     * Other names the same drink is ordered by ("Prosecco DOC", "Lambrusco
     * di Sorbara"). Matched by `matchDrink`, folded as names are. Never a
     * different drink: a pour matched by alias moves the coordinate.
     */
    aliases?: string[];
    /**
     * For a drink placed by its style (`placement.ts`), what placed it: `x`
     * and `y` are computed from this, never typed. Absent for a hand-placed drink.
     */
    profile?: StyleProfile;
};

/** A drink placed by its style profile: the coordinate comes from `placeStyle`, not by eye. */
const styled = (d: Omit<Drink, 'x' | 'y'> & { profile: StyleProfile }): Drink => ({ ...d, ...placeStyle(d.profile) });

type Flags = Pick<Drink, 'hasSmoke' | 'hasAnise' | 'isBitter'>;
const plain: Flags = { hasSmoke: false, hasAnise: false, isBitter: false };
const gripping: Flags = { hasSmoke: false, hasAnise: false, isBitter: true };

export const drinkDatabase: Drink[] = [
    // --- Crisp · Sweet, x > 0, y > 0: region `surf` (its name is `quadrants` in copy.ts) ---
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

    // --- Rich · Sweet, x < 0, y > 0: region `eddy` ---
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

    // --- Crisp · Savory, x > 0, y < 0: region `salt-line` ---
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

    // --- Rich · Savory, x < 0, y < 0: region `deep` ---
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
    { name: "Monte Carlo", type: "Cocktail", x: -7, y: -4, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'complex', 'comfort'] },
    // --- Placed by style (placement.ts): body, residual sugar g/L, structure. Any region. ---
    // Wine
    styled({ name: "Lambrusco", type: "Wine", ...plain, tags: ['social', 'crushable', 'comfort'], aliases: ["Lambrusco Secco", "Lambrusco di Sorbara", "Lambrusco Grasparossa"], profile: { body: 2, residualSugarGpl: 8, structure: 1 } }),
    styled({ name: "Lambrusco Amabile", type: "Wine", ...plain, tags: ['social', 'sweet', 'crushable'], profile: { body: 2, residualSugarGpl: 45, structure: 1 } }),
    styled({ name: "Prosecco", type: "Wine", ...plain, tags: ['social', 'crushable', 'visual'], aliases: ["Prosecco DOC", "Prosecco Superiore", "Prosecco Extra Dry"], profile: { body: 1, residualSugarGpl: 14, structure: 0 } }),
    styled({ name: "Champagne (Brut)", type: "Wine", ...plain, tags: ['prestige', 'classic', 'social'], aliases: ["Brut Champagne"], profile: { body: 2, residualSugarGpl: 8, structure: 0 } }),
    styled({ name: "Cava (Brut)", type: "Wine", ...plain, tags: ['social', 'crushable'], profile: { body: 1, residualSugarGpl: 8, structure: 0 } }),
    styled({ name: "Pinot Grigio", type: "Wine", ...plain, tags: ['social', 'crushable'], aliases: ["Pinot Gris"], profile: { body: 1, residualSugarGpl: 3, structure: 0 } }),
    styled({ name: "Albariño", type: "Wine", ...plain, tags: ['crushable', 'social'], aliases: ["Alvarinho"], profile: { body: 2, residualSugarGpl: 2, structure: 0 } }),
    styled({ name: "Grüner Veltliner", type: "Wine", ...plain, tags: ['crushable', 'classic'], aliases: ["Gruner"], profile: { body: 2, residualSugarGpl: 2, structure: 0 } }),
    styled({ name: "Chablis (Chardonnay)", type: "Wine", ...plain, tags: ['classic', 'prestige'], profile: { body: 2, residualSugarGpl: 1, structure: 0 } }),
    styled({ name: "Chardonnay (Oaked)", type: "Wine", ...plain, tags: ['comfort', 'bold'], aliases: ["California Chardonnay", "Oaked Chardonnay"], profile: { body: 4, residualSugarGpl: 4, structure: 0 } }),
    styled({ name: "Provence Rosé", type: "Wine", ...plain, tags: ['social', 'crushable', 'visual'], aliases: ["Rosé", "Rose"], profile: { body: 1, residualSugarGpl: 2, structure: 0 } }),
    styled({ name: "Orange Wine", type: "Wine", ...gripping, tags: ['complex', 'polarizing'], aliases: ["Skin-Contact White", "Skin Contact"], profile: { body: 3, residualSugarGpl: 1, structure: 2 } }),
    styled({ name: "Beaujolais (Gamay)", type: "Wine", ...plain, tags: ['crushable', 'social'], profile: { body: 1, residualSugarGpl: 1, structure: 1 } }),
    styled({ name: "Pinot Noir (Burgundy)", type: "Wine", ...plain, tags: ['classic', 'prestige', 'complex'], aliases: ["Red Burgundy", "Bourgogne Rouge"], profile: { body: 2, residualSugarGpl: 1, structure: 1 } }),
    styled({ name: "Chianti Classico (Sangiovese)", type: "Wine", ...gripping, tags: ['classic', 'comfort'], aliases: ["Chianti"], profile: { body: 3, residualSugarGpl: 1, structure: 3 } }),
    styled({ name: "Rioja (Tempranillo)", type: "Wine", ...gripping, tags: ['classic', 'warm', 'comfort'], aliases: ["Rioja Reserva", "Rioja Crianza"], profile: { body: 4, residualSugarGpl: 2, structure: 3 } }),
    styled({ name: "Malbec (Mendoza)", type: "Wine", ...gripping, tags: ['bold', 'comfort', 'warm'], profile: { body: 4, residualSugarGpl: 3, structure: 3 } }),
    styled({ name: "Cabernet Sauvignon (Napa)", type: "Wine", ...gripping, tags: ['bold', 'prestige'], aliases: ["Napa Cabernet", "Napa Cab"], profile: { body: 5, residualSugarGpl: 4, structure: 4 } }),
    // Beer
    styled({ name: "Helles Lager", type: "Beer", ...plain, tags: ['crushable', 'social', 'classic'], aliases: ["Helles", "Lager"], profile: { body: 2, residualSugarGpl: 3, structure: 1 } }),
    styled({ name: "Pilsner (German)", type: "Beer", ...gripping, tags: ['crushable', 'classic'], aliases: ["Pils", "German Pils"], profile: { body: 1, residualSugarGpl: 2, structure: 3 } }),
    styled({ name: "Kölsch", type: "Beer", ...plain, tags: ['crushable', 'social'], profile: { body: 1, residualSugarGpl: 2, structure: 1 } }),
    styled({ name: "Pale Ale", type: "Beer", ...gripping, tags: ['social', 'classic'], aliases: ["American Pale Ale", "APA"], profile: { body: 2, residualSugarGpl: 3, structure: 3 } }),
    styled({ name: "IPA (West Coast)", type: "Beer", ...gripping, tags: ['bold', 'polarizing'], aliases: ["India Pale Ale", "West Coast IPA"], profile: { body: 3, residualSugarGpl: 3, structure: 4 } }),
    styled({ name: "Hazy IPA", type: "Beer", ...plain, tags: ['crushable', 'social', 'visual'], aliases: ["New England IPA", "NEIPA"], profile: { body: 3, residualSugarGpl: 8, structure: 1 } }),
    styled({ name: "Hefeweizen", type: "Beer", ...plain, tags: ['comfort', 'social'], aliases: ["Weissbier", "Wheat Beer"], profile: { body: 3, residualSugarGpl: 4, structure: 0 } }),
    styled({ name: "Witbier", type: "Beer", ...plain, tags: ['crushable', 'social'], aliases: ["Belgian Wit", "Wit"], profile: { body: 2, residualSugarGpl: 4, structure: 0 } }),
    styled({ name: "Belgian Tripel", type: "Beer", ...plain, tags: ['complex', 'warm'], aliases: ["Tripel"], profile: { body: 4, residualSugarGpl: 10, structure: 1 } }),
    styled({ name: "Imperial Stout", type: "Beer", ...gripping, tags: ['bold', 'warm', 'complex'], aliases: ["Russian Imperial Stout"], profile: { body: 5, residualSugarGpl: 25, structure: 3 } }),
];

import { QuestionTier, QuestionOption, Question, questions } from './discovery-questions';
export type { QuestionTier, QuestionOption, Question };
export { questions };