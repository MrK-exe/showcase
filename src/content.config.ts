import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// One shared "card" schema. Every section's items are cards driven by this data.
const cardSchema = z.object({
  title: z.string(),
  kicker: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  date: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).optional(),
  status: z.string().optional(),
  variant: z.enum(['poster', 'wide', 'square', 'photo', 'row']).default('wide'),
  progress: z
    .object({ show: z.boolean().default(false), value: z.number().min(0).max(100).default(0) })
    .optional(),
  image: z.string().optional(),
  links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  order: z.number().default(0),
});

const mk = (dir: string) =>
  defineCollection({
    loader: glob({ pattern: '**/*.{md,mdoc}', base: `./src/content/${dir}` }),
    schema: cardSchema,
  });

export const collections = {
  work: mk('work'),
  films: mk('films'),
  games: mk('games'),
  writing: mk('writing'),
  photos: mk('photos'),
};
