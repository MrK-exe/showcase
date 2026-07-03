// Shared collection-entry comparators for listing pages.
export const byDateDesc = (a: any, b: any) =>
  +new Date(b.data.date ?? 0) - +new Date(a.data.date ?? 0);

// Owner-pinned ordering: entries with an Order number lead (ascending), the rest
// follow newest-first. Used by BOTH the homepage Work row and /work/ so the two
// listings can never disagree.
export const byOrderThenDate = (a: any, b: any) => {
  const ao = a.data.order ?? null;
  const bo = b.data.order ?? null;
  if (ao != null && bo != null && ao !== bo) return ao - bo;
  if (ao != null && bo == null) return -1;
  if (bo != null && ao == null) return 1;
  return byDateDesc(a, b);
};
