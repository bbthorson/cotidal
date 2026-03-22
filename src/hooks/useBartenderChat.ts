'use client';
import { useRef, useCallback } from 'react';
import { getGenerativeModel } from 'firebase/ai';
import { ai } from '@/lib/firebase';
import { ENRICHED_FEEDBACK } from '@/lib/conversation';

const SYSTEM_PROMPT = `You are a knowledgeable, warm bartender helping someone discover their perfect drink. You're building a flavor profile through a series of questions.

Rules:
- Keep responses to 2-3 sentences max
- Be conversational and natural — like chatting across a bar
- Reference their previous answers to build a narrative ("First black coffee, now fizzy — you want contrast")
- Use specific drink/flavor knowledge (mention actual spirits, techniques, flavor notes)
- Don't be cheesy or use clichés like "great choice!" — be genuine
- When you're given a next question to ask, weave it naturally into your response — react to their answer first, then transition into the next question as part of the same thought
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
          maxOutputTokens: 200,
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

  // Phase 2: Unified turn — feedback on answer + next question woven together
  const getUnifiedTurn = useCallback(async (
    questionText: string,
    answerText: string,
    questionId: string,
    optionIndex: number,
    nextQuestionText: string | null,
    tierTransition?: { from: string; to: string },
  ): Promise<string> => {
    const feedbackFallback = ENRICHED_FEEDBACK[`${questionId}-${optionIndex}`] || '';
    const fallback = nextQuestionText
      ? `${feedbackFallback} ${nextQuestionText}`
      : feedbackFallback;

    try {
      const chat = getChat();
      if (!chat) return fallback;

      let prompt = `Question: "${questionText}"\nMy answer: "${answerText}"`;

      if (tierTransition) {
        prompt += `\n\n[We just finished the "${tierTransition.from}" section and are moving to "${tierTransition.to}". Briefly note this shift in your response.]`;
      }

      if (nextQuestionText) {
        prompt += `\n\n[After reacting to my answer, naturally transition to asking me this next question: "${nextQuestionText}"]`;
      } else {
        prompt += `\n\n[This was the last question. Wrap up with something like "I've got a good read on you now — let me put together your menu."]`;
      }

      const result = await chat.sendMessage(prompt);
      const text = result.response.text().trim();
      return text || fallback;
    } catch (e) {
      console.error('Bartender AI failed, using fallback:', e);
      return fallback;
    }
  }, [getChat]);

  // Phase 3: Interpret freeform text against current options
  const interpretFreeText = useCallback(async (
    userText: string,
    questionText: string,
    optionTexts: string[],
  ): Promise<{ matchedIndex: number; bartenderText: string }> => {
    try {
      const chat = getChat();
      if (!chat) return { matchedIndex: -1, bartenderText: '' };

      const prompt = `[The user typed a freeform response instead of picking an option. Interpret which option they meant, if any.

Question: "${questionText}"
Available options: ${optionTexts.map((t, i) => `${i}: "${t}"`).join(', ')}
User typed: "${userText}"

Respond in this exact JSON format (no markdown, no backticks):
{"matchedIndex": <0-based index or -1 if no match>, "reasoning": "<one sentence>"}

Be generous in matching — if the user's intent clearly aligns with an option, match it even if the wording differs. Only return -1 if genuinely ambiguous or off-topic.]`;

      const result = await chat.sendMessage(prompt);
      const raw = result.response.text().trim();

      // Parse JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { matchedIndex: -1, bartenderText: '' };

      const parsed = JSON.parse(jsonMatch[0]);
      const idx = typeof parsed.matchedIndex === 'number' ? parsed.matchedIndex : -1;

      if (idx >= 0 && idx < optionTexts.length) {
        return { matchedIndex: idx, bartenderText: '' };
      }

      return { matchedIndex: -1, bartenderText: '' };
    } catch (e) {
      console.error('Freeform interpretation failed:', e);
      return { matchedIndex: -1, bartenderText: '' };
    }
  }, [getChat]);

  // Phase 3: Handle the opener — user's first freeform message before quiz
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

  return { getUnifiedTurn, interpretFreeText, getOpenerResponse, resetChat };
}
