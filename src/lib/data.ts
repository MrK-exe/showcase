// Build-time reads of pulled feed data (src/generated/*.json) and CMS singletons
// (src/content/settings/*.json). Resilient twice over: a missing/corrupt file returns the
// fallback rather than breaking the build, and every read is validated with a PERMISSIVE
// zod schema so feed-shape drift degrades a field to its default (never blanks a section)
// while a wholesale shape change falls back loudly instead of flowing `as T` into the page.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'astro/zod';

const root = process.cwd();

function readJson<S extends z.ZodTypeAny>(rel: string, schema: S, fallback: z.infer<S>): z.infer<S> {
  const f = resolve(root, rel);
  if (!existsSync(f)) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(readFileSync(f, 'utf8')));
    if (!parsed.success) {
      console.warn(`[data] ${rel} failed shape validation — using fallback (${parsed.error.issues[0]?.path?.join('.')}: ${parsed.error.issues[0]?.message})`);
      return fallback;
    }
    return parsed.data;
  } catch {
    return fallback;
  }
}

/* Field policy: .catch() everywhere — a single malformed field degrades to its default
   instead of failing the file. Only a top-level shape break (e.g. items no longer an
   array) trips the fallback path above. */
const str = z.string().catch('');
const strOrNull = z.string().nullable().catch(null);
const numOrNull = z.number().nullable().catch(null);

const WritingItemSchema = z.object({
  title: str,
  date: strOrNull,
  link: str,
  image: strOrNull,
});
const FilmReviewSchema = z.object({
  title: str,
  year: numOrNull,
  rating: numOrNull,
  watchedDate: strOrNull,
  link: str,
  poster: strOrNull,
  excerpt: str,
});
const FilmFavSchema = z.object({
  title: str,
  rating: numOrNull,
  link: str,
  poster: strOrNull,
});
const PlayedGameSchema = z.object({
  name: str,
  lastPlayed: strOrNull,
  cover: strOrNull,
  header: z.string().optional().catch(undefined),
  playtimeHours: z.number().optional().catch(undefined),
  platform: z.string().nullable().optional().catch(null),
});
const TrackSchema = z.object({
  spotifyUrl: str,
  title: str,
  artist: str,
  art: strOrNull,
  preview: strOrNull,
});
const TopGameSchema = z.object({
  title: str,
  rating: z.union([z.string(), z.number()]).nullable().catch(null),
  cover: strOrNull,
});
const ConnectLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export type WritingItem = z.infer<typeof WritingItemSchema>;
export type FilmReview = z.infer<typeof FilmReviewSchema>;
export type FilmFav = z.infer<typeof FilmFavSchema>;
export type PlayedGame = z.infer<typeof PlayedGameSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type TopGame = z.infer<typeof TopGameSchema>;
export type ConnectLink = z.infer<typeof ConnectLinkSchema>;

export const getWriting = () =>
  readJson('src/generated/writing.json', z.object({ items: z.array(WritingItemSchema).catch([]) }), { items: [] }).items;
export const getFilms = () =>
  readJson(
    'src/generated/films.json',
    z.object({ reviews: z.array(FilmReviewSchema).catch([]), favorites: z.array(FilmFavSchema).catch([]) }),
    { reviews: [], favorites: [] }
  );
export const getLastPlayed = () =>
  readJson(
    'src/generated/lastplayed.json',
    z.object({ steam: z.array(PlayedGameSchema).catch([]), psn: z.array(PlayedGameSchema).catch([]) }),
    { steam: [], psn: [] }
  );
export const getMusic = () =>
  readJson('src/generated/music.json', z.object({ tracks: z.array(TrackSchema).catch([]) }), { tracks: [] }).tracks;
export const getTopGames = () =>
  readJson('src/content/settings/top-games.json', z.object({ games: z.array(TopGameSchema).catch([]) }), { games: [] }).games;
export const getConnectLinks = (fallback: ConnectLink[]) =>
  readJson('src/content/settings/connect.json', z.object({ links: z.array(ConnectLinkSchema) }), { links: fallback }).links;
