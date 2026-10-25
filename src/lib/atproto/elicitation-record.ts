/**
 * `app.cotidal.elicitation` — the answers behind one completed quiz. Its own
 * module because the browser validates a quiz's answers before keeping them
 * (src/lib/elicitation.ts), and should not load every other record's schema
 * to do it. records.ts re-exports it.
 */
import { z } from 'zod';
import { ELICITATION_COLLECTION } from './vocab.ts';
import { datetime, lexInteger, lexString, writtenDatetime } from './lex-string.ts';

/** Integers only: the AT Protocol data model has no floats. */
const tenths = lexInteger().min(-100).max(100);

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
    chosen: lexInteger().min(0).max(5),
  })
  // A refinement in Zod 4 is a check on the object, not a wrapper around it,
  // so `.shape` still reads and the lexicon checker compares it as an object.
  // It runs only once every field has parsed.
  .refine((a) => a.chosen < a.options.length, { error: 'chosen is not one of the options' });
export type ElicitationAnswer = z.infer<typeof ElicitationAnswerSchema>;

export const ElicitationRecordSchema = z.object({
  $type: z.literal(ELICITATION_COLLECTION),
  responseModel: lexString({ maxLength: 64 }),
  answers: z.array(ElicitationAnswerSchema).min(1).max(16),
  createdAt: datetime(),
});
export type ElicitationRecord = z.infer<typeof ElicitationRecordSchema>;

/** Answers this app is about to write. The browser sets `createdAt`, so the server holds it to the strict form. */
export const ElicitationWriteSchema = ElicitationRecordSchema.extend({
  createdAt: writtenDatetime(),
});
