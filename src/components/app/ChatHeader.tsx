import { CoupeLogo } from './CoupeLogo';

interface ChatHeaderProps {
  progress?: number;
}

export function ChatHeader({ progress }: ChatHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <CoupeLogo className="w-6 h-6 text-primary" />
        <span className="font-headline text-lg text-primary font-bold">The Crystal Coupe</span>
      </div>
      {progress != null && progress > 0 && (
        <div className="w-full h-0.5 bg-primary/10 rounded-full overflow-hidden" role="progressbar" aria-label="Quiz progress" aria-valuenow={progress}>
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
