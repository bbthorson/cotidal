import { CoupeLogo } from './CoupeLogo';

export function ChatHeader() {
  return (
    <div className="flex items-center gap-3">
      <CoupeLogo className="w-6 h-6 text-primary" />
      <span className="font-headline text-lg text-primary font-bold">The Crystal Coupe</span>
    </div>
  );
}
