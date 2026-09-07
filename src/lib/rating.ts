// Half-star aware star string, Letterboxd style: 2.5 → ★★½ (never rounds up). Single source
// for the rating glyphs that Card.astro and the game detail page both render — they had
// drifted (one padded empty stars, one didn't); `pad` now makes that choice explicit.
//   pad=false → compact grids: '★★½'         (no hollow padding)
//   pad=true  → detail page:   '★★½☆☆'        (padded to a full 5)
export function formatStars(rating?: number | null, opts: { pad?: boolean } = {}): string | null {
  if (rating == null || rating <= 0) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = opts.pad ? Math.max(0, 5 - full - half) : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}
