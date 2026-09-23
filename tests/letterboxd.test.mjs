import { describe, it, expect } from 'vitest';
import { parseEntry, parseFavorites } from '../scripts/lib/letterboxd.mjs';

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

  it('decodes the entities the feed sends in review prose', () => {
    const r = parseEntry({ title: 'X', content: '<p>I don&#039;t know what &quot;this&quot; is</p>' });
    expect(r.excerpt).toBe('I don\'t know what "this" is');
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

// Markup trimmed from the live profile page (Sep 2026), attributes in Letterboxd's order.
const poster = (name, slug) =>
  `<li class="griditem"><div class="favourite-production-poster-container" data-owner="abdullahVEVO">` +
  `<div class="react-component" data-component-class="LazyPoster" data-image-width="150" data-image-height="225" ` +
  `data-item-name="${name}" data-item-slug="${slug}" data-item-link="/film/${slug}/" data-item-full-display-name="${name}"></div></div></li>`;
const profile = (items) =>
  `<section id="favourites" class="section"><h2 class="section-heading">Favorite films</h2>` +
  `<div class="poster-grid"><ul class="grid -p150">${items.join('')}</ul></div></section>`;

describe('parseFavorites', () => {
  it('reads title + absolute film link off the favorites wall, dropping the year', () => {
    const films = parseFavorites(profile([poster('Inception (2010)', 'inception'), poster('Drive (2011)', 'drive-2011')]));
    expect(films).toEqual([
      { title: 'Inception', rating: null, link: 'https://letterboxd.com/film/inception/', poster: '' },
      { title: 'Drive', rating: null, link: 'https://letterboxd.com/film/drive-2011/', poster: '' },
    ]);
  });

  it('decodes entities in film names', () => {
    const [film] = parseFavorites(profile([poster('Schindler&#039;s List (1993)', 'schindlers-list')]));
    expect(film.title).toBe("Schindler's List");
  });

  it('throws when the page has no favorites wall, so the caller keeps the last good list', () => {
    expect(() => parseFavorites('<title>Just a moment...</title>')).toThrow(/no favourites section/);
  });
});
