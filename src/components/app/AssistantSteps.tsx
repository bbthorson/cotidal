import { assistants as copy } from '@/lib/copy';
import { SectionTitle } from './ui';

/**
 * How to reach a palate from a chat assistant: the address, where to paste
 * it, what to ask, and what it cannot do. Shown under the account at the foot
 * of `/map`, with the member's handle in the example, and at `/mcp` to anyone
 * who opens the address in a browser. One component for both: `/mcp` renders
 * it with no `client:` directive, so it is static HTML with no script (the
 * address is text to select), and the island on `/map` renders the same markup.
 *
 * Where members can sign an assistant in (`/mcp/me`, on only once its OAuth
 * store is bound), there are two addresses, and yours comes first: it is the
 * one that knows who you are and can log what you tell it. Without it, the
 * one read-only address, as before.
 */
export function AssistantSteps({
  address,
  memberAddress,
  handle,
}: {
  /** The `/mcp` address on this host. */
  address: string;
  /** The `/mcp/me` address, when signing an assistant in is on here. */
  memberAddress?: string | null;
  /** The member's handle, for the example question; absent at `/mcp`, which cannot know. */
  handle?: string | null;
}) {
  return (
    <div className="space-y-10">
      {memberAddress ? (
        <section className="space-y-6">
          <Address label={copy.memberUrlLabel} note={copy.memberUrlNote} address={memberAddress} testId="mcp-me-address" />
          <Address label={copy.publicUrlLabel} note={copy.publicUrlNote} address={address} testId="mcp-address" />
        </section>
      ) : (
        <Address label={copy.urlLabel} address={address} testId="mcp-address" />
      )}

      <section className="space-y-3">
        <SectionTitle as="h3">{copy.stepsTitle}</SectionTitle>
        <ol className="list-decimal space-y-2 pl-6 text-ui text-foreground">
          {(memberAddress ? copy.memberSteps : copy.steps).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="text-ui text-muted-foreground">{memberAddress ? copy.memberOtherClients : copy.otherClients}</p>
      </section>

      <section className="space-y-3">
        <SectionTitle as="h3">{copy.canTitle}</SectionTitle>
        <ul className="list-disc space-y-2 pl-6 text-ui text-foreground">
          {(memberAddress ? copy.memberCan : copy.can).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-ui text-muted-foreground">
          {memberAddress ? copy.memberAsk : handle ? copy.askWith(handle) : copy.askWithGuest}
        </p>
      </section>

      <section className="space-y-3">
        <SectionTitle as="h3">{memberAddress ? copy.memberLimitsTitle : copy.readOnlyTitle}</SectionTitle>
        <p className="text-ui text-muted-foreground">{memberAddress ? copy.memberLimits : copy.readOnly}</p>
      </section>
    </div>
  );
}

function Address({ label, note, address, testId }: { label: string; note?: string; address: string; testId: string }) {
  return (
    <div className="space-y-3">
      <h3 className="label-caps text-foreground">{label}</h3>
      <p
        className="select-all break-all rounded-sm border border-border bg-card px-3.5 py-3 font-code text-ui text-foreground"
        data-testid={testId}
      >
        {address}
      </p>
      {note && <p className="text-ui text-muted-foreground">{note}</p>}
    </div>
  );
}
