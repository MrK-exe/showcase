import { describe, it, expect } from 'vitest';
import { formatStars } from '../src/lib/rating';

// The star string is shared by Card grids (pad=false) and the game detail page (pad=true);
// it had drifted before being unified, so these tests pin BOTH shapes + the never-round-up rule.
describe('formatStars', () => {
  it('returns null for no / zero / negative rating', () => {
    expect(formatStars(null)).toBeNull();
    expect(formatStars(undefined)).toBeNull();
    expect(formatStars(0)).toBeNull();
    expect(formatStars(-1)).toBeNull();
  });

  it('compact (pad=false): whole + half, no hollow padding', () => {
    expect(formatStars(3)).toBe('★★★');
    expect(formatStars(2.5)).toBe('★★½');
    expect(formatStars(5)).toBe('★★★★★');
  });

  it('padded (pad=true): fills to five with hollow stars', () => {
    expect(formatStars(2.5, { pad: true })).toBe('★★½☆☆');
    expect(formatStars(4, { pad: true })).toBe('★★★★☆');
    expect(formatStars(5, { pad: true })).toBe('★★★★★');
    expect(formatStars(0.5, { pad: true })).toBe('½☆☆☆☆');
  });

  it('never rounds up: only >= .5 earns a half; below stays whole', () => {
    expect(formatStars(2.9)).toBe('★★½');            // 2.9 shows 2½, never 3
    expect(formatStars(2.4)).toBe('★★');             // 2.4 shows 2, no half
    expect(formatStars(2.4, { pad: true })).toBe('★★☆☆☆');
  });
});
