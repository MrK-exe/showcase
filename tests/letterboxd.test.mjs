import { describe, it, expect } from 'vitest';
import { parseEntry } from '../scripts/lib/letterboxd.mjs';

// parseEntry turns a raw Letterboxd RSS item into a card. It's a string-scraper over feed
// HTML — exactly the kind of brittle code that breaks silently, so pin its behaviour.
describe('parseEntry', () => {
  it('extracts poster, decodes review text, strips the spoiler boilerplate', () => {
    const r = parseEntry({
      filmTitle: 'Drive', filmYear: '2011', memberRating: '4.5',
      watchedDate: '2024-01-02', link: 'https://letterboxd.com/x',
      content: '<p><img src="https://poster.jpg" />This review may contain spoilers. A neon fever dream.</p>',
    });
    expect(r.poster).toBe('https://poster.jpg');
    expect(r.excerpt).toBe('A neon fever dream.');
    expect(r.title).toBe('Drive');
    expect(r.year).toBe(2011);
    expect(r.rating).toBe(4.5);
    expect(r.isReview).toBe(true);
  });

  it('rating is null when memberRating is blank or absent', () => {
    expect(parseEntry({ title: 'X', content: 'text', memberRating: '' }).rating).toBeNull();
    expect(parseEntry({ title: 'X', content: 'text' }).rating).toBeNull();
  });

  it('falls back to the diary title, stripping the trailing ", YYYY…" suffix', () => {
    const r = parseEntry({ title: 'Sinners, 2025, ★★★★½', content: 'text', link: 'u' });
    expect(r.title).toBe('Sinners');
    expect(r.year).toBeNull();
  });

  it('marks a poster-only entry (no prose) as not a review, with an empty excerpt', () => {
    const r = parseEntry({ title: 'Poster only', content: '<img src="https://p.jpg">' });
    expect(r.isReview).toBe(false);
    expect(r.excerpt).toBe('');
    expect(r.poster).toBe('https://p.jpg');
  });

  it('truncates a long review on a word boundary with an ellipsis', () => {
    const long = ('word '.repeat(80)).trim(); // ~399 chars, well over the 240 cap
    const r = parseEntry({ title: 'Long', content: `<p>${long}</p>` });
    expect(r.excerpt.endsWith('…')).toBe(true);
    expect(r.excerpt.length).toBeLessThanOrEqual(241);
    expect(r.excerpt).not.toMatch(/wor…$/); // never cut mid-word (falls back to a space)
  });
});
