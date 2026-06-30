// Build-time reads of pulled feed data (src/generated/*.json) and CMS singletons
// (src/content/settings/*.json). Resilient: a missing file returns the fallback rather than
// breaking the build, so the site renders honest empty states before content/feeds exist.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function readJson<T>(rel: string, fallback: T): T {
  const f = resolve(root, rel);
  if (!existsSync(f)) return fallback;
  try {
    return JSON.parse(readFileSync(f, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export interface WritingItem { title: string; date: string | null; link: string; image: string | null }
export interface FilmReview { title: string; year: number | null; rating: number | null; watchedDate: string | null; link: string; poster: string | null; excerpt: string }
export interface FilmFav { title: string; rating: number | null; link: string; poster: string | null }
export interface PlayedGame { name: string; lastPlayed: string | null; cover: string | null; header?: string; playtimeHours?: number; platform?: string | null }
export interface Track { spotifyUrl: string; title: string; artist: string; art: string | null; preview: string | null }
export interface TopGame { title: string; rating: string | number | null; cover: string | null }
export interface ConnectLink { label: string; href: string }

export const getWriting = () => readJson<{ items: WritingItem[] }>('src/generated/writing.json', { items: [] }).items;
export const getFilms = () => readJson<{ reviews: FilmReview[]; favorites: FilmFav[] }>('src/generated/films.json', { reviews: [], favorites: [] });
export const getLastPlayed = () => readJson<{ steam: PlayedGame[]; psn: PlayedGame[] }>('src/generated/lastplayed.json', { steam: [], psn: [] });
export const getMusic = () => readJson<{ tracks: Track[] }>('src/generated/music.json', { tracks: [] }).tracks;
export const getTopGames = () => readJson<{ games: TopGame[] }>('src/content/settings/top-games.json', { games: [] }).games;
export const getConnectLinks = (fallback: ConnectLink[]) => readJson<{ links: ConnectLink[] }>('src/content/settings/connect.json', { links: fallback }).links;
