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
  umami: '9f076c71-4960-40c1-8023-881085e1848d',
  // Public share URL of the same website (dashboard → website settings → enable Share URL).
  // This is how the build READS the stats back — API keys are paid-only on the free tier,
  // but the share endpoints are public by design. Empty = no signals label.
  umamiShare: '',
};
