import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* Astro-side schemas for the file-backed collections authored/uploaded in Keystatic.
   Curated singletons (film favorites, top games, music, connect) and fed data (writing,
   latest films, last-played games) are read elsewhere — not Astro content collections. */

// Authored dev-log entries (markdoc body → outline/TOC + dedicated page).
const work = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    // mirrors the Keystatic select — a hand-edited file can't ship an unknown status
    status: z.enum(['shipped', 'wip', 'archived']).optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

// Authored game reviews (markdoc body + dedicated page).
// cover uses the image() helper: Keystatic stores an entry-relative path into
// src/assets/images/games, astro:assets resolves it to ImageMetadata (WebP + srcset).
const gameReviews = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/content/game-reviews' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date().optional(),
      rating: z.coerce.number().min(0).max(5).optional(),
      cover: image().optional(),
      excerpt: z.string().optional(),
    }),
});

// Uploaded photos (data-only json: image + caption + date + Instagram link).
const photos = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml,json}', base: './src/content/photos' }),
  schema: ({ image }) =>
    z.object({
      name: z.string().optional(),
      image: image(),
      caption: z.string().optional(),
      date: z.coerce.date().optional(),
      // mirrors the Keystatic url field — must be a real URL when present
      instagramUrl: z.string().url().optional().or(z.literal('')),
    }),
});

export const collections = { work, gameReviews, photos };
