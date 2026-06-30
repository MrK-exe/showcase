// Substack feed → post metadata (title, date, link, first image). Metadata only — the full
// read lives on Substack. Built on rss-parser (no custom XML parsing).
import Parser from 'rss-parser';

const parser = new Parser({ timeout: 15000 });

const firstImage = (it) => {
  if (it.enclosure?.url) return it.enclosure.url;
  const html = it['content:encoded'] || it.content || '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
};

export async function pullSubstack(baseUrl, limit = 12) {
  const feedUrl = baseUrl.replace(/\/+$/, '') + '/feed';
  const feed = await parser.parseURL(feedUrl);
  return (feed.items || []).slice(0, limit).map((it) => ({
    title: (it.title || 'Untitled').trim(),
    date: it.isoDate || it.pubDate || null,
    link: it.link || '',
    image: firstImage(it),
  }));
}
