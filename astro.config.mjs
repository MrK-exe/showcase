import { defineConfig } from 'astro/config';
import markdoc from '@astrojs/markdoc';

// Keystatic admin is server-rendered, so it only loads in local CMS mode
// (`npm run cms`). The GitHub Pages build stays a pure static site.
const KS = process.env.ENABLE_KEYSTATIC === 'true';

// Server output + node adapter are needed only for the Keystatic admin route.
const keystaticExtras = KS
  ? {
      output: 'server',
      adapter: (await import('@astrojs/node')).default({ mode: 'standalone' }),
    }
  : {};

// React + Keystatic run only in CMS mode. Markdoc is a pure static integration and
// must be present in BOTH modes so the authored Work/Game-review bodies render on the
// static Pages build — not only under ENABLE_KEYSTATIC.
const keystaticIntegrations = KS
  ? [
      (await import('@astrojs/react')).default(),
      (await import('@keystatic/astro')).default(),
    ]
  : [];

export default defineConfig({
  // Project-page deploy: repo "showcase" → https://mrk-exe.github.io/showcase/.
  // Base only in the static build; in CMS mode the admin stays at the standard /keystatic.
  site: 'https://mrk-exe.github.io',
  base: KS ? '/' : '/showcase',
  integrations: [markdoc(), ...keystaticIntegrations],
  ...keystaticExtras,
});
