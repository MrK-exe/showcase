// Steam last-played. Using the user's own API key on their own SteamID64, GetOwnedGames returns
// rtime_last_played + playtime (hidden for other people's keys, but this is their own data). Cover
// art comes from Steam's CDN. The API key is read from the environment (GitHub Secret), never committed.
export async function pullSteam(steamId, apiKey, limit = 4) {
  if (!steamId || !apiKey) return [];
  const url =
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}` +
    `&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`;
  const data = await fetch(url).then((r) => r.json());
  const games = data?.response?.games || [];
  return games
    .filter((g) => g.rtime_last_played)
    .sort((a, b) => b.rtime_last_played - a.rtime_last_played)
    .slice(0, limit)
    .map((g) => ({
      name: g.name,
      appid: g.appid,
      lastPlayed: new Date(g.rtime_last_played * 1000).toISOString(),
      playtimeHours: Math.round((g.playtime_forever || 0) / 60),
      cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`,
      header: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
    }));
}
