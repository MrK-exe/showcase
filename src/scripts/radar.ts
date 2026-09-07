import lagRadar from '../vendor/lag-radar.js';
import { $, reduce } from './dom';

/* hero "active signals" radar (mobz/lag-radar, ISC — themed in CSS). A real sonar sweep
   whose pace tracks live frame performance. Lifecycle-managed: only runs while the hero is
   on-screen and the tab is visible, so it never burns rAF in the background. */
export function initRadar() {
  const mount = $('#hero-radar');
  if (!mount) return;
  if (reduce) { mount.classList.add('radar--static'); return; }
  let inst: (() => void) | null = null;
  let onScreen = false;
  const start = () => { if (!inst && onScreen && !document.hidden) inst = lagRadar({ parent: mount, size: 36, inset: 2, frames: 44 }); };
  const stop = () => { if (inst) { inst(); inst = null; } };
  new IntersectionObserver((es) => {
    onScreen = es[0].isIntersecting;
    onScreen ? start() : stop();
  }).observe(mount);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}
