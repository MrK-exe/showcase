// Re-runnable asset generation. Pulls from a public lib (figlet) and writes a static artifact
// into src/generated so nothing heavy ships to the client. Run with:  node scripts/generate.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/generated');     // imported into components (small)
mkdirSync(OUT, { recursive: true });

/* ---- ASCII wordmark via figlet (patorjk/figlet.js) ---- */
{
  const figletMod = await import('figlet');
  const figlet = figletMod.default || figletMod;
  const banner = figlet.textSync('ABDULLAH', { font: 'Graffiti' });
  writeFileSync(resolve(OUT, 'banner.txt'), banner, 'utf8');
  console.log('banner.txt written\n' + banner);
}
