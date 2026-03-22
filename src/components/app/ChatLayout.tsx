import { ReactNode, RefObject } from 'react';

interface ChatLayoutProps {
  header: ReactNode;
  middle: ReactNode;
  prompt: ReactNode;
  input: ReactNode;
  middleRef?: RefObject<HTMLDivElement | null>;
  centerPrompt?: boolean;
}

export function ChatLayout({ header, middle, prompt, input, middleRef, centerPrompt = false }: ChatLayoutProps) {
  return (
    <div className="h-dvh flex flex-col max-w-2xl mx-auto">
      {/* Header — sticky top */}
      <header className="shrink-0 px-5 py-3 border-b border-primary/10">
        {header}
      </header>

      {/* Middle — scrollable content */}
      <div
        ref={middleRef}
        className={`flex-1 overflow-y-auto px-5 py-6${centerPrompt ? ' max-h-[50dvh]' : ''}`}
      >
        {middle}
      </div>

      {/* Prompt — question/title */}
      <div className="shrink-0 px-5 py-3 border-t border-primary/10 bg-background">
        {prompt}
      </div>

      {/* Input — answer choices / actions */}
      <div className="shrink-0 px-5 py-4 bg-background">
        {input}
      </div>

      {/* Spacer — fills remaining space when prompt is centered */}
      {centerPrompt && (
        <div className="flex-1 bg-background pb-[env(safe-area-inset-bottom,16px)]" />
      )}
    </div>
  );
}
