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

export const DEFS_LEXICON = 'app.cotidal.defs';
export const PALATE_COLLECTION = 'app.cotidal.palate';
export const PALATE_RKEY = 'self';
export const POUR_COLLECTION = 'app.cotidal.pour';
export const MENU_COLLECTION = 'app.cotidal.menu';
export const RECIPE_COLLECTION = 'app.cotidal.recipe';
export const VENUE_COLLECTION = 'app.cotidal.venue';
export const MAKER_COLLECTION = 'app.cotidal.maker';
export const ELICITATION_COLLECTION = 'app.cotidal.elicitation';

/**
 * The namespace before the rename to Cotidal. Read-only: palates and pours
 * written under it are still read (publish.ts, public-read.ts) so nobody's
 * map empties, but nothing is written there and those records are never
 * rewritten or deleted by the app. The next palate write lands under
 * `app.cotidal.*`.
 */
export const LEGACY_PALATE_COLLECTION = 'app.crystalcoupe.palate';
export const LEGACY_POUR_COLLECTION = 'app.crystalcoupe.pour';

/** Records held at a fixed key, one per repo. */
export const SELF_RKEY = 'self';

// ---------------------------------------------------------------------------
// Lexicon strings
// ---------------------------------------------------------------------------

/**
 * A lexicon string's limits. `maxLength` counts UTF-8 bytes and
 * `maxGraphemes` user-perceived characters — neither is what `.length` or
 * Zod's `.max()` count (UTF-16 code units), so a note in emoji or a
 * non-Latin script could pass those and still break the record's limits.
 */
export interface StringLimits {
  minLength?: number;
  maxLength?: number;
  maxGraphemes?: number;
  format?: 'datetime' | 'did' | 'at-uri' | 'cid' | 'uri';
}

/** What each `lexString` was built with, for the lexicon checker to compare. */
export const STRING_LIMITS = new WeakMap<z.ZodTypeAny, StringLimits>();

const encoder = new TextEncoder();
export const utf8Length = (s: string) => encoder.encode(s).length;

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
const graphemes = (s: string): string[] =>
  segmenter ? Array.from(segmenter.segment(s), (g) => g.segment) : Array.from(s);
export const graphemeLength = (s: string) => graphemes(s).length;

/**
 * Datetimes as the AT Protocol writes them: RFC 3339 with an explicit offset.
 * `Z` and `+02:00` are both valid. Zod's bare `.datetime()` refuses the second,
 * which would drop a valid record written by another client.
 */
const DATETIME = z.string().datetime({ offset: true });

const FORMATS: Record<NonNullable<StringLimits['format']>, (s: string) => boolean> = {
  datetime: (s) => DATETIME.safeParse(s).success,
  did: (s) => /^did:[a-z]+:[a-zA-Z0-9._:%-]*[a-zA-Z0-9._-]$/.test(s),
  'at-uri': (s) => /^at:\/\/[^\s/]+(\/[^\s]*)?$/.test(s),
  cid: (s) => /^[a-zA-Z0-9+/=]{8,256}$/.test(s),
  uri: (s) => /^[a-z][a-z0-9+.-]*:\S+$/i.test(s),
};

/** A string checked the way its lexicon defines it. */
export function lexString(limits: StringLimits = {}) {
  const schema = z.string().superRefine((value, ctx) => {
    const bytes = utf8Length(value);
    if (limits.minLength !== undefined && bytes < limits.minLength) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `shorter than ${limits.minLength} bytes` });
    }
    if (limits.maxLength !== undefined && bytes > limits.maxLength) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `longer than ${limits.maxLength} bytes` });
    }
    if (limits.maxGraphemes !== undefined && graphemeLength(value) > limits.maxGraphemes) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `longer than ${limits.maxGraphemes} characters` });
    }
    if (limits.format && !FORMATS[limits.format](value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `not a valid ${limits.format}` });
    }
  });
  STRING_LIMITS.set(schema, limits);
  return schema;
}

const datetime = () => lexString({ format: 'datetime' });

/**
 * Cut a string to fit a lexicon's limits, on a character boundary, so free
 * text is kept rather than refused. Bytes and graphemes are both honoured.
 */
export function fitString(value: string, maxLength: number, maxGraphemes?: number): string {
  let out = '';
  let bytes = 0;
  let count = 0;
  for (const g of graphemes(value)) {
    const size = utf8Length(g);
    if (bytes + size > maxLength || (maxGraphemes !== undefined && count + 1 > maxGraphemes)) break;
    out += g;
    bytes += size;
    count += 1;
  }
  return out;
}

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
export const LocationSchema = z.object({ $type: z.string() }).passthrough();
export type Location = z.infer<typeof LocationSchema>;

export const VenueRefSchema = z.object({
  entity: EntityRefSchema,
  address: LocationSchema.optional(),
});
export type VenueRef = z.infer<typeof VenueRefSchema>;

/** Integers only, named for their unit: the AT Protocol has no floats. */
export const StimulusSchema = z.object({
  matrixType: z.enum(['cocktail', 'wine', 'spirit', 'beer', 'tea', 'coffee', 'cider', 'non-alcoholic']).optional(),
  abvTenths: z.number().int().min(0).max(1000).optional(),
  residualSugarGpl: z.number().int().min(0).optional(),
  acidityPhHundredths: z.number().int().min(100).max(1400).optional(),
  astringencyIndexTenths: z.number().int().min(0).max(100).optional(),
});
export type Stimulus = z.infer<typeof StimulusSchema>;

/**
 * A drink category is folklore and unowned — it is a `slug` in an open
 * catalog. A `recipe` is the authored, ownable formulation.
 */
export const DrinkRefSchema = z.object({
  name: lexString({ maxLength: 200, maxGraphemes: 100 }),
  slug: lexString({ maxLength: 64 }).optional(),
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
  amount: z.number().int().min(0),
  currency: lexString({ minLength: 3, maxLength: 3 }),
});
export type Price = z.infer<typeof PriceSchema>;

// ---------------------------------------------------------------------------
// app.cotidal.palate
// ---------------------------------------------------------------------------

export const PhenotypesSchema = z.object({
  tas2r38BitterSensitivity: z.enum(['non-taster', 'medium-taster', 'super-taster']).optional(),
  trigeminalTolerance: z.enum(['low', 'moderate', 'high']).optional(),
});
export type Phenotypes = z.infer<typeof PhenotypesSchema>;

/**
 * The palate as the app works with it: plain numbers. This is never written
 * as-is — the AT Protocol data model has no floats — but encoded by
 * `encodePalate` into `PalateRecord`, the shape the lexicon describes.
 */
export const DynamicStateSchema = z.object({
  latentVector: z.array(z.number()),
  covarianceDiagonal: z.array(z.number()),
  eventCount: z.number().int().min(0),
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
  phenotypes: PhenotypesSchema,
  aversions: AversionsSchema,
  vibeTags: z.record(z.string(), z.number()),
  createdAt: datetime(),
  updatedAt: datetime().optional(),
});
export type Palate = z.infer<typeof PalateSchema>;

/** Every fractional quantity is stored as an integer count of hundredths. */
const hundredths = z.number().int();
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
    eventCount: z.number().int().min(0),
    lastUpdate: datetime().optional(),
  }),
  phenotypes: PhenotypesSchema,
  aversions: AversionsSchema,
  vibeTagsHundredths: z.record(z.string(), hundredths),
  createdAt: datetime(),
  updatedAt: datetime().optional(),
});
export type PalateRecord = z.infer<typeof PalateRecordSchema>;

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
    phenotypes: palate.phenotypes,
    aversions: palate.aversions,
    vibeTagsHundredths: Object.fromEntries(
      Object.entries(palate.vibeTags).map(([tag, weight]) => [tag, toHundredths(weight)])
    ),
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
 * A palate record read from a repository, in either encoding and under
 * either namespace, as the app works with it. Records written before the hundredths encoding still read;
 * the next write migrates them. `null` for anything that is not a palate.
 */
export function decodePalate(input: unknown): Palate | null {
  // A record from before the rename carries the old $type; its body is the same.
  const raw =
    input && typeof input === 'object' && (input as { $type?: unknown }).$type === LEGACY_PALATE_COLLECTION
      ? { ...(input as object), $type: PALATE_COLLECTION }
      : input;
  const current = PalateRecordSchema.safeParse(raw);
  if (current.success) {
    const r = current.data;
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
      phenotypes: r.phenotypes,
      aversions: r.aversions,
      vibeTags: Object.fromEntries(
        Object.entries(r.vibeTagsHundredths).map(([tag, weight]) => [tag, fromHundredths(weight)])
      ),
      createdAt: r.createdAt,
      ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}),
    };
  }
  const legacy = PalateSchema.safeParse(raw);
  return legacy.success ? legacy.data : null;
}

// ---------------------------------------------------------------------------
// app.cotidal.elicitation — the answers behind one completed quiz
// ---------------------------------------------------------------------------

/** Integers only: the AT Protocol data model has no floats. */
const tenths = z.number().int().min(-100).max(100);

export const ElicitationOptionSchema = z.object({
  dxTenths: tenths,
  dyTenths: tenths,
});

export const ElicitationAnswerSchema = z
  .object({
    questionId: lexString({ maxLength: 64 }),
    kind: lexString({ maxLength: 32 }).optional(),
    generated: z.boolean().optional(),
    options: z.array(ElicitationOptionSchema).min(1).max(6),
    chosen: z.number().int().min(0).max(5),
  })
  .refine((a) => a.chosen < a.options.length, { message: 'chosen is not one of the options' });
export type ElicitationAnswer = z.infer<typeof ElicitationAnswerSchema>;

export const ElicitationRecordSchema = z.object({
  $type: z.literal(ELICITATION_COLLECTION),
  responseModel: lexString({ maxLength: 64 }),
  answers: z.array(ElicitationAnswerSchema).min(1).max(16),
  createdAt: datetime(),
});
export type ElicitationRecord = z.infer<typeof ElicitationRecordSchema>;

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
// app.cotidal.pour
// ---------------------------------------------------------------------------

export const DEVIATIONS = [
  'too-sweet', 'not-sweet-enough',
  'too-sour', 'not-sour-enough',
  'too-bitter', 'too-smoky', 'too-anise',
  'too-rich', 'too-crisp',
  'too-flat', 'too-fizzy',
] as const;
export type Deviation = (typeof DEVIATIONS)[number];

/**
 * Check-all-that-apply notes, as stored. Stable ids rather than the labels
 * shown (`pour.cata` in copy.ts), so rewording a label does not split the
 * data. Each id is its label slugified, which is also how a pour written
 * before the ids — when the label itself was stored — is read back.
 */
export const CATA = [
  'bright-citrus', 'lime-peel', 'stone-fruit', 'dark-cherry',
  'campfire-smoke', 'botanical-herb', 'baking-spice', 'toasted-oak',
  'floral-blossom', 'bittersweet-cocoa', 'briny-mineral', 'rich-velvet-body',
] as const;
export type CataNote = (typeof CATA)[number];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** A stored note as its id: an id stays, a pre-id label maps, anything else is kept as written. */
export function cataId(note: string): string {
  if ((CATA as readonly string[]).includes(note)) return note;
  const slug = slugify(note);
  return (CATA as readonly string[]).includes(slug) ? slug : note;
}

export const RatingSchema = z.object({
  /** 9-point hedonic scale: 1 dislike extremely, 5 neutral, 9 like extremely. */
  hedonic: z.number().int().min(1).max(9),
  /** Bipolar gLMS liking score, −100 to +100, in whole points. */
  glmsValence: z.number().int().min(-100).max(100).optional(),
  /**
   * Adoption rather than approval. A recipe's reception is built from this —
   * "reordered by 61%" credits a designer without producing a score that
   * could shame one.
   */
  wouldOrderAgain: z.boolean().optional(),
});
export type Rating = z.infer<typeof RatingSchema>;

const intensity = z.number().int().min(0).max(100);
export const PerceivedIntensitiesSchema = z.object({
  sweetness: intensity.optional(),
  sourness: intensity.optional(),
  bitterness: intensity.optional(),
  astringency: intensity.optional(),
  effervescence: intensity.optional(),
});
export type PerceivedIntensities = z.infer<typeof PerceivedIntensitiesSchema>;

export const PourContextSchema = z.object({
  volumeConsumedMl: z.number().int().min(0).optional(),
  fastingDurationHours: z.number().int().min(0).optional(),
});
export type PourContext = z.infer<typeof PourContextSchema>;

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
  context: PourContextSchema.optional(),
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
  deviations: z.array(z.enum(DEVIATIONS)).max(10).optional(),
  cata: z.array(z.enum(CATA)).max(20).optional(),
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
  confidence: z.number().int().min(0).max(100).optional(),
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
      x: z.number().int().min(-10).max(10),
      y: z.number().int().min(-10).max(10),
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
export const RECORD_SCHEMAS: Record<string, z.ZodTypeAny> = {
  [PALATE_COLLECTION]: PalateRecordSchema,
  [POUR_COLLECTION]: PourRecordSchema,
  [ELICITATION_COLLECTION]: ElicitationRecordSchema,
  [MENU_COLLECTION]: MenuRecordSchema,
  [RECIPE_COLLECTION]: RecipeRecordSchema,
  [VENUE_COLLECTION]: VenueRecordSchema,
  [MAKER_COLLECTION]: MakerRecordSchema,
};
