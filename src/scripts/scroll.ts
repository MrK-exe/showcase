import LocomotiveScroll from 'locomotive-scroll';
import { reduce } from './dom';

/* smooth scroll + parallax (Locomotive Scroll v5, built on Lenis).
   data-scroll + data-scroll-speed on elements drives parallax; auto-disables on touch.
   Returns the two scroll actions the rest of the app needs — goTo (waypoint) and toTop —
   with the loco-or-native fallback resolved once, here, instead of at every call site. */
export function createScroll() {
  let loco: any = null;
  if (!reduce) {
    loco = new LocomotiveScroll({ lenisOptions: { lerp: 0.1, wheelMultiplier: 1, smoothWheel: true } });
  }
  const goTo = (el: Element | null) => {
    if (!el) return;
    if (loco) loco.scrollTo(el as HTMLElement, { offset: -80, duration: 0.9 });
    else (el as HTMLElement).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  const toTop = () => {
    if (loco) loco.scrollTo(0, { duration: 0.9 });
    else scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };
  return { goTo, toTop };
}
