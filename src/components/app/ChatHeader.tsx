import { CoupeLogo } from './CoupeLogo';

interface ChatHeaderProps {
  progress?: number;
}

export function ChatHeader({ progress }: ChatHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <CoupeLogo className="h-7 w-7 text-primary" />
          <span className="font-serif text-sm font-bold uppercase tracking-wordmark text-foreground">
            The Crystal Coupe
          </span>
        </a>
        <a
          href="/drinks"
          className="font-condensed text-xs font-bold uppercase tracking-label text-muted-foreground transition-colors hover:text-primary"
        >
          The register &rarr;
        </a>
      </div>
      {progress != null && progress > 0 && (
        <div
          className="w-full h-0.5 bg-primary/10 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuenow={progress}
        >
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
