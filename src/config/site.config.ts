// Single source for site identity + the EFFECTIVE section registry.
// Honest boundary: reordering/re-weighting an existing kind of section is a config change in
// ./sections.ts; switching one on or off is the admin's "Sections — on/off" singleton. Adding a
// NEW kind of section also needs a groupsFor() case in src/pages/index.astro (and a pull
// script if it's fed from an external source).
import { getSiteSettings, getSectionToggles } from '../lib/data';
import { sectionDefaults, applyToggles, type SectionDef } from './sections';

export type { CollectionKey, SectionWeight, SectionKind, SectionDef } from './sections';

// ── owner-editable copy — edit in the admin (`npm run cms` → Site settings), which saves
//    to src/content/settings/site.json and overrides these code defaults. Everything except
//    tagline is hidden while '' so no placeholder copy can ever ship (INIT-03). ──
const editable = getSiteSettings({
  tagline: 'filmmaker · developer · writer',
  // One-line positioning that leads with what you MAKE, shown under the wordmark.
  // e.g. 'I direct films, build software, and write.'
  positioning: '',
  // 2–3 lines in your voice: who you are and what to hire you for.
  bio: '',
  // The admin's CV upload ('/cv/cvUrl.pdf'). The CV button appears when set; see ./cv.mjs
  // for where the file lives and how it ships.
  cvUrl: '',
  // e.g. 'Oct 2026' → the published file is Abdullah_Aletai_CV_Oct_2026.pdf
  cvMonth: '',
  // Optional short availability line, e.g. 'open to film + software work'.
  availability: '',
});

export const site = {
  name: 'Abdullah Aletai',          // display identity — title, hero, SEO
  codename: 'mrk.exe',              // system/console motif — boot log, footer SYS tag (the MrK-exe handle)
  author: 'Abdullah Aletai',
  handle: 'MrK-exe',
  url: 'https://mrk-exe.github.io',
  email: 'abdullahk.aletai@gmail.com',
  // search/share snippet — deliberately distinct from the <title> (which is name + tagline)
  description:
    'The index of Abdullah Aletai — films, software builds, writing, photography, games, and music, in one place.',
  ...editable,
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

// Effective section registry: code defaults (./sections.ts) gated by the admin's
// "Sections — on/off" switches (src/content/settings/sections.json). Every consumer reads THIS
// (rail, bottom bar, hero jump links, homepage, work index, the detail routes' getStaticPaths),
// so one switch removes a section everywhere at once.
export const sections: SectionDef[] = applyToggles(
  sectionDefaults,
  getSectionToggles(sectionDefaults.map((s) => s.id))
);
