// href scheme allowlist. CMS singletons and feed data supply link URLs as free strings —
// only ever render http(s) and mailto so a poisoned value (javascript:, data:, etc.)
// can't become a click-to-run sink. Relative/anchor URLs (our own) pass through.
export const isSafeHref = (href?: string | null): href is string => {
  const h = (href || '').trim();
  if (!h) return false;
  if (/^(https?:|mailto:)/i.test(h)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(h); // no scheme at all → relative/anchor → ours
};
