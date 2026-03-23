'use client';
import { useRef, useCallback } from 'react';
import { getGenerativeModel } from 'firebase/ai';
import { ai } from '@/lib/firebase';
import { ENRICHED_FEEDBACK } from '@/lib/conversation';
import type { BeliefState } from '@/lib/belief-state';
import type { Question } from '@/lib/discovery-questions';
import {
  buildQuestionPrompt,
  parseAIResponse,
  extractFeedbackFromText,
  type AIQuestionResponse,
} from '@/lib/ai-question-generator';

const SYSTEM_PROMPT = `You are a knowledgeable, warm bartender helping someone discover their perfect drink. You're building a flavor profile through a series of questions.

Rules:
- Keep responses to 2-3 sentences max
- Be conversational and natural — like chatting across a bar
- Reference their previous answers to build a narrative ("First black coffee, now fizzy — you want contrast")
- Use specific drink/flavor knowledge (mention actual spirits, techniques, flavor notes)
- Don't be cheesy or use clichés like "great choice!" — be genuine
- Don't ask questions — just respond to their choice and hint at what it tells you
- Sometimes you'll be asked to generate the next question in JSON format — follow the schema exactly when asked
- Never mention that you're an AI`;

let model: ReturnType<typeof getGenerativeModel> | null = null;
let modelFailed = false;

function getModel(): ReturnType<typeof getGenerativeModel> | null {
  if (modelFailed) return null;
  if (!model) {
    try {
      model = getGenerativeModel(ai, {
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.8,
          topP: 0.9,
        },
        systemInstruction: SYSTEM_PROMPT,
      });
    } catch {
      modelFailed = true;
      return null;
    }
  }
  return model;
}

export function useBartenderChat() {
  const chatRef = useRef<ReturnType<ReturnType<typeof getGenerativeModel>['startChat']> | null>(null);

  const getChat = useCallback(() => {
    if (!chatRef.current) {
      const m = getModel();
      if (!m) return null;
      chatRef.current = m.startChat();
    }
    return chatRef.current;
  }, []);

  const resetChat = useCallback(() => {
    chatRef.current = null;
  }, []);

  // Feedback on the user's answer to a quiz question
  const getBartenderResponse = useCallback(async (
    questionText: string,
    answerText: string,
    questionId: string,
    optionIndex: number,
    tierTransition?: { from: string; to: string },
  ): Promise<string> => {
    const fallback = ENRICHED_FEEDBACK[`${questionId}-${optionIndex}`] || '';

    try {
      const chat = getChat();
      if (!chat) return fallback;

      let prompt = `Question: "${questionText}"\nMy answer: "${answerText}"`;

      if (tierTransition) {
        prompt += `\n\n[We just finished the "${tierTransition.from}" section and are moving to "${tierTransition.to}". Briefly note this shift in your response.]`;
      }

      prompt += `\n\n[Respond with natural bartender feedback only. Do NOT return JSON.]`;

      const result = await chat.sendMessage(prompt);
      let text = result.response.text().trim();

      // If the model accidentally returns JSON, extract just the feedback
      if (text.startsWith('{')) {
        try {
          const parsed = JSON.parse(text);
          if (typeof parsed.feedback === 'string') text = parsed.feedback;
        } catch { /* not JSON, use as-is */ }
      }

      return text || fallback;
    } catch (e) {
      console.error('Bartender AI failed, using fallback:', e);
      return fallback;
    }
  }, [getChat]);

  // Interpret freeform text against current options
  const interpretFreeText = useCallback(async (
    userText: string,
    questionText: string,
    optionTexts: string[],
  ): Promise<{ matchedIndex: number }> => {
    try {
      const chat = getChat();
      if (!chat) return { matchedIndex: -1 };

      const prompt = `[The user typed a freeform response instead of picking an option. Interpret which option they meant, if any.

Question: "${questionText}"
Available options: ${optionTexts.map((t, i) => `${i}: "${t}"`).join(', ')}
User typed: "${userText}"

Respond in this exact JSON format (no markdown, no backticks):
{"matchedIndex": <0-based index or -1 if no match>, "reasoning": "<one sentence>"}

Be generous in matching — if the user's intent clearly aligns with an option, match it even if the wording differs. Only return -1 if genuinely ambiguous or off-topic.]`;

      const result = await chat.sendMessage(prompt);
      const raw = result.response.text().trim();

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { matchedIndex: -1 };

      const parsed = JSON.parse(jsonMatch[0]);
      const idx = typeof parsed.matchedIndex === 'number' ? parsed.matchedIndex : -1;

      if (idx >= 0 && idx < optionTexts.length) {
        return { matchedIndex: idx };
      }

      return { matchedIndex: -1 };
    } catch (e) {
      console.error('Freeform interpretation failed:', e);
      return { matchedIndex: -1 };
    }
  }, [getChat]);

  // Handle the opener — user's first freeform message before quiz
  const getOpenerResponse = useCallback(async (
    userText: string,
  ): Promise<string> => {
    const fallback = "Interesting — I can already tell you've got taste. Let me ask you a few things to zero in on your flavor profile.";

    try {
      const chat = getChat();
      if (!chat) return fallback;

      const prompt = `[The guest just sat down and I asked "What are you in the mood for tonight?" They said: "${userText}"

React naturally to what they said — acknowledge their mood, reference any specific flavors or drinks they mentioned. Then smoothly transition to starting the quiz by saying something like "Let me figure out exactly what to pour you." Keep it to 2-3 sentences. Don't ask a follow-up question — the quiz questions will follow automatically.]`;

      const result = await chat.sendMessage(prompt);
      const text = result.response.text().trim();
      return text || fallback;
    } catch (e) {
      console.error('Opener response failed:', e);
      return fallback;
    }
  }, [getChat]);

  // Post-calibration: unified feedback + next question generation
  let aiQuestionCounter = 0;
  const getNextQuestionWithFeedback = useCallback(async (
    questionText: string,
    answerText: string,
    questionId: string,
    optionIndex: number,
    beliefState: BeliefState,
    tierTransition?: { from: string; to: string },
  ): Promise<{ feedback: string; question: Question | null }> => {
    const feedbackFallback = ENRICHED_FEEDBACK[`${questionId}-${optionIndex}`] || '';

    try {
      const chat = getChat();
      if (!chat) return { feedback: feedbackFallback, question: null };

      const prompt = buildQuestionPrompt(beliefState, questionText, answerText, tierTransition);
      const result = await chat.sendMessage(prompt);
      const raw = result.response.text().trim();

      const parsed = parseAIResponse(raw);
      if (parsed) {
        const question: Question | null = parsed.question ? {
          id: `ai-${++aiQuestionCounter}`,
          tier: 'architecture',
          text: parsed.question.text,
          type: 'narrative',
          options: parsed.question.options,
          primaryAxis: parsed.question.primaryAxis,
          informationGain: Math.max(...parsed.question.options.map(
            o => Math.abs(parsed.question!.primaryAxis === 'x' ? o.dx : o.dy)
          )),
          isAIGenerated: true,
        } : null;

        return { feedback: parsed.feedback, question };
      }

      // Partial fallback — try to extract just the feedback
      const partialFeedback = extractFeedbackFromText(raw);
      return { feedback: partialFeedback || feedbackFallback, question: null };
    } catch (e) {
      console.error('AI question generation failed:', e);
      return { feedback: feedbackFallback, question: null };
    }
  }, [getChat]);

  return { getBartenderResponse, getNextQuestionWithFeedback, interpretFreeText, getOpenerResponse, resetChat };
}
