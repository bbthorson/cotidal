import { useState } from 'react';
import { drinkDatabase } from '@/lib/drinks/data';
import { compass } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/drinks/register';
import type { MenuCapture } from '@/hooks/useMenuCapture';

/**
 * How a menu gets into the card: a line typed (with the drinks as
 * suggestions), many lines pasted, or a photo (`useMenuCapture`), and what
 * the photo said back.
 */
export function MenuEntry({
  register,
  capture,
  signInEnabled,
  onSignIn,
  onAddLine,
  onAddLines,
}: {
  register: Register;
  capture: MenuCapture;
  signInEnabled: boolean;
  onSignIn?: () => void;
  onAddLine: (line: string) => void;
  onAddLines: (text: string) => void;
}) {
  const [entry, setEntry] = useState('');
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');

  return (
    <>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          onAddLine(entry);
          setEntry('');
        }}
        className="flex gap-2"
      >
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="label-caps">{compass.atMenu.addLabel}</span>
          <input
            value={entry}
            onChange={(ev) => setEntry(ev.target.value)}
            list="menu-drinks"
            placeholder={compass.atMenu.addPlaceholder}
            maxLength={200}
            autoComplete="off"
            className="field min-h-11"
          />
        </label>
        <button type="submit" className="btn btn-outline self-end px-4">
          {compass.atMenu.add}
        </button>
        <datalist id="menu-drinks">
          {drinkDatabase.map((d) => (
            <option key={d.name} value={titleOf(register, d.name)} />
          ))}
        </datalist>
      </form>

      {!pasting ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={() => setPasting(true)}
            aria-expanded={false}
            className="link-caps text-secondary hover:underline hover:underline-offset-4"
          >
            {/* "+": it opens here. "→" is for what goes somewhere ("Have a menu? →"). */}
            {compass.atMenu.pasteToggle} +
          </button>
          <button
            type="button"
            disabled={capture.scanning}
            onClick={capture.start}
            data-testid="menu-scan-photo"
            className="link-caps text-secondary hover:underline hover:underline-offset-4 disabled:opacity-50"
          >
            {capture.scanning ? compass.atMenu.scanningPhoto : compass.atMenu.scanPhoto}
          </button>
          <input
            ref={capture.fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={capture.onFile}
            className="sr-only"
            aria-label={compass.atMenu.scanPhoto}
          />
        </div>
      ) : (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            onAddLines(pasteText);
            setPasteText('');
            setPasting(false);
          }}
          className="mt-4 flex flex-col gap-2 border-t border-border pt-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="label-caps">{compass.atMenu.pasteLabel}</span>
            <textarea
              value={pasteText}
              onChange={(ev) => setPasteText(ev.target.value)}
              placeholder={compass.atMenu.pastePlaceholder}
              rows={5}
              className="field py-2.5"
            />
          </label>
          <div className="flex items-center gap-4">
            <button type="submit" className="btn btn-outline px-4">
              {compass.atMenu.pasteAdd}
            </button>
            <button type="button" onClick={() => setPasting(false)} className="link-caps text-muted-foreground hover:text-foreground">
              {compass.atMenu.pasteCancel}
            </button>
          </div>
        </form>
      )}

      {capture.askSignIn && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3" data-testid="photo-signin-nudge">
          <p className="text-meta text-muted-foreground">{compass.atMenu.photoSignInNudge}</p>
          {signInEnabled && onSignIn && (
            <button type="button" onClick={onSignIn} className="btn btn-outline px-3">
              {compass.atMenu.photoSignInAction}
            </button>
          )}
        </div>
      )}

      {capture.message && (
        <p className="mt-3 text-meta text-primary" role="status">
          {capture.message}
        </p>
      )}
    </>
  );
}
