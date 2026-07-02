// Re-runnable asset generation. Writes static artifacts nothing heavy ships to the client.
// Run with:  node scripts/generate.mjs
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/generated');   // imported into components (small)
const PUB = resolve(__dirname, '../public');           // served static
mkdirSync(OUT, { recursive: true });
mkdirSync(PUB, { recursive: true });

/* ---- ASCII wordmark via figlet (patorjk/figlet.js) ---- */
{
  const figletMod = await import('figlet');
  const figlet = figletMod.default || figletMod;
  const banner = figlet.textSync('ABDULLAH', { font: 'Graffiti' });
  writeFileSync(resolve(OUT, 'banner.txt'), banner, 'utf8');
  console.log('banner.txt written');
}

/* ---- social share image (1200x630) via satori + resvg (Chakra Petch woff from @fontsource) ---- */
{
  const [{ default: satori }, { Resvg }] = await Promise.all([import('satori'), import('@resvg/resvg-js')]);
  const fontDir = resolve(__dirname, '../node_modules/@fontsource/chakra-petch/files');
  const bold = readFileSync(resolve(fontDir, 'chakra-petch-latin-700-normal.woff'));
  const med = readFileSync(resolve(fontDir, 'chakra-petch-latin-500-normal.woff'));
  const t = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

  const tree = t(
    { width: '100%', height: '100%', flexDirection: 'column', justifyContent: 'space-between',
      backgroundColor: '#F4F2EC', padding: '72px 80px', fontFamily: 'Chakra Petch' },
    [
      t({ fontSize: 28, letterSpacing: 5, color: '#6A6559' }, 'FILMMAKER · DEVELOPER · WRITER'),
      t({ flexDirection: 'column', lineHeight: 0.92 }, [
        t({ fontSize: 154, fontWeight: 700, color: '#141310' }, 'ABDULLAH'),
        t({ fontSize: 154, fontWeight: 700 }, [
          { type: 'span', props: { style: { color: '#141310' }, children: 'ALETAI' } },
          { type: 'span', props: { style: { color: '#E5341C' }, children: '.' } },
        ]),
      ]),
      t({ fontSize: 24, letterSpacing: 3, color: '#6A6559' }, 'mrk-exe.github.io/showcase'),
    ]
  );

  const svg = await satori(tree, {
    width: 1200, height: 630,
    fonts: [
      { name: 'Chakra Petch', data: bold, weight: 700, style: 'normal' },
      { name: 'Chakra Petch', data: med, weight: 500, style: 'normal' },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  writeFileSync(resolve(PUB, 'og.png'), png);
  console.log('public/og.png written (' + png.length + ' bytes)');
}
