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
    status: z.string().optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

// Authored game reviews (markdoc body + dedicated page).
const gameReviews = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/content/game-reviews' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    cover: z.string().optional(),
    excerpt: z.string().optional(),
  }),
});

// Uploaded photos (data-only yaml: image + caption + date + Instagram link).
const photos = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml,json}', base: './src/content/photos' }),
  schema: z.object({
    name: z.string().optional(),
    image: z.string(),
    caption: z.string().optional(),
    date: z.coerce.date().optional(),
    instagramUrl: z.string().optional(),
  }),
});

export const collections = { work, gameReviews, photos };
