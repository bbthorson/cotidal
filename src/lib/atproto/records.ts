/**
 * Zod schemas for the record types described in `lexicons/*.json`.
 *
 * The JSON is authoritative. `npm run lexicons` walks every record schema in
 * `RECORD_SCHEMAS` against its lexicon, field by field — names, required,
 * types, bounds, string limits, formats and known values — and fails when
 * they disagree. That is what stops the drift that produced two different
 * definitions of the old `drinkLog`. So a schema here says exactly what its
 * lexicon says: no stricter, no looser.
 *
 * `app.cotidal.palate`, `app.cotidal.pour` and
 * `app.cotidal.elicitation` live here.
 * The legacy `drinkLog` has been superseded by `pour`.
 */
import { z } from 'zod';
// Relative imports name their `.ts` file: `npm run lexicons` loads these modules
// with Node's own type stripping, which does not guess extensions.
import { isAtUriString, isValidDid, isValidUri } from '@atproto/syntax';
import { parseCidSafe } from '@atproto/lex-data';
import {
  BASE_SPIRITS,
  CATA,
  DEVIATIONS,
  GLASSWARE,
  ELICITATION_COLLECTION,
  LEGACY_PALATE_COLLECTION,
  LEGACY_POUR_COLLECTION,
  MAKER_COLLECTION,
  MENU_COLLECTION,
  PALATE_COLLECTION,
  POUR_COLLECTION,
  RECIPE_COLLECTION,
  VENUE_COLLECTION,
  cataId,
} from './vocab.ts';
import { datetime, lexInteger, lexString, registerFormat, writtenDatetime } from './lex-string.ts';
import { ElicitationRecordSchema } from './elicitation-record.ts';

// Named, not `export *`: a dynamic import() of a transpiled module cannot see
// star re-exports, and the tests import this module dynamically.
export {
  DEFS_LEXICON,
  PALATE_COLLECTION,
  PALATE_RKEY,
  POUR_COLLECTION,
  MENU_COLLECTION,
  RECIPE_COLLECTION,
  VENUE_COLLECTION,
  MAKER_COLLECTION,
  ELICITATION_COLLECTION,
  LEGACY_PALATE_COLLECTION,
  LEGACY_POUR_COLLECTION,
  SELF_RKEY,
  DEVIATIONS,
  CATA,
  cataId,
  BASE_SPIRITS,
  GLASSWARE,
  VIBE_TAGS,
  GLMS_ANCHORS,
  ASKED_INTENSITIES,
  type Deviation,
  type CataNote,
  type BaseSpirit,
  type Glassware,
  type GlmsAnchor,
  type AskedIntensity,
} from './vocab.ts';
export {
  STRING_LIMITS,
  utf8Length,
  graphemeLength,
  registerFormat,
  lexString,
  isLexInteger,
  lexInteger,
  datetime,
  writtenDatetime,
  fitString,
  type StringLimits,
} from './lex-string.ts';
export {
  ElicitationOptionSchema,
  ElicitationAnswerSchema,
  ElicitationRecordSchema,
  ElicitationWriteSchema,
  type ElicitationAnswer,
  type ElicitationRecord,
} from './elicitation-record.ts';

// Formats the browser does not need, registered before any schema below uses them.
registerFormat('did', (s) => isValidDid(s));
registerFormat('at-uri', (s) => isAtUriString(s));
registerFormat('cid', (s) => parseCidSafe(s) !== null);
registerFormat('uri', (s) => isValidUri(s));

// ---------------------------------------------------------------------------
// Shared references (app.cotidal.defs)
// ---------------------------------------------------------------------------

/**
 * A reference to something that may not have an account yet. `name` is always
 * present so the record stands alone; `uri`/`did` appear once it is claimed.
 * Unclaimed references are reconciled by the app view — never by rewriting
 * somebody's signed record.
 */
export const EntityRefSchema = z.object({
  name: lexString({ maxLength: 200, maxGraphemes: 100 }),
  uri: lexString({ format: 'at-uri' }).optional(),
  cid: lexString({ format: 'cid' }).optional(),
  did: lexString({ format: 'did' }).optional(),
  domain: lexString({ maxLength: 253 }).optional(),
});
export type EntityRef = z.infer<typeof EntityRefSchema>;

/**
 * Location encodings borrowed from `community.lexicon.location.*` rather than
 * invented here, so any app speaking that vocabulary agrees which place is
 * meant. Kept permissive: these shapes are governed by the Lexicon Community
 * and should be verified against the source before being tightened.
 */
export const LocationSchema = z.looseObject({ $type: z.string() });
export type Location = z.infer<typeof LocationSchema>;

export const VenueRefSchema = z.object({
  entity: EntityRefSchema,
  address: LocationSchema.optional(),
});
export type VenueRef = z.infer<typeof VenueRefSchema>;

/** Integers only, named for their unit: the AT Protocol has no floats. */
export const StimulusSchema = z.object({
  matrixType: z.enum(['cocktail', 'wine', 'spirit', 'beer', 'tea', 'coffee', 'cider', 'non-alcoholic']).optional(),
  abvTenths: lexInteger().min(0).max(1000).optional(),
  residualSugarGpl: lexInteger().min(0).optional(),
  acidityPhHundredths: lexInteger().min(100).max(1400).optional(),
  astringencyIndexTenths: lexInteger().min(0).max(100).optional(),
});
export type Stimulus = z.infer<typeof StimulusSchema>;

/**
 * A drink category is folklore and unowned — it is a `slug` in an open
 * catalog. A `recipe` is the authored, ownable formulation.
 */
export const DrinkRefSchema = z.object({
  name: lexString({ maxLength: 200, maxGraphemes: 100 }),
  slug: lexString({ maxLength: 64 }).optional(),
  baseSpirit: lexString({ maxLength: 32 }).optional(),
  recipe: EntityRefSchema.optional(),
  stimulus: StimulusSchema.optional(),
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
  amount: lexInteger().min(0),
  currency: lexString({ minLength: 3, maxLength: 3 }),
});
export type Price = z.infer<typeof PriceSchema>;

// ---------------------------------------------------------------------------
// app.cotidal.palate
// ---------------------------------------------------------------------------

/**
 * The palate as the app works with it: plain numbers. This is never written
 * as-is — the AT Protocol data model has no floats — but encoded by
 * `encodePalate` into `PalateRecord`, the shape the lexicon describes.
 */
export const DynamicStateSchema = z.object({
  latentVector: z.array(z.number()),
  covarianceDiagonal: z.array(z.number()),
  eventCount: lexInteger().min(0),
  lastUpdate: datetime().optional(),
});
export type DynamicState = z.infer<typeof DynamicStateSchema>;

const AversionsSchema = z.object({
  smoke: z.boolean(),
  bitter: z.boolean(),
  anise: z.boolean(),
});

export const PalateSchema = z.object({
  $type: z.literal(PALATE_COLLECTION),
  mapCoordinates: z.object({
    x: z.number().min(-10).max(10),
    y: z.number().min(-10).max(10),
  }),
  dynamicState: DynamicStateSchema,
  aversions: AversionsSchema,
  vibeTags: z.record(z.string(), z.number()),
  createdAt: datetime(),
  updatedAt: datetime().optional(),
});
export type Palate = z.infer<typeof PalateSchema>;

/** Every fractional quantity is stored as an integer count of hundredths. */
const hundredths = lexInteger();
const coordinateHundredths = hundredths.min(-1000).max(1000);

/** `app.cotidal.palate` as written to a repository: integers only. */
export const PalateRecordSchema = z.object({
  $type: z.literal(PALATE_COLLECTION),
  mapCoordinates: z.object({
    xHundredths: coordinateHundredths,
    yHundredths: coordinateHundredths,
  }),
  dynamicState: z.object({
    latentVectorHundredths: z.array(hundredths).length(5),
    covarianceDiagonalHundredths: z.array(hundredths.min(0)).length(5),
    eventCount: lexInteger().min(0),
    lastUpdate: datetime().optional(),
  }),
  aversions: AversionsSchema,
  vibeTagWeights: z
    .array(z.object({ tag: lexString({ maxLength: 32 }), weightHundredths: hundredths }))
    .max(32),
  createdAt: datetime(),
  updatedAt: datetime().optional(),
});
export type PalateRecord = z.infer<typeof PalateRecordSchema>;

/**
 * The hundredths encoding before `vibeTagWeights`: tags as an open object,
 * which Lexicon cannot describe. Read, never written.
 */
const PreviousPalateRecordSchema = PalateRecordSchema.omit({ vibeTagWeights: true }).extend({
  vibeTagsHundredths: z.record(z.string(), hundredths),
});

const toHundredths = (v: number) => Math.round(v * 100);
const fromHundredths = (v: number) => v / 100;
const clampCoordinate = (v: number) => Math.max(-1000, Math.min(1000, toHundredths(v)));

/** The palate as a record a repository will accept. */
export function encodePalate(palate: Palate): PalateRecord {
  const { dynamicState: d } = palate;
  return {
    $type: PALATE_COLLECTION,
    mapCoordinates: {
      xHundredths: clampCoordinate(palate.mapCoordinates.x),
      yHundredths: clampCoordinate(palate.mapCoordinates.y),
    },
    dynamicState: {
      latentVectorHundredths: d.latentVector.map(toHundredths),
      covarianceDiagonalHundredths: d.covarianceDiagonal.map((v) => Math.max(0, toHundredths(v))),
      eventCount: d.eventCount,
      ...(d.lastUpdate ? { lastUpdate: d.lastUpdate } : {}),
    },
    aversions: palate.aversions,
    // One entry per tag, in a stable order so an unchanged palate writes the same bytes.
    vibeTagWeights: Object.entries(palate.vibeTags)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 32)
      .map(([tag, weight]) => ({ tag, weightHundredths: toHundredths(weight) })),
    createdAt: palate.createdAt,
    ...(palate.updatedAt ? { updatedAt: palate.updatedAt } : {}),
  };
}

/**
 * Where a palate record puts its owner, in either encoding: hundredths, or
 * the plain floats written before them. `null` when it is neither.
 */
export function decodeCoordinates(raw: unknown): { x: number; y: number } | null {
  const c = (raw as { mapCoordinates?: Record<string, unknown> } | null)?.mapCoordinates;
  if (!c || typeof c !== 'object') return null;
  const point =
    Number.isInteger(c.xHundredths) && Number.isInteger(c.yHundredths)
      ? { x: fromHundredths(c.xHundredths as number), y: fromHundredths(c.yHundredths as number) }
      : typeof c.x === 'number' && typeof c.y === 'number'
        ? { x: c.x, y: c.y }
        : null;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  if (Math.abs(point.x) > 10 || Math.abs(point.y) > 10) return null;
  return point;
}

/**
 * A palate record read from a repository, in any encoding it has been written
 * in and under either namespace, as the app works with it. A `phenotypes`
 * field on an older record is ignored. Records written before the hundredths encoding still read;
 * the next write migrates them. `null` for anything that is not a palate.
 */
export function decodePalate(input: unknown): Palate | null {
  // A record from before the rename carries the old $type; its body is the same.
  const raw =
    input && typeof input === 'object' && (input as { $type?: unknown }).$type === LEGACY_PALATE_COLLECTION
      ? { ...(input as object), $type: PALATE_COLLECTION }
      : input;
  const current = PalateRecordSchema.safeParse(raw);
  const previous = current.success ? null : PreviousPalateRecordSchema.safeParse(raw);
  if (current.success || previous?.success) {
    const r = current.success ? current.data : previous!.data!;
    const weights: [string, number][] =
      'vibeTagWeights' in r
        ? r.vibeTagWeights.map((w) => [w.tag, w.weightHundredths])
        : Object.entries(r.vibeTagsHundredths);
    return {
      $type: PALATE_COLLECTION,
      mapCoordinates: {
        x: fromHundredths(r.mapCoordinates.xHundredths),
        y: fromHundredths(r.mapCoordinates.yHundredths),
      },
      dynamicState: {
        latentVector: r.dynamicState.latentVectorHundredths.map(fromHundredths),
        covarianceDiagonal: r.dynamicState.covarianceDiagonalHundredths.map(fromHundredths),
        eventCount: r.dynamicState.eventCount,
        ...(r.dynamicState.lastUpdate ? { lastUpdate: r.dynamicState.lastUpdate } : {}),
      },
      aversions: r.aversions,
      vibeTags: Object.fromEntries(weights.map(([tag, weight]) => [tag, fromHundredths(weight)])),
      createdAt: r.createdAt,
      ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}),
    };
  }
  const legacy = PalateSchema.safeParse(raw);
  return legacy.success ? legacy.data : null;
}



// ---------------------------------------------------------------------------
// app.cotidal.pour
// ---------------------------------------------------------------------------

export const RatingSchema = z.object({
  /** 9-point hedonic scale: 1 dislike extremely, 5 neutral, 9 like extremely. */
  hedonic: lexInteger().min(1).max(9),
  /** Bipolar gLMS liking score, −100 to +100, in whole points. */
  glmsValence: lexInteger().min(-100).max(100).optional(),
  /**
   * Adoption rather than approval. A recipe's reception is built from this —
   * "reordered by 61%" credits a designer without producing a score that
   * could shame one.
   */
  wouldOrderAgain: z.boolean().optional(),
});
export type Rating = z.infer<typeof RatingSchema>;

const intensity = lexInteger().min(0).max(100);
export const PerceivedIntensitiesSchema = z.object({
  sweetness: intensity.optional(),
  sourness: intensity.optional(),
  bitterness: intensity.optional(),
  astringency: intensity.optional(),
  effervescence: intensity.optional(),
  alcoholHeat: intensity.optional(),
});
export type PerceivedIntensities = z.infer<typeof PerceivedIntensitiesSchema>;

export const PourRecordSchema = z.object({
  $type: z.literal(POUR_COLLECTION),
  drink: DrinkRefSchema,
  venue: VenueRefSchema.optional(),
  menu: EntityRefSchema.optional(),
  credits: z.array(CreditSchema).max(10).optional(),
  rating: RatingSchema,
  perceivedIntensities: PerceivedIntensitiesSchema.optional(),
  deviations: z.array(lexString({ maxLength: 32 })).max(10).optional(),
  cata: z.array(lexString({ maxLength: 32 })).max(20).optional(),
  glassware: lexString({ maxLength: 100 }).optional(),
  garnish: lexString({ maxLength: 200 }).optional(),
  note: lexString({ maxLength: 3000, maxGraphemes: 1000 }).optional(),
  isHomePour: z.boolean().optional(),
  createdAt: datetime(),
});
export type PourRecord = z.infer<typeof PourRecordSchema>;

/** Note limits, for fitting free text before it is written. */
export const POUR_NOTE_LIMITS = { maxLength: 3000, maxGraphemes: 1000 } as const;

/**
 * A pour this app is about to write. The lexicon's `knownValues` are open, so
 * a reader accepts any deviation or note another client wrote; a writer here
 * only writes the ones it knows.
 */
export const PourWriteSchema = PourRecordSchema.extend({
  drink: DrinkRefSchema.extend({ baseSpirit: z.enum(BASE_SPIRITS).optional() }),
  deviations: z.array(z.enum(DEVIATIONS)).max(10).optional(),
  cata: z.array(z.enum(CATA)).max(20).optional(),
  glassware: z.enum(GLASSWARE).optional(),
  createdAt: writtenDatetime(),
});

/**
 * A pour as read from a repository, or `null` when it is not one. Accepts the
 * collection before the rename, and maps CATA labels stored before the ids.
 * Anything can be written to a collection in someone's repo, so a pour is
 * parsed before it is trusted, not cast.
 */
export function readPour(value: unknown): PourRecord | null {
  const raw =
    value && typeof value === 'object' && (value as { $type?: unknown }).$type === LEGACY_POUR_COLLECTION
      ? { ...(value as object), $type: POUR_COLLECTION }
      : value;
  const parsed = PourRecordSchema.safeParse(raw);
  if (!parsed.success) return null;
  const pour = parsed.data;
  return pour.cata ? { ...pour, cata: pour.cata.map(cataId) } : pour;
}

// ---------------------------------------------------------------------------
// app.cotidal.menu
// ---------------------------------------------------------------------------

export const MenuItemSchema = z.object({
  drink: DrinkRefSchema,
  /** The menu's own words — the best signal for matching a house name. */
  description: lexString({ maxLength: 1000, maxGraphemes: 500 }).optional(),
  price: PriceSchema.optional(),
  credits: z.array(CreditSchema).max(10).optional(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuSectionSchema = z.object({
  name: lexString({ maxLength: 200, maxGraphemes: 100 }).optional(),
  items: z.array(MenuItemSchema).max(200),
});

/** Present on a patron's sighting; absent on a venue's own publication. */
export const MenuCaptureSchema = z.object({
  method: z.enum(['photo', 'manual', 'import']),
  photo: z.unknown().optional(),
  confidence: lexInteger().min(0).max(100).optional(),
});

export const MenuRecordSchema = z.object({
  $type: z.literal(MENU_COLLECTION),
  venue: VenueRefSchema,
  title: lexString({ maxLength: 200, maxGraphemes: 100 }).optional(),
  publishedAt: datetime(),
  validFrom: datetime().optional(),
  validUntil: datetime().optional(),
  sections: z.array(MenuSectionSchema).max(40).optional(),
  capture: MenuCaptureSchema.optional(),
  /** Standard.site document pointer if published to a publication. */
  document: EntityRefSchema.optional(),
  createdAt: datetime().optional(),
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
// app.cotidal.recipe / venue / maker
// ---------------------------------------------------------------------------

export const RecipeRecordSchema = z.object({
  $type: z.literal(RECIPE_COLLECTION),
  name: lexString({ maxLength: 200, maxGraphemes: 100 }),
  slug: lexString({ maxLength: 64 }).optional(),
  description: lexString({ maxLength: 2000, maxGraphemes: 1000 }).optional(),
  ingredients: z
    .array(
      z.object({
        name: lexString({ maxLength: 200 }),
        amount: lexString({ maxLength: 50 }).optional(),
        optional: z.boolean().optional(),
      })
    )
    .max(40)
    .optional(),
  method: lexString({ maxLength: 4000, maxGraphemes: 2000 }).optional(),
  glassware: lexString({ maxLength: 100 }).optional(),
  garnish: lexString({ maxLength: 200 }).optional(),
  credits: z.array(CreditSchema).max(10).optional(),
  adaptedFrom: EntityRefSchema.optional(),
  coordinates: z
    .object({
      xHundredths: lexInteger().min(-1000).max(1000),
      yHundredths: lexInteger().min(-1000).max(1000),
    })
    .optional(),
  stimulus: StimulusSchema.optional(),
  createdAt: datetime(),
  updatedAt: datetime().optional(),
});
export type RecipeRecord = z.infer<typeof RecipeRecordSchema>;

export const VenueRecordSchema = z.object({
  $type: z.literal(VENUE_COLLECTION),
  name: lexString({ maxLength: 200, maxGraphemes: 100 }),
  description: lexString({ maxLength: 2000, maxGraphemes: 1000 }).optional(),
  location: LocationSchema.optional(),
  website: lexString({ format: 'uri' }).optional(),
  /** Menus are immutable, so a venue points at the one that is live. */
  currentMenu: EntityRefSchema.optional(),
  /** Standard.site publication pointer (site.standard.publication at rkey self). */
  publication: EntityRefSchema.optional(),
  createdAt: datetime(),
});
export type VenueRecord = z.infer<typeof VenueRecordSchema>;

/**
 * Deliberately carries no score and no aggregate. A portfolio is computed by
 * following `recipes` out to the works and reading their reception — a pull
 * the maker initiates, not a number anyone can rank them by.
 */
export const MakerRecordSchema = z.object({
  $type: z.literal(MAKER_COLLECTION),
  displayName: lexString({ maxLength: 200, maxGraphemes: 100 }),
  bio: lexString({ maxLength: 2000, maxGraphemes: 1000 }).optional(),
  recipes: z.array(EntityRefSchema).max(200).optional(),
  venues: z.array(EntityRefSchema).max(50).optional(),
  createdAt: datetime(),
});
export type MakerRecord = z.infer<typeof MakerRecordSchema>;

/**
 * Every record this app reads or writes, by collection. `npm run lexicons`
 * compares each against its lexicon, so a record type is not finished until
 * it is listed here.
 */
export const RECORD_SCHEMAS: Record<string, z.ZodObject> = {
  [PALATE_COLLECTION]: PalateRecordSchema,
  [POUR_COLLECTION]: PourRecordSchema,
  [ELICITATION_COLLECTION]: ElicitationRecordSchema,
  [MENU_COLLECTION]: MenuRecordSchema,
  [RECIPE_COLLECTION]: RecipeRecordSchema,
  [VENUE_COLLECTION]: VenueRecordSchema,
  [MAKER_COLLECTION]: MakerRecordSchema,
};
