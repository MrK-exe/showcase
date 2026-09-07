// The site base path with a guaranteed trailing slash ('/showcase/'). import.meta.env.BASE_URL
// is a build-time constant Vite inlines per file, so importing this shared value is identical
// to recomputing it — it just stops eight files from hand-repeating the same `.replace(...)`.
export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
