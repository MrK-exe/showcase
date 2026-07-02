// Single source for site identity + section registry.
// Adding/reordering/enabling a section is a config change here — never a code change in pages.

export type CollectionKey = 'work' | 'gameReviews' | 'photos';
export type SectionWeight = 'lead' | 'standard' | 'compact';
// how a section gets its content: authored in the CMS, uploaded, pulled at build, or a custom component
export type SectionKind = 'authored' | 'uploaded' | 'fed' | 'component';

export interface SectionDef {
  id: string;
  title: string;
  kind: SectionKind;
  collection?: CollectionKey;
  component?: string;
  meta?: string;
  enabled: boolean;
  // visual primacy: production sections lead, consumption sections compact
  weight?: SectionWeight;
}

export const site = {
  name: 'Abdullah Aletai',          // display identity — title, hero, SEO
  codename: 'psychic-carnival',     // system/console motif — boot log, footer SYS tag
  author: 'Abdullah Aletai',
  handle: 'MrK-exe',
  url: 'https://mrk-exe.github.io',
  email: 'abdullahk.aletai@gmail.com',
  tagline: 'filmmaker · developer · writer',

  // ── hireability scaffold (INIT-03) — everything below is hidden while '' so no
  //    placeholder copy can ever ship. Fill in real text to light each piece up. ──
  // One-line positioning that leads with what you MAKE, shown under the wordmark.
  // e.g. 'I direct films, build software, and write.'
  positioning: '',
  // 2–3 lines in your voice: who you are and what to hire you for.
  bio: '',
  // Path (under the site base) to a downloadable CV/résumé PDF, e.g. 'abdullah-aletai-cv.pdf'
  // once the file is in /public. The CV button appears when set.
  cvUrl: '',
  // Optional short availability line, e.g. 'open to film + software work'.
  availability: '',
};

// Public source handles live in a plain .mjs so the Node build script can share them.
export { sources } from './sources.mjs';

// Default Connect links. The admin `connect` singleton overrides this when present.
export const links = [
  { label: 'Email', href: 'mailto:abdullahk.aletai@gmail.com' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/abdullah-aletai' },
  { label: 'GitHub', href: 'https://github.com/MrK-exe' },
  { label: 'Substack', href: 'https://abdullahaletai.substack.com' },
  { label: 'Letterboxd', href: 'https://letterboxd.com/abdullahVEVO' },
  { label: 'Instagram · archive', href: 'https://instagram.com/AbdullahsArchive' },
];

// Production sections lead (weight), consumption sections compact. Order = visual order.
export const sections: SectionDef[] = [
  { id: 'work', title: 'Work', kind: 'authored', collection: 'work', meta: 'dev log', enabled: true, weight: 'lead' },
  { id: 'writing', title: 'Writing', kind: 'fed', meta: 'substack', enabled: true, weight: 'standard' },
  { id: 'photography', title: 'Photography', kind: 'uploaded', collection: 'photos', meta: '@AbdullahsArchive', enabled: true, weight: 'standard' },
  { id: 'films', title: 'Films', kind: 'fed', enabled: true, weight: 'compact' },
  { id: 'games', title: 'Games', kind: 'authored', collection: 'gameReviews', meta: 'reviews · steam + playstation', enabled: true, weight: 'compact' },
  { id: 'music', title: 'Music', kind: 'component', component: 'RecordPlayer', meta: 'record player', enabled: true, weight: 'compact' },
];
