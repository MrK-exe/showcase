/* hotlinked-image rot: swap a failed card image for the placeholder.
   (delegated capture listener — inline onerror handlers would violate the CSP) */
export function initImageRot() {
  document.addEventListener('error', (e) => {
    const img = e.target as HTMLElement;
    if (!img || img.tagName !== 'IMG') return;
    const media = img.closest('.card__media');
    if (!media) return;
    img.remove();
    if (!media.querySelector('.card__ph')) {
      const ph = document.createElement('span');
      ph.className = 'card__ph';
      ph.textContent = 'no image';
      media.prepend(ph);
    }
  }, true);
}
