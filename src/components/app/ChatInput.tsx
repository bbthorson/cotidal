'use client';
import { useRef, useCallback, KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = "Type something..." }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Cap at ~3 lines (approx 72px)
    el.style.height = `${Math.min(el.scrollHeight, 72)}px`;
  }, []);

  const handleSend = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text) return;
    onSend(text);
    el.value = '';
    el.style.height = 'auto';
  }, [onSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex items-end gap-2 px-5 pt-3 pb-safe-b border-t border-primary/10 bg-background">
      <textarea
        ref={textareaRef}
        rows={1}
        onInput={resize}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="
          flex-1 resize-none bg-transparent text-sm text-foreground
          placeholder:text-muted-foreground/40
          border-none outline-none
          py-2 leading-snug
          disabled:opacity-40
        "
      />
      <button
        onClick={handleSend}
        disabled={disabled}
        className="
          shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          bg-primary/10 text-primary
          hover:bg-primary/20 transition-colors
          disabled:opacity-30
          focus-visible:ring-2 focus-visible:ring-primary
        "
        aria-label="Send message"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </div>
  );
}
