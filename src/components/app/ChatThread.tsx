'use client';
import { RefObject, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { QuestionOption } from '@/lib/discovery-questions';
import { QuickReplyChips } from './QuickReplyChips';

export interface ThreadMessage {
  id: string;
  role: 'bartender' | 'user' | 'system';
  content: string;
  action?: string;
}

interface ChatThreadProps {
  messages: ThreadMessage[];
  pendingOptions: QuestionOption[] | null;
  onSelectOption: (option: QuestionOption, index: number) => void;
  onAction?: (action: string) => void;
  isNavigating: boolean;
  threadRef?: RefObject<HTMLDivElement | null>;
}

export function ChatThread({
  messages,
  pendingOptions,
  onSelectOption,
  onAction,
  isNavigating,
  threadRef,
}: ChatThreadProps) {
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = threadRef?.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }, [messages, pendingOptions, threadRef]);

  // Find the last bartender message index to attach chips
  const lastBartenderIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'bartender') return i;
    }
    return -1;
  })();

  return (
    <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-6 flex flex-col">
      <div className="mt-auto space-y-3 pb-4">
        {messages.map((msg, idx) => {
          switch (msg.role) {
            case 'bartender':
              return (
                <div key={msg.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="border-l border-primary/20 pl-3 py-0.5"
                  >
                    <p className="text-sm text-foreground/70 italic leading-snug">{msg.content}</p>
                  </motion.div>
                  {/* Chips appear below the last bartender message */}
                  {idx === lastBartenderIdx && pendingOptions && (
                    <div className="pl-3">
                      <QuickReplyChips
                        options={pendingOptions}
                        onSelect={onSelectOption}
                        disabled={isNavigating}
                      />
                    </div>
                  )}
                </div>
              );

            case 'user':
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="text-right"
                >
                  <span className="font-condensed text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
                    {msg.content}
                  </span>
                </motion.div>
              );

            case 'system':
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="py-2 space-y-2"
                >
                  {msg.action ? (
                    <div className="flex justify-center">
                      <button
                        onClick={() => onAction?.(msg.action!)}
                        className="
                          font-condensed text-xs uppercase tracking-[0.2em]
                          text-primary hover:text-primary/80
                          underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60
                          transition-colors min-h-[44px] px-4
                        "
                      >
                        {msg.content}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="editorial-rule" />
                      <p className="text-center text-xs italic text-muted-foreground/60 leading-snug px-4">
                        {msg.content}
                      </p>
                      <div className="editorial-rule" />
                    </>
                  )}
                </motion.div>
              );
          }
        })}
      </div>
    </div>
  );
}
