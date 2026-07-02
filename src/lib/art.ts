// Resolve a stored art reference to something Card can render:
// - 'art/<hash>.<ext>'   → remote art cached at pull time into src/generated/art
//                          (ImageMetadata → optimized <Image> with srcset)
// - '/src/assets/...'    → CMS-uploaded file referenced by an absolute src path
//                          (used by the top-games singleton, which bypasses collections)
// - anything else        → passed through as a plain string (remote-URL fallback for a
//                          failed cache download; <img> hotlinks it like before)
// A cached path whose file vanished (lost CI cache) resolves to undefined → the card
// shows its 'no image' placeholder until the next daily pull re-downloads it.
import type { ImageMetadata } from 'astro';

const cached = import.meta.glob<ImageMetadata>('/src/generated/art/*.{jpg,png,webp,avif,gif}', {
  eager: true,
  import: 'default',
});
const uploaded = import.meta.glob<ImageMetadata>(
  '/src/assets/images/**/*.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true, import: 'default' }
);

export type Art = ImageMetadata | string | undefined;

export function resolveArt(p?: string | null): Art {
  if (!p) return undefined;
  if (p.startsWith('art/')) return cached[`/src/generated/${p}`];
  if (p.startsWith('/src/assets/')) return uploaded[p];
  return p;
}
