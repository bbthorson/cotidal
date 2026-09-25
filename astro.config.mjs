import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    prerenderEnvironment: 'node',
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
