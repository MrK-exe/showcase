// PSN last-played via psn-api. The npsso (GitHub Secret) is exchanged for an auth token on each
// build; it stays valid ~2 months, after which the secret must be refreshed. Uses the game-library
// "recently played" list (name + lastPlayedDateTime + cover) — independent of trophies, so it
// reflects what was actually played rather than what earned a trophy.
import { exchangeNpssoForCode, exchangeCodeForAccessToken, getRecentlyPlayedGames } from 'psn-api';

// psn-api's internal fetches take no AbortSignal, so cap the whole auth+fetch chain with a
// race — a hung Sony endpoint must not stall the daily cron build indefinitely.
const deadline = (ms) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(`psn: timed out after ${ms}ms`)), ms).unref?.());

export async function pullPsn(npsso, limit = 4) {
  if (!npsso) return [];
  const res = await Promise.race([
    (async () => {
      const accessCode = await exchangeNpssoForCode(npsso);
      const authorization = await exchangeCodeForAccessToken(accessCode);
      return getRecentlyPlayedGames(authorization, { limit: 12 });
    })(),
    deadline(45000),
  ]);
  const games = res?.data?.gameLibraryTitlesRetrieve?.games || [];
  return games
    .slice()
    .sort((a, b) => new Date(b.lastPlayedDateTime) - new Date(a.lastPlayedDateTime))
    .slice(0, limit)
    .map((g) => ({
      name: g.name,
      lastPlayed: g.lastPlayedDateTime || null,
      cover: g.image?.url || null,
      platform: g.platform && g.platform !== 'UNKNOWN' ? g.platform : 'PSN',
    }));
}
