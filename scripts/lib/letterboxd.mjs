// Letterboxd RSS → latest reviews (poster + excerpt + rating + link). Built on rss-parser with
// Letterboxd's namespaced fields. Favorites aren't in the feed — scraped from the profile page.
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 15000,
  // descriptive UA — rss-parser's default gets bot-filtered from datacenter IPs (see substack.mjs)
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; showcase-build; +https://mrk-exe.github.io/showcase/)' },
  customFields: {
    item: [
      ['letterboxd:filmTitle', 'filmTitle'],
      ['letterboxd:filmYear', 'filmYear'],
      ['letterboxd:memberRating', 'memberRating'],
      ['letterboxd:watchedDate', 'watchedDate'],
      ['letterboxd:rewatch', 'rewatch'],
      ['tmdb:movieId', 'tmdbId'],
    ],
  },
});

const parseEntry = (it) => {
  const html = it.content || it['content:encoded'] || it.description || '';
  const poster = (html.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || null;
  // strip the poster image + tags → plain review text; drop Letterboxd's platform
  // boilerplate so it never ships on a card as if it were the review's opening line
  const text = html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^this review may contain spoilers\.?\s*/i, '');
  // truncate on a word boundary — never mid-word
  let excerpt = text;
  if (text.length > 240) {
    const cut = text.slice(0, 240);
    const space = cut.lastIndexOf(' ');
    excerpt = cut.slice(0, space > 180 ? space : 237).trimEnd() + '…';
  }
  const rating = it.memberRating != null && it.memberRating !== '' ? Number(it.memberRating) : null;
  return {
    title: it.filmTitle || (it.title || '').replace(/,\s*\d{4}.*$/, '') || 'Untitled',
    year: it.filmYear ? Number(it.filmYear) : null,
    rating,
    watchedDate: it.watchedDate || it.isoDate || it.pubDate || null,
    link: it.link || '',
    poster,
    excerpt,
    isReview: text.length > 0,
  };
};

export async function pullLetterboxd(user, limit = 8) {
  const url = `https://letterboxd.com/${user}/rss/`;
  // one retry — this feed flakes on timeouts, and a failed pull blanks the section until the next build
  const feed = await parser.parseURL(url).catch(async () => {
    await new Promise((r) => setTimeout(r, 2000));
    return parser.parseURL(url);
  });
  const entries = (feed.items || []).map(parseEntry);
  // prefer entries that carry actual review prose; fall back to plain diary entries if sparse
  const reviews = entries.filter((e) => e.isReview);
  return (reviews.length ? reviews : entries).slice(0, limit);
}

// The profile's Favorites wall (max 4). Not in any feed, so scrape the profile page: each
// favorite is a poster div carrying data-item-name="Drive (2011)" + data-item-link="/film/…/".
// The poster itself is lazy-loaded client-side, so it's fetched per film via fetchFilmPoster.
// Ratings stay null — Letterboxd's own favorites wall doesn't show them either. Throws on a
// failed fetch so the caller can keep the last good list.
export async function fetchFavorites(user) {
  const res = await fetch(`https://letterboxd.com/${user}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; showcase-build; +https://mrk-exe.github.io/showcase/)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`letterboxd profile: http ${res.status}`);
  const html = await res.text();
  const section = (html.match(/<section id="favourites"[\s\S]*?<\/section>/i) || [])[0];
  if (!section) throw new Error('letterboxd profile: no favourites section (markup changed?)');
  const films = [];
  for (const m of section.matchAll(/data-item-name="([^"]+)"[^>]*?data-item-link="([^"]+)"/g)) {
    const name = m[1].replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');
    films.push({
      title: name.replace(/\s*\(\d{4}\)\s*$/, ''),
      rating: null,
      link: new URL(m[2], 'https://letterboxd.com').href,
      poster: '',
    });
  }
  return films.slice(0, 4);
}

// A favorite film's poster isn't in the RSS feed, so grab it from the film page's og:image.
export async function fetchFilmPoster(filmUrl) {
  if (!filmUrl) return null;
  try {
    const html = await fetch(filmUrl, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) }).then((r) => r.text());
    return (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1] || null;
  } catch {
    return null;
  }
}
