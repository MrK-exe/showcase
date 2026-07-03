import { component, defineMarkdocConfig, nodes } from '@astrojs/markdoc/config';

// Only override: prose links render through MdLink.astro, which scheme-allowlists the
// href and adds target="_blank" rel="noopener" to external http(s) links so an article
// link never replaces the site. Everything else keeps Markdoc's defaults.
export default defineMarkdocConfig({
  nodes: {
    link: {
      ...nodes.link,
      render: component('./src/components/MdLink.astro'),
    },
  },
});
