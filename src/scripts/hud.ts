import * as A from 'animejs';
import { $, reduce } from './dom';

/* controls card: pops up on first visit (after the boot intro) and fades after AUTO_MS, the
   countdown paused while it's hovered or focused. The re-open button shows it until closed.
   Desktop only (touch skips it). Listens for 'intro:done'. */
const AUTO_MS = 6000;

export function initHud() {
  const el = $('#hud-controls'), btn = $('#controls-btn');
  if (!el) return;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const KEY = 'pc.hud.seen';
  let open = false, left = 0, startedAt = 0, timer = 0;
  const pauseAuto = () => {
    if (!timer) return;
    clearTimeout(timer); timer = 0; left -= performance.now() - startedAt;
  };
  const resumeAuto = () => {
    if (!open || timer || left <= 0 || el.matches(':hover') || el.contains(document.activeElement)) return;
    startedAt = performance.now(); timer = window.setTimeout(hide, left);
  };
  const show = (auto = false) => {
    if (touch || open) return;
    el.hidden = false; open = true; btn?.setAttribute('aria-expanded', 'true');
    if (!reduce && A.animate) A.animate(el, { opacity: [0, 1], translateY: [10, 0], duration: 320, ease: 'outQuad' });
    left = auto ? AUTO_MS : 0;
    resumeAuto();
  };
  const hide = () => {
    clearTimeout(timer); timer = 0; left = 0;
    if (!open) return; open = false; btn?.setAttribute('aria-expanded', 'false');
    if (!reduce && A.animate) A.animate(el, { opacity: [1, 0], translateY: [0, 8], duration: 240, ease: 'outQuad', onComplete: () => { el.hidden = true; } });
    else el.hidden = true;
  };
  el.querySelector('[data-hud-dismiss]')?.addEventListener('click', hide);
  el.addEventListener('mouseenter', pauseAuto);
  el.addEventListener('mouseleave', resumeAuto);
  el.addEventListener('focusin', pauseAuto);
  el.addEventListener('focusout', resumeAuto);
  btn?.addEventListener('click', () => (open ? hide() : show()));
  // Esc closes it (only) — does NOT auto-dismiss on scroll/keypress anymore
  addEventListener('keydown', (e) => { if (open && e.key === 'Escape') hide(); });
  // first visit only: pop it open after the boot intro resolves
  document.addEventListener('intro:done', () => {
    if (touch) return;
    let seen = false; try { seen = !!localStorage.getItem(KEY); } catch (_) {}
    if (!seen) setTimeout(() => { show(true); try { localStorage.setItem(KEY, '1'); } catch (_) {} }, 900);
  });
}
