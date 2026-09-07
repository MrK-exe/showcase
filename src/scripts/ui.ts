import * as A from 'animejs';
import { $, reduce, closeOnOutside } from './dom';
import type { Sound } from './sound';

/* modals + dev toggles + record player. The accessible modal (focus move-in, Tab trap,
   background inert, focus restore) is the heavy part; the dev panel and the vinyl player
   ride alongside because they share the same sound kit + outside-click plumbing. */
export function initUi({ sound }: { sound: Sound }) {
  // ---- accessible modal: move focus in, trap Tab, inert the background, restore focus on close ----
  const FOCUSABLE = 'a[href],button:not(:disabled),input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])';
  let modalEl: HTMLElement | null = null, opener: HTMLElement | null = null, inerted: HTMLElement[] = [];
  const openModal = (id: string, from: HTMLElement | null) => {
    const m = $(id);
    if (!m || modalEl) return;
    modalEl = m; opener = from;
    m.classList.add('open');
    from?.setAttribute('aria-expanded', 'true');
    inerted = (Array.from(document.body.children) as HTMLElement[])
      .filter((c) => c !== m && c.tagName !== 'SCRIPT' && !c.hasAttribute('inert'));
    inerted.forEach((c) => c.setAttribute('inert', ''));
    const f = Array.from(m.querySelectorAll(FOCUSABLE)) as HTMLElement[];
    (f[0] || m).focus({ preventScroll: true });
    sound.ping();
  };
  const closeModal = () => {
    if (!modalEl) return;
    const back = opener;
    modalEl.classList.remove('open');
    inerted.forEach((c) => c.removeAttribute('inert')); inerted = [];
    document.querySelectorAll('[data-open][aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    modalEl = null; opener = null;
    back?.focus?.({ preventScroll: true });
  };
  document.querySelectorAll('[data-open]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.preventDefault(); // the CTA anchors carry a real mailto: fallback for the no-JS path
      openModal('#' + (b as HTMLElement).dataset.open, b as HTMLElement);
    }));
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) closeModal(); }));
  document.addEventListener('keydown', (e) => {
    if (!modalEl) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    const focusables = () =>
      (Array.from(modalEl!.querySelectorAll(FOCUSABLE)) as HTMLElement[]).filter((el) => (el as any).offsetParent !== null);
    if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
      return;
    }
    // arrows/paging must not scroll the page behind the dialog; up/down walk the links
    const k = e.key.toLowerCase();
    if (['arrowdown', 'arrowup', 'arrowleft', 'arrowright', 'pagedown', 'pageup', 'home', 'end', ' '].includes(k)) {
      if ((document.activeElement?.tagName || '').toLowerCase() === 'input') return;
      e.preventDefault();
      if (k === 'arrowdown' || k === 'arrowup') {
        const f = focusables();
        if (!f.length) return;
        const i = f.indexOf(document.activeElement as HTMLElement);
        const next = k === 'arrowdown' ? f[(i + 1 + f.length) % f.length] : f[(i - 1 + f.length) % f.length];
        next.focus();
      }
    }
  });

  const devBtn = $('#dev-btn'), panel = $('#dev-panel');
  const setDev = (on: boolean) => { panel?.classList.toggle('open', on); devBtn?.setAttribute('aria-expanded', String(on)); };
  devBtn?.addEventListener('click', () => setDev(!panel?.classList.contains('open')));
  closeOnOutside('#controls', () => !!panel?.classList.contains('open'), () => setDev(false));

  const bind = (id: string, fn: (on: boolean) => void) => {
    const cb = $(id) as HTMLInputElement | null;
    cb?.addEventListener('change', () => fn(cb.checked));
    if (cb) fn(cb.checked);
  };
  bind('#t-sound', (on) => sound.setMuted(!on));
  bind('#t-crt', (on) => document.body.classList.toggle('no-crt', !on));
  bind('#t-curve', (on) => document.body.classList.toggle('fx-curve', on));

  // record player — plays the real 30-sec preview; the vinyl spins while audio plays
  const vinyl = $('#vinyl'), playBtn = $('#rp-play'), now = $('#rp-now');
  const titleEl = $('#rp-title'), artistEl = $('#rp-artist'), artEl = $('#rp-art');
  const openEl = $('#rp-open') as HTMLAnchorElement | null;
  const audio = $('#rp-audio') as HTMLAudioElement | null;
  const items = Array.from(document.querySelectorAll('#rp-tracks li')) as HTMLElement[];
  const spin = (vinyl && !reduce && A.animate)
    ? A.animate(vinyl, { rotate: '1turn', loop: true, duration: 3400, ease: 'linear', autoplay: false }) : null;
  let idx = 0;
  const load = (i: number, autoplay = false) => {
    idx = (i + items.length) % items.length;
    const d = items[idx]?.dataset || {};
    items.forEach((li, k) => li.classList.toggle('now', k === idx));
    if (titleEl) titleEl.textContent = d.title || '';
    if (artistEl) artistEl.textContent = d.artist || '';
    if (artEl) artEl.style.backgroundImage = d.art ? `url(${d.art})` : '';
    if (openEl && d.spotify) openEl.href = d.spotify;
    if (now) now.textContent = `track ${String(idx + 1).padStart(2, '0')} / ${items.length}`;
    if (audio) { audio.src = d.preview || ''; if (autoplay && d.preview) audio.play().catch(() => {}); }
    // media-session card (iOS lock screen / control center): show the brand name instead of
    // the page title, with the current track's art. 'aletai.dev' is the intended future
    // domain — a deliberate fixed brand string, kept independent of the page <title>.
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'aletai.dev',
        artwork: d.art ? [{ src: d.art }] : [],
      });
    }
  };
  const setPlaying = (on: boolean) => {
    if (playBtn) playBtn.textContent = on ? 'pause' : 'play';
    spin && (on ? spin.play() : spin.pause());
  };
  if (audio) {
    playBtn?.addEventListener('click', () => {
      if (audio.paused) { if (!audio.src) load(idx); audio.play().catch(() => {}); }
      else audio.pause();
    });
    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('ended', () => load(idx + 1, true)); // roll through the playlist
    // let the OS media buttons (lock screen, earbuds) walk the playlist too
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('nexttrack', () => load(idx + 1, true));
        navigator.mediaSession.setActionHandler('previoustrack', () => load(idx - 1, true));
      } catch {}
    }
  }
  // each track row is a real <a href={spotify}> (works without JS); with JS alive the
  // click is upgraded into loading the 30-sec preview in-page. Native anchor = native
  // keyboard activation, so no Enter/Space shim is needed.
  items.forEach((li, i) => {
    li.addEventListener('click', (e) => { e.preventDefault(); load(i, true); });
  });
  if (items.length) load(0);
}
