import { ReactNode, RefObject } from 'react';

interface ChatLayoutProps {
  header: ReactNode;
  middle: ReactNode;
  prompt: ReactNode;
  input: ReactNode;
  middleRef?: RefObject<HTMLDivElement | null>;
}

export function ChatLayout({ header, middle, prompt, input, middleRef }: ChatLayoutProps) {
  return (
    <div className="h-dvh flex flex-col max-w-2xl mx-auto">
      {/* Header — sticky top */}
      <header className="shrink-0 px-5 py-3 border-b border-primary/10">
        {header}
      </header>

      {/* Middle — scrollable content */}
      <div ref={middleRef} className="flex-1 overflow-y-auto px-5 py-6">
        {middle}
      </div>

      {/* Prompt — question/title */}
      <div className="shrink-0 px-5 py-3 border-t border-primary/10 bg-background">
        {prompt}
      </div>

      {/* Input — answer choices / actions */}
      <div className="shrink-0 px-5 py-4 pb-[env(safe-area-inset-bottom,16px)] bg-background">
        {input}
      </div>
    </div>
  );
}
