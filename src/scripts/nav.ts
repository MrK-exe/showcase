import { $ } from './dom';
import type { Sound } from './sound';

/* nav waypoints — active-link highlighting via IntersectionObserver, smooth-scroll hijack
   for on-page hashes (base-absolute rail links still navigate home from detail pages), and
   the mobile back-to-top button. Depends on goTo + toTop (scroll) + sound, injected. */
export function initNav({ goTo, toTop, sound }: { goTo: (el: Element | null) => void; toTop: () => void; sound: Sound }) {
  const navLinks = Array.from(document.querySelectorAll('[data-nav]')) as HTMLElement[];
  const secs = Array.from(document.querySelectorAll('[data-section]')) as HTMLElement[];
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        const id = (e.target as HTMLElement).id;
        navLinks.forEach((l) => l.classList.toggle('on', (l.getAttribute('href') || '').endsWith('#' + id)));
      }
    });
  }, { threshold: 0.4 });
  secs.forEach((s) => io.observe(s));
  // Rail links are base-absolute (`/showcase/#work`) so they also work FROM detail pages:
  // hijack into smooth-scroll only when the section exists on THIS page, else let the
  // browser navigate back to the index.
  document.querySelectorAll('[data-nav], [data-sectlink]').forEach((l) =>
    l.addEventListener('click', (e) => {
      const href = (l as HTMLElement).getAttribute('href') || '';
      const hash = href.includes('#') ? href.slice(href.indexOf('#')) : '';
      const target = hash.length > 1 ? document.querySelector(hash) : null;
      if (!target) return; // not on this page — normal navigation
      e.preventDefault(); sound.nav();
      goTo(target);
    }));

  // back-to-top (mobile) — appears once the hero (or first viewport) scrolls away
  const totop = $('#totop');
  if (totop) {
    totop.addEventListener('click', () => {
      sound.nav();
      toTop();
    });
    const hero = document.querySelector('.hero');
    const show = (on: boolean) => totop.classList.toggle('show', on);
    if (hero) new IntersectionObserver((es) => show(!es[0].isIntersecting)).observe(hero);
    else addEventListener('scroll', () => show(scrollY > innerHeight), { passive: true });
  }
}
