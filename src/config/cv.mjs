// CV file naming + location, shared by the Astro app, keystatic.config.ts and scripts/cv.mjs
// (plain .mjs for the same reason as ./sources.mjs).
//
// The PDF is never committed: any copy that reaches git lives on in the public repo's history.
// The admin uploads it into cvDir, which scripts/cv.mjs lists in .git/info/exclude rather than
// .gitignore, because Keystatic hides .gitignore'd files and would then drop the CV on the next
// save. It ships as the one file on the repo's `cv` release, and src/pages/cv/[file].ts
// publishes it under the dated name.
export const cvDir = 'cv';
export const cvRelease = { repo: 'MrK-exe/showcase', tag: 'cv' };

export const cvMonthPattern = /^((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4})?$/;

// 'Oct 2026' → 'Abdullah_Aletai_CV_Oct_2026.pdf'; no month → 'Abdullah_Aletai_CV.pdf'
export const cvName = (month) =>
  `Abdullah_Aletai_CV${cvMonthPattern.test(month) && month ? `_${month.replace(' ', '_')}` : ''}.pdf`;

// The admin stores '/cv/cvUrl.pdf' (publicPath + file); the file itself sits in cvDir.
export const cvSource = (cvUrl) => (cvUrl ? `${cvDir}/${cvUrl.split('/').pop()}` : null);
