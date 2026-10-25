import { RESPONSE_MODEL, type QuizResponse } from './belief-state';
import { ELICITATION_COLLECTION } from './atproto/vocab';
import { ElicitationRecordSchema, type ElicitationRecord } from './atproto/elicitation-record';

/**
 * A finished quiz's answers as an `app.cotidal.elicitation` record.
 *
 * Nudges are stored in tenths because the AT Protocol data model has no
 * floats. Every bank nudge is a whole number; a generated question's nudge
 * is rounded to the nearest tenth, which is finer than anything it encodes.
 * Returns `null` when there is nothing valid to log.
 */
export function toElicitationRecord(
  responses: QuizResponse[],
  createdAt = new Date().toISOString()
): ElicitationRecord | null {
  const tenths = (v: number) => Math.max(-100, Math.min(100, Math.round(v * 10)));
  const record = {
    $type: ELICITATION_COLLECTION,
    responseModel: RESPONSE_MODEL,
    answers: responses.slice(0, 16).map((r) => ({
      questionId: r.questionId.slice(0, 64),
      kind: r.kind,
      ...(r.generated ? { generated: true } : {}),
      options: r.options.slice(0, 6).map((o) => ({ dxTenths: tenths(o.dx), dyTenths: tenths(o.dy) })),
      chosen: r.chosen,
    })),
    createdAt,
  };
  const parsed = ElicitationRecordSchema.safeParse(record);
  return parsed.success ? parsed.data : null;
}
