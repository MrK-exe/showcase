// PSN last-played via psn-api. The npsso (GitHub Secret) is exchanged for an auth token on each
// build; it stays valid ~2 months, after which the secret must be refreshed. "Recently played" is
// approximated by trophy titles ordered by most-recent trophy activity.
import { exchangeNpssoForCode, exchangeCodeForAccessToken, getUserTitles } from 'psn-api';

export async function pullPsn(npsso, limit = 4) {
  if (!npsso) return [];
  const accessCode = await exchangeNpssoForCode(npsso);
  const authorization = await exchangeCodeForAccessToken(accessCode);
  const { trophyTitles = [] } = await getUserTitles(authorization, 'me');
  return trophyTitles
    .slice()
    .sort((a, b) => new Date(b.lastUpdatedDateTime) - new Date(a.lastUpdatedDateTime))
    .slice(0, limit)
    .map((t) => ({
      name: t.trophyTitleName,
      lastPlayed: t.lastUpdatedDateTime || null,
      cover: t.trophyTitleIconUrl || null,
      platform: t.trophyTitlePlatform || null,
    }));
}
