// Public handles the build-time pull reads (non-secret). Shared by both the Astro app
// (via site.config.ts) and the build script (scripts/pull.mjs), so it's a plain .mjs that
// runs under Node and Vite alike. Steam API key + PSN npsso are GitHub Secrets, never here.
export const sources = {
  substack: 'https://abdullahaletai.substack.com',
  letterboxd: 'abdullahVEVO',
  instagram: 'AbdullahsArchive',
  steamId: '76561198160172980',   // SteamID64 (public profile)
  psnUser: '',                    // PSN reads 'me' from the npsso — no id needed
  // Umami Cloud website id (public — it ships in the tracker tag anyway). Empty = analytics
  // fully off: no tracker script, no CSP third-party origins, no signals label on the radar.
  // The API key that READS stats stays a secret (UMAMI_API_KEY in CI).
  umami: '',
};
