// PSN last-played via psn-api. The npsso (GitHub Secret) is exchanged for an auth token on each
// build; it stays valid ~2 months, after which the secret must be refreshed. Uses the game-library
// "recently played" list (name + lastPlayedDateTime + cover) — independent of trophies, so it
// reflects what was actually played rather than what earned a trophy.
import { exchangeNpssoForCode, exchangeCodeForAccessToken, getRecentlyPlayedGames } from 'psn-api';

export async function pullPsn(npsso, limit = 4) {
  if (!npsso) return [];
  const accessCode = await exchangeNpssoForCode(npsso);
  const authorization = await exchangeCodeForAccessToken(accessCode);
  const res = await getRecentlyPlayedGames(authorization, { limit: 12 });
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
