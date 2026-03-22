import { ReactNode } from 'react';

interface ChatLayoutProps {
  header: ReactNode;
  middle: ReactNode;
  input: ReactNode;
}

export function ChatLayout({ header, middle, input }: ChatLayoutProps) {
  return (
    <div className="h-dvh flex flex-col max-w-2xl mx-auto">
      {/* Header — sticky top */}
      <header className="shrink-0 px-5 py-3 border-b border-primary/10">
        {header}
      </header>

      {/* Middle — scrollable thread */}
      {middle}

      {/* Input — sticky bottom */}
      <div className="shrink-0">
        {input}
      </div>
    </div>
  );
}
