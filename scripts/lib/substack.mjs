// Substack feed → post metadata (title, date, link, first image). Metadata only — the full
// read lives on Substack. Built on rss-parser (no custom XML parsing).
import Parser from 'rss-parser';

// rss-parser's default User-Agent ("rss-parser") gets bot-filtered by CDN-fronted feeds
// when the request comes from a datacenter IP (GitHub Actions) — send a descriptive UA,
// same workaround fetchFilmPoster in letterboxd.mjs already uses.
const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; showcase-build; +https://mrk-exe.github.io/showcase/)' },
});

// One retry on a flaky/blocked first attempt — a failed pull in CI blanks the section
// until the next daily build, so a second try is cheap insurance.
async function parseWithRetry(url) {
  try {
    return await parser.parseURL(url);
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
    return parser.parseURL(url);
  }
}

const firstImage = (it) => {
  if (it.enclosure?.url) return it.enclosure.url;
  const html = it['content:encoded'] || it.content || '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
};

export async function pullSubstack(baseUrl, limit = 12) {
  const feedUrl = baseUrl.replace(/\/+$/, '') + '/feed';
  const feed = await parseWithRetry(feedUrl);
  return (feed.items || []).slice(0, limit).map((it) => ({
    title: (it.title || 'Untitled').trim(),
    date: it.isoDate || it.pubDate || null,
    link: it.link || '',
    image: firstImage(it),
  }));
}
