/**
 * `cloudflare:workers` off Workers, for the unit tests: enough for
 * `@cloudflare/workers-oauth-provider` to load. `env` is absent, as it is in
 * `astro dev`, so `src/lib/runtime.ts` takes its off-platform path.
 */
export class WorkerEntrypoint {
  constructor(
    public ctx: unknown,
    public env: unknown
  ) {}
}
export const env = undefined;
