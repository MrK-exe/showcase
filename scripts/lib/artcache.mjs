// Build-time cache of remote artwork (Steam/PSN covers, Letterboxd posters, iTunes
// album art, Substack images). Downloading at pull time means the deployed site serves
// art from its own origin — no third-party hotlinking (privacy, CSP, rot) — and hands
// the files to astro:assets for WebP/srcset optimization.
//
// Files are content-addressed by URL hash into src/generated/art (gitignored; restored
// between CI runs by actions/cache, same keep-last-good story as the feed JSON). An
// existing file is a cache hit, so a dead CDN keeps serving the last good copy. On a
// download failure the ORIGINAL remote URL is returned, so the page degrades to a
// hotlink instead of a placeholder.
import { createHash } from 'node:crypto';
import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ART = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/generated/art');

// Extension comes from the response content-type (many PSN/CDN URLs carry none).
const EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

let index = null; // hash → 'art/<hash>.<ext>', built once from the dir listing
function loadIndex() {
  index = new Map();
  if (existsSync(ART)) {
    for (const f of readdirSync(ART)) index.set(f.replace(/\.[^.]+$/, ''), `art/${f}`);
  }
}

export async function cacheArt(url) {
  if (!url || typeof url !== 'string') return url ?? null;
  if (!/^https:\/\//i.test(url)) return url; // already a local/cached path
  if (index === null) loadIndex();

  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
  const hit = index.get(hash);
  if (hit) return hit;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    const ext = EXT[type];
    if (!ext) throw new Error(`not an image: ${type || 'no content-type'}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) throw new Error('suspiciously small body');
    mkdirSync(ART, { recursive: true });
    writeFileSync(resolve(ART, `${hash}.${ext}`), buf);
    const rel = `art/${hash}.${ext}`;
    index.set(hash, rel);
    return rel;
  } catch (err) {
    console.warn(`  art  keep remote ${url.slice(0, 72)} (${err.message})`);
    return url;
  }
}

// Map an item list, replacing each named field's remote URL with its cached path.
export function withCachedArt(items, ...keys) {
  return Promise.all(
    (items || []).map(async (item) => {
      const out = { ...item };
      for (const k of keys) out[k] = await cacheArt(item?.[k]);
      return out;
    })
  );
}
