// Music for the record player. Spotify deprecated preview_url for new apps, so: resolve the pasted
// Spotify track link to title + artist (oEmbed for title/album-art; og:description for the artist),
// then match it against keyless preview catalogs for a real 30-sec clip: Apple's iTunes Search API
// first (stable, non-expiring files), Deezer as fallback (covers different catalog gaps; its
// preview URLs carry an expiry token, refreshed by the daily cron rebuild). The album art comes
// from Spotify (accurate to the exact track); the audio comes from the matched catalog. No keys.

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

// Spotify suffixes version info after ' - ' ("Hotel California - 2013 Remaster");
// catalogs write it differently ("Hotel California (Remastered)"), so matching on the
// full title misses. Match base-first, full-title when it happens to agree.
// Spotify lists collaborators as "A, B"; catalog search chokes on the comma list, so
// query with the primary artist and verify candidates against ANY listed artist.
// When the artist is known, the match MUST agree on one of them — a blind results[0]
// can attach the wrong song's 30-sec preview to the track. No artist scraped →
// title-only match, but never a fallback to an arbitrary first result.
const splitArtists = (artist) => (artist || '').split(',').map((s) => s.trim()).filter(Boolean);
const pickTrack = (candidates, artists, title, baseTitle) => {
  const want = norm(title);
  const wantBase = norm(baseTitle);
  const artistOk = (c) =>
    !artists.length ||
    artists.some((a) => {
      const na = norm(a);
      const rn = norm(c.artist);
      return na && (rn.includes(na) || na.includes(rn));
    });
  return (
    candidates.find((c) => norm(c.title) === want && artistOk(c)) ||
    candidates.find((c) => norm(c.title) === wantBase && artistOk(c)) ||
    candidates.find((c) => norm(c.title).includes(wantBase) && artistOk(c))
  );
};

async function itunesMatch(artist, title) {
  const baseTitle = title.split(' - ')[0].trim() || title;
  const artists = splitArtists(artist);
  const search = async (term) => {
    const data = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=5`, { signal: AbortSignal.timeout(15000) }).then((r) => r.json());
    return (data.results || []).map((r) => ({
      title: r.trackName,
      artist: r.artistName,
      preview: r.previewUrl || null,
      art: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '600x600bb') : null,
    }));
  };
  let hit = pickTrack(await search(`${artists[0] || ''} ${baseTitle}`.trim()), artists, title, baseTitle);
  // artist+title found nothing artist-approved → title-only search (odd artist strings,
  // features, stylized names); the artist check still gates every candidate.
  if (!hit && artists.length) hit = pickTrack(await search(baseTitle), artists, title, baseTitle);
  return hit || { preview: null, art: null };
}

// Deezer fallback — the other keyless catalog with direct 30-sec MP3 previews; it carries
// tracks (esp. independent releases) that Apple doesn't. Same verification gate.
async function deezerMatch(artist, title) {
  const baseTitle = title.split(' - ')[0].trim() || title;
  const artists = splitArtists(artist);
  const search = async (q) => {
    const data = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=5`, { signal: AbortSignal.timeout(15000) }).then((r) => r.json());
    return (data.data || []).map((r) => ({
      title: r.title,
      artist: r.artist?.name || '',
      preview: r.preview || null,
      art: r.album?.cover_big || null,
    }));
  };
  let hit = pickTrack(
    await search(artists[0] ? `artist:"${artists[0]}" track:"${baseTitle}"` : baseTitle),
    artists, title, baseTitle
  );
  if (!hit && artists.length) hit = pickTrack(await search(`${artists[0]} ${baseTitle}`), artists, title, baseTitle);
  return hit || { preview: null, art: null };
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
      let match = await itunesMatch(meta.artist, meta.title);
      // not in Apple's catalog → try Deezer before giving up (row then links to Spotify)
      if (!match.preview) {
        const dz = await deezerMatch(meta.artist, meta.title);
        if (dz.preview) match = dz;
      }
      out.push({
        spotifyUrl: url,
        title: label || meta.title || 'Untitled',
        artist: meta.artist || '',
        art: meta.art || match.art || null, // Spotify album art first (matches the exact track)
        preview: match.preview,             // 30-sec clip from iTunes or Deezer
      });
    } catch (err) {
      out.push({ spotifyUrl: url, title: label || 'Untitled', artist: '', art: null, preview: null, error: true });
    }
  }
  return out;
}
