// Umami Cloud stats → honest "signals" snapshot for the hero radar: unique visitors +
// per-country breakdown over the last N days. Read-side only — the tracker tag lives in
// Experience.astro. Cloud API: https://api.umami.is/v1, auth via the x-umami-api-key
// header (rate limit: 50 calls / 15s — we make 2 per build).
const API = 'https://api.umami.is/v1';

export async function pullSignals(websiteId, apiKey, days = 7) {
  const endAt = Date.now();
  const startAt = endAt - days * 24 * 60 * 60 * 1000;
  const get = async (path, params = {}) => {
    const qs = new URLSearchParams({ startAt: String(startAt), endAt: String(endAt), ...params });
    const res = await fetch(`${API}/websites/${websiteId}/${path}?${qs}`, {
      headers: { Accept: 'application/json', 'x-umami-api-key': apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`umami ${path}: HTTP ${res.status}`);
    return res.json();
  };
  const [stats, countries] = await Promise.all([get('stats'), get('metrics', { type: 'country' })]);
  return {
    days,
    // /stats fields are {value, prev} pairs; tolerate a plain number if the shape drifts
    visitors: typeof stats?.visitors === 'number' ? stats.visitors : (stats?.visitors?.value ?? null),
    pageviews: typeof stats?.pageviews === 'number' ? stats.pageviews : (stats?.pageviews?.value ?? null),
    // /metrics rows are {x: 'US', y: count}
    countries: (Array.isArray(countries) ? countries : []).map((c) => ({ code: c.x || '', visitors: c.y ?? 0 })),
  };
}
