import type { PourRecord } from '@/lib/atproto/records';
import { explore, mapPage } from '@/lib/copy';
import { publicMapPath, startOverPath } from '@/lib/atproto/paths';
import type { Register } from '@/lib/drinks/register';
import type { TrackPoint } from '@/lib/palate/track';
import { PourLedger } from './PourLedger';
import { StartOver } from './StartOver';
import { TrackFigure } from './TrackFigure';
import { GuestPrompt, Readout, SectionTitle } from './ui';

/**
 * Your pours: the figures, your track up close, the ledger, then a link to
 * compare (a member) or what signing in keeps and Start over (a guest).
 * Reflection rather than finding (docs/design-system.md, The return).
 */
export function YourPours({
  member,
  isMember,
  signInEnabled,
  onSignIn,
  register,
  pours,
  history,
  track,
  startLabel,
  stats,
}: {
  member: { did: string; handle: string | null } | null;
  isMember: boolean;
  signInEnabled: boolean;
  onSignIn: () => void;
  register: Register;
  /** Null while they load. */
  pours: PourRecord[] | null;
  history: PourRecord[];
  track: TrackPoint[] | null;
  startLabel: string;
  stats: { label: string; value: string }[];
}) {
  return (
    <section id="yours" className="mt-8">
      <SectionTitle>{explore.yoursTitle}</SectionTitle>
      {stats.length > 0 && <Readout className="border-t-0" cells={stats.map((st) => ({ ...st, figure: true }))} />}
      {track && track.length > 1 && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="label-caps">{mapPage.upClose}</p>
          <TrackFigure track={track} />
        </div>
      )}
      {history.length > 0 && <SectionTitle as="h3" className="mt-6">{mapPage.ledgerTitle}</SectionTitle>}
      <PourLedger
        pours={history}
        register={register}
        empty={mapPage.ledgerEmpty}
        loading={pours === null}
        track={track}
        startLabel={startLabel}
      />
      {member && (
        <a href={`${publicMapPath(member.handle ?? member.did)}#compare`} className="link-caps mt-6 flex text-secondary hover:underline hover:underline-offset-4">
          {mapPage.compareLink} &rarr;
        </a>
      )}
      {!isMember && signInEnabled && history.length > 0 && (
        <GuestPrompt className="mt-8" title={mapPage.guestTitle} body={mapPage.guestBody} onSignIn={onSignIn} />
      )}
      {!isMember && <StartOver onConfirm={() => window.location.assign(startOverPath)} flush={signInEnabled && history.length > 0} />}
    </section>
  );
}
