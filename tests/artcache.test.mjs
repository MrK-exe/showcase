import { describe, it, expect } from 'vitest';
import { artKey } from '../scripts/lib/artcache.mjs';

describe('artKey', () => {
  it('keys a Spotify cover by its image id, whichever host serves it', () => {
    const id = 'ab67616d00001e028fd4464607215c2e91afa117';
    const hosts = ['https://i.scdn.co', 'https://image-cdn-ak.spotifycdn.com', 'https://image-cdn-fa.spotifycdn.com'];
    const keys = hosts.map((h) => artKey(`${h}/image/${id}`));
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe(`spotify-image:${id}`);
  });

  it('leaves every other URL as its own key', () => {
    const poster = 'https://a.ltrbxd.com/resized/film-poster/5/1/5/7/5/51575-drive-0-600-0-900-crop.jpg?v=0c2d3c5bfa';
    expect(artKey(poster)).toBe(poster);
    expect(artKey('https://example.com/image/abc')).toBe('https://example.com/image/abc');
  });
});
