import { Markdoc, component, defineMarkdocConfig, nodes } from '@astrojs/markdoc/config';
import shiki from '@astrojs/markdoc/shiki';

const { Tag } = Markdoc;

// Footnote text is plain text authored in the admin popup — turn any URLs in it
// into real (new-tab) links so references can cite sources.
function linkify(text) {
  const parts = [];
  const re = /https?:\/\/[^\s)]+/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(new Tag('a', { href: m[0], target: '_blank', rel: 'noopener' }, [m[0]]));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default defineMarkdocConfig({
  // Code blocks get syntax highlighting; vitesse-black sits closest to the site's
  // #0a0908 pre background (app.css pins the exact color over shiki's inline style).
  extends: [shiki({ theme: 'vitesse-black' })],
  nodes: {
    // Prose links render through MdLink.astro, which scheme-allowlists the href and
    // adds target="_blank" rel="noopener" to external http(s) links so an article
    // link never replaces the site.
    link: {
      ...nodes.link,
      render: component('./src/components/MdLink.astro'),
    },
    // Wide tables must scroll in place, never stretch the page (layout-stability rule) —
    // wrap every table in an overflow container.
    table: {
      ...nodes.table,
      // async: Astro runs Markdoc in async mode — transformChildren returns a Promise
      async transform(node, config) {
        return new Tag('div', { class: 'tablewrap' }, [
          new Tag('table', node.transformAttributes(config), await node.transformChildren(config)),
        ]);
      },
    },
    // Document override: number every {% fn %} footnote in reading order, then append
    // the references list (with backlinks) after the article body. Numbering happens
    // on the AST before transformChildren so each fn tag renders its own number.
    document: {
      ...nodes.document,
      // async: Astro runs Markdoc in async mode — transformChildren returns a Promise
      async transform(node, config) {
        const notes = [];
        for (const n of node.walk()) {
          if (n.type === 'tag' && n.tag === 'fn') {
            notes.push(String(n.attributes.note ?? ''));
            n.attributes.n = notes.length;
          }
        }
        const children = await node.transformChildren(config);
        if (notes.length) {
          children.push(
            new Tag('section', { class: 'fnotes', 'aria-label': 'References' }, [
              new Tag('ol', { class: 'fnotes__list' }, notes.map((note, i) => (
                new Tag('li', { id: `fn-${i + 1}` }, [
                  ...linkify(note),
                  ' ',
                  new Tag('a', { href: `#fnref-${i + 1}`, class: 'fnotes__back', 'aria-label': `back to reference ${i + 1}` }, ['↩']),
                ])
              ))),
            ])
          );
        }
        return new Tag('article', {}, children);
      },
    },
  },
  tags: {
    // Inserted from the admin editor (Footnote component) — serialized as {% fn note="…" /%}.
    // Renders as a superscript numbered link to the appended references list.
    fn: {
      selfClosing: true,
      attributes: { note: { type: String }, n: { type: Number } },
      transform(node) {
        const n = node.attributes.n ?? '?';
        return new Tag('sup', { class: 'fnref', id: `fnref-${n}` }, [
          new Tag('a', { href: `#fn-${n}` }, [`[${n}]`]),
        ]);
      },
    },
    // Rich link card (admin "Link card" component) — a bordered preview block for a URL,
    // instead of a bare text link.
    embed: {
      selfClosing: true,
      attributes: {
        url: { type: String },
        title: { type: String },
        description: { type: String },
      },
      render: component('./src/components/LinkCard.astro'),
    },
  },
});
