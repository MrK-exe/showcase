import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { site } from '../../config/site.config';
import { cvName, cvSource } from '../../config/cv.mjs';

// Always prerendered — also under ENABLE_KEYSTATIC's output:'server' (see games/[...slug]).
export const prerender = true;

// One file, at the dated name the hero's cv button links to. No CV set = no page, so an old
// dated link 404s once the CV is removed or replaced.
export function getStaticPaths() {
  const source = cvSource(site.cvUrl);
  return source ? [{ params: { file: cvName(site.cvMonth) }, props: { source } }] : [];
}

// A missing file throws, failing the build instead of shipping a dead button. `npm run build`
// downloads it first (scripts/cv.mjs ensure).
export const GET: APIRoute = ({ props }) =>
  new Response(readFileSync(props.source), { headers: { 'Content-Type': 'application/pdf' } });
