import { SEL } from './dom';

/* sound kit (web audio). Plays the Death Stranding menu set from the separate showcase-sfx repo,
   which GitHub Pages serves on this same mrk-exe.github.io origin, so the CSP's connect-src 'self'
   already allows it and a takedown there can't touch this repo. Any moment whose file hasn't
   loaded (local dev, offline, repo gone) falls back to its synthesized blip. Armed on the first
   real pointer gesture (autoplay policy), muted via the dev toggle. createSound() wires the global
   hover/click listeners once and returns the api the cursor/nav/ui modules call. */
const SFX_BASE = '/showcase-sfx/ds-a/';
const MOMENTS = ['hover', 'nav', 'click', 'open', 'close'] as const;
type Moment = (typeof MOMENTS)[number];

export function createSound() {
  let AC: AudioContext | null = null, muted = false, armed = false;
  const VOL = 0.5;
  const ac = () => { if (!AC) AC = new (window.AudioContext || (window as any).webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; };
  const tone = (o: any) => {
    if (muted || !armed) return;
    const c = ac(), t = c.currentTime, os = c.createOscillator(), g = c.createGain();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f, t);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + (o.dur || 0.08));
    const v = (o.vol || 0.3) * VOL;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 0.08));
    os.connect(g).connect(c.destination); os.start(t); os.stop(t + (o.dur || 0.08) + 0.03);
  };
  const nz = (o: any) => {
    if (muted || !armed) return;
    const c = ac(), t = c.currentTime, dur = o.dur || 0.04;
    const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b;
    const g = c.createGain(), f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.cut || 3000;
    g.gain.setValueAtTime((o.vol || 0.25) * VOL, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + dur + 0.02);
  };
  const synth: Record<Moment, () => void> = {
    click: () => nz({ dur: 0.03, cut: 3500, vol: 0.3 }),
    hover: () => tone({ f: 900, f2: 1500, type: 'triangle', dur: 0.05, vol: 0.1 }),
    nav: () => tone({ f: 880, f2: 1320, type: 'square', dur: 0.05, vol: 0.18 }),
    open: () => tone({ f: 1800, type: 'sine', dur: 0.5, vol: 0.2 }),
    close: () => tone({ f: 1500, f2: 900, type: 'sine', dur: 0.25, vol: 0.15 }),
  };

  // decoded off an OfflineAudioContext so nothing opens audio before the first gesture;
  // AudioBuffers play in any context afterwards
  const samples: Partial<Record<Moment, AudioBuffer>> = {};
  const decoder = new OfflineAudioContext(1, 1, 44100);
  for (const m of MOMENTS) {
    fetch(`${SFX_BASE}${m}.wav`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((a) => decoder.decodeAudioData(a))
      .then((b) => { samples[m] = b; })
      .catch((e) => console.warn(`[sfx] ${m}: ${SFX_BASE}${m}.wav didn't load (${e.message}), using the synth blip`));
  }
  const play = (m: Moment) => {
    if (muted || !armed) return;
    const b = samples[m];
    if (!b) return synth[m]();
    const c = ac(), s = c.createBufferSource(), g = c.createGain();
    s.buffer = b; g.gain.value = VOL * 1.6;
    s.connect(g).connect(c.destination); s.start();
  };

  const api = {
    setMuted: (m: boolean) => { muted = m; },
    click: () => play('click'),
    hover: () => play('hover'),
    nav: () => play('nav'),
    ping: () => play('open'),
    close: () => play('close'),
  };
  addEventListener('pointerdown', () => { if (!armed) { armed = true; ac(); } }, { once: true });
  // a button that opens or closes a pop-up plays that pop-up's open/close sound instead of a click
  addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('a,button') && !t.closest('[data-open],[data-close]')) api.click();
  });
  document.addEventListener('mouseover', (e) => { if ((e.target as HTMLElement).closest(SEL)) api.hover(); });
  return api;
}

// Shared type so cursor/nav/ui can accept the kit as an injected dependency.
export type Sound = ReturnType<typeof createSound>;
