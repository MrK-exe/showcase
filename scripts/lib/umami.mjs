// Umami Cloud stats → honest "signals" snapshot for the hero radar: unique visitors +
// per-country breakdown over the last N days. Read-side only — the tracker tag lives in
// Experience.astro.
//
// Reads via the website's public SHARE URL (API keys are paid-only on Umami Cloud's free
// tier). These are the same endpoints the public share dashboard itself uses — verified
// against the live cloud 2026-07-04:
//   1. GET the share page HTML to sniff the account region (/analytics/eu|us assets)
//   2. GET {base}/share/{shareId} → { websiteId, token }
//   3. GET {base}/websites/{id}/stats|metrics with BOTH headers:
//      x-umami-share-token: {token} AND x-umami-share-context: {shareId}
//      (token alone gets a 401; a browser User-Agent is required throughout)
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

export async function pullSignals(shareUrl, days = 7) {
  const shareId = String(shareUrl).match(/\/share\/([^/]+)/)?.[1];
  if (!shareId) throw new Error(`not a share url: ${shareUrl}`);

  const page = await fetch(shareUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
  if (!page.ok) throw new Error(`share page: HTTP ${page.status}`);
  const region = (await page.text()).match(/\/analytics\/(eu|us)\//)?.[1] || 'eu';
  const base = `https://cloud.umami.is/analytics/${region}/api`;

  const get = async (path, headers = {}) => {
    const res = await fetch(`${base}/${path}`, {
      headers: { Accept: 'application/json', 'User-Agent': UA, ...headers },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`umami ${path.split('?')[0]}: HTTP ${res.status}`);
    return res.json();
  };

  const share = await get(`share/${shareId}`);
  const auth = { 'x-umami-share-token': share.token, 'x-umami-share-context': shareId };
  const endAt = Date.now();
  const range = `startAt=${endAt - days * 86400000}&endAt=${endAt}`;
  const [stats, countries, cities] = await Promise.all([
    get(`websites/${share.websiteId}/stats?${range}`, auth),
    get(`websites/${share.websiteId}/metrics?${range}&type=country`, auth),
    // approximate city, IP-geolocated by Umami. Rows are {x: 'Riyadh', y: count, country: 'SA'}
    get(`websites/${share.websiteId}/metrics?${range}&type=city`, auth),
  ]);
  return {
    days,
    // share endpoints return plain numbers; tolerate the API-key shape ({value, prev}) too
    visitors: typeof stats?.visitors === 'number' ? stats.visitors : (stats?.visitors?.value ?? null),
    pageviews: typeof stats?.pageviews === 'number' ? stats.pageviews : (stats?.pageviews?.value ?? null),
    // /metrics rows are {x: 'US', y: count}
    countries: (Array.isArray(countries) ? countries : []).map((c) => ({ code: c.x || '', visitors: c.y ?? 0 })),
    // top cities only — the panel stays compact, and a long tail of one-offs isn't worth showing
    cities: (Array.isArray(cities) ? cities : [])
      .filter((c) => c.x)
      .sort((a, b) => (b.y ?? 0) - (a.y ?? 0))
      .slice(0, 8)
      .map((c) => ({ city: c.x, country: c.country || '', visitors: c.y ?? 0 })),
  };
}
