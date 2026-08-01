import { z } from 'zod';

export const PALATE_COLLECTION = 'app.crystalcoupe.palate';
export const PALATE_RKEY = 'self';
export const DRINK_LOG_COLLECTION = 'app.crystalcoupe.drinkLog';

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

export const VenueSchema = z.object({
  name: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export type Venue = z.infer<typeof VenueSchema>;

export const DrinkLogRecordSchema = z.object({
  $type: z.literal(DRINK_LOG_COLLECTION),
  drinkName: z.string().min(1).max(128),
  baseSpirit: z.string().max(64).optional(),
  rating: z.number().min(0).max(10).optional(),
  hedonicScale: z.number().int().min(1).max(9).optional(),
  isHomePour: z.boolean().optional(),
  location: z.string().max(100).optional(),
  venue: VenueSchema.optional(),
  sensoryProfile: SensoryProfileSchema.optional(),
  glassware: z.string().optional(),
  garnish: z.string().optional(),
  deviations: z.array(z.enum([
    "too-sweet", "not-sweet-enough",
    "too-sour", "not-sour-enough",
    "too-bitter", "too-smoky", "too-anise",
    "too-rich", "too-crisp",
    "too-flat", "too-fizzy"
  ])).optional(),
  notes: z.string().max(1000).optional(),
  note: z.string().max(1000).optional(),
  palateShift: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  createdAt: z.string().datetime(),
});

export type DrinkLogRecord = z.infer<typeof DrinkLogRecordSchema>;

