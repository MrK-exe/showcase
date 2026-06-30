import { config, fields, collection } from '@keystatic/core';

// Mirrors the zod card schema in src/content.config.ts so the admin and the
// site read/write the same content. Local mode = edit via `npm run cms`.
const cardSchema = {
  title: fields.slug({ name: { label: 'Title' } }),
  kicker: fields.text({ label: 'Kicker' }),
  subtitle: fields.text({ label: 'Subtitle', multiline: true }),
  variant: fields.select({
    label: 'Variant',
    options: [
      { label: 'Poster (2:3)', value: 'poster' },
      { label: 'Wide (16:9)', value: 'wide' },
      { label: 'Square (1:1)', value: 'square' },
      { label: 'Photo (3:2)', value: 'photo' },
      { label: 'Row', value: 'row' },
    ],
    defaultValue: 'wide',
  }),
  date: fields.date({ label: 'Date' }),
  tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags', itemLabel: (p) => p.value }),
  rating: fields.integer({ label: 'Rating (0–5)', validation: { min: 0, max: 5 } }),
  status: fields.text({ label: 'Status' }),
  order: fields.integer({ label: 'Order', defaultValue: 0 }),
  progress: fields.object(
    {
      show: fields.checkbox({ label: 'Show progress bar' }),
      value: fields.integer({ label: 'Percent', defaultValue: 0, validation: { min: 0, max: 100 } }),
    },
    { label: 'Progress' }
  ),
  image: fields.text({ label: 'Image (path or URL)' }),
  links: fields.array(
    fields.object({ label: fields.text({ label: 'Label' }), href: fields.text({ label: 'Href' }) }),
    { label: 'Links', itemLabel: (p) => p.fields.label.value }
  ),
  body: fields.markdoc({ label: 'Body' }),
};

export default config({
  storage: { kind: 'cloud' },
  cloud: { project: 'personal-site/showcase' },
  ui: { brand: { name: 'psychic-carnival' } },
  collections: {
    work: collection({
      label: 'Work',
      slugField: 'title',
      path: 'src/content/work/*',
      format: { contentField: 'body' },
      schema: cardSchema,
    }),
    writing: collection({
      label: 'Writing',
      slugField: 'title',
      path: 'src/content/writing/*',
      format: { contentField: 'body' },
      schema: cardSchema,
    }),
    photos: collection({
      label: 'Photography',
      slugField: 'title',
      path: 'src/content/photos/*',
      format: { contentField: 'body' },
      schema: cardSchema,
    }),
    films: collection({
      label: 'Films',
      slugField: 'title',
      path: 'src/content/films/*',
      format: { contentField: 'body' },
      schema: cardSchema,
    }),
    games: collection({
      label: 'Games',
      slugField: 'title',
      path: 'src/content/games/*',
      format: { contentField: 'body' },
      schema: cardSchema,
    }),
  },
});
