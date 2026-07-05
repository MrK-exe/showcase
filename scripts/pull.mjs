// Build-time data pull. Fetches the fed sections from public feeds/APIs and writes static JSON
// into src/generated so the site ships zero runtime fetching and no exposed keys. Fault-tolerant:
// on a failed source it keeps the last good file (or writes an empty-but-valid one), and always
// exits 0 so a flaky feed never breaks the build. Run with:  node scripts/pull.mjs
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sources } from '../src/config/sources.mjs';
import { pullSubstack } from './lib/substack.mjs';
import { pullLetterboxd, fetchFavorites, fetchFilmPoster } from './lib/letterboxd.mjs';
import { pullSteam } from './lib/steam.mjs';
import { pullPsn } from './lib/psn.mjs';
import { resolveTracks } from './lib/music.mjs';
import { pullSignals } from './lib/umami.mjs';
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

// Favorite films — the Letterboxd profile's own Favorites wall, scraped at pull time.
// The CMS singleton is a manual OVERRIDE: any films listed there win (custom order/ratings/
// posters); empty singleton = live profile favorites. A failed profile scrape keeps the
// previously pulled list (same per-source isolation as Steam/PSN below), so a Letterboxd
// hiccup can never blank favorites while fresh reviews still land.
async function filmFavorites() {
  const curated = (readSingleton('film-favorites')?.films || []).map((f) => ({
    title: f.title || '',
    rating: f.rating != null && f.rating !== '' ? Number(f.rating) : null,
    link: f.letterboxdUrl || '',
    poster: f.poster || '',
  }));
  let films = curated;
  if (!films.length) {
    try {
      films = await fetchFavorites(sources.letterboxd);
    } catch (e) {
      console.warn(`  letterboxd favorites failed: ${e?.message || e} (kept last good)`);
      return readGen('films.json', { favorites: [] }).favorites || [];
    }
  }
  return Promise.all(
    films.map(async (f) => ({ ...f, poster: f.poster || (await fetchFilmPoster(f.link)) }))
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

// Signals — Umami Cloud snapshot (unique visitors + countries, last 7 days) feeding the
// hero radar's honest label. Reads via the PUBLIC share URL (no key, works anywhere);
// unset/failed → task()'s keep-last-good path, so the label never regresses to fake data.
await task(
  'signals.json',
  async () => {
    if (!sources.umamiShare) throw new Error('no umami share url (skipped)');
    return pullSignals(sources.umamiShare, 7);
  },
  { days: 7, visitors: null, pageviews: null, countries: [] }
);

console.log('pull: done');
