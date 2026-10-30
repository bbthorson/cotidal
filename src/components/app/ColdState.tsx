import { coldState } from '@/lib/copy';
import { questionsHref } from '@/lib/site-nav';

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
    <div className="mx-auto max-w-xl py-10 md:py-14">
      <span className="label-caps text-secondary">{eyebrow}</span>
      <h1 className="mt-3 font-serif text-title font-bold text-foreground">{coldState.title}</h1>
      <p className="mt-3 font-serif text-prose text-muted-foreground">{coldState.body}</p>
      <div className="mt-8 flex flex-col gap-3">
        <a href={questionsHref} className="btn btn-primary btn-lg px-6">
          {coldState.quizCta}
        </a>
        <button type="button" onClick={onSignIn} className="btn btn-outline px-6">
          {coldState.signInCta}
        </button>
        <button
          type="button"
          onClick={onGuest}
          className="mt-1 min-h-11 self-center px-2 font-condensed text-meta uppercase tracking-label text-muted-foreground underline decoration-primary underline-offset-4 transition-colors hover:text-primary"
        >
          {coldState.guestCta}
        </button>
        <p className="text-center text-meta text-muted-foreground">{coldState.guestNote}</p>
      </div>
    </div>
  );
}
