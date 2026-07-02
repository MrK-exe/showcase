# Abdullah Aletai — personal site

`psychic-carnival` — an index of work, writing, photography, films, games, and music.
Astro 7 static site → GitHub Pages at **https://mrk-exe.github.io/showcase/**.

## Run modes

```bash
npm install              # .npmrc sets legacy-peer-deps (see "Dependency note")

npm run dev              # static site @ http://localhost:4321/showcase  ⚠ pulls feeds first
npm run build            # production build → dist/                      ⚠ pulls feeds first
npm run preview          # serve the built dist/

npm run cms              # Keystatic admin mode @ http://localhost:4321/keystatic
                         # (server output; base is "/" in this mode, not /showcase)

npm run check            # astro check — the same type gate CI runs
npm run pull             # just the feed pull (writes src/generated/*.json)
npm run generate         # regenerate the ASCII banner + public/og.png
```

> **⚠ Network on dev/build:** `predev`/`prebuild` run `scripts/pull.mjs`, which fetches
> Substack + Letterboxd RSS, Steam, PSN, and Spotify/iTunes metadata. It is fault-tolerant
> (a dead feed keeps the last good JSON and never fails the build), but know that a plain
> `npm run build` touches the network. Use `npx astro build` to build without pulling.

## Architecture in one paragraph

Three layers that never bleed: **content** (Astro content collections + Keystatic CMS +
feed JSON *and remote artwork* pulled at build time — zero runtime fetching, zero client
keys, zero third-party hotlinking; all images ship as optimized WebP via astro:assets),
**presentation**
(`src/styles/tokens.css` + a single `Card.astro` primitive), **behavior** (one progressive-
enhancement script layer; the site is fully readable with JS off). The Keystatic admin
(React, server adapter) loads **only** under `ENABLE_KEYSTATIC=true` — the deployed site
ships no React, no server, no admin route.

## Editing content & sections

- **Entries** (work dev-logs, game reviews, photos), **curated lists** (film favorites,
  top games, playlist, connect links), and **site copy** (tagline, positioning, bio, CV,
  availability — the "Site settings" panel): edit in Keystatic (`npm run cms`). Saves land
  as local files; preview them live in the same server.
- **Publish**: double-click `publish.cmd` (repo root) — commits everything and pushes;
  CI deploys in ~5 min. Nothing goes live until you publish.
- **Section order/enable/weight, identity, default links**: `src/config/site.config.ts`.
  The "Site settings" values in `src/content/settings/site.json` override its copy fields.
- Honest boundary: adding/reordering/disabling an **existing kind** of section is
  config-only. Adding a **new kind** of section also needs a `groupsFor()` case in
  `src/pages/index.astro` (and a pull script if it's fed from an external source).

## Deploy

Pushes to `main` (plus a daily 06:00 UTC cron, for fresh feed data) run
`.github/workflows/deploy.yml`: type-check → banner/OG generation → build → Pages deploy.
Pull requests run the same checks but never deploy. Feed JSON is cached between CI runs
so "keep last good" survives clean checkouts.

**Base-path gotcha:** the site lives under `/showcase` (GitHub project page). Internal
URLs must be built from `import.meta.env.BASE_URL` — never hardcoded from `/`.

## Secrets

Set as GitHub Actions secrets (never committed, never shipped to the client — used only
by the build-time pull):

| Secret | What | How to obtain |
|---|---|---|
| `STEAM_API_KEY` | Steam Web API key for last-played | https://steamcommunity.com/dev/apikey |
| `PSN_NPSSO` | PSN sign-in token for last-played | Log in at playstation.com, then visit https://ca.account.sony.com/api/v1/ssocookie — valid ~2 months, refresh when the PSN list goes stale |

Copy `.env.example` to `.env` for local pulls with real data (optional — everything
degrades to honest empty states without them).

## Dependency note

`.npmrc` sets `legacy-peer-deps=true` because `@keystatic/astro` doesn't yet declare
Astro 7 peer support. Remove the flag once it does (npm cannot scope a peer-range
override per-package).
