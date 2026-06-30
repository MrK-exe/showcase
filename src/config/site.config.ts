// Single source for site identity + section registry.
// Adding/reordering/enabling a section is a config change here — never a code change in pages.

export type CollectionKey = 'work' | 'films' | 'games' | 'writing' | 'photos';
export type SectionWeight = 'lead' | 'standard' | 'compact';

export interface SectionDef {
  id: string;
  title: string;
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
};

// NOTE: full re-rank (CV · Email · LinkedIn · GitHub first) + real URLs for the
// '#' placeholders happens in Phase B once the CV + those links are provided.
export const links = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/abdullah-aletai' },
  { label: 'GitHub', href: 'https://github.com/MrK-exe' },
  { label: 'Steam', href: '#' },
  { label: 'Letterboxd', href: 'https://letterboxd.com/abdullahVEVO' },
  { label: 'Substack', href: 'https://abdullahaletai.substack.com' },
  { label: 'Instagram · archive', href: 'https://instagram.com/AbdullahsArchive' },
  { label: 'Instagram · main', href: '#' },
  { label: 'WhatsApp', href: '#' },
  { label: 'Email', href: 'mailto:abdullahk.aletai@gmail.com' },
];

// Production sections lead (weight), consumption sections compact. Order = visual order.
export const sections: SectionDef[] = [
  { id: 'work', title: 'Work', collection: 'work', meta: 'selected + pipeline', enabled: true, weight: 'lead' },
  { id: 'writing', title: 'Writing', collection: 'writing', meta: 'substack', enabled: true, weight: 'standard' },
  { id: 'photography', title: 'Photography', collection: 'photos', meta: '@AbdullahsArchive', enabled: true, weight: 'standard' },
  { id: 'films', title: 'Films', collection: 'films', meta: 'letterboxd · @abdullahVEVO', enabled: true, weight: 'compact' },
  { id: 'games', title: 'Games', collection: 'games', meta: 'steam + playstation', enabled: true, weight: 'compact' },
  { id: 'music', title: 'Music', component: 'RecordPlayer', meta: 'record player', enabled: true, weight: 'compact' },
];
