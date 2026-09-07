import * as A from 'animejs';
import { $, reduce } from './dom';

/* dynamic CRT: transform-only sync-bar roll + glare drift + rare glitch (no per-frame
   repaint). The only constant motion on the page — kept GPU-cheap (transform-only). */
export function initCrt() {
  if (reduce || !A.animate) return;
  // rolling refresh/sync bar with randomized gaps (no metronome tell) — the only constant motion; transform-only = GPU-cheap
  const sync = $('#sync');
  if (sync) {
    const roll = () => {
      const h = window.innerHeight;
      A.animate(sync, { translateY: [-0.2 * h, 1.2 * h], duration: 8200, ease: 'linear',
        onComplete: () => setTimeout(roll, 2200 + Math.random() * 3500) });
    };
    roll();
  }
  // drifting glare on the glass — light playing across a curved surface
  A.animate('#glare', { translateX: [-10, 10], duration: 9000, loop: true, alternate: true, ease: 'inOutSine' });
  // rare signal glitch (every ~20–45s)
  const glitch = () => {
    A.animate('#sync', { translateX: [0, -2, 2, 0], duration: 160, ease: 'linear' });
    setTimeout(glitch, 20000 + Math.random() * 25000);
  };
  setTimeout(glitch, 15000 + Math.random() * 10000);
}
