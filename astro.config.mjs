import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  // The regions were renamed to a water vocabulary (src/lib/copy.ts); links
  // to the old pages keep working.
  redirects: {
    '/regions/ember': { status: 301, destination: '/regions/deep' },
    '/regions/vault': { status: 301, destination: '/regions/eddy' },
    '/regions/orchard': { status: 301, destination: '/regions/surf' },
  },
  adapter: cloudflare({
    prerenderEnvironment: 'node',
    remoteBindings: false,
  }),
  integrations: [
    react(),
  ],
  vite: {
    optimizeDeps: {
      exclude: ['@astrojs/cloudflare'],
    },
  },
});
