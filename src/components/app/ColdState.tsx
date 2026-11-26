import { coldState } from '@/lib/copy';
import { questionsHref } from '@/lib/site-nav';
import { ScreenHeader } from './ui';

/**
 * What a page that needs a coordinate says to someone with none: what the
 * page is for, and one thing to do — answer the questions. The other two ways
 * in, signing in to bring one from an account or trying a pour as a guest,
 * are a quiet line under it, so the card asks one thing (docs/design-system.md,
 * rule 10).
 */
export function ColdState({
  eyebrow,
  onQuiz,
  onSignIn,
  onGuest,
}: {
  /** What the sheet is, where no tab already says it (the rating sheet). */
  eyebrow?: string;
  /** Open the questions in place, on the map (`?quiz=1` is the same, as a link). */
  onQuiz?: () => void;
  onSignIn: () => void;
  onGuest: () => void;
}) {
  const quiet =
    'min-h-11 px-1 font-condensed text-meta uppercase tracking-label text-secondary underline decoration-muted-foreground underline-offset-4 transition-colors hover:text-foreground';
  return (
    <div className="pb-10 pt-4">
      <ScreenHeader eyebrow={eyebrow} title={coldState.title} lede={coldState.body} />
      <a
        href={questionsHref}
        onClick={(ev) => {
          if (!onQuiz) return;
          ev.preventDefault();
          onQuiz();
        }}
        className="btn btn-primary w-full"
      >
        {coldState.quizCta}
      </a>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-muted-foreground">
        <button type="button" onClick={onSignIn} className={quiet}>
          {coldState.signInCta}
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={onGuest} className={quiet}>
          {coldState.guestCta}
        </button>
      </p>
      <p className="text-center text-meta text-muted-foreground">{coldState.guestNote}</p>
    </div>
  );
}
