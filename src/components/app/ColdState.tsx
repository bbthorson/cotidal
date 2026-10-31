import { coldState } from '@/lib/copy';
import { questionsHref } from '@/lib/site-nav';
import { ScreenHeader } from './ui';

/**
 * What a page that needs a coordinate says to someone with none: what the
 * page is for, and the three ways in — answer the questions, sign in to bring
 * one from an account, or try a pour as a guest.
 */
export function ColdState({
  eyebrow,
  onSignIn,
  onGuest,
}: {
  /** The page's own name. */
  eyebrow: string;
  onSignIn: () => void;
  onGuest: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl pb-10 pt-6 lg:pt-10">
      <ScreenHeader eyebrow={eyebrow} title={coldState.title} lede={coldState.body} />
      <div className="mt-3 flex flex-col gap-3">
        <a href={questionsHref} className="btn btn-primary btn-lg px-6">
          {coldState.quizCta}
        </a>
        <button type="button" onClick={onSignIn} className="btn btn-outline px-6">
          {coldState.signInCta}
        </button>
        <button
          type="button"
          onClick={onGuest}
          className="mt-1 min-h-11 self-center px-2 font-condensed text-meta uppercase tracking-label text-muted-foreground underline decoration-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
        >
          {coldState.guestCta}
        </button>
        <p className="text-center text-meta text-muted-foreground">{coldState.guestNote}</p>
      </div>
    </div>
  );
}
