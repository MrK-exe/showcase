import { SEL } from './dom';

/* sound kit (web audio) — synthesized UI blips, no audio assets. Armed on the first real
   pointer gesture (autoplay policy), muted via the dev toggle. createSound() wires the
   global hover/click listeners once and returns the api the cursor/nav/ui modules call. */
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
  const api = {
    setMuted: (m: boolean) => { muted = m; },
    click: () => nz({ dur: 0.03, cut: 3500, vol: 0.3 }),
    hover: () => tone({ f: 900, f2: 1500, type: 'triangle', dur: 0.05, vol: 0.1 }),
    nav: () => tone({ f: 880, f2: 1320, type: 'square', dur: 0.05, vol: 0.18 }),
    ping: () => tone({ f: 1800, type: 'sine', dur: 0.5, vol: 0.2 }),
  };
  addEventListener('pointerdown', () => { if (!armed) { armed = true; ac(); } }, { once: true });
  addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a,button')) api.click(); });
  document.addEventListener('mouseover', (e) => { if ((e.target as HTMLElement).closest(SEL)) api.hover(); });
  return api;
}

// Shared type so cursor/nav/ui can accept the kit as an injected dependency.
export type Sound = ReturnType<typeof createSound>;
