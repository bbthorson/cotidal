'use client';
import { motion } from 'framer-motion';
import type { ConversationMessage } from '@/lib/conversation';

interface ConversationThreadProps {
  messages: ConversationMessage[];
}

export function ConversationThread({ messages }: ConversationThreadProps) {
  return (
    <div className="space-y-2">
      {messages.map((msg) => {
        switch (msg.role) {
          case 'bartender':
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' as const }}
                className="border-l border-primary/20 pl-3 py-0.5"
              >
                <p className="text-sm text-foreground/70 italic leading-snug">{msg.content}</p>
              </motion.div>
            );
          case 'user':
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' as const }}
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
                transition={{ duration: 0.6, ease: 'easeOut' as const }}
                className="py-2 space-y-2"
              >
                <div className="editorial-rule" />
                <p className="text-center text-xs italic text-muted-foreground/60 leading-snug px-4">
                  {msg.content}
                </p>
                <div className="editorial-rule" />
              </motion.div>
            );
        }
      })}
    </div>
  );
}
