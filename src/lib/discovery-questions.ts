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
    },

    // --- EXPANDED POOL ---

    // Y-axis: Savory/Dry (-) to Sweet/Fruity (+)
    {
        id: 'breakfast',
        tier: 'calibration',
        type: 'narrative',
        text: "What does your ideal breakfast look like?",
        primaryAxis: 'y',
        informationGain: 6,
        options: [
            { text: "Eggs, bacon, toast.", dx: -2, dy: -6, feedback: "Savory and grounded." },
            { text: "Pancakes with fruit.", dx: 1, dy: 6, vibeTags: ['sweet'], feedback: "Sweet and bright." },
            { text: "Just black coffee.", dx: -3, dy: -2, vibeTags: ['bold'], feedback: "Straight to business." }
        ]
    },
    {
        id: 'snack',
        tier: 'architecture',
        type: 'narrative',
        text: "You're reaching for a snack. What is it?",
        primaryAxis: 'y',
        informationGain: 5,
        options: [
            { text: "Olives or salted nuts.", dx: -2, dy: -5, vibeTags: ['complex'], feedback: "Salt and earth." },
            { text: "Fresh fruit.", dx: 2, dy: 5, vibeTags: ['crushable'], feedback: "Clean and bright." },
            { text: "Dark chocolate.", dx: -1, dy: -3, vibeTags: ['bold'], feedback: "Bittersweet indulgence." }
        ]
    },
    {
        id: 'sauce',
        tier: 'architecture',
        type: 'narrative',
        text: "Which sauce on the table?",
        primaryAxis: 'y',
        informationGain: 5,
        options: [
            { text: "Hot sauce.", dx: 1, dy: -5, vibeTags: ['bold', 'spice'], feedback: "Heat and acid — you like a kick." },
            { text: "Honey mustard.", dx: -1, dy: 5, vibeTags: ['sweet', 'comfort'], feedback: "Sweet with a little edge." },
            { text: "Soy sauce.", dx: -2, dy: -4, vibeTags: ['complex'], feedback: "Umami. Deep and savory." }
        ]
    },
    {
        id: 'jam',
        tier: 'context',
        type: 'narrative',
        text: "Pick a preserve for your toast.",
        primaryAxis: 'y',
        informationGain: 6,
        options: [
            { text: "Orange marmalade.", dx: 2, dy: 4, vibeTags: ['spice'], feedback: "Bitter peel, bright sugar." },
            { text: "Strawberry jam.", dx: 1, dy: 6, vibeTags: ['sweet', 'crushable'], feedback: "Pure, simple sweetness." },
            { text: "Nothing. Butter only.", dx: -2, dy: -4, vibeTags: ['classic'], feedback: "Purist. Respect." }
        ]
    },
    {
        id: 'cheese',
        tier: 'architecture',
        type: 'narrative',
        text: "You're building a cheese plate. What anchors it?",
        primaryAxis: 'y',
        informationGain: 5,
        options: [
            { text: "Aged cheddar or manchego.", dx: -2, dy: -5, vibeTags: ['bold', 'complex'], feedback: "Sharp, crystalline, serious." },
            { text: "Brie or burrata.", dx: -3, dy: 3, vibeTags: ['comfort'], feedback: "Soft, lush, indulgent." },
            { text: "Goat cheese with honey.", dx: 1, dy: 5, vibeTags: ['sweet'], feedback: "Tangy meets sweet. Nice range." }
        ]
    },

    // X-axis: Rich/Full (-) to Crisp/Light (+)
    {
        id: 'soup',
        tier: 'architecture',
        type: 'narrative',
        text: "What kind of soup warms your soul?",
        primaryAxis: 'x',
        informationGain: 5,
        options: [
            { text: "Thick and creamy.", dx: -5, dy: 1, vibeTags: ['comfort'], feedback: "Richness you can feel." },
            { text: "Clear broth with herbs.", dx: 5, dy: -1, vibeTags: ['classic'], feedback: "Clean and restorative." },
            { text: "Spicy and complex.", dx: -2, dy: -3, vibeTags: ['bold', 'spice'], feedback: "Layers and heat." }
        ]
    },
    {
        id: 'bread',
        tier: 'context',
        type: 'narrative',
        text: "What bread do you want on the table?",
        primaryAxis: 'x',
        informationGain: 4,
        options: [
            { text: "Dense sourdough.", dx: -4, dy: -2, vibeTags: ['complex'], feedback: "Tangy, chewy, substantial." },
            { text: "Light and crusty baguette.", dx: 4, dy: 0, vibeTags: ['classic'], feedback: "Airy with a crack." },
            { text: "Warm focaccia with oil.", dx: -3, dy: 1, vibeTags: ['comfort'], feedback: "Soft, herby, generous." }
        ]
    },
    {
        id: 'salad',
        tier: 'architecture',
        type: 'narrative',
        text: "How do you dress a salad?",
        primaryAxis: 'x',
        informationGain: 5,
        options: [
            { text: "Creamy ranch or caesar.", dx: -5, dy: 1, vibeTags: ['comfort'], feedback: "Rich and coated." },
            { text: "Sharp vinaigrette.", dx: 5, dy: -2, vibeTags: ['crushable'], feedback: "Bright acid cuts through." },
            { text: "Just olive oil and lemon.", dx: 3, dy: 0, vibeTags: ['classic'], feedback: "Minimal. Elegant." }
        ]
    },

    // Both axes
    {
        id: 'vacation',
        tier: 'context',
        type: 'narrative',
        text: "Where are you escaping to?",
        primaryAxis: 'x',
        informationGain: 4,
        options: [
            { text: "Tropical beach.", dx: 4, dy: 4, vibeTags: ['crushable', 'sweet'], feedback: "Sun, sand, something cold." },
            { text: "Mountain cabin.", dx: -4, dy: -3, vibeTags: ['warm', 'comfort'], feedback: "Fireside. Something dark in the glass." },
            { text: "A city I've never been to.", dx: 1, dy: -1, vibeTags: ['complex', 'social'], feedback: "Exploration. New bars, new menus." }
        ]
    },
    {
        id: 'season',
        tier: 'context',
        type: 'narrative',
        text: "What is your favorite season?",
        primaryAxis: 'x',
        informationGain: 3,
        options: [
            { text: "Summer.", dx: 3, dy: 3, vibeTags: ['crushable', 'social'], feedback: "Long days, cold drinks." },
            { text: "Autumn.", dx: -2, dy: -3, vibeTags: ['warm', 'spice'], feedback: "Cinnamon, woodsmoke, amber light." },
            { text: "Winter.", dx: -3, dy: -1, vibeTags: ['bold', 'warm'], feedback: "Dark spirits by a fire." },
            { text: "Spring.", dx: 2, dy: 2, vibeTags: ['crushable'], feedback: "Fresh starts, light pours." }
        ]
    },
    {
        id: 'restaurant',
        tier: 'context',
        type: 'narrative',
        text: "You're picking the restaurant tonight.",
        primaryAxis: 'y',
        informationGain: 4,
        options: [
            { text: "Izakaya — small plates, big flavors.", dx: -1, dy: -4, vibeTags: ['complex', 'social'], feedback: "Umami, pickles, rice. You know what's good." },
            { text: "Italian trattoria.", dx: -3, dy: 2, vibeTags: ['classic', 'comfort'], feedback: "Rustic, generous, wine on the table." },
            { text: "Taco truck.", dx: 2, dy: 1, vibeTags: ['crushable', 'social'], feedback: "Casual, punchy, perfect." }
        ]
    },
    {
        id: 'candy',
        tier: 'calibration',
        type: 'narrative',
        text: "Trick-or-treat. Pick your candy.",
        primaryAxis: 'y',
        informationGain: 7,
        options: [
            { text: "Sour gummies.", dx: 3, dy: 4, vibeTags: ['crushable'], feedback: "Tart and playful." },
            { text: "Dark chocolate bar.", dx: -2, dy: -5, vibeTags: ['bold'], feedback: "Bitter and serious." },
            { text: "Caramel or toffee.", dx: -4, dy: 7, vibeTags: ['sweet', 'comfort'], feedback: "Rich, buttery sweetness." }
        ]
    },
    {
        id: 'morning_drink',
        tier: 'calibration',
        type: 'narrative',
        text: "First drink of the morning?",
        primaryAxis: 'x',
        informationGain: 4,
        options: [
            { text: "Orange juice.", dx: 4, dy: 4, vibeTags: ['crushable'], feedback: "Bright and sweet. You wake up optimistic." },
            { text: "Tea.", dx: 2, dy: -1, vibeTags: ['classic'], feedback: "Subtle, aromatic, measured." },
            { text: "Strong coffee.", dx: -4, dy: -2, vibeTags: ['bold'], feedback: "No small talk until the cup is empty." }
        ]
    },
    {
        id: 'cooking',
        tier: 'architecture',
        type: 'narrative',
        text: "You're cooking tonight. What's the move?",
        primaryAxis: 'y',
        informationGain: 4,
        options: [
            { text: "Low and slow braise.", dx: -4, dy: -3, vibeTags: ['complex', 'warm'], feedback: "Hours of patience. Deep, melted flavors." },
            { text: "Quick stir-fry.", dx: 2, dy: -2, vibeTags: ['social', 'crushable'], feedback: "Fast, bright, a little smoky from the wok." },
            { text: "Something with a sweet glaze.", dx: -1, dy: 4, vibeTags: ['sweet', 'comfort'], feedback: "Caramelized edges. You like that sweetness." }
        ]
    },
    {
        id: 'ice_cream',
        tier: 'context',
        type: 'narrative',
        text: "Pick a scoop.",
        primaryAxis: 'y',
        informationGain: 5,
        options: [
            { text: "Vanilla.", dx: -1, dy: 3, vibeTags: ['classic', 'comfort'], feedback: "The original. Underrated." },
            { text: "Salted caramel.", dx: -3, dy: 5, vibeTags: ['sweet', 'complex'], feedback: "Sweet, salty, rich — you want it all." },
            { text: "Lemon sorbet.", dx: 4, dy: 2, vibeTags: ['crushable'], feedback: "Tart and clean. A palate reset." },
            { text: "Coffee.", dx: -3, dy: -2, vibeTags: ['bold'], feedback: "Bitter and cold. Interesting combination." }
        ]
    }
];