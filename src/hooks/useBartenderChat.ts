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
- Don't ask questions — just respond to their choice and hint at what it tells you
- Never mention that you're an AI`;

let model: ReturnType<typeof getGenerativeModel> | null = null;

function getModel() {
  if (!model) {
    model = getGenerativeModel(ai, {
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.8,
        topP: 0.9,
      },
      systemInstruction: SYSTEM_PROMPT,
    });
  }
  return model;
}

export function useBartenderChat() {
  const chatRef = useRef<ReturnType<ReturnType<typeof getGenerativeModel>['startChat']> | null>(null);

  const getChat = useCallback(() => {
    if (!chatRef.current) {
      chatRef.current = getModel().startChat();
    }
    return chatRef.current;
  }, []);

  const resetChat = useCallback(() => {
    chatRef.current = null;
  }, []);

  const getBartenderResponse = useCallback(async (
    questionText: string,
    answerText: string,
    questionId: string,
    optionIndex: number,
  ): Promise<string> => {
    const fallback = ENRICHED_FEEDBACK[`${questionId}-${optionIndex}`] || '';

    try {
      const chat = getChat();
      const prompt = `Question: "${questionText}"\nMy answer: "${answerText}"`;
      const result = await chat.sendMessage(prompt);
      const text = result.response.text().trim();
      return text || fallback;
    } catch (e) {
      console.error('Bartender AI failed, using fallback:', e);
      return fallback;
    }
  }, [getChat]);

  const getTierTransition = useCallback(async (
    fromTier: string,
    toTier: string,
  ): Promise<string> => {
    const fallbacks: Record<string, string> = {
      calibration: "Alright, I'm starting to get a read on you. You've got a clear sense of what you like on the palate. Now let's talk about how you like your drinks to feel.",
      architecture: "The picture's coming together — I know your flavor leanings and your style. A few more questions and I'll have your menu ready.",
    };

    try {
      const chat = getChat();
      const prompt = `[We just finished the "${fromTier}" section and are moving to "${toTier}". Give a brief transitional comment summarizing what you've learned so far about my taste. 1-2 sentences.]`;
      const result = await chat.sendMessage(prompt);
      const text = result.response.text().trim();
      return text || fallbacks[fromTier] || '';
    } catch (e) {
      console.error('Tier transition AI failed, using fallback:', e);
      return fallbacks[fromTier] || '';
    }
  }, [getChat]);

  return { getBartenderResponse, getTierTransition, resetChat };
}
