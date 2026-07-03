// Substack feed → post metadata (title, date, link, first image). Metadata only — the full
// read lives on Substack. Built on rss-parser (no custom XML parsing).
import Parser from 'rss-parser';

// Substack 403s bot-identifying User-Agents from datacenter IPs (GitHub Actions) —
// "compatible; …" strings included. A full browser UA is what feed readers use to get
// through; local pulls work with any UA.
const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
  },
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
