// Music for the record player. Spotify deprecated preview_url for new apps, so: resolve the pasted
// Spotify track link to title + artist (oEmbed for title/album-art; og:description for the artist),
// then match it on Apple's free iTunes Search API for a real 30-sec preview + hi-res artwork. The
// album art comes from Spotify (accurate to the exact track); the audio comes from iTunes. No keys.

const canonical = (url) => {
  const m = (url || '').match(/track\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/track/${m[1]}` : (url || '');
};

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// og:description is scraped from raw HTML, so entities arrive encoded
// ("Joey Valence &amp; Brae") and would poison the iTunes artist check.
const unescapeHtml = (s) =>
  (s || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function spotifyMeta(url) {
  const oembed = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(15000) }).then((r) => r.json());
  let artist = '';
  try {
    const html = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) }).then((r) => r.text());
    const desc = (html.match(/<meta property="og:description" content="([^"]*)"/) || [])[1] || '';
    artist = unescapeHtml(desc.split(' · ')[0].trim());
  } catch { /* artist optional — title-only match still works */ }
  return { title: oembed.title || '', artist, art: oembed.thumbnail_url || null };
}

async function itunesMatch(artist, title) {
  // Spotify suffixes version info after ' - ' ("Hotel California - 2013 Remaster");
  // iTunes writes it differently ("Hotel California (Remastered)"), so matching on the
  // full title misses. Search with the base title; match base-first, full-title when it
  // happens to agree.
  const baseTitle = title.split(' - ')[0].trim() || title;
  // Spotify lists collaborators as "A, B"; iTunes search chokes on the comma list, so
  // query with the primary artist and verify against ANY listed artist.
  const artists = (artist || '').split(',').map((s) => s.trim()).filter(Boolean);
  const search = async (term) => {
    const data = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=5`, { signal: AbortSignal.timeout(15000) }).then((r) => r.json());
    return data.results || [];
  };
  const want = norm(title);
  const wantBase = norm(baseTitle);
  // when the artist is known, the match must agree on one of them — a blind results[0]
  // can attach the wrong song's 30-sec preview to the track. No artist scraped →
  // title-only match, but never a fallback to an arbitrary first result.
  const artistOk = (r) =>
    !artists.length ||
    artists.some((a) => {
      const na = norm(a);
      const rn = norm(r.artistName);
      return na && (rn.includes(na) || na.includes(rn));
    });
  const pick = (results) =>
    results.find((r) => norm(r.trackName) === want && artistOk(r)) ||
    results.find((r) => norm(r.trackName) === wantBase && artistOk(r)) ||
    results.find((r) => norm(r.trackName).includes(wantBase) && artistOk(r));
  let hit = pick(await search(`${artists[0] || ''} ${baseTitle}`.trim()));
  // artist+title found nothing artist-approved → title-only search (odd artist strings,
  // features, stylized names); the artist check still gates every candidate.
  if (!hit && artists.length) hit = pick(await search(baseTitle));
  if (!hit) return { preview: null, art: null };
  return {
    preview: hit.previewUrl || null,
    art: hit.artworkUrl100 ? hit.artworkUrl100.replace('100x100bb', '600x600bb') : null,
  };
}

// A Spotify track URL pasted into the wrong field still yields a track id.
const trackUrlIn = (s) => {
  const m = (s || '').match(/track\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/track/${m[1]}` : '';
};

export async function resolveTracks(items, limit = 12) {
  const out = [];
  for (const it of (items || []).slice(0, limit)) {
    // Rescue common paste mistakes: URL (or embed code) in the Label field instead of
    // the URL field. A label that is itself a URL is never used as display text.
    const url = canonical(it.spotifyUrl) || trackUrlIn(it.label);
    const label = /https?:\/\//i.test(it.label || '') ? '' : it.label;
    if (!url) continue;
    try {
      const meta = await spotifyMeta(url);
      const itunes = await itunesMatch(meta.artist, meta.title);
      out.push({
        spotifyUrl: url,
        title: label || meta.title || 'Untitled',
        artist: meta.artist || '',
        art: meta.art || itunes.art || null, // Spotify album art first (matches the exact track)
        preview: itunes.preview,             // 30-sec clip from iTunes
      });
    } catch (err) {
      out.push({ spotifyUrl: url, title: label || 'Untitled', artist: '', art: null, preview: null, error: true });
    }
  }
  return out;
}
