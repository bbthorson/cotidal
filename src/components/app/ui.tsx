import type { ReactNode } from 'react';
import { nav } from '@/lib/copy';
import { cn } from '@/lib/utils';

/** A toggle in a wrapped row of choices: what was off, a recent bar. Pressed is forest. */
export function Chip({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn('chip', className)}>
      {children}
    </button>
  );
}

/**
 * How every card opens: the title, and a lede if the card needs one — left
 * aligned, at one size, on every page (docs/design-system.md, One kind of
 * page). The eyebrow names the way in, when the card's head does not already
 * (rule 16). A `gloss` is the italic line under a drink's, a region's or a
 * person's name (rule 15); a `lede` is plain prose. Anything under them (a
 * readout) is `children`.
 */
export function ScreenHeader({
  eyebrow,
  title,
  lede,
  gloss,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  gloss?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="pb-5">
      {eyebrow && <p className="label-caps">{eyebrow}</p>}
      <div className={cn('flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3', eyebrow && 'mt-2')}>
        <h1 className="break-words font-serif text-title font-bold text-foreground">{title}</h1>
        {action}
      </div>
      {gloss && <p className="mt-2 font-serif text-ui italic leading-relaxed text-muted-foreground">{gloss}</p>}
      {lede && <p className="mt-2 text-ui text-muted-foreground">{lede}</p>}
      {children}
    </div>
  );
}

/**
 * How a section of a card opens, and the only section heading
 * (docs/design-system.md, One row): serif, ruled in ink under it, with an
 * optional `aside` at the right (a note, the axis it runs on). A list of
 * `DrinkRow`s follows it directly.
 */
export function SectionTitle({
  as: Tag = 'h2',
  id,
  aside,
  className,
  children,
}: {
  as?: 'h2' | 'h3';
  id?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  if (aside === undefined) {
    return (
      <Tag id={id} className={cn('section-title', className)}>
        {children}
      </Tag>
    );
  }
  return (
    <div className={cn('flex items-baseline justify-between gap-4 border-b border-foreground pb-1.5', className)}>
      <Tag id={id} className="font-serif text-heading font-bold text-foreground">
        {children}
      </Tag>
      <span className="shrink-0 text-meta text-muted-foreground">{aside}</span>
    </div>
  );
}

/**
 * What a guest is told signing in buys, once, in the place it would keep:
 * a title, a line, and the one sign-in button. Ruled above and below rather
 * than boxed: a screen's one sheet is what is yours, and this is not.
 */
export function GuestPrompt({
  title,
  body,
  onSignIn,
  className,
}: {
  title: string;
  body: string;
  onSignIn: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 border-y border-foreground py-4', className)}>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-serif text-prose font-bold">{title}</span>
        <span className="text-meta text-muted-foreground">{body}</span>
      </div>
      <button type="button" onClick={onSignIn} className="btn btn-primary shrink-0 px-3.5">
        {nav.signIn}
      </button>
    </div>
  );
}

/**
 * A list with nothing in it yet: one sentence in the voice, italic, ruled
 * beneath, and at most one action. It sits under the list's own heading, so
 * it brings no heading of its own. A whole screen that cannot start without a
 * coordinate is a different thing: `ColdState`, a `ScreenHeader` and its ways in.
 */
export function Empty({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-start gap-4 border-b border-border py-6', className)}>
      <p className="font-serif text-prose italic text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}

/** Held in a list's place while it loads. */
export function Loading() {
  return <p className="py-6 font-serif text-ui italic text-muted-foreground motion-safe:animate-pulse">…</p>;
}

export interface ReadoutCell {
  label: string;
  value: ReactNode;
  href?: string;
  /** Set in condensed figures (a coordinate, a count) rather than Playfair (a name). */
  figure?: boolean;
}

/**
 * A few labelled figures side by side, ruled above and below, never boxed
 * (docs/design-system.md, One readout): a drink's coordinate and region, a
 * person's coordinate and pours, your pours and bars. A cell with `href`
 * links its value.
 */
export function Readout({ cells, className }: { cells: ReadoutCell[]; className?: string }) {
  return (
    <dl className={cn('grid auto-cols-fr grid-flow-col border-y border-border', className)}>
      {cells.map((cell, i) => {
        const value = cn(
          'block truncate text-prose text-foreground',
          cell.figure ? 'font-condensed font-semibold tabular-nums' : 'font-serif font-bold'
        );
        return (
          <div key={cell.label} className={cn('flex min-w-0 flex-col gap-0.5 py-2.5 pr-3', i > 0 && 'border-l border-border pl-3.5')}>
            <dt className="label-caps truncate">{cell.label}</dt>
            <dd className="min-w-0">
              {cell.href ? (
                <a href={cell.href} className={cn(value, 'hover:underline hover:underline-offset-4')}>
                  {cell.value}
                </a>
              ) : (
                <span className={value}>{cell.value}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * A line about the state of the screen — what is off, what failed, what just
 * happened — ruled above and below (docs/design-system.md, One notice). An
 * `alert` is in the destructive ink and announced at once; a `status` is
 * announced politely; a `note` is quiet. A field's own error sits under the
 * field instead, unruled.
 */
export function Notice({
  tone = 'note',
  id,
  className,
  children,
}: {
  tone?: 'note' | 'status' | 'alert';
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role={tone === 'alert' ? 'alert' : tone === 'status' ? 'status' : undefined}
      className={cn(
        'border-y py-2.5 text-meta',
        tone === 'alert' ? 'border-destructive text-destructive' : 'border-border',
        tone === 'note' && 'text-muted-foreground',
        tone === 'status' && 'text-foreground',
        className
      )}
    >
      {children}
    </p>
  );
}
