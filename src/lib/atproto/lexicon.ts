import { z } from 'zod';

export const PALATE_COLLECTION = 'app.crystalcoupe.palate';
export const PALATE_RKEY = 'self';

export const PalateRecordSchema = z.object({
  $type: z.literal(PALATE_COLLECTION),
  x: z.number().min(-10).max(10),
  y: z.number().min(-10).max(10),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
  dislikesAnise: z.boolean(),
  vibeTags: z.record(z.string(), z.number()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type PalateRecord = z.infer<typeof PalateRecordSchema>;
