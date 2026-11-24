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
    /**
     * The drink's key in the open catalog, and what a pour or a recipe stores
     * as `slug` (`app.cotidal.defs#drinkSlug`). Typed once, here, beside the
     * coordinate; a register entry's filename must be this (`/drinks/<slug>`),
     * and a drink with no entry has a slug all the same. Never changed once a
     * record points at it: it is how a pour finds its drink without its name.
     */
    slug: string;
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
    { name: "Aperol Spritz", slug: "aperol-spritz", type: "Cocktail", x: 6, y: 7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['visual', 'social', 'crushable'] },
    { name: "Daiquiri (Classic)", slug: "daiquiri", type: "Cocktail", x: 7, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Margarita (Tommy's Style)", slug: "margarita", type: "Cocktail", x: 6, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'classic', 'crushable'] },
    { name: "French 75", slug: "french-75", type: "Cocktail", x: 8, y: 6, hasSmoke: false, hasAnise: true, isBitter: false, tags: ['classic', 'social', 'visual', 'prestige'] },
    { name: "Moscow Mule", slug: "moscow-mule", type: "Cocktail", x: 5, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'comfort', 'crushable'] },
    { name: "Mojito", slug: "mojito", type: "Cocktail", x: 7, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'visual', 'messy'] },
    { name: "Paloma", slug: "paloma", type: "Cocktail", x: 8, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'crushable', 'visual'] },
    { name: "Bramble", slug: "bramble", type: "Cocktail", x: 6, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'sweet', 'classic'] },
    { name: "Southside", slug: "southside", type: "Cocktail", x: 7, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social'] },
    { name: "Tom Collins", slug: "tom-collins", type: "Cocktail", x: 9, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Whiskey Sour", slug: "whiskey-sour", type: "Cocktail", x: 3, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'comfort', 'bold'] },
    { name: "Pimm's Cup", slug: "pimms-cup", type: "Cocktail", x: 7, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'visual', 'crushable'] },
    { name: "Hugo Spritz", slug: "hugo-spritz", type: "Cocktail", x: 9, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'social', 'crushable'] },
    { name: "Paper Plane", slug: "paper-plane", type: "Cocktail", x: 4, y: 4, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'classic', 'prestige'] },
    { name: "Jungle Bird", slug: "jungle-bird", type: "Cocktail", x: 2, y: 6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'visual', 'bold'] },
    { name: "Tequila Sunrise", slug: "tequila-sunrise", type: "Cocktail", x: 5, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'sweet', 'social'] },
    { name: "Sea Breeze", slug: "sea-breeze", type: "Cocktail", x: 8, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'crushable'] },
    { name: "Caipirinha", slug: "caipirinha", type: "Cocktail", x: 6, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'bold', 'messy'] },
    { name: "German Riesling (Kabinett)", slug: "riesling-kabinett", type: "Wine", x: 8, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Moscato d'Asti", slug: "moscato-d-asti", type: "Wine", x: 9, y: 9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'comfort', 'sweet'] },
    { name: "Mai Tai", slug: "mai-tai", type: "Cocktail", x: 2, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'complex', 'visual'] },
    { name: "Naked & Famous", slug: "naked-and-famous", type: "Cocktail", x: 3, y: 1, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['complex', 'bold', 'visual'] },
    { name: "Division Bell", slug: "division-bell", type: "Cocktail", x: 3, y: 2, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['complex', 'visual', 'bold'] },
    { name: "Mezcal Paloma", slug: "mezcal-paloma", type: "Cocktail", x: 6, y: 2, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['social', 'crushable', 'complex'] },
    { name: "Bee's Knees", slug: "bees-knees", type: "Cocktail", x: 6, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'sweet'] },
    { name: "El Diablo", slug: "el-diablo", type: "Cocktail", x: 5, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'crushable', 'visual'] },

    // --- Rich · Sweet, x < 0, y > 0: region `eddy` ---
    { name: "Espresso Martini", slug: "espresso-martini", type: "Cocktail", x: -5, y: 6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['visual', 'social', 'bold', 'messy'] },
    { name: "White Russian", slug: "white-russian", type: "Cocktail", x: -8, y: 9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'sweet', 'messy'] },
    { name: "Amaretto Sour", slug: "amaretto-sour", type: "Cocktail", x: -4, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'social', 'sweet'] },
    { name: "Grasshopper", slug: "grasshopper", type: "Cocktail", x: -9, y: 10, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['sweet', 'visual', 'comfort'] },
    { name: "Brandy Alexander", slug: "brandy-alexander", type: "Cocktail", x: -7, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'comfort', 'prestige'] },
    { name: "Mudslide", slug: "mudslide", type: "Cocktail", x: -10, y: 10, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['sweet', 'messy', 'comfort'] },
    { name: "Irish Coffee", slug: "irish-coffee", type: "Cocktail", x: -6, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'warm', 'bold'] },
    { name: "Port (Tawny)", slug: "port-tawny", type: "Wine", x: -7, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'classic', 'warm', 'spice'] },
    { name: "Pedro Ximénez Sherry", slug: "pedro-ximenez", type: "Wine", x: -9, y: 9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'comfort', 'sweet', 'warm'] },
    { name: "Sauternes", slug: "sauternes", type: "Wine", x: -8, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'prestige', 'sweet'] },
    { name: "Clover Club", slug: "clover-club", type: "Cocktail", x: -3, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'visual', 'prestige'] },
    { name: "Sidecar", slug: "sidecar", type: "Cocktail", x: -4, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold', 'prestige'] },
    { name: "Alexander", slug: "alexander", type: "Cocktail", x: -7, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'comfort'] },
    { name: "Pink Lady", slug: "pink-lady", type: "Cocktail", x: -3, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'classic', 'sweet'] },
    { name: "Aviation", slug: "aviation", type: "Cocktail", x: -2, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'complex', 'visual'] },
    { name: "French Martini", slug: "french-martini", type: "Cocktail", x: -4, y: 8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['visual', 'social', 'sweet'] },
    { name: "Cosmopolitan", slug: "cosmopolitan", type: "Cocktail", x: -3, y: 6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'classic', 'visual'] },
    { name: "Millionaire", slug: "millionaire", type: "Cocktail", x: -5, y: 7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'prestige', 'complex'] },
    { name: "Milk Stout", slug: "milk-stout", type: "Beer", x: -4, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'bold', 'warm'] },
    { name: "Late-Harvest Riesling", slug: "late-harvest-riesling", type: "Wine", x: -8, y: 5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['comfort', 'complex', 'sweet'] },
    { name: "20th Century", slug: "20th-century", type: "Cocktail", x: -3, y: 4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'complex', 'prestige'] },

    // --- Crisp · Savory, x > 0, y < 0: region `salt-line` ---
    { name: "Gin & Tonic", slug: "gin-and-tonic", type: "Cocktail", x: 8, y: -5, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'social', 'crushable'] },
    { name: "Dry Martini", slug: "dry-martini", type: "Cocktail", x: 9, y: -8, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold', 'prestige'] },
    { name: "Vodka Soda", slug: "vodka-soda", type: "Cocktail", x: 10, y: -2, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['social', 'crushable'] },
    { name: "Gimlet (Gin)", slug: "gimlet", type: "Cocktail", x: 7, y: -3, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold'] },
    { name: "Vesper", slug: "vesper", type: "Cocktail", x: 9, y: -7, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'prestige', 'bold'] },
    { name: "50/50 Martini", slug: "50-50-martini", type: "Cocktail", x: 8, y: -6, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'complex', 'prestige'] },
    { name: "Gibson", slug: "gibson", type: "Cocktail", x: 9, y: -9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold', 'polarizing'] },
    { name: "Bamboo", slug: "bamboo", type: "Cocktail", x: 7, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'classic', 'prestige'] },
    { name: "Adonis", slug: "adonis", type: "Cocktail", x: 6, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'classic'] },
    { name: "Sherry (Fino)", slug: "sherry-fino", type: "Wine", x: 9, y: -9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'polarizing', 'classic'] },
    { name: "Sauvignon Blanc (Sancerre)", slug: "sancerre", type: "Wine", x: 8, y: -4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'social', 'crushable'] },
    { name: "Pilsner Urquell", slug: "pilsner-urquell", type: "Beer", x: 7, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'social', 'crushable'] },
    { name: "Gose", slug: "gose", type: "Beer", x: 8, y: -3, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['complex', 'visual', 'polarizing'] },
    { name: "Dirty Martini", slug: "dirty-martini", type: "Cocktail", x: 8, y: -9, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'polarizing', 'bold'] },
    { name: "Greyhound (Gin)", slug: "greyhound", type: "Cocktail", x: 7, y: -4, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['social', 'crushable'] },
    { name: "Rickey", slug: "rickey", type: "Cocktail", x: 9, y: -2, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'crushable'] },
    { name: "Americano (Cocktail)", slug: "americano", type: "Cocktail", x: 6, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'social', 'complex'] },
    { name: "Spritz Veneziano (Dry)", slug: "spritz-veneziano", type: "Cocktail", x: 7, y: -5, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['social', 'visual'] },
    { name: "Last Word", slug: "last-word", type: "Cocktail", x: 4, y: -4, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['complex', 'classic', 'prestige'] },
    { name: "Corpse Reviver No. 2", slug: "corpse-reviver-no-2", type: "Cocktail", x: 5, y: -3, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['classic', 'complex', 'prestige'] },
    { name: "Enzoni", slug: "enzoni", type: "Cocktail", x: 5, y: -4, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'social', 'visual'] },

    // --- Rich · Savory, x < 0, y < 0: region `deep` ---
    { name: "Negroni", slug: "negroni", type: "Cocktail", x: -6, y: -8, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'classic', 'complex', 'prestige', 'polarizing'] },
    { name: "Old Fashioned", slug: "old-fashioned", type: "Cocktail", x: -7, y: -5, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['classic', 'bold', 'prestige'] },
    { name: "Manhattan", slug: "manhattan", type: "Cocktail", x: -6, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'bold', 'prestige', 'warm'] },
    { name: "Boulevardier", slug: "boulevardier", type: "Cocktail", x: -8, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'complex', 'classic'] },
    { name: "Vieux Carré", slug: "vieux-carre", type: "Cocktail", x: -9, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'bold', 'prestige'] },
    { name: "Sazerac", slug: "sazerac", type: "Cocktail", x: -7, y: -7, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['classic', 'bold', 'complex'] },
    { name: "Penicillin", slug: "penicillin", type: "Cocktail", x: -5, y: -4, hasSmoke: true, hasAnise: false, isBitter: false, tags: ['complex', 'bold', 'warm', 'spice'] },
    { name: "Oaxaca Old Fashioned", slug: "oaxaca-old-fashioned", type: "Cocktail", x: -6, y: -4, hasSmoke: true, hasAnise: false, isBitter: false, tags: ['complex', 'bold', 'classic', 'prestige'] },
    { name: "Rob Roy", slug: "rob-roy", type: "Cocktail", x: -8, y: -6, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'bold'] },
    { name: "Rusty Nail", slug: "rusty-nail", type: "Cocktail", x: -9, y: -4, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['bold', 'comfort', 'classic'] },
    { name: "Martinez", slug: "martinez", type: "Cocktail", x: -5, y: -5, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'complex', 'prestige'] },
    { name: "Bijou", slug: "bijou", type: "Cocktail", x: -6, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'classic', 'bold'] },
    { name: "Fernet-Branca", slug: "fernet-branca", type: "Spirit", x: -10, y: -10, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['bold', 'complex', 'polarizing'] },
    { name: "Islay Scotch (Neat)", slug: "islay-scotch", type: "Spirit", x: -9, y: -9, hasSmoke: true, hasAnise: false, isBitter: false, tags: ['bold', 'complex', 'polarizing', 'prestige', 'warm'] },
    { name: "Barolo (Nebbiolo)", slug: "barolo", type: "Wine", x: -7, y: -8, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['bold', 'complex', 'classic', 'prestige'] },
    { name: "Guinness", slug: "guinness", type: "Beer", x: -8, y: -5, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'comfort', 'classic'] },
    { name: "Smoked Porter", slug: "smoked-porter", type: "Beer", x: -6, y: -7, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['bold', 'complex', 'comfort', 'polarizing', 'warm'] },
    { name: "Mezcal Negroni", slug: "mezcal-negroni", type: "Cocktail", x: -7, y: -8, hasSmoke: true, hasAnise: false, isBitter: true, tags: ['complex', 'bold', 'polarizing'] },
    { name: "Black Russian", slug: "black-russian", type: "Cocktail", x: -6, y: -2, hasSmoke: false, hasAnise: false, isBitter: false, tags: ['bold', 'comfort'] },
    { name: "Toronto", slug: "toronto", type: "Cocktail", x: -8, y: -9, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'complex', 'polarizing'] },
    { name: "Hanky Panky", slug: "hanky-panky", type: "Cocktail", x: -5, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['classic', 'complex', 'bold'] },
    { name: "Syrah (Northern Rhône)", slug: "syrah-northern-rhone", type: "Wine", x: -7, y: -7, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['complex', 'bold', 'warm', 'spice'] },
    { name: "Absinthe Drip", slug: "absinthe-drip", type: "Spirit", x: -6, y: -2, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['polarizing', 'complex', 'visual'] },
    { name: "Sambuca (with coffee beans)", slug: "sambuca", type: "Spirit", x: -2, y: -4, hasSmoke: false, hasAnise: true, isBitter: false, tags: ['sweet', 'classic', 'polarizing'] },
    { name: "Tipperary", slug: "tipperary", type: "Cocktail", x: -7, y: -6, hasSmoke: false, hasAnise: true, isBitter: true, tags: ['complex', 'bold', 'classic'] },
    { name: "Monte Carlo", slug: "monte-carlo", type: "Cocktail", x: -7, y: -4, hasSmoke: false, hasAnise: false, isBitter: true, tags: ['bold', 'complex', 'comfort'] },
    // --- Placed by style (placement.ts): body, residual sugar g/L, structure. Any region. ---
    // Wine
    styled({ name: "Lambrusco", slug: "lambrusco", type: "Wine", ...plain, tags: ['social', 'crushable', 'comfort'], aliases: ["Lambrusco Secco", "Lambrusco di Sorbara", "Lambrusco Grasparossa"], profile: { body: 2, residualSugarGpl: 8, structure: 1 } }),
    styled({ name: "Lambrusco Amabile", slug: "lambrusco-amabile", type: "Wine", ...plain, tags: ['social', 'sweet', 'crushable'], profile: { body: 2, residualSugarGpl: 45, structure: 1 } }),
    styled({ name: "Prosecco", slug: "prosecco", type: "Wine", ...plain, tags: ['social', 'crushable', 'visual'], aliases: ["Prosecco DOC", "Prosecco Superiore", "Prosecco Extra Dry"], profile: { body: 1, residualSugarGpl: 14, structure: 0 } }),
    styled({ name: "Champagne (Brut)", slug: "champagne-brut", type: "Wine", ...plain, tags: ['prestige', 'classic', 'social'], aliases: ["Brut Champagne"], profile: { body: 2, residualSugarGpl: 8, structure: 0 } }),
    styled({ name: "Cava (Brut)", slug: "cava-brut", type: "Wine", ...plain, tags: ['social', 'crushable'], profile: { body: 1, residualSugarGpl: 8, structure: 0 } }),
    styled({ name: "Pinot Grigio", slug: "pinot-grigio", type: "Wine", ...plain, tags: ['social', 'crushable'], aliases: ["Pinot Gris"], profile: { body: 1, residualSugarGpl: 3, structure: 0 } }),
    styled({ name: "Albariño", slug: "albarino", type: "Wine", ...plain, tags: ['crushable', 'social'], aliases: ["Alvarinho"], profile: { body: 2, residualSugarGpl: 2, structure: 0 } }),
    styled({ name: "Grüner Veltliner", slug: "gruner-veltliner", type: "Wine", ...plain, tags: ['crushable', 'classic'], aliases: ["Gruner"], profile: { body: 2, residualSugarGpl: 2, structure: 0 } }),
    styled({ name: "Chablis (Chardonnay)", slug: "chablis-chardonnay", type: "Wine", ...plain, tags: ['classic', 'prestige'], profile: { body: 2, residualSugarGpl: 1, structure: 0 } }),
    styled({ name: "Chardonnay (Oaked)", slug: "chardonnay-oaked", type: "Wine", ...plain, tags: ['comfort', 'bold'], aliases: ["California Chardonnay", "Oaked Chardonnay"], profile: { body: 4, residualSugarGpl: 4, structure: 0 } }),
    styled({ name: "Provence Rosé", slug: "provence-rose", type: "Wine", ...plain, tags: ['social', 'crushable', 'visual'], aliases: ["Rosé", "Rose"], profile: { body: 1, residualSugarGpl: 2, structure: 0 } }),
    styled({ name: "Orange Wine", slug: "orange-wine", type: "Wine", ...gripping, tags: ['complex', 'polarizing'], aliases: ["Skin-Contact White", "Skin Contact"], profile: { body: 3, residualSugarGpl: 1, structure: 2 } }),
    styled({ name: "Beaujolais (Gamay)", slug: "beaujolais-gamay", type: "Wine", ...plain, tags: ['crushable', 'social'], profile: { body: 1, residualSugarGpl: 1, structure: 1 } }),
    styled({ name: "Pinot Noir (Burgundy)", slug: "pinot-noir-burgundy", type: "Wine", ...plain, tags: ['classic', 'prestige', 'complex'], aliases: ["Red Burgundy", "Bourgogne Rouge"], profile: { body: 2, residualSugarGpl: 1, structure: 1 } }),
    styled({ name: "Chianti Classico (Sangiovese)", slug: "chianti-classico-sangiovese", type: "Wine", ...gripping, tags: ['classic', 'comfort'], aliases: ["Chianti"], profile: { body: 3, residualSugarGpl: 1, structure: 3 } }),
    styled({ name: "Rioja (Tempranillo)", slug: "rioja-tempranillo", type: "Wine", ...gripping, tags: ['classic', 'warm', 'comfort'], aliases: ["Rioja Reserva", "Rioja Crianza"], profile: { body: 4, residualSugarGpl: 2, structure: 3 } }),
    styled({ name: "Malbec (Mendoza)", slug: "malbec-mendoza", type: "Wine", ...gripping, tags: ['bold', 'comfort', 'warm'], profile: { body: 4, residualSugarGpl: 3, structure: 3 } }),
    styled({ name: "Cabernet Sauvignon (Napa)", slug: "cabernet-sauvignon-napa", type: "Wine", ...gripping, tags: ['bold', 'prestige'], aliases: ["Napa Cabernet", "Napa Cab"], profile: { body: 5, residualSugarGpl: 4, structure: 4 } }),
    // Beer
    styled({ name: "Helles Lager", slug: "helles-lager", type: "Beer", ...plain, tags: ['crushable', 'social', 'classic'], aliases: ["Helles", "Lager"], profile: { body: 2, residualSugarGpl: 3, structure: 1 } }),
    styled({ name: "Pilsner (German)", slug: "pilsner-german", type: "Beer", ...gripping, tags: ['crushable', 'classic'], aliases: ["Pils", "German Pils"], profile: { body: 1, residualSugarGpl: 2, structure: 3 } }),
    styled({ name: "Kölsch", slug: "kolsch", type: "Beer", ...plain, tags: ['crushable', 'social'], profile: { body: 1, residualSugarGpl: 2, structure: 1 } }),
    styled({ name: "Pale Ale", slug: "pale-ale", type: "Beer", ...gripping, tags: ['social', 'classic'], aliases: ["American Pale Ale", "APA"], profile: { body: 2, residualSugarGpl: 3, structure: 3 } }),
    styled({ name: "IPA (West Coast)", slug: "ipa-west-coast", type: "Beer", ...gripping, tags: ['bold', 'polarizing'], aliases: ["India Pale Ale", "West Coast IPA"], profile: { body: 3, residualSugarGpl: 3, structure: 4 } }),
    styled({ name: "Hazy IPA", slug: "hazy-ipa", type: "Beer", ...plain, tags: ['crushable', 'social', 'visual'], aliases: ["New England IPA", "NEIPA"], profile: { body: 3, residualSugarGpl: 8, structure: 1 } }),
    styled({ name: "Hefeweizen", slug: "hefeweizen", type: "Beer", ...plain, tags: ['comfort', 'social'], aliases: ["Weissbier", "Wheat Beer"], profile: { body: 3, residualSugarGpl: 4, structure: 0 } }),
    styled({ name: "Witbier", slug: "witbier", type: "Beer", ...plain, tags: ['crushable', 'social'], aliases: ["Belgian Wit", "Wit"], profile: { body: 2, residualSugarGpl: 4, structure: 0 } }),
    styled({ name: "Belgian Tripel", slug: "belgian-tripel", type: "Beer", ...plain, tags: ['complex', 'warm'], aliases: ["Tripel"], profile: { body: 4, residualSugarGpl: 10, structure: 1 } }),
    styled({ name: "Imperial Stout", slug: "imperial-stout", type: "Beer", ...gripping, tags: ['bold', 'warm', 'complex'], aliases: ["Russian Imperial Stout"], profile: { body: 5, residualSugarGpl: 25, structure: 3 } }),
];

import { QuestionTier, QuestionOption, Question, questions } from './discovery-questions';
export type { QuestionTier, QuestionOption, Question };
export { questions };