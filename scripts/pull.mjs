// Build-time data pull. Fetches the fed sections from public feeds/APIs and writes static JSON
// into src/generated so the site ships zero runtime fetching and no exposed keys. Fault-tolerant:
// on a failed source it keeps the last good file (or writes an empty-but-valid one), and always
// exits 0 so a flaky feed never breaks the build. Run with:  node scripts/pull.mjs
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sources } from '../src/config/sources.mjs';
import { pullSubstack } from './lib/substack.mjs';
import { pullLetterboxd, fetchFilmPoster } from './lib/letterboxd.mjs';
import { pullSteam } from './lib/steam.mjs';
import { pullPsn } from './lib/psn.mjs';
import { resolveTracks } from './lib/music.mjs';
import { readSingleton } from './lib/singleton.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEN = resolve(__dirname, '../src/generated');
mkdirSync(GEN, { recursive: true });

// Run one source. On success: write fresh JSON. On failure: keep the existing file,
// or seed an empty-but-valid one so the page import never breaks.
async function task(name, fn, fallback) {
  const file = resolve(GEN, name);
  try {
    const data = await fn();
    writeFileSync(file, JSON.stringify({ ...data, fetchedAt: new Date().toISOString() }, null, 2));
    const counts = Object.entries(data)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => `${k}:${v.length}`)
      .join(' ');
    console.log(`  ok   ${name} (${counts || '–'})`);
  } catch (err) {
    console.warn(`  fail ${name}: ${err.message}`);
    if (existsSync(file)) console.warn(`       kept last good ${name}`);
    else {
      writeFileSync(file, JSON.stringify({ ...fallback, fetchedAt: null, error: true }, null, 2));
      console.warn(`       seeded empty ${name}`);
    }
  }
}

// Hand-curated favorite films (CMS) enriched with posters scraped from each Letterboxd film page.
async function filmFavorites() {
  const fav = readSingleton('film-favorites');
  const films = fav?.films || [];
  return Promise.all(
    films.map(async (f) => ({
      title: f.title || '',
      rating: f.rating != null && f.rating !== '' ? Number(f.rating) : null,
      link: f.letterboxdUrl || '',
      poster: f.poster || (await fetchFilmPoster(f.letterboxdUrl)),
    }))
  );
}

console.log('pull: fetching fed data …');

// Writing — Substack metadata (latest posts).
await task('writing.json', async () => ({ items: await pullSubstack(sources.substack, 12) }), { items: [] });

// Films — latest reviews from RSS + hand-curated favorites with fetched posters.
await task(
  'films.json',
  async () => ({ reviews: await pullLetterboxd(sources.letterboxd, 8), favorites: await filmFavorites() }),
  { reviews: [], favorites: [] }
);

// Games last-played — Steam (own key+id) + PSN (npsso). Keys come from the environment / GitHub Secrets.
await task(
  'lastplayed.json',
  async () => {
    // isolate PSN so a token/auth hiccup can't also wipe the Steam list
    const steam = await pullSteam(sources.steamId, process.env.STEAM_API_KEY, 4);
    let psn = [];
    try {
      psn = await pullPsn(process.env.PSN_NPSSO, 4);
    } catch (e) {
      console.warn(`  psn failed: ${e?.message || e}`);
    }
    return { steam, psn };
  },
  { steam: [], psn: [] }
);

// Music — resolve the CMS playlist's Spotify links to preview + art for the record player.
await task('music.json', async () => ({ tracks: await resolveTracks(readSingleton('music')?.tracks, 12) }), { tracks: [] });

console.log('pull: done');
