/* Pre-paint progressive-enhancement boot. Loaded as a blocking classic script in <head>
   (same-origin, CSP script-src 'self') so it runs before first paint:
   - marks `.js` so the CSS knows enhancement is expected;
   - after load, if the enhancement bundle never dismissed the boot intro (slow network,
     blocked script, runtime error), forces the page into `.fallback` — content revealed,
     overlay gone, native cursor — instead of a permanent black screen. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  addEventListener('load', function () {
    setTimeout(function () {
      var intro = document.getElementById('intro');
      if (intro && !intro.classList.contains('off')) {
        d.classList.add('fallback');
        intro.classList.add('off');
        document.dispatchEvent(new Event('intro:done'));
        setTimeout(function () { intro.remove(); }, 700);
      }
    }, 3500);
  });
})();
