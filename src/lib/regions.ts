import type { QuadrantId } from './quadrant';

export interface RegionDetail {
  id: QuadrantId;
  name: string;
  axis: string;
  gloss: string;
  coordinateRange: string;
  character: string;
  philosophy: string;
  chemistry: {
    baseSpirits: string[];
    flavorCompounds: string[];
    technique: string;
    glassware: string;
  };
  orderingProfile: string;
}

export const REGION_DETAILS: Record<QuadrantId, RegionDetail> = {
  ember: {
    id: 'ember',
    name: 'The Ember',
    axis: 'Rich · Savory',
    gloss: 'Bitter, aged, and unhurried. Drinks that argue back.',
    coordinateRange: 'x: −10 → 0, y: −10 → 0',
    character:
      'The quadrant of friction and patience. Drinks in The Ember do not flatter the palate or disguise their proof behind sugar; they lean into wood tannins, bitter roots, aromatic botanicals, and oxidative fortified wines.',
    philosophy:
      'A Negroni, a Sazerac, or a Boulevardier is not a thirst-quencher; it is an argument. This region is home to the digestif and the nightcap that requires twenty minutes of sitting as melting ice gradually unlocks spirit oils and cinchona bitterness. The drinker who lives here values structure over sweetness and understands that bitterness is a flavor that rewards repeat encounters.',
    chemistry: {
      baseSpirits: ['Rye Whiskey', 'High-Ester Rum', 'Campari & Amari', 'Islay Scotch', 'Mezcal'],
      flavorCompounds: ['Gentian', 'Wormwood', 'Quinine', 'Charred Oak Tannins', 'Anise', 'Orange Pith'],
      technique: 'Stirred over dense block ice to achieve clarity, viscosity, and slow, controlled dilution.',
      glassware: 'Heavy Double Rocks / Nick & Nora',
    },
    orderingProfile:
      'You are comfortable with spirits that bite back. You order for contemplation rather than refreshment, preferring drinks that evolve as they reach room temperature.',
  },
  'salt-line': {
    id: 'salt-line',
    name: 'The Salt Line',
    axis: 'Crisp · Savory',
    gloss: 'Dry, mineral, and exact. Nothing hidden behind sugar.',
    coordinateRange: 'x: 0 → +10, y: −10 → 0',
    character:
      'The territory of razor-sharp precision and mineral clarity. The Salt Line strip-mines sugar out of the equation, leaving spirit botanicals, dry vermouth, saline tension, and cold effervescence completely exposed.',
    philosophy:
      'In The Salt Line, there is nowhere to hide poor technique or cheap distillate. A Dry Martini or a high-pressure Gin & Tonic operates on millimeter tolerances: sub-zero temperatures, dense dilution, and expressed citrus oils that coat the tongue without adding sweet juice. It is the most austere and demanding quadrant on the map.',
    chemistry: {
      baseSpirits: ['London Dry Gin', 'Dry French Vermouth', 'Manzanilla & Fino Sherry', 'Blanco Tequila'],
      flavorCompounds: ['Juniper Pinenes', 'Citrus Peel Oils', 'Saline / Sea Salt', 'Cucumber', 'Coriander Seed'],
      technique: 'Violently stirred to near-freezing temperatures or poured over tall, crystal-clear spears with high carbonation.',
      glassware: 'Classic Crystal Coupe / Tall Thin-Walled Highball',
    },
    orderingProfile:
      'You seek focus, cleanliness, and sharpness. You value drinks structured like architectural blueprints: dry, cold, bracing, and free of cloying distractions.',
  },
  vault: {
    id: 'vault',
    name: 'The Vault',
    axis: 'Rich · Sweet',
    gloss: 'Dense and warm. The last drink of the night.',
    coordinateRange: 'x: −10 → 0, y: 0 → +10',
    character:
      'The territory of indulgence, gravity, and velvety warmth. The Vault brings together spirit weight, roasted sugars, espresso extractions, and emulsified textures.',
    philosophy:
      'Where The Salt Line is an architectural draft, The Vault is velvet curtains. Drinks here—like the Espresso Martini, the Brandy Alexander, and the heavier variations of the Old Fashioned—are designed as conclusions. They use dark demerara, cacao, vanilla, and egg whites to wrap spirit proof in luxurious mouthfeel without tipping into cloying syrup.',
    chemistry: {
      baseSpirits: ['Bourbon Whiskey', 'Cognac & Brandy', 'Aged Dark Rum', 'Coffee Liqueurs'],
      flavorCompounds: ['Roasted Coffee Oils', 'Dark Demerara', 'Vanillin', 'Theobromine (Cacao)', 'Nutmeg', 'Cream'],
      technique: 'Hard emulsification via vigorous dry-and-wet shaking, or slow stirring with unrefined sugars.',
      glassware: 'Chilled Coupe / Footed Specimen Glass',
    },
    orderingProfile:
      'You appreciate decadence and texture. Cocktails are an evening ritual, a dessert, or a comforting finish after a long meal.',
  },
  orchard: {
    id: 'orchard',
    name: 'The Orchard',
    axis: 'Crisp · Sweet',
    gloss: 'Bright, fast, and built for company.',
    coordinateRange: 'x: 0 → +10, y: 0 → +10',
    character:
      'The quadrant of kinetic energy, celebration, and balanced brightness. The Orchard balances freshly pressed citrus acids against pure cane syrup, aromatic herbal liqueurs, and carbonation.',
    philosophy:
      'The Daiquiri, the Margarita, and the Last Word demonstrate that a cocktail can be accessible and cheerful while remaining rigorously balanced. Acidity from freshly hand-pressed lime or lemon juice produces salivary tension, immediately answered by sugar and fruit aromatics. These drinks are built to be served ice-cold and finished before dilution degrades their lift.',
    chemistry: {
      baseSpirits: ['White Rum', 'Blanco Agave', 'Dry Gin', 'Chartreuse & Maraschino', 'Champagne'],
      flavorCompounds: ['Citric & Malic Acids', 'Cane Sugar', 'Green Lime Zest', 'Mint Oils', 'Maraschino Cherry'],
      technique: 'Vigorous shaking with sharp cubed ice to achieve immediate chill, micro-aeration, and precise dilution.',
      glassware: 'Chilled Stemmed Coupe / Flute',
    },
    orderingProfile:
      'You drink for sociability, brightness, and energy. You look for tight equilibrium between refreshing acidity and welcoming fruit sweetness.',
  },
};

export function getRegionDetail(id: QuadrantId): RegionDetail {
  return REGION_DETAILS[id] ?? REGION_DETAILS.ember;
}
