// Letterboxd RSS → latest reviews (poster + excerpt + rating + link). Favorites aren't in the
// feed (hand-curated in the CMS instead). Built on rss-parser with Letterboxd's namespaced fields.
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 15000,
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
  const feed = await parser.parseURL(`https://letterboxd.com/${user}/rss/`);
  const entries = (feed.items || []).map(parseEntry);
  // prefer entries that carry actual review prose; fall back to plain diary entries if sparse
  const reviews = entries.filter((e) => e.isReview);
  return (reviews.length ? reviews : entries).slice(0, limit);
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
