// Build-time cache of remote media. Downloading at pull time means the deployed site
// serves these from its own origin — no third-party hotlinking (privacy, CSP, rot).
//
// Two caches from one factory:
// - artwork  → src/generated/art   (handed to astro:assets for WebP/srcset; on a failed
//              download the ORIGINAL remote URL is returned so the page hotlink-degrades)
// - audio    → public/audio-cache  (served verbatim; on failure returns null — Deezer
//              preview URLs expire ~20 min after issue, so shipping one is worse than
//              no preview. Keyed by a caller-supplied STABLE id, because hashing the
//              rotating tokenized URL would re-download + duplicate every build.)
//
// Both dirs are gitignored and restored between CI runs by actions/cache — an existing
// file is a cache hit, so a dead CDN keeps serving the last good copy.
import { createHash } from 'node:crypto';
import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Extension comes from the response content-type (many CDN URLs carry none).
function makeCache({ dir, prefix, types, label, keepRemoteOnFail }) {
  const abs = resolve(ROOT, dir);
  let index = null; // hash → '<prefix>/<hash>.<ext>', built once from the dir listing
  return async function cache(url, stableKey = url) {
    if (!url || typeof url !== 'string') return keepRemoteOnFail ? url ?? null : null;
    if (!/^https:\/\//i.test(url)) return url; // already a local/cached path
    if (index === null) {
      index = new Map();
      if (existsSync(abs)) {
        for (const f of readdirSync(abs)) index.set(f.replace(/\.[^.]+$/, ''), `${prefix}/${f}`);
      }
    }
    const hash = createHash('sha1').update(String(stableKey)).digest('hex').slice(0, 16);
    const hit = index.get(hash);
    if (hit) return hit;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`http ${res.status}`);
      const type = (res.headers.get('content-type') || '').split(';')[0].trim();
      const ext = types[type];
      if (!ext) throw new Error(`unexpected content-type: ${type || 'none'}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error('suspiciously small body');
      mkdirSync(abs, { recursive: true });
      writeFileSync(resolve(abs, `${hash}.${ext}`), buf);
      const rel = `${prefix}/${hash}.${ext}`;
      index.set(hash, rel);
      return rel;
    } catch (err) {
      console.warn(`  ${label} ${keepRemoteOnFail ? 'keep remote' : 'skip'} ${url.slice(0, 72)} (${err.message})`);
      return keepRemoteOnFail ? url : null;
    }
  };
}

export const cacheArt = makeCache({
  dir: 'src/generated/art',
  prefix: 'art',
  types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' },
  label: 'art  ',
  keepRemoteOnFail: true,
});

export const cacheAudio = makeCache({
  dir: 'public/audio-cache',
  prefix: 'audio-cache',
  types: { 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac' },
  label: 'audio',
  keepRemoteOnFail: false,
});

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
