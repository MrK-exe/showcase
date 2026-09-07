import { $, reduce, SEL } from './dom';
import type { Sound } from './sound';

/* lock-on bracket cursor + spatial keyboard nav (arrows + WASD). The reticle lerps toward
   whatever interactive element is hovered/focused; the keyboard nav picks the nearest
   element in the pressed direction. Depends on goTo (waypoint scroll) + sound, injected. */
export function initCursor({ goTo, sound }: { goTo: (el: Element | null) => void; sound: Sound }) {
  const cur = $('#cur');
  if (!cur || window.matchMedia('(pointer: coarse)').matches) return;
  let mx = innerWidth / 2, my = innerHeight / 2;
  let hoverEl: HTMLElement | null = null, focusEl: HTMLElement | null = null;
  let mode: 'mouse' | 'key' = 'mouse';
  let cx = mx, cy = my, cw = 22, ch = 22;

  addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; mode = 'mouse'; cur.style.opacity = '1'; }, { passive: true });
  document.addEventListener('mouseover', (e) => { const t = (e.target as HTMLElement).closest(SEL) as HTMLElement; if (t) hoverEl = t; });
  document.addEventListener('mouseout', (e) => {
    const t = (e.target as HTMLElement).closest(SEL);
    const to = (e.relatedTarget as HTMLElement)?.closest?.(SEL) || null;
    if (t && t !== to) hoverEl = (to as HTMLElement) || null;
  });
  document.addEventListener('focusin', (e) => { const t = (e.target as HTMLElement).closest(SEL) as HTMLElement; if (t) focusEl = t; });
  document.addEventListener('focusout', () => { focusEl = null; });
  addEventListener('mousedown', () => { cur.classList.add('flash'); setTimeout(() => cur.classList.remove('flash'), 140); });

  // The visual reticle loop is skipped under reduced motion (CSS restores the native
  // cursor); hover/focus tracking + the spatial keyboard nav below still run.
  // Lifecycle care: the rAF pauses while the tab is hidden, and style writes are
  // skipped once the lerp has settled (no busy-work between interactions).
  if (!reduce) {
    let rafOn = false;
    const loop = () => {
      const raw = ((mode as string) === 'key' ? (focusEl || hoverEl) : hoverEl) as HTMLElement | null;
      // a hidden 0×0 toggle input (or its label) should frame the visible .tog row
      const t = ((raw && raw.closest && raw.closest('.tog')) as HTMLElement | null) || raw;
      let tx, ty, tw, th;
      if (t && document.body.contains(t)) {
        const r = t.getBoundingClientRect();
        tx = r.left + r.width / 2; ty = r.top + r.height / 2; tw = r.width + 14; th = r.height + 12;
        cur.classList.add('hot');
      } else { tx = mx; ty = my; tw = 22; th = 22; cur.classList.remove('hot'); }
      const settled = Math.abs(tx - cx) < 0.1 && Math.abs(ty - cy) < 0.1 && Math.abs(tw - cw) < 0.1 && Math.abs(th - ch) < 0.1;
      if (!settled) {
        cx += (tx - cx) * 0.28; cy += (ty - cy) * 0.28; cw += (tw - cw) * 0.32; ch += (th - ch) * 0.32;
        cur.style.transform = `translate(${cx}px,${cy}px)`;
        cur.style.width = cw + 'px'; cur.style.height = ch + 'px';
        cur.style.marginLeft = -cw / 2 + 'px'; cur.style.marginTop = -ch / 2 + 'px';
      }
      if (document.hidden) { rafOn = false; return; }
      requestAnimationFrame(loop);
    };
    const start = () => { if (!rafOn) { rafOn = true; requestAnimationFrame(loop); } };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    start();
  }

  // spatial keyboard navigation (arrows + WASD)
  const DIR: Record<string, string> = { arrowup: 'u', arrowdown: 'd', arrowleft: 'l', arrowright: 'r', w: 'u', s: 'd', a: 'l', d: 'r' };
  const visible = (el: HTMLElement) => {
    if (!(el as any).offsetParent && el !== document.body) return false;
    if (el.closest('.modal:not(.open)')) return false;
    if (!document.querySelector('.modal.open') && el.closest('.modal')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  addEventListener('keydown', (e) => {
    // while a modal is open it owns the keyboard (focus trap + Esc live in ui())
    if (document.querySelector('.modal.open')) return;
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'textarea' || (tag === 'input' && (document.activeElement as HTMLInputElement).type === 'text')) return;
    const key = e.key.toLowerCase();
    if (e.key === 'Enter' && mode === 'key') { const a = document.activeElement as HTMLElement; if (a && a.closest(SEL)) { e.preventDefault(); a.click(); } return; }
    const d = DIR[key];
    if (!d) return;
    mode = 'key';
    const list = (Array.from(document.querySelectorAll(SEL)) as HTMLElement[]).filter(visible);
    // anchor on the genuinely focused element (robust); else the reticle position
    const active = document.activeElement as HTMLElement | null;
    const ref = (active && active !== document.body && active.closest(SEL) && visible(active)) ? active : null;
    const cur0 = ref ? ref.getBoundingClientRect() : { left: cx, top: cy, width: 0, height: 0 } as DOMRect;
    const cc = { x: cur0.left + cur0.width / 2, y: cur0.top + cur0.height / 2 };
    let best: HTMLElement | null = null, bestScore = Infinity;
    for (const el of list) {
      if (el === ref) continue;
      const r = el.getBoundingClientRect();
      const px = r.left + r.width / 2, py = r.top + r.height / 2;
      const dx = px - cc.x, dy = py - cc.y;
      let along = 0, cross = 0;
      if (d === 'u') { if (dy >= -2) continue; along = -dy; cross = Math.abs(dx); }
      else if (d === 'd') { if (dy <= 2) continue; along = dy; cross = Math.abs(dx); }
      else if (d === 'l') { if (dx >= -2) continue; along = -dx; cross = Math.abs(dy); }
      else { if (dx <= 2) continue; along = dx; cross = Math.abs(dy); }
      const score = along + cross * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) {
      e.preventDefault(); // only hijack the arrow/WASD key when focus actually moves (page ends still scroll)
      // a .tog label isn't focusable — focus its hidden checkbox so Enter still toggles
      const ft = (best.matches('label') ? best.querySelector('input,button,a') as HTMLElement | null : null) || best;
      ft.focus({ preventScroll: true });
      focusEl = best;
      goTo(best.closest('[data-section], .hero, footer, .section, header') || best);
      sound.nav();
    }
  });
}
