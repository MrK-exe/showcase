import { defineConfig } from 'astro/config';

// Keystatic admin is server-rendered, so it only loads in local CMS mode
// (`npm run cms`). The GitHub Pages build stays a pure static site.
const KS = process.env.ENABLE_KEYSTATIC === 'true';

const keystaticExtras = KS
  ? {
      output: 'server',
      adapter: (await import('@astrojs/node')).default({ mode: 'standalone' }),
      integrations: [
        (await import('@astrojs/react')).default(),
        (await import('@keystatic/astro')).default(),
      ],
    }
  : {};

export default defineConfig({
  // Project-page deploy: repo "showcase" → https://mrk-exe.github.io/showcase/.
  // Base only in the static build; in CMS mode the admin stays at the standard /keystatic.
  site: 'https://mrk-exe.github.io',
  base: KS ? '/' : '/showcase',
  ...keystaticExtras,
});
