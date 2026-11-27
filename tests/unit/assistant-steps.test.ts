import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssistantSteps } from '@/components/app/AssistantSteps';
import { assistants } from '@/lib/copy';

/**
 * What `/mcp` and `/#assistant` tell someone about chat assistants: one
 * read-only address until members can sign an assistant in, then both, with
 * theirs first and the limits that come with writing.
 */

const PUBLIC = 'https://cotidal.test/mcp';
const MEMBER = 'https://cotidal.test/mcp/me';
const html = (props: Parameters<typeof AssistantSteps>[0]) => renderToStaticMarkup(createElement(AssistantSteps, props));
const text = (s: string) => s.replace(/&#x27;|’/g, '’').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('AssistantSteps', () => {
  it('offers the one read-only address while signing an assistant in is off', () => {
    const out = text(html({ address: PUBLIC, handle: 'alice.test' }));
    expect(out).toContain(PUBLIC);
    expect(out).not.toContain(MEMBER);
    expect(out).toContain(assistants.readOnlyTitle);
    expect(out).toContain(text(assistants.askWith('alice.test')));
    expect(out).not.toContain(text(assistants.memberSteps[3]));
  });

  it('puts the member’s own address first when it is on, and says what writing means', () => {
    const out = text(html({ address: PUBLIC, memberAddress: MEMBER, handle: 'alice.test' }));
    expect(out.indexOf(MEMBER)).toBeGreaterThan(-1);
    expect(out.indexOf(MEMBER)).toBeLessThan(out.indexOf(`>${PUBLIC}<`));
    expect(out).toContain('data-testid="mcp-me-address"');
    expect(out).toContain('data-testid="mcp-address"');
    expect(out).toContain(text(assistants.memberSteps[3]));
    expect(out).toContain(text(assistants.memberOtherClients));
    expect(out).toContain(text(assistants.memberLimitsTitle));
    // “Only you log” is no longer true there, so it is not said.
    expect(out).not.toContain(assistants.readOnlyTitle);
  });
});
