/**
 * What the drinks in a region share — counted from their own entries, never
 * written down per region.
 *
 * A drink entry's ingredient names are free text as a spec card writes them
 * ("Rye or bourbon", "Sweet vermouth (Carpano Antica or Punt e Mes)"), so
 * counting needs a vocabulary that folds them together. That vocabulary is
 * this list, and it says nothing about any region: which ingredients a region
 * shares falls out of which drinks the map places there. Hand-listing them on
 * the region page instead would be one more copy to drift — the previous
 * version listed rum under The Deep, where no drink on the map contains any.
 *
 * An ingredient written as alternatives counts toward each ("Angostura or
 * orange bitters"). `tests/region-content.spec.ts` fails on a group that
 * matches nothing, so a renamed ingredient cannot quietly drop out.
 */
export const INGREDIENT_GROUPS: readonly { name: string; match: RegExp }[] = [
  { name: 'Sweet vermouth', match: /sweet vermouth/i },
  { name: 'Dry vermouth', match: /dry (french )?vermouth|french dry vermouth/i },
  { name: 'Lillet or Cocchi Americano', match: /lillet|cocchi/i },
  { name: 'Sherry', match: /sherry/i },
  { name: 'Sparkling wine', match: /prosecco|champagne|sparkling wine/i },
  { name: 'Campari', match: /campari/i },
  { name: 'Aperol', match: /aperol/i },
  { name: 'Fernet-Branca', match: /fernet/i },
  { name: 'Chartreuse', match: /chartreuse/i },
  { name: 'Bénédictine', match: /bénédictine/i },
  { name: 'Maraschino liqueur', match: /maraschino/i },
  { name: 'Orange liqueur', match: /cointreau|curaçao|grand marnier|orange liqueur/i },
  { name: 'Crème de cacao', match: /crème de cacao/i },
  { name: 'Coffee liqueur', match: /coffee liqueur/i },
  { name: 'Absinthe', match: /absinthe/i },
  { name: 'Angostura bitters', match: /angostura/i },
  { name: 'Orange bitters', match: /orange bitters/i },
  { name: 'Peychaud’s bitters', match: /peychaud/i },
  { name: 'Gin', match: /\bgin\b/i },
  { name: 'Vodka', match: /vodka/i },
  { name: 'Rye whiskey', match: /\brye\b/i },
  { name: 'Bourbon', match: /bourbon/i },
  { name: 'Scotch whisky', match: /scotch/i },
  { name: 'Irish whiskey', match: /irish whiskey/i },
  { name: 'Cognac or brandy', match: /^cognac|aged brandy/i },
  { name: 'Rum', match: /\brum\b/i },
  { name: 'Tequila', match: /tequila/i },
  { name: 'Mezcal', match: /mezcal/i },
  { name: 'Lemon juice', match: /lemon juice/i },
  { name: 'Lime juice', match: /lime juice|^whole lime|^fresh lime$/i },
  { name: 'Grapefruit', match: /grapefruit/i },
  { name: 'Sugar or syrup', match: /simple syrup|sugar cube|^sugar|cane sugar|^demerara/i },
  { name: 'Honey', match: /honey/i },
  { name: 'Agave nectar', match: /agave nectar/i },
  { name: 'Grenadine', match: /grenadine/i },
  { name: 'Egg white', match: /egg white/i },
  { name: 'Cream', match: /heavy cream/i },
  { name: 'Mint', match: /\bmint\b|spearmint/i },
  { name: 'Soda water', match: /club soda|sparkling water|sparkling mineral water/i },
  { name: 'Tonic water', match: /tonic/i },
];

/** An ingredient is "shared" once this many of a region's drinks carry it. */
export const SHARED_MIN = 3;

export interface SharedIngredient {
  name: string;
  /** How many of the drinks carry it. */
  count: number;
}

/**
 * Ingredient groups carried by at least `SHARED_MIN` of `drinks`, most common
 * first. Each drink counts once per group, however many of its ingredients
 * match.
 */
export function sharedIngredients(
  drinks: readonly { ingredients: readonly { name: string }[] }[]
): SharedIngredient[] {
  return INGREDIENT_GROUPS.map(({ name, match }) => ({
    name,
    count: drinks.filter((d) => d.ingredients.some((i) => match.test(i.name))).length,
  }))
    .filter((g) => g.count >= SHARED_MIN)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
