import { assistants as copy } from '@/lib/copy';

/**
 * How to reach a palate from a chat assistant: the address, where to paste
 * it, what to ask, and what it cannot do. Shown under the account at the foot
 * of `/log`, with the member's handle in the example, and at `/mcp` to anyone
 * who opens the address in a browser. One component for both: `/mcp` renders
 * it with no `client:` directive, so it is static HTML with no script (the
 * address is text to select), and the island on `/log` renders the same markup.
 */
export function AssistantSteps({
  address,
  handle,
}: {
  /** The `/mcp` address on this host. */
  address: string;
  /** The member's handle, for the example question; absent at `/mcp`, which cannot know. */
  handle?: string | null;
}) {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h3 className="label-caps text-foreground">{copy.urlLabel}</h3>
        <p
          className="select-all break-all rounded-sm border border-border bg-card px-3.5 py-3 font-code text-ui text-foreground"
          data-testid="mcp-address"
        >
          {address}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="section-title">{copy.stepsTitle}</h3>
        <ol className="list-decimal space-y-2 pl-6 text-ui text-foreground">
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="text-ui text-muted-foreground">{copy.otherClients}</p>
      </section>

      <section className="space-y-3">
        <h3 className="section-title">{copy.canTitle}</h3>
        <ul className="list-disc space-y-2 pl-6 text-ui text-foreground">
          {copy.can.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-ui text-muted-foreground">{handle ? copy.askWith(handle) : copy.askWithGuest}</p>
      </section>

      <section className="space-y-3">
        <h3 className="section-title">{copy.readOnlyTitle}</h3>
        <p className="text-ui text-muted-foreground">{copy.readOnly}</p>
      </section>
    </div>
  );
}
