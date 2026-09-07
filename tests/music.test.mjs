import { describe, it, expect } from 'vitest';
import { canonical, norm, splitArtists, trackUrlIn, unescapeHtml, pickTrack } from '../scripts/lib/music.mjs';

describe('canonical / trackUrlIn — Spotify URL extraction', () => {
  it('strips query params down to the canonical track URL', () => {
    expect(canonical('https://open.spotify.com/track/abc123?si=xyz')).toBe('https://open.spotify.com/track/abc123');
  });
  it('returns the input unchanged when there is no track id', () => {
    expect(canonical('')).toBe('');
    expect(canonical('https://example.com')).toBe('https://example.com');
  });
  it('rescues a track URL pasted into the wrong field (embed / prose)', () => {
    expect(trackUrlIn('oops <iframe src="https://open.spotify.com/track/xyz789"></iframe>')).toBe('https://open.spotify.com/track/xyz789');
    expect(trackUrlIn('just a label')).toBe('');
  });
});

describe('norm / splitArtists / unescapeHtml — matching primitives', () => {
  it('norm lowercases and drops everything but a-z0-9', () => {
    expect(norm('Hotel California - 2013 Remaster')).toBe('hotelcalifornia2013remaster');
    expect(norm('Café Über!')).toBe('cafber');
  });
  it('splitArtists splits a comma list and trims/drops blanks', () => {
    expect(splitArtists('A, B, C')).toEqual(['A', 'B', 'C']);
    expect(splitArtists('Solo')).toEqual(['Solo']);
    expect(splitArtists('')).toEqual([]);
  });
  it('unescapeHtml decodes the entities og:description arrives with', () => {
    expect(unescapeHtml('Joey Valence &amp; Brae')).toBe('Joey Valence & Brae');
    expect(unescapeHtml('it&#39;s &quot;live&quot;')).toBe('it\'s "live"');
  });
});

// The verification gate — this is the one that keeps the wrong song's 30-sec preview from
// being stapled onto a track. A blind results[0] would fail these.
describe('pickTrack — artist-verified matching', () => {
  const cands = [
    { title: 'Midnight', artist: 'Wrong Artist', preview: 'WRONG' },
    { title: 'Midnight', artist: 'Right Artist', preview: 'RIGHT' },
  ];

  it('skips a title match by the wrong artist and picks the artist-verified one', () => {
    const hit = pickTrack(cands, ['Right Artist'], 'Midnight', 'Midnight');
    expect(hit?.preview).toBe('RIGHT');
  });

  it('returns undefined when NO candidate agrees on the artist (never a blind first result)', () => {
    const hit = pickTrack([{ title: 'Midnight', artist: 'Nobody', preview: 'X' }], ['Right Artist'], 'Midnight', 'Midnight');
    expect(hit).toBeUndefined();
  });

  it('with no known artist, falls back to a title-only match', () => {
    const hit = pickTrack([{ title: 'Midnight', artist: 'Anyone', preview: 'OK' }], [], 'Midnight', 'Midnight');
    expect(hit?.preview).toBe('OK');
  });

  it('matches on the base title when the full (remaster-suffixed) title differs', () => {
    const c = [{ title: 'Hotel California', artist: 'Eagles', preview: 'BASE' }];
    const hit = pickTrack(c, ['Eagles'], 'Hotel California - 2013 Remaster', 'Hotel California');
    expect(hit?.preview).toBe('BASE');
  });

  it('accepts a partial artist overlap (collaborator lists)', () => {
    const c = [{ title: 'Song', artist: 'Joey Valence & Brae', preview: 'FEAT' }];
    const hit = pickTrack(c, ['Joey Valence'], 'Song', 'Song');
    expect(hit?.preview).toBe('FEAT');
  });
});
