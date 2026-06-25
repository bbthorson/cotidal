import type { VibeTag } from './data';
import type { BeliefState, FilterState } from './belief-state';
import { getMaxUncertaintyAxis, getProgressContext } from './belief-state';

const VALID_VIBE_TAGS: VibeTag[] = [
  'bold', 'classic', 'visual', 'social', 'comfort', 'complex',
  'sweet', 'messy', 'polarizing', 'prestige', 'warm', 'spice', 'crushable',
];

const VALID_FILTER_KEYS = ['dislikesSmoke', 'dislikesBitter', 'dislikesAnise'] as const;
type FilterKey = (typeof VALID_FILTER_KEYS)[number];

export interface AIQuestionResponse {
  feedback: string;
  question: {
    text: string;
    primaryAxis: 'x' | 'y';
    options: Array<{
      text: string;
      dx: number;
      dy: number;
      vibeTags?: VibeTag[];
      filterFlag?: { key: FilterKey; value: boolean };
    }>;
  } | null;
}

function uncertaintyLabel(variance: number): string {
  if (variance > 10) return 'high';
  if (variance > 5) return 'moderate';
  return 'low';
}

function getUnresolvedFilters(filters: FilterState): FilterKey[] {
  const unresolved: FilterKey[] = [];
  if (filters.dislikesSmoke === null) unresolved.push('dislikesSmoke');
  if (filters.dislikesBitter === null) unresolved.push('dislikesBitter');
  if (filters.dislikesAnise === null) unresolved.push('dislikesAnise');
  return unresolved;
}

const FILTER_LABELS: Record<FilterKey, string> = {
  dislikesSmoke: 'smoke/campfire tolerance',
  dislikesBitter: 'bitterness tolerance',
  dislikesAnise: 'anise/licorice tolerance',
};

export function buildQuestionPrompt(
  belief: BeliefState,
  questionText: string,
  answerText: string,
  tierTransition?: { from: string; to: string },
): string {
  const targetAxis = getMaxUncertaintyAxis(belief);
  const unresolvedFilters = getUnresolvedFilters(belief.filters);
  const progressCtx = getProgressContext(belief);

  const axisDesc = targetAxis === 'x'
    ? 'X-axis (Rich & Full ← → Crisp & Light)'
    : 'Y-axis (Savory & Dry ← → Sweet & Fruity)';

  const progressCue = progressCtx.phase === 'almost-done'
    ? `\n- PROGRESS CUE: You're almost done — weave in something like "I've got a pretty clear picture" or "One more thing..." in your feedback. Keep it natural, not formulaic.`
    : progressCtx.phase === 'midway'
    ? `\n- PROGRESS CUE: You're getting a feel for them — optionally hint at it naturally, like "Starting to see where you land..." but don't force it.`
    : '';

  const prompt = `The guest just answered your question.

Question: "${questionText}"
Their answer: "${answerText}"

${tierTransition ? `[We just finished the "${tierTransition.from}" section and are moving to "${tierTransition.to}".]` : ''}

Current flavor profile state:
- X-axis (Rich ← → Crisp): mean=${belief.axes.x.mean.toFixed(1)}, uncertainty=${uncertaintyLabel(belief.axes.x.variance)}
- Y-axis (Savory ← → Sweet): mean=${belief.axes.y.mean.toFixed(1)}, uncertainty=${uncertaintyLabel(belief.axes.y.variance)}
- Questions asked: ${belief.questionCount} (${progressCtx.questionsRemaining} remaining)
${unresolvedFilters.length > 0 ? `- Unresolved filters: ${unresolvedFilters.map(f => FILTER_LABELS[f]).join(', ')}` : '- All filters resolved'}${progressCue}

TARGET: Focus your next question on the ${axisDesc} because it has the highest uncertainty.
${unresolvedFilters.length > 0 ? `Also consider probing: ${unresolvedFilters.map(f => FILTER_LABELS[f]).join(', ')}` : ''}

Respond with ONLY a JSON object (no markdown fencing, no extra text):
{
  "feedback": "Your 2-3 sentence bartender reaction to their answer. Reference their specific choice. Be genuine, not cheesy.",
  "question": {
    "text": "A food, drink, or lifestyle question that feels like bartender conversation. Not a survey.",
    "primaryAxis": "${targetAxis}",
    "options": [
      {
        "text": "Short, vivid option text",
        "dx": <number from -8 to 8>,
        "dy": <number from -8 to 8>
      }
    ]
  }
}

Option rules:
- 2-3 options per question
- Each option can optionally include "vibeTags": an array from [${VALID_VIBE_TAGS.map(t => `"${t}"`).join(', ')}]
${unresolvedFilters.length > 0 ? `- To probe a filter, add "filterFlag": { "key": "${unresolvedFilters[0]}", "value": true } on the relevant option (true = dislikes, false = likes)` : ''}
- dx values should spread meaningfully${targetAxis === 'x' ? ' (this is the target axis — make dx deltas distinct across options)' : ''}
- dy values should spread meaningfully${targetAxis === 'y' ? ' (this is the target axis — make dy deltas distinct across options)' : ''}
- Make questions about concrete things (foods, drinks, scenarios, places) not abstract personality traits
- Feel like a bartender making conversation, not a quiz`;

  return prompt;
}

export function parseAIResponse(rawText: string): AIQuestionResponse | null {
  try {
    // Try to extract JSON — handle fenced blocks, raw JSON, etc.
    let jsonStr: string | null = null;

    // Try fenced code block first
    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fencedMatch) {
      jsonStr = fencedMatch[1].trim();
    }

    // Try raw JSON object
    if (!jsonStr) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    if (!jsonStr) return null;

    const parsed = JSON.parse(jsonStr);
    return validateAIQuestion(parsed);
  } catch {
    return null;
  }
}

function validateAIQuestion(parsed: unknown): AIQuestionResponse | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  // Validate feedback
  const feedback = typeof obj.feedback === 'string' ? obj.feedback.trim() : '';
  if (!feedback) return null;

  // Question can be null (quiz completing)
  if (obj.question === null || obj.question === undefined) {
    return { feedback, question: null };
  }

  if (typeof obj.question !== 'object') return null;
  const q = obj.question as Record<string, unknown>;

  // Validate question text
  const text = typeof q.text === 'string' ? q.text.trim() : '';
  if (!text) return null;

  // Validate primary axis
  const primaryAxis = q.primaryAxis === 'x' || q.primaryAxis === 'y' ? q.primaryAxis : null;
  if (!primaryAxis) return null;

  // Validate options
  if (!Array.isArray(q.options) || q.options.length < 2) return null;
  const rawOptions = q.options.slice(0, 3); // cap at 3

  const options: AIQuestionResponse['question'] extends infer T
    ? T extends { options: infer O } ? O extends Array<infer I> ? I[] : never : never
    : never = [];

  for (const opt of rawOptions) {
    if (!opt || typeof opt !== 'object') return null;
    const o = opt as Record<string, unknown>;

    const optText = typeof o.text === 'string' ? o.text.trim() : '';
    if (!optText) return null;

    const dx = typeof o.dx === 'number' ? Math.max(-8, Math.min(8, Math.round(o.dx))) : 0;
    const dy = typeof o.dy === 'number' ? Math.max(-8, Math.min(8, Math.round(o.dy))) : 0;

    // Filter vibeTags to known values
    let vibeTags: VibeTag[] | undefined;
    if (Array.isArray(o.vibeTags)) {
      const valid = o.vibeTags.filter(
        (t): t is VibeTag => typeof t === 'string' && VALID_VIBE_TAGS.includes(t as VibeTag)
      );
      if (valid.length > 0) vibeTags = valid;
    }

    // Validate filterFlag
    let filterFlag: { key: FilterKey; value: boolean } | undefined;
    if (o.filterFlag && typeof o.filterFlag === 'object') {
      const ff = o.filterFlag as Record<string, unknown>;
      if (
        typeof ff.key === 'string' &&
        VALID_FILTER_KEYS.includes(ff.key as FilterKey) &&
        typeof ff.value === 'boolean'
      ) {
        filterFlag = { key: ff.key as FilterKey, value: ff.value };
      }
    }

    options.push({ text: optText, dx, dy, vibeTags, filterFlag });
  }

  if (options.length < 2) return null;

  // Check that primary axis has meaningful spread
  const primaryDeltas = options.map(o => primaryAxis === 'x' ? o.dx : o.dy);
  const spread = Math.max(...primaryDeltas) - Math.min(...primaryDeltas);
  if (spread < 2) return null; // options too similar on target axis

  return {
    feedback,
    question: { text, primaryAxis, options },
  };
}

// Extract just the feedback text from a failed/partial AI response
export function extractFeedbackFromText(rawText: string): string | null {
  // Try to get feedback from partial JSON
  const feedbackMatch = rawText.match(/"feedback"\s*:\s*"([^"]+)"/);
  if (feedbackMatch) return feedbackMatch[1];

  // Use the first sentence/paragraph as feedback
  const firstParagraph = rawText.split('\n')[0]?.trim();
  if (firstParagraph && firstParagraph.length > 10 && firstParagraph.length < 500) {
    return firstParagraph;
  }

  return null;
}
