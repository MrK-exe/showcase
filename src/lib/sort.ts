// Shared collection-entry comparators for listing pages.
export const byDateDesc = (a: any, b: any) =>
  +new Date(b.data.date ?? 0) - +new Date(a.data.date ?? 0);

// Owner-pinned ordering from the admin "Work — order" singleton (drag-ranked slugs):
// listed entries lead in list order, the rest follow newest-first. Used by BOTH the
// homepage Work row and /work/ so the two listings can never disagree.
export const byPinnedOrder = (pinned: string[]) => {
  const pos = new Map(pinned.map((slug, i) => [slug, i]));
  return (a: any, b: any) => {
    const ai = pos.get(a.id) ?? -1;
    const bi = pos.get(b.id) ?? -1;
    if (ai !== -1 && bi !== -1 && ai !== bi) return ai - bi;
    if (ai !== -1 && bi === -1) return -1;
    if (bi !== -1 && ai === -1) return 1;
    return byDateDesc(a, b);
  };
};
