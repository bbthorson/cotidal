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
};

// Tier transition messages — shown between tiers as "system" messages
export const TIER_TRANSITIONS: Record<string, string> = {
  calibration: "Alright, I'm starting to get a read on you. You've got a clear sense of what you like on the palate. Now let's talk about how you like your drinks to feel.",
  architecture: "The picture's coming together — I know your flavor leanings and your style. A few more questions and I'll have your menu ready.",
};
