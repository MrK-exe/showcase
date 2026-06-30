// Re-runnable asset generation. Pulls from public libs (figlet, dotted-map) and
// writes static artifacts into src/generated so nothing heavy ships to the client.
// Run with:  node scripts/generate.mjs
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/generated');     // imported into components (small)
const PUB = resolve(__dirname, '../public');            // served static, lazy-loaded (large)
mkdirSync(OUT, { recursive: true });
mkdirSync(PUB, { recursive: true });

/* ---- ASCII wordmark via figlet (patorjk/figlet.js) ---- */
{
  const figletMod = await import('figlet');
  const figlet = figletMod.default || figletMod;
  const banner = figlet.textSync('ABDULLAH', { font: 'Graffiti' });
  writeFileSync(resolve(OUT, 'banner.txt'), banner, 'utf8');
  console.log('banner.txt written\n' + banner);
}

/* ---- wordmark glyph outlines via opentype.js (for anime.js createDrawable self-draw) ----
   ABDULLAH ALETAI rendered from Chakra Petch Bold into per-glyph SVG <path> outlines so the
   draw effect can stroke them on (then fill). Font: google/fonts ofl/chakrapetch (OFL). */
{
  const otMod = await import('opentype.js');
  const opentype = otMod.default || otMod;
  // Medium weight: opentype.js v2 mis-parses Chakra Petch Bold/SemiBold (NaN coords); Regular/Medium are clean.
  const buf = readFileSync(resolve(__dirname, 'ChakraPetch-Medium.ttf'));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const text = 'ABDULLAH ALETAI';
  const SIZE = 100;
  const full = font.getPath(text, 0, 0, SIZE);
  const bb = full.getBoundingBox();
  const pad = 8;
  const vb = `${(bb.x1 - pad).toFixed(1)} ${(bb.y1 - pad).toFixed(1)} ${(bb.x2 - bb.x1 + pad * 2).toFixed(1)} ${(bb.y2 - bb.y1 + pad * 2).toFixed(1)}`;
  const glyphs = font.getPaths(text, 0, 0, SIZE)
    .map((p) => p.toPathData(2))
    .filter((d) => d && d.trim().length > 4);
  const paths = glyphs.map((d) => `<path d="${d}"/>`).join('');
  const svg = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="word-draw" aria-hidden="true" preserveAspectRatio="xMinYMid meet">${paths}</svg>`;
  writeFileSync(resolve(OUT, 'wordmark.svg'), svg, 'utf8');
  console.log(`src/generated/wordmark.svg written (${glyphs.length} glyph paths, ${svg.length} bytes)`);
}

/* ---- dotted world map via dotted-map (NTag/dotted-map) ---- */
{
  const dmMod = await import('dotted-map');
  const DottedMap = dmMod.default || dmMod;
  // Lower density + low-contrast graphite dots so the map
  // reads as a quiet substrate and the vermilion pins own the frame.
  const map = new DottedMap({ height: 38, grid: 'diagonal' });
  const svg = map.getSVG({
    radius: 0.32,
    color: '#C9C4B6',
    shape: 'circle',
    backgroundColor: 'transparent',
  });
  writeFileSync(resolve(PUB, 'worldmap.svg'), svg, 'utf8');
  console.log('public/worldmap.svg written (' + svg.length + ' bytes)');
}
