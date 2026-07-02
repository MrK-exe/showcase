// Build-time data pull. Fetches the fed sections from public feeds/APIs and writes static JSON
// into src/generated so the site ships zero runtime fetching and no exposed keys. Fault-tolerant:
// on a failed source it keeps the last good file (or writes an empty-but-valid one), and always
// exits 0 so a flaky feed never breaks the build. Run with:  node scripts/pull.mjs
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sources } from '../src/config/sources.mjs';
import { pullSubstack } from './lib/substack.mjs';
import { pullLetterboxd, fetchFilmPoster } from './lib/letterboxd.mjs';
import { pullSteam } from './lib/steam.mjs';
import { pullPsn } from './lib/psn.mjs';
import { resolveTracks } from './lib/music.mjs';
import { readSingleton } from './lib/singleton.mjs';
import { withCachedArt } from './lib/artcache.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEN = resolve(__dirname, '../src/generated');
mkdirSync(GEN, { recursive: true });

// Read a previously generated file (the "last good" state) — used for per-source merges
// where one platform's outage must not blank another platform's fresh data.
function readGen(name, fallback) {
  const file = resolve(GEN, name);
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

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

// Writing — Substack metadata (latest posts). Art fields are downloaded into
// src/generated/art (see lib/artcache.mjs) so the site serves them from its own origin.
await task(
  'writing.json',
  async () => ({ items: await withCachedArt(await pullSubstack(sources.substack, 12), 'image') }),
  { items: [] }
);

// Films — latest reviews from RSS + hand-curated favorites with fetched posters.
await task(
  'films.json',
  async () => ({
    reviews: await withCachedArt(await pullLetterboxd(sources.letterboxd, 8), 'poster'),
    favorites: await withCachedArt(await filmFavorites(), 'poster'),
  }),
  { reviews: [], favorites: [] }
);

// Games last-played — Steam (own key+id) + PSN (npsso). Keys come from the environment / GitHub Secrets.
await task(
  'lastplayed.json',
  async () => {
    // Per-source isolation WITH per-source keep-last-good: one platform's outage must
    // neither wipe the other platform's fresh pull nor overwrite its OWN last good list
    // with []. A missing key (e.g. a build without secrets) also keeps the last good list.
    const prev = readGen('lastplayed.json', { steam: [], psn: [] });
    let steam = prev.steam || [];
    try {
      const hasKey = sources.steamId && process.env.STEAM_API_KEY;
      if (hasKey) steam = await withCachedArt(await pullSteam(sources.steamId, process.env.STEAM_API_KEY, 4), 'cover', 'header');
    } catch (e) {
      console.warn(`  steam failed: ${e?.message || e} (kept last good)`);
    }
    let psn = prev.psn || [];
    try {
      if (process.env.PSN_NPSSO) psn = await withCachedArt(await pullPsn(process.env.PSN_NPSSO, 4), 'cover');
    } catch (e) {
      console.warn(`  psn failed: ${e?.message || e} (kept last good)`);
    }
    return { steam, psn };
  },
  { steam: [], psn: [] }
);

// Music — resolve the CMS playlist's Spotify links to preview + art for the record player.
await task(
  'music.json',
  async () => ({ tracks: await withCachedArt(await resolveTracks(readSingleton('music')?.tracks, 12), 'art') }),
  { tracks: [] }
);

console.log('pull: done');
