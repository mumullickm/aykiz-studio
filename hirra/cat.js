/* Hero mascot: the same Lottie cat the app ships (assets/cat-movement.json).
   The raw loop ducks the cat off-frame for part of each cycle, so we loop only
   the up-window, matching the app's LottieCat. Reduced motion holds a still
   frame, and the animation pauses while it is scrolled offscreen. */
(function () {
  var mount = document.getElementById('catLottie');
  if (!mount || !window.lottie) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var UP_FROM = 43, UP_TO = 109; // ~0.25..0.64 of the 171 frame loop

  var anim = window.lottie.loadAnimation({
    container: mount,
    renderer: 'svg',
    loop: true,
    autoplay: !reduce,
    path: 'assets/cat-movement.json?v=3',
    initialSegment: [UP_FROM, UP_TO]
  });

  if (reduce) {
    anim.addEventListener('DOMLoaded', function () { anim.goToAndStop(76, true); });
    return;
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) anim.play(); else anim.pause();
    }, { threshold: 0.04 }).observe(mount);
  }
})();
