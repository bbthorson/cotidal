export type MessageRole = 'bartender' | 'user' | 'system';

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
}

let messageCounter = 0;
export function createMessage(role: MessageRole, content: string): ConversationMessage {
  return { id: `msg-${++messageCounter}`, role, content };
}

// Enriched bartender feedback — keyed by "questionId-optionIndex"
export const ENRICHED_FEEDBACK: Record<string, string> = {
  'coffee-0': "Black coffee, no nonsense. That tells me you appreciate bold, unmasked flavors. We're off to a good start.",
  'coffee-1': "Milk and sugar — you like things smooth and approachable. Nothing wrong with that. I've got some ideas already.",

  'dessert-0': "Lemon tart — bright, zippy acidity balanced with sweetness. That's going to open up some interesting doors.",
  'dessert-1': "Dark chocolate — the kind that lingers. You like depth without sweetness getting in the way. Noted.",
  'dessert-2': "Crème brûlée. Rich, custardy, that crackle of burnt sugar. You want indulgence, and I can work with that.",

  'bitter_tol-0': "You can handle bitterness — good. That opens up a whole world of aperitifs, amari, and properly bitter cocktails.",
  'bitter_tol-1': "Not a fan of bitter? No judgment. We'll steer toward drinks that play nice — smooth, rounded, easy on the palate.",

  'texture-0': "Fizzy and refreshing — you want something that wakes you up. Bubbles change a drink completely.",
  'texture-1': "Still and smooth. You want something that sits in the glass with quiet confidence. Classic choice.",

  'weather-0': "Beat the heat. You need something tall, cold, and crushable. I'm already thinking citrus and ice.",
  'weather-1': "Warming up from the inside out. There's nothing like a spirit-forward drink when the cold sets in.",

  'glassware-0': "Stemmed and elegant — you appreciate the ritual. The way light catches the glass. Presentation matters to you.",
  'glassware-1': "Something heavy in the hand. You want a drink that means business — no fuss, just substance.",

  'smoke-0': "Campfire lover. Mezcal, peated scotch, charred oak — these are going to be your friends.",
  'smoke-1': "Not into smoke? That's fine. We'll keep things clean and let other flavors do the talking.",

  'flavor_revelation-0': "Black licorice — that's a polarizing pick, and I respect it. Anise, absinthe, pastis — you're not afraid of bold.",
  'flavor_revelation-1': "Spiced orange. Warm, citrusy, familiar but interesting. That's a flavor profile with a lot of range.",

  'pacing-0': "Slow sipper. You want something complex enough to reward every sip. No rushing.",
  'pacing-1': "Social mode — you need something that keeps the energy up. Light, lively, easy to love.",

  'breakfast-0': "Savory breakfast — you want substance and salt first thing. That tells me a lot about where you land on a menu.",
  'breakfast-1': "Pancakes and fruit. You start the day sweet and bright — that energy carries right into what you'll drink.",
  'breakfast-2': "Just coffee, nothing else. You don't need extras. That kind of minimalism shows up in your drink preferences too.",

  'snack-0': "Olives and nuts — salt, earth, a little brine. You gravitate toward drinks with that same savory backbone.",
  'snack-1': "Fresh fruit. Clean, bright, no heaviness. You want your drinks to feel the same way.",
  'snack-2': "Dark chocolate as a snack. Bittersweet and satisfying. That's a very specific palate — I like it.",

  'sauce-0': "Hot sauce on everything. You want heat, acid, something that wakes up the plate. Drinks too, I'd bet.",
  'sauce-1': "Honey mustard — sweet with a savory anchor. That balance shows up in your drink preferences more than you'd think.",
  'sauce-2': "Soy sauce. Deep umami, that fermented richness. You like drinks with backbone and depth.",

  'jam-0': "Marmalade — bitter peel with bright sugar. That's actually a very cocktail-friendly palate.",
  'jam-1': "Strawberry jam. Pure, uncomplicated sweetness. You know what you like and you don't apologize for it.",
  'jam-2': "Butter only, no jam. You let the base ingredient speak. That's the sign of someone who respects simplicity.",

  'cheese-0': "Aged cheese — sharp, crystalline, the kind that fights back. You want drinks with that same assertiveness.",
  'cheese-1': "Soft, creamy cheese. Rich and yielding. You like drinks that feel luxurious on the palate.",
  'cheese-2': "Goat cheese with honey — tangy and sweet together. That push-pull is actually a great cocktail instinct.",

  'soup-0': "Thick and creamy soup. You want richness you can feel. That maps straight to how you'll like your drinks.",
  'soup-1': "Clear broth — clean, restorative, nothing hiding. You want transparency in a glass too.",
  'soup-2': "Spicy and complex. Layers of heat, aromatics, depth. You're not looking for easy — you want interesting.",

  'bread-0': "Dense sourdough. Tangy, chewy, with character. You appreciate things that take time.",
  'bread-1': "Light baguette with a good crust. Airy and crisp — you want structure without heaviness.",
  'bread-2': "Warm focaccia with oil. Soft, herby, generous. Comfort is the through-line here.",

  'salad-0': "Creamy dressing — you want richness even in a salad. That carries right into spirit-forward drinks.",
  'salad-1': "Sharp vinaigrette. Bright acid that cuts through everything. You want your drinks to do the same.",
  'salad-2': "Just olive oil and lemon. Clean, minimal, nothing to hide behind. I know exactly where to steer you.",

  'vacation-0': "Tropical beach. Sun, sand, and something cold and colorful in your hand. That's a whole drink philosophy.",
  'vacation-1': "Mountain cabin. Fireside, something dark and warming in the glass. I can picture your drink already.",
  'vacation-2': "A new city. You want to explore — new bars, new menus, new flavors. That adventurous streak matters.",

  'season-0': "Summer person. Long days, cold drinks, nothing too serious. You want refreshment first.",
  'season-1': "Autumn. Cinnamon, woodsmoke, amber light. Your drink palette is warm and layered.",
  'season-2': "Winter. Dark spirits, heavy pours, something that fights the cold. Bold choices ahead.",
  'season-3': "Spring. Fresh starts, light pours, things coming alive again. You want drinks that feel new.",

  'restaurant-0': "Izakaya — small plates, big umami. You know how to eat, which means you know how to drink.",
  'restaurant-1': "Italian trattoria. Rustic, generous, wine flowing. You want drinks that feel like a long dinner.",
  'restaurant-2': "Taco truck. Casual, punchy, no pretense. You want drinks that match that energy.",

  'candy-0': "Sour gummies. Tart and playful — you like things that make your mouth pucker. That's useful information.",
  'candy-1': "Dark chocolate bar. Bitter and serious, even your candy has edge. Noted.",
  'candy-2': "Caramel or toffee. Rich, buttery sweetness — you're drawn to that golden warmth in everything.",

  'morning_drink-0': "Orange juice first thing. Bright, sweet, optimistic. That energy translates directly to your bar order.",
  'morning_drink-1': "Tea. Subtle, aromatic, a little ceremony. You appreciate nuance — that matters in a drink.",
  'morning_drink-2': "Strong coffee, no negotiation. You want intensity before anything else. I hear you.",

  'cooking-0': "Low and slow. You have patience for deep flavors — that maps perfectly to spirit-forward drinks.",
  'cooking-1': "Quick stir-fry. Fast, bright, a little smoky from the wok. You want drinks with that same snap.",
  'cooking-2': "Sweet glaze. Caramelized edges, that sticky-sweet finish. You like drinks that hit the same notes.",

  'ice_cream-0': "Vanilla. The original and still underrated. You appreciate a well-executed classic.",
  'ice_cream-1': "Salted caramel. Sweet, salty, rich — you want complexity even in a scoop. Same with drinks.",
  'ice_cream-2': "Lemon sorbet. Tart and clean, a palate reset. You want drinks that feel refreshing first.",
  'ice_cream-3': "Coffee ice cream. Bitter and cold — that contrast says a lot about how you like your drinks.",
};

// Tier transition messages — shown between tiers as "system" messages
export const TIER_TRANSITIONS: Record<string, string> = {
  calibration: "Alright, I'm starting to get a read on you. You've got a clear sense of what you like on the palate. Now let's talk about how you like your drinks to feel.",
  architecture: "The picture's coming together — I know your flavor leanings and your style. A few more questions and I'll have your menu ready.",
};
