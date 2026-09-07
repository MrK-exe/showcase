import * as A from 'animejs';
import { $, reduce } from './dom';

/* build-log boot intro (one-time per session, accessible skip, Y2K bars). Dispatches an
   'intro:done' event on the document when it clears — the hero entrance + first-visit HUD
   listen for that. Self-contained: no shared state beyond $/reduce/animejs. */
export function initIntro() {
  const el = $('#intro');
  const log = $('#intro-log');
  const bannerEl = $('#intro-banner');
  const skipBtn = $('#intro-skip');
  if (!el || !log) return;
  const PLAYED = 'pc.intro.played';
  const done = () => {
    if (el.classList.contains('off')) return;
    el.classList.add('off');
    document.dispatchEvent(new Event('intro:done'));
    setTimeout(() => el.remove(), 700);
  };
  // skip: click anywhere, the skip button, or Enter/Space/Esc
  el.addEventListener('click', done);
  skipBtn?.addEventListener('click', (e) => { e.stopPropagation(); done(); });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); done(); } });

  // play once per tab session (no replay on alt-tab/reload); reduced-motion skips
  let played = false; try { played = !!sessionStorage.getItem(PLAYED); } catch (_) {}
  // defer so listeners registered later in this script (hero flip + scramble) catch intro:done on reload
  if (played || reduce) { setTimeout(done, 0); return; }
  try { sessionStorage.setItem(PLAYED, '1'); } catch (_) {}
  // hard cap: the boot log never gates the page longer than this, whatever the bar timings
  // do. Kept above the sequence's randomized worst case (~2.25s) so a normal run always
  // resolves its '✓ ready' line before the cap can cut the fade short.
  setTimeout(done, 2600);
  setTimeout(() => skipBtn?.focus(), 60);

  if (A.animate) A.animate('#intro-caret', { opacity: [1, 0], duration: 560, loop: true, alternate: true, ease: 'inOutQuad' });

  const line = (html: string, cls = '') => {
    const d = document.createElement('div');
    d.className = 'il ' + cls;
    d.innerHTML = html;
    log.appendChild(d);
    return d;
  };
  const ok = '<span class="ok">ok</span>';
  const slow = [
    '<span class="dim">$</span> boot mrk.exe <span class="dim">— rev.01</span>',
    '<span class="dim">▶</span> mounting modules ......... ' + ok,
  ];
  const burst = [
    'sys   identity ......... abdullah aletai',
    'load  /work /writing /photography',
    'load  /films /games /music',
    'auth  @abdullahVEVO .... ' + ok,
  ];

  const bar = (label: string) => {
    const wrap = document.createElement('div');
    wrap.className = 'il bar';
    wrap.innerHTML = `<span class="blabel">${label}</span><span class="track"><i></i></span><span class="bpct">0%</span>`;
    log.appendChild(wrap);
    return wrap;
  };

  // authentic Y2K bar — discrete chunks + an awkward stall, then a snap to 100. Each call
  // randomizes its own waypoints AND hold times, so two bars running together fill out of sync.
  const rnd = (a: number, z: number) => a + Math.random() * (z - a);
  const fillY2K = (w: HTMLElement, then: () => void) => {
    const b = w.querySelector('i') as HTMLElement;
    const pct = w.querySelector('.bpct') as HTMLElement;
    const pStall = Math.round(rnd(78, 90));
    const steps: [number, number][] = [
      [Math.round(rnd(14, 26)), rnd(50, 110)],
      [Math.round(rnd(44, 58)), rnd(60, 130)],
      [Math.round(rnd(62, 76)), rnd(50, 110)],
      [pStall, rnd(150, 260)],                   // one brief, honest stall — not the old 360–720ms hang
      [100, 0],
    ];
    let i = 0;
    const tick = () => {
      if (i >= steps.length) { setTimeout(then, 100); return; }
      const [v, hold] = steps[i++];
      b.style.width = v + '%'; pct.textContent = v + '%';
      setTimeout(tick, hold + 25);
    };
    tick();
  };

  let i = 0;
  const slowStep = () => {
    if (i < slow.length) { line(slow[i]); i++; setTimeout(slowStep, 300); }
    else setTimeout(phaseBurst, 200);
  };
  const phaseBurst = () => {
    burst.forEach((b) => line(b));
    requestAnimationFrame(phaseBars);
  };
  const phaseBars = () => {
    // both bars appear together and fill concurrently, each at its own randomized pace
    const bars = [bar('mounting ui'), bar('linking signals')];
    let remaining = bars.length;
    const finish = () => {
      line('<span class="ok">✓</span> ready', 'final');
      if (bannerEl && A.animate) {
        bannerEl.style.display = 'block';
        A.animate(bannerEl, { opacity: [0, 1], duration: 320, ease: 'outQuad' });
      }
      setTimeout(done, 600);
    };
    bars.forEach((b) => fillY2K(b, () => { if (--remaining === 0) finish(); }));
  };
  slowStep();
}
