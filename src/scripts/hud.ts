import * as A from 'animejs';
import { $, reduce } from './dom';

/* controls card: pops up on first visit (after the boot intro), persistent re-open button,
   stays until closed. Desktop only (touch skips it). Listens for 'intro:done'. */
export function initHud() {
  const el = $('#hud-controls'), btn = $('#controls-btn');
  if (!el) return;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const KEY = 'pc.hud.seen';
  let open = false;
  const show = () => {
    if (touch || open) return;
    el.hidden = false; open = true; btn?.setAttribute('aria-expanded', 'true');
    if (!reduce && A.animate) A.animate(el, { opacity: [0, 1], translateY: [10, 0], duration: 320, ease: 'outQuad' });
  };
  const hide = () => {
    if (!open) return; open = false; btn?.setAttribute('aria-expanded', 'false');
    if (!reduce && A.animate) A.animate(el, { opacity: [1, 0], translateY: [0, 8], duration: 240, ease: 'outQuad', onComplete: () => { el.hidden = true; } });
    else el.hidden = true;
  };
  el.querySelector('[data-hud-dismiss]')?.addEventListener('click', hide);
  btn?.addEventListener('click', () => (open ? hide() : show()));
  // Esc closes it (only) — does NOT auto-dismiss on scroll/keypress anymore
  addEventListener('keydown', (e) => { if (open && e.key === 'Escape') hide(); });
  // first visit only: pop it open after the boot intro resolves
  document.addEventListener('intro:done', () => {
    if (touch) return;
    let seen = false; try { seen = !!localStorage.getItem(KEY); } catch (_) {}
    if (!seen) setTimeout(() => { show(); try { localStorage.setItem(KEY, '1'); } catch (_) {} }, 900);
  });
}
