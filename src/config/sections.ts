// Section registry: code defaults for every homepage section. Kept free of node imports on
// purpose: keystatic.config.ts pulls this into the browser-side admin bundle to build the
// "Sections — on/off" switches, so it must never touch the filesystem the way site.config.ts does.
// Adding a NEW kind of section still needs a groupsFor() case in src/pages/index.astro
// (and a pull script if it's fed from an external source).

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
  metaHref?: string;   // makes the meta label a link (e.g. the @handle → the account)
  enabled: boolean;    // code kill switch; the admin switch can only hide, never resurrect
  // visual primacy: production sections lead, consumption sections compact
  weight?: SectionWeight;
}

// Production sections lead (weight), consumption sections compact. Order = visual order.
export const sectionDefaults: SectionDef[] = [
  { id: 'work', title: 'Work', kind: 'authored', collection: 'work', meta: 'dev log', enabled: true, weight: 'lead' },
  { id: 'writing', title: 'Writing', kind: 'fed', meta: 'substack', enabled: true, weight: 'standard' },
  { id: 'photography', title: 'Photography', kind: 'uploaded', collection: 'photos', meta: '@AbdullahsArchive', metaHref: 'https://instagram.com/AbdullahsArchive', enabled: true, weight: 'standard' },
  { id: 'films', title: 'Films', kind: 'fed', enabled: true, weight: 'compact' },
  { id: 'games', title: 'Games', kind: 'authored', collection: 'gameReviews', meta: 'reviews · steam + playstation', enabled: true, weight: 'compact' },
  { id: 'music', title: 'Music', kind: 'component', component: 'RecordPlayer', meta: 'record player', enabled: true, weight: 'compact' },
];

// Admin "Sections — on/off" singleton shape: section id → shown?
export type SectionToggles = Record<string, boolean>;

// A section is on only when the code default AND its admin switch agree. Ids the file doesn't
// mention stay on: a switch that was never saved can't hide anything.
export const applyToggles = (defs: SectionDef[], toggles: SectionToggles): SectionDef[] =>
  defs.map((s) => ({ ...s, enabled: s.enabled && toggles[s.id] !== false }));
