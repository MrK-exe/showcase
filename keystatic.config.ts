import { config, fields, collection, singleton } from '@keystatic/core';

/* Admin schema. Three content TYPES:
   - Authored (Work dev-log, Game reviews): markdoc body whose headings drive an outline/TOC; dedicated pages.
   - Uploaded (Photos): image + caption + date + Instagram link.
   - Curated (Film favorites, Top games, Music playlist, Connect links): singletons; arrays drag-to-reorder.
   Fed sections (Writing, latest Films, last-played games) are pulled at build time — not edited here.
   Edited via `npm run cms` → Keystatic Cloud → commits to the repo → rebuild. */

// Half-star ratings (Letterboxd-style). Stored as a string; parsed to a number when rendering.
const ratingField = fields.select({
  label: 'Rating',
  options: [
    { label: '— none', value: '0' },
    { label: '0.5', value: '0.5' }, { label: '1', value: '1' }, { label: '1.5', value: '1.5' },
    { label: '2', value: '2' }, { label: '2.5', value: '2.5' }, { label: '3', value: '3' },
    { label: '3.5', value: '3.5' }, { label: '4', value: '4' }, { label: '4.5', value: '4.5' },
    { label: '5', value: '5' },
  ],
  defaultValue: '0',
});

export default config({
  storage: { kind: 'cloud' },
  cloud: { project: 'personal-site/showcase' },
  ui: { brand: { name: 'Abdullah Aletai' } },

  collections: {
    // ── Authored: dev log with a document hierarchy (headings → page outline/TOC) ──
    work: collection({
      label: 'Work — dev log',
      slugField: 'title',
      path: 'src/content/work/*',
      format: { contentField: 'body' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date', defaultValue: { kind: 'today' } }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Shipped', value: 'shipped' },
            { label: 'In progress', value: 'wip' },
            { label: 'Archived', value: 'archived' },
          ],
          defaultValue: 'wip',
        }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags', itemLabel: (p) => p.value }),
        body: fields.markdoc({ label: 'Body' }),
      },
    }),

    // ── Authored: custom game reviews (dedicated pages) ──
    gameReviews: collection({
      label: 'Game reviews',
      slugField: 'title',
      path: 'src/content/game-reviews/*',
      format: { contentField: 'body' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date', defaultValue: { kind: 'today' } }),
        rating: ratingField,
        cover: fields.image({
          label: 'Cover art',
          directory: 'public/images/games',
          publicPath: '/images/games/',
        }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        body: fields.markdoc({ label: 'Review' }),
      },
    }),

    // ── Uploaded: photo archive (caption + date typed here; image click → Instagram post) ──
    photos: collection({
      label: 'Photos',
      slugField: 'name',
      path: 'src/content/photos/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: 'Name (internal id)' } }),
        image: fields.image({
          label: 'Photo',
          directory: 'public/images/photos',
          publicPath: '/images/photos/',
          validation: { isRequired: true },
        }),
        caption: fields.text({ label: 'Caption', multiline: true }),
        date: fields.date({ label: 'Date', defaultValue: { kind: 'today' } }),
        instagramUrl: fields.url({ label: 'Instagram post URL' }),
      },
    }),
  },

  singletons: {
    // ── Curated: hand-picked top-4 favorite films (posters auto-fetched from the Letterboxd link at build) ──
    filmFavorites: singleton({
      label: 'Films — favorites',
      path: 'src/content/settings/film-favorites',
      format: { data: 'json' },
      schema: {
        films: fields.array(
          fields.object({
            title: fields.text({ label: 'Title' }),
            letterboxdUrl: fields.url({ label: 'Letterboxd film URL' }),
            rating: ratingField,
            poster: fields.text({ label: 'Poster URL (optional — auto-fetched if blank)' }),
          }),
          { label: 'Favorite films', itemLabel: (p) => p.fields.title.value || 'Film' }
        ),
      },
    }),

    // ── Curated: top-4 games ──
    topGames: singleton({
      label: 'Games — top 4',
      path: 'src/content/settings/top-games',
      format: { data: 'json' },
      schema: {
        games: fields.array(
          fields.object({
            title: fields.text({ label: 'Title' }),
            rating: ratingField,
            cover: fields.image({
              label: 'Cover art',
              directory: 'public/images/games',
              publicPath: '/images/games/',
            }),
          }),
          { label: 'Top games', itemLabel: (p) => p.fields.title.value || 'Game' }
        ),
      },
    }),

    // ── Curated: record-player playlist (drag to rank; preview + art resolved from the link at build) ──
    music: singleton({
      label: 'Music — record player',
      path: 'src/content/settings/music',
      format: { data: 'json' },
      schema: {
        tracks: fields.array(
          fields.object({
            spotifyUrl: fields.url({ label: 'Spotify track URL' }),
            label: fields.text({ label: 'Label (optional override)' }),
          }),
          { label: 'Tracks (drag to rank)', itemLabel: (p) => p.fields.label.value || p.fields.spotifyUrl.value || 'Track' }
        ),
      },
    }),

    // ── Curated: the Connect link list (drag to order) ──
    connect: singleton({
      label: 'Connect — links',
      path: 'src/content/settings/connect',
      format: { data: 'json' },
      schema: {
        links: fields.array(
          fields.object({
            label: fields.text({ label: 'Label' }),
            href: fields.text({ label: 'URL or mailto:' }),
          }),
          { label: 'Links (drag to order)', itemLabel: (p) => p.fields.label.value || 'Link' }
        ),
      },
    }),
  },
});
