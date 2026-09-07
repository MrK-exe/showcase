import * as A from 'animejs';
import { $, reduce } from './dom';

/* text scramble / decode — native anime.js A.scrambleText ONLY.
   data-scramble="reveal periodic hover" (space-separated triggers); optional data-scramble-chars.
   reveal  = decode when scrolled into view (re-arms on exit so it re-fires);
   periodic = slow, randomized, staggered re-scramble while visible AND tab-focused (else paused);
   hover   = re-scramble on pointerenter of the nearest interactive host.
   Reduced-motion shows resolved text and skips all of it.
   Returns { hero, bio } — the two entrance decodes the boot intro fires on 'intro:done'. */
export function createScramble() {
  if (reduce || !A.animate || !A.scrambleText) return { hero() {}, bio() {} };
  const busy = new WeakSet<Element>();
  const run = (el: HTMLElement, from: any = 'left') => {
    if (busy.has(el)) return;
    busy.add(el);
    const len = (el.textContent || '').length || 6;
    // freeze the element's footprint so random glyph widths can't reflow/resize anything.
    // clip-path (not overflow:hidden) clips horizontal spill without breaking the baseline.
    const prevStyle = el.getAttribute('style');
    const w = el.offsetWidth; // layout width — transform-independent (reveal/parallax safe)
    el.style.display = 'inline-block';
    // pin all three + flex:none — a flex item's min-width:auto would otherwise let wide glyphs grow it
    el.style.width = el.style.minWidth = el.style.maxWidth = `${w}px`;
    el.style.flex = 'none';
    el.style.whiteSpace = 'nowrap';
    el.style.clipPath = 'inset(-50% 0px)';
    const unlock = () => { if (prevStyle === null) el.removeAttribute('style'); else el.setAttribute('style', prevStyle); };
    A.animate(el, {
      textContent: A.scrambleText({
        chars: el.dataset.scrambleChars || 'A-Z0-9!%#',
        from, ease: 'inOutQuad', revealRate: 46, cursor: '_', settleDuration: 420,
        duration: Math.min(1400, 360 + len * 44),
      }),
      onComplete: () => { unlock(); busy.delete(el); },
    });
  };

  // reveal — decode on scroll-in; re-arm on exit
  const armed = new WeakSet<Element>();
  const rio = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { if (!armed.has(e.target)) { armed.add(e.target); run(e.target as HTMLElement); } }
    else armed.delete(e.target);
  }), { threshold: 0.6 });
  document.querySelectorAll('[data-scramble~="reveal"]').forEach((el) => rio.observe(el));

  // hover — re-scramble on pointerenter of nearest a/button (so the tiny count scrambles when you hover its button)
  document.querySelectorAll('[data-scramble~="hover"]').forEach((el) => {
    const host = ((el as HTMLElement).closest('a,button') as HTMLElement) || (el as HTMLElement);
    host.addEventListener('pointerenter', () => run(el as HTMLElement, 'random'));
  });

  // periodic — slow randomized loop, gated on visibility + tab focus
  const seen = new WeakMap<Element, boolean>();
  const pio = new IntersectionObserver((es) => es.forEach((e) => seen.set(e.target, e.isIntersecting)), { threshold: 0.5 });
  const rnd = (a: number, z: number) => a + Math.random() * (z - a);
  const periodic = Array.from(document.querySelectorAll('[data-scramble~="periodic"]')) as HTMLElement[];
  periodic.forEach((el) => { seen.set(el, false); pio.observe(el); });
  // content text (titles/nums/nav/meta) refreshes rarely so it's not re-scrambling under the reader's eyes;
  // small ambient readouts (kicker/count/footer) stay lively. Each element keeps its own randomized timer.
  const period = (el: HTMLElement) =>
    el.matches('.section__title, .section__num, .navlink__t, .section__meta') ? rnd(11000, 20000) : rnd(5000, 9000);
  const loop = (el: HTMLElement) => setTimeout(() => {
    if (!document.hidden && seen.get(el)) run(el, 'random');
    loop(el);
  }, period(el));
  periodic.forEach((el, i) => setTimeout(() => loop(el), 1200 + i * 700));

  // hero group entrance decode (fired once when the boot intro resolves)
  return {
    hero() {
      const els = Array.from(document.querySelectorAll('.hero__kicker[data-scramble], .navlink__t')) as HTMLElement[];
      els.forEach((el, i) => setTimeout(() => run(el, 'random'), 120 + i * 70));
    },
    // about-me decode — per-CHARACTER, built on the wordmark's proven split+width-lock so it is
    // reflow-PROOF: splitText wraps every glyph in its own box, we PIN each box to its final width,
    // then reveal left→right (each char scrambles in place) with a block caret riding the frontier.
    // Headless-verified (chrome --virtual-time-budget): 0px drift across all 104 chars mid-decode,
    // settles to the exact prose. Lines are separate .hero__bio-line blocks (split on \n upstream)
    // so a hard line-break is structure, never a scrambled glyph — that was the old version's shift.
    bio() {
      const root = document.getElementById('hero-bio') as HTMLElement | null;
      if (!root || !A.splitText) return;
      const lines = Array.from(root.querySelectorAll('.hero__bio-line')) as HTMLElement[];
      if (!lines.length) return;
      const chars: HTMLElement[] = [];
      lines.forEach((line) => {
        const s: any = A.splitText(line, { chars: { class: 'fc' }, accessible: true });
        ((s.chars || (s[1] && s[1].chars) || []) as HTMLElement[]).forEach((c) => {
          c.style.width = `${c.getBoundingClientRect().width}px`;
          c.style.textAlign = 'center';
          c.style.display = 'inline-block';
          c.style.visibility = 'hidden'; // box already reserved; revealed as the caret reaches it (no leak, no reflow)
          chars.push(c);
        });
      });
      const step = Math.max(9, Math.min(22, Math.round(1500 / chars.length)));
      chars.forEach((c, i) => setTimeout(() => {
        c.style.visibility = 'visible';
        if (i > 0) chars[i - 1].classList.remove('is-caret');
        c.classList.add('is-caret');
        A.animate(c, { textContent: A.scrambleText({ chars: 'A-Z0-9!%#', duration: 240, settleDuration: 160 }) });
      }, i * step));
      // NOTE: we do NOT revert the split. Per-char boxes wrap a hair wider than kerned prose, so
      // reverting to natural text would re-wrap by a word at the very end — a visible snap. Keeping
      // the pinned layout means the bio settles once (while chars are still hidden) and never moves.
      setTimeout(() => {
        const last = chars[chars.length - 1];
        if (last) last.classList.remove('is-caret');
      }, chars.length * step + 900);
    },
  };
}

/* wordmark decode — scrambleText on the name (the single locked treatment).
   Per-char, width-locked so the proportional display font can't jitter the line. NO stagger delay:
   a delayed char shows its FINAL letter during the wait (leaks the reveal early). Instead every letter
   scrambles from t=0 with increasing per-letter durations, so the word resolves left→right, one letter
   at a time, and never snaps to the finish. */
export function createWordmark() {
  const wordT = $('#word-t');
  if (!wordT || !A.animate || !A.splitText || !A.scrambleText) return { play() {} };
  const original = wordT.textContent || '';
  let splitter: any = null;
  let running: any[] = [];
  const reset = () => {
    running.forEach((a) => { try { a.pause(); } catch (_) {} });
    running = [];
    try { splitter && splitter.revert && splitter.revert(); } catch (_) {}
    splitter = null;
    wordT.removeAttribute('style');
    wordT.textContent = original;
  };
  const play = () => {
    reset();
    if (reduce) return;
    requestAnimationFrame(() => {
      splitter = A.splitText(wordT, { chars: { class: 'fc' }, accessible: true });
      const chars = (splitter.chars || (splitter[1] && splitter[1].chars) || []) as HTMLElement[];
      chars.forEach((c) => { c.style.width = c.getBoundingClientRect().width + 'px'; c.style.textAlign = 'center'; });
      chars.forEach((c, i) => {
        const dur = 300 + i * 50;
        running.push(A.animate(c, {
          textContent: A.scrambleText({ chars: 'A-Z0-9', duration: dur, settleDuration: Math.round(dur * 0.82), settleRate: 26 }),
        }));
      });
    });
  };
  return { play };
}
