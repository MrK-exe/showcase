/* reveals (card/section fade-in via .in class) — toggles `.in` as elements cross the
   viewport threshold. Self-contained. */
export function initReveals() {
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => (e.target as HTMLElement).classList.toggle('in', e.isIntersecting));
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((r) => io.observe(r));
}
