// Music for the record player. Spotify deprecated preview_url for new apps, so: resolve the pasted
// Spotify track link to title + artist (oEmbed for title/album-art; og:description for the artist),
// then match it on Apple's free iTunes Search API for a real 30-sec preview + hi-res artwork. The
// album art comes from Spotify (accurate to the exact track); the audio comes from iTunes. No keys.

const canonical = (url) => {
  const m = (url || '').match(/track\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/track/${m[1]}` : (url || '');
};

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function spotifyMeta(url) {
  const oembed = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`).then((r) => r.json());
  let artist = '';
  try {
    const html = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => r.text());
    const desc = (html.match(/<meta property="og:description" content="([^"]*)"/) || [])[1] || '';
    artist = desc.split(' · ')[0].trim();
  } catch { /* artist optional — title-only match still works */ }
  return { title: oembed.title || '', artist, art: oembed.thumbnail_url || null };
}

async function itunesMatch(artist, title) {
  const term = encodeURIComponent(`${artist} ${title}`.trim());
  const data = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=5`).then((r) => r.json());
  const results = data.results || [];
  const want = norm(title);
  const hit =
    results.find((r) => norm(r.trackName) === want) ||
    results.find((r) => norm(r.trackName).includes(want)) ||
    results[0];
  if (!hit) return { preview: null, art: null };
  return {
    preview: hit.previewUrl || null,
    art: hit.artworkUrl100 ? hit.artworkUrl100.replace('100x100bb', '600x600bb') : null,
  };
}

export async function resolveTracks(items, limit = 12) {
  const out = [];
  for (const it of (items || []).slice(0, limit)) {
    const url = canonical(it.spotifyUrl);
    if (!url) continue;
    try {
      const meta = await spotifyMeta(url);
      const itunes = await itunesMatch(meta.artist, meta.title);
      out.push({
        spotifyUrl: url,
        title: it.label || meta.title || 'Untitled',
        artist: meta.artist || '',
        art: meta.art || itunes.art || null, // Spotify album art first (matches the exact track)
        preview: itunes.preview,             // 30-sec clip from iTunes
      });
    } catch (err) {
      out.push({ spotifyUrl: url, title: it.label || 'Untitled', artist: '', art: null, preview: null, error: true });
    }
  }
  return out;
}
