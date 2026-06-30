// Public handles the build-time pull reads (non-secret). Shared by both the Astro app
// (via site.config.ts) and the build script (scripts/pull.mjs), so it's a plain .mjs that
// runs under Node and Vite alike. Steam API key + PSN npsso are GitHub Secrets, never here.
export const sources = {
  substack: 'https://abdullahaletai.substack.com',
  letterboxd: 'abdullahVEVO',
  instagram: 'AbdullahsArchive',
  steamId: '76561198160172980',   // SteamID64 (public profile)
  psnUser: '',                    // PSN reads 'me' from the npsso — no id needed
};
