import { $, closeOnOutside } from './dom';

/* hero signal panel: native <details> already gives click-to-toggle + no-JS support;
   this only adds outside-click-to-close via the SAME shared plumbing as the dev menu. */
export function initSignalPanel() {
  const sig = $('.signal');
  if (!sig) return;
  closeOnOutside('.signal', () => sig.hasAttribute('open'), () => sig.removeAttribute('open'));
}
