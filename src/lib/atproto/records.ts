/**
 * Zod schemas for the record types described in `lexicons/*.json`.
 *
 * The JSON is authoritative — `npm run lexicons` fails the build when the two
 * disagree, which is what stops the drift that produced two different
 * definitions of the old `drinkLog`.
 *
 * `app.crystalcoupe.palate` and `app.crystalcoupe.pour` live here.
 * The legacy `drinkLog` has been superseded by `pour`.
 */
import { z } from 'zod';

export const DEFS_LEXICON = 'app.crystalcoupe.defs';
export const PALATE_COLLECTION = 'app.crystalcoupe.palate';
export const PALATE_RKEY = 'self';
export const POUR_COLLECTION = 'app.crystalcoupe.pour';
export const MENU_COLLECTION = 'app.crystalcoupe.menu';
export const RECIPE_COLLECTION = 'app.crystalcoupe.recipe';
export const VENUE_COLLECTION = 'app.crystalcoupe.venue';
export const MAKER_COLLECTION = 'app.crystalcoupe.maker';

/** Records held at a fixed key, one per repo. */
export const SELF_RKEY = 'self';

// ---------------------------------------------------------------------------
// Shared references (app.crystalcoupe.defs)
// ---------------------------------------------------------------------------

/**
 * A reference to something that may not have an account yet. `name` is always
 * present so the record stands alone; `uri`/`did` appear once it is claimed.
 * Unclaimed references are reconciled by the app view — never by rewriting
 * somebody's signed record.
 */
export const EntityRefSchema = z.object({
  name: z.string().min(1).max(200),
  uri: z.string().optional(),
  cid: z.string().optional(),
  did: z.string().optional(),
  domain: z.string().max(253).optional(),
});
export type EntityRef = z.infer<typeof EntityRefSchema>;

/**
 * Location encodings borrowed from `community.lexicon.location.*` rather than
 * invented here, so any app speaking that vocabulary agrees which place is
 * meant. Kept permissive: these shapes are governed by the Lexicon Community
 * and should be verified against the source before being tightened.
 */
export const LocationSchema = z.object({ $type: z.string() }).passthrough();
export type Location = z.infer<typeof LocationSchema>;

export const VenueRefSchema = z.object({
  entity: EntityRefSchema,
  address: LocationSchema.optional(),
});
export type VenueRef = z.infer<typeof VenueRefSchema>;

/**
 * A drink category is folklore and unowned — it is a `slug` in an open
 * catalog. A `recipe` is the authored, ownable formulation.
 */
export const DrinkRefSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(64).optional(),
  recipe: EntityRefSchema.optional(),
});
export type DrinkRef = z.infer<typeof DrinkRefSchema>;

/** Attribution for a person. Carries no score, by design. */
export const CreditSchema = z.object({
  entity: EntityRefSchema,
  role: z.enum(['maker', 'author', 'adapter']),
});
export type Credit = z.infer<typeof CreditSchema>;

export const PriceSchema = z.object({
  /** Minor units (cents), to avoid float rounding. */
  amount: z.number().int().min(0),
  currency: z.string().length(3),
});
export type Price = z.infer<typeof PriceSchema>;

// ---------------------------------------------------------------------------
// app.crystalcoupe.palate
// ---------------------------------------------------------------------------

export const PalateRecordSchema = z.object({
  $type: z.literal(PALATE_COLLECTION),
  mapCoordinates: z.object({
    x: z.number().min(-10).max(10),
    y: z.number().min(-10).max(10),
  }),
  sensoryVector: z.object({
    tastes: z.object({
      sweet: z.number().min(0).max(10),
      sour: z.number().min(0).max(10),
      salty: z.number().min(0).max(10),
      bitter: z.number().min(0).max(10),
      umami: z.number().min(0).max(10),
    }),
    aromas: z.object({
      smoky: z.number().min(0).max(10),
      herbaceous: z.number().min(0).max(10),
      spicy: z.number().min(0).max(10),
      fruity: z.number().min(0).max(10),
      floral: z.number().min(0).max(10),
    }),
    textures: z.object({
      body: z.number().min(0).max(10),
      effervescence: z.number().min(0).max(10),
    }),
  }),
  aversions: z.object({
    smoke: z.boolean(),
    bitter: z.boolean(),
    anise: z.boolean(),
  }),
  archetype: z.string().optional(),
  vibeTags: z.record(z.string(), z.number()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type PalateRecord = z.infer<typeof PalateRecordSchema>;

export const SensoryProfileSchema = z.object({
  bitter: z.number().min(0).max(5),
  sweet: z.number().min(0).max(5),
  sour: z.number().min(0).max(5),
  spiritForward: z.number().min(0).max(5),
  citrus: z.number().min(0).max(5),
  herbal: z.number().min(0).max(5),
});
export type SensoryProfile = z.infer<typeof SensoryProfileSchema>;

// ---------------------------------------------------------------------------
// app.crystalcoupe.pour
// ---------------------------------------------------------------------------

export const DEVIATIONS = [
  'too-sweet', 'not-sweet-enough',
  'too-sour', 'not-sour-enough',
  'too-bitter', 'too-smoky', 'too-anise',
  'too-rich', 'too-crisp',
  'too-flat', 'too-fizzy',
] as const;

export const RatingSchema = z.object({
  /** 9-point hedonic scale: 1 dislike extremely, 5 neutral, 9 like extremely. */
  hedonic: z.number().int().min(1).max(9),
  /**
   * Adoption rather than approval. A recipe's reception is built from this —
   * "reordered by 61%" credits a designer without producing a score that
   * could shame one.
   */
  wouldOrderAgain: z.boolean().optional(),
});
export type Rating = z.infer<typeof RatingSchema>;

export const PourRecordSchema = z.object({
  $type: z.literal(POUR_COLLECTION),
  drink: DrinkRefSchema,
  venue: VenueRefSchema.optional(),
  menu: EntityRefSchema.optional(),
  credits: z.array(CreditSchema).max(10).optional(),
  rating: RatingSchema,
  deviations: z.array(z.enum(DEVIATIONS)).max(11).optional(),
  palateShift: z
    .object({
      x: z.number().int().min(-20).max(20),
      y: z.number().int().min(-20).max(20),
    })
    .optional(),
  note: z.string().max(3000).optional(),
  isHomePour: z.boolean().optional(),
  createdAt: z.string().datetime(),
});
export type PourRecord = z.infer<typeof PourRecordSchema>;

// ---------------------------------------------------------------------------
// app.crystalcoupe.menu
// ---------------------------------------------------------------------------

export const MenuItemSchema = z.object({
  drink: DrinkRefSchema,
  /** The menu's own words — the best signal for matching a house name. */
  description: z.string().max(1000).optional(),
  price: PriceSchema.optional(),
  credits: z.array(CreditSchema).max(10).optional(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuSectionSchema = z.object({
  name: z.string().max(200).optional(),
  items: z.array(MenuItemSchema).max(200),
});

/** Present on a patron's sighting; absent on a venue's own publication. */
export const MenuCaptureSchema = z.object({
  method: z.enum(['photo', 'manual', 'import']),
  photo: z.unknown().optional(),
  confidence: z.number().int().min(0).max(100).optional(),
});

export const MenuRecordSchema = z.object({
  $type: z.literal(MENU_COLLECTION),
  venue: VenueRefSchema,
  title: z.string().max(200).optional(),
  publishedAt: z.string().datetime(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  sections: z.array(MenuSectionSchema).max(40).optional(),
  capture: MenuCaptureSchema.optional(),
  /** Standard.site document pointer if published to a publication. */
  document: EntityRefSchema.optional(),
  createdAt: z.string().datetime().optional(),
});
export type MenuRecord = z.infer<typeof MenuRecordSchema>;

/**
 * Authority comes from the repo that signed a menu, not from any field on it:
 * a menu in the venue's own repo is that venue's menu, one in a patron's repo
 * is a sighting. The app view prefers the former and otherwise takes
 * consensus across the latter.
 */
export function isVenueAuthored(record: MenuRecord, signerDid: string): boolean {
  return record.venue.entity.did === signerDid;
}

// ---------------------------------------------------------------------------
// app.crystalcoupe.recipe / venue / maker
// ---------------------------------------------------------------------------

export const RecipeRecordSchema = z.object({
  $type: z.literal(RECIPE_COLLECTION),
  name: z.string().min(1).max(200),
  slug: z.string().max(64).optional(),
  description: z.string().max(2000).optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().max(200),
        amount: z.string().max(50).optional(),
        optional: z.boolean().optional(),
      })
    )
    .max(40)
    .optional(),
  method: z.string().max(4000).optional(),
  glassware: z.string().max(100).optional(),
  garnish: z.string().max(200).optional(),
  credits: z.array(CreditSchema).max(10).optional(),
  adaptedFrom: EntityRefSchema.optional(),
  coordinates: z
    .object({
      x: z.number().int().min(-10).max(10),
      y: z.number().int().min(-10).max(10),
    })
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type RecipeRecord = z.infer<typeof RecipeRecordSchema>;

export const VenueRecordSchema = z.object({
  $type: z.literal(VENUE_COLLECTION),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  location: LocationSchema.optional(),
  website: z.string().optional(),
  /** Menus are immutable, so a venue points at the one that is live. */
  currentMenu: EntityRefSchema.optional(),
  /** Standard.site publication pointer (site.standard.publication at rkey self). */
  publication: EntityRefSchema.optional(),
  createdAt: z.string().datetime(),
});
export type VenueRecord = z.infer<typeof VenueRecordSchema>;

/**
 * Deliberately carries no score and no aggregate. A portfolio is computed by
 * following `recipes` out to the works and reading their reception — a pull
 * the maker initiates, not a number anyone can rank them by.
 */
export const MakerRecordSchema = z.object({
  $type: z.literal(MAKER_COLLECTION),
  displayName: z.string().min(1).max(200),
  bio: z.string().max(2000).optional(),
  recipes: z.array(EntityRefSchema).max(200).optional(),
  venues: z.array(EntityRefSchema).max(50).optional(),
  createdAt: z.string().datetime(),
});
export type MakerRecord = z.infer<typeof MakerRecordSchema>;
