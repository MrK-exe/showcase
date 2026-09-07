// Shared client primitives — one definition each, imported by every concern module in
// this folder. Keeping reduce/$/SEL/closeOnOutside single-sourced is what lets the old
// 710-line inline blob split into focused files without each one re-declaring the basics.

// prefers-reduced-motion: the single gate every motion effect checks before animating.
export const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// terse querySelector — returns the element or null (never throws).
export const $ = (s: string) => document.querySelector(s) as HTMLElement | null;

// Interactive-target selector: the cursor reticle, the spatial keyboard nav, and the sound
// kit all frame/track the SAME set of elements — single-sourced so they can never drift.
export const SEL = 'a[href],button:not(:disabled),input:not([type=hidden]),[data-mag],.rail__item';

/* Close an open popover when a click lands outside it — ONE shared mechanism for the dev
   menu, the signal panel, and any future dropdown. Each caller only owns its own open
   test + close action; the outside-click plumbing lives here once. */
export const closeOnOutside = (selector: string, isOpen: () => boolean, close: () => void) =>
  document.addEventListener('click', (e) => {
    if (isOpen() && !(e.target as HTMLElement).closest(selector)) close();
  });
