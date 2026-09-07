// Client entry for the Experience layout. Composition root only: it imports each concern
// as its own module and wires the few shared dependencies (scroll actions + the sound kit)
// between them. The behaviour is identical to the old single inline <script> — this is the
// same code, split by concern, with the cross-module wiring made explicit instead of relying
// on one shared closure. Read a specific effect in its own file under src/scripts/.
import * as A from 'animejs';
import { reduce } from './dom';
import { createScroll } from './scroll';
import { createSound } from './sound';
import { createScramble, createWordmark } from './scramble';
import { initSignalPanel } from './signal-panel';
import { initIntro } from './intro';
import { initCursor } from './cursor';
import { initNav } from './nav';
import { initReveals } from './reveals';
import { initCrt } from './crt';
import { initRadar } from './radar';
import { initHud } from './hud';
import { initImageRot } from './image-rot';
import { initUi } from './ui';

initSignalPanel();
const { goTo, toTop } = createScroll();
initIntro();
const sound = createSound();
initCursor({ goTo, sound });
initNav({ goTo, toTop, sound });
initReveals();

// hero entrance effects — created now so the intro:done listener below can close over them,
// fired once when the boot intro resolves.
const scramble = createScramble();
const wordmark = createWordmark();
document.addEventListener('intro:done', () => {
  if (reduce || !A.animate) return;
  // bio is NOT in this fade group — it decodes (scramble + '_' cursor) as its own entrance below
  A.animate('#hero-positioning, #hero-links, #hero-signal', { opacity: [0, 1], y: [12, 0], duration: 640, delay: 260, ease: 'outQuad' });
  // the decode effects width-lock their glyphs — measure only with the real (self-hosted,
  // preloaded) fonts, never the fallback's metrics. Resolves near-instantly in practice.
  document.fonts.ready.then(() => {
    scramble.bio(); // first, with no delay — starts as noise so the final text never flashes
    wordmark.play();
    setTimeout(() => scramble.hero(), 320);
  });
});

initCrt();
initRadar();
initHud();
initImageRot();
initUi({ sound });
