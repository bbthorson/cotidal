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
  vibeTags: z.record(z.string(), z.number()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type PalateRecord = z.infer<typeof PalateRecordSchema>;

export const DrinkLogRecordSchema = z.object({
  $type: z.literal(DRINK_LOG_COLLECTION),
  drinkName: z.string().min(1),
  location: z.string().max(100).optional(),
  hedonicScale: z.number().int().min(1).max(9),
  deviations: z.array(z.enum([
    "too-sweet", "not-sweet-enough",
    "too-sour", "not-sour-enough",
    "too-bitter", "too-smoky", "too-anise",
    "too-rich", "too-crisp",
    "too-flat", "too-fizzy"
  ])).optional(),
  note: z.string().max(300).optional(),
  palateShift: z.object({
    x: z.number(),
    y: z.number()
  }),
  createdAt: z.string().datetime(),
});

export type DrinkLogRecord = z.infer<typeof DrinkLogRecordSchema>;

