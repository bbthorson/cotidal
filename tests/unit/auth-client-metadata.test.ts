import { afterEach, describe, expect, it } from 'vitest';
import { _resetAuth, getAuth } from '../../src/lib/atproto/auth';

const origEnabled = process.env.ATPROTO_ENABLED;

afterEach(() => {
  if (origEnabled === undefined) delete process.env.ATPROTO_ENABLED;
  else process.env.ATPROTO_ENABLED = origEnabled;
  _resetAuth();
});

describe('OAuth client metadata', () => {
  it('publishes Cotidal’s logo_uri across custom domain, workers.dev, and loopback origins', async () => {
    process.env.ATPROTO_ENABLED = 'true';
    _resetAuth();

    const auth = await getAuth();
    expect(auth).not.toBeNull();

    for (const origin of ['https://cotidal.app', 'https://cotidal.workers.dev', 'http://127.0.0.1:9002']) {
      const meta = auth!.clientMetadata(origin);
      expect(meta.client_name).toBe('Cotidal');
      expect(meta.logo_uri).toBe('https://cotidal.app/apple-touch-icon.png');
    }

    // Also verify the HTTP route serves the metadata with logo_uri cleanly.
    const res = await auth!.handle(new Request('https://cotidal.app/api/auth/atproto/client-metadata.json'));
    expect(res?.status).toBe(200);
    const body = (await res!.json()) as { logo_uri?: string; client_name?: string };
    expect(body.client_name).toBe('Cotidal');
    expect(body.logo_uri).toBe('https://cotidal.app/apple-touch-icon.png');
  });
});
