/* The Hirra cat: Microsoft Fluent "Cat face" emoji (MIT licensed), recolored to
   the Hirra palette and rigged to stay alive. The eyes translate toward the
   cursor, blink on a human-like random cadence, and squint into a happy smile
   with blushed cheeks when the cursor comes near. Eye-follow works under
   reduced motion (calm, non vestibular); the float and blink are gated on motion
   preference and pause when the cat is offscreen. */
(function () {
  var wrap = document.getElementById('catMascot');
  if (!wrap) return;
  var svg = wrap.querySelector('.cat-svg');
  if (!svg) return;
  var tracks = Array.prototype.slice.call(svg.querySelectorAll('.eyeTrack'));

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var running = true, happy = false, blinkTimer = null, saccadeTimer = null;
  var has = false;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // map a client point into the svg viewBox (0..32), return offset from center
  function aimEyes(clientX, clientY) {
    var r = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    var x = (clientX - r.left) / r.width * vb.width;
    var y = (clientY - r.top) / r.height * vb.height;
    var dx = clamp((x - 16) / 13, -1, 1) * 1.05;
    var dy = clamp((y - 17) / 13, -1, 1) * 0.85;
    setEyes(dx, dy);
  }
  function setEyes(dx, dy) {
    var t = 'translate(' + dx.toFixed(2) + ' ' + dy.toFixed(2) + ')';
    tracks.forEach(function (g) { g.setAttribute('transform', t); });
  }

  function setHappy(on) {
    if (happy === on) return;
    happy = on;
    svg.classList.toggle('is-happy', on);
  }

  function onMove(ev) {
    has = true;
    aimEyes(ev.clientX, ev.clientY);
    var r = wrap.getBoundingClientRect(), pad = 95;
    setHappy(ev.clientX > r.left - pad && ev.clientX < r.right + pad && ev.clientY > r.top - pad && ev.clientY < r.bottom + pad);
  }
  function onLeave() { has = false; setEyes(0, 0); setHappy(false); }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('blur', onLeave);
  document.addEventListener('mouseleave', onLeave);

  function blink(after) {
    svg.classList.add('is-blinking');
    setTimeout(function () { svg.classList.remove('is-blinking'); if (after) after(); }, 110);
  }
  function scheduleBlink() {
    if (reduce || !running) { blinkTimer = null; return; }
    blinkTimer = setTimeout(function () {
      blink(function () {
        if (Math.random() < 0.22) setTimeout(function () { blink(scheduleBlink); }, 165);
        else scheduleBlink();
      });
    }, 2600 + Math.random() * 3900);
  }
  // gentle idle gaze drift when the cursor is away, so it never freezes
  function scheduleSaccade() {
    if (reduce || !running) { saccadeTimer = null; return; }
    saccadeTimer = setTimeout(function () {
      if (!has && !happy) {
        var a = Math.random() * Math.PI * 2, m = 0.25 + Math.random() * 0.35;
        setEyes(Math.cos(a) * m, Math.sin(a) * m * 0.7);
      }
      scheduleSaccade();
    }, 1500 + Math.random() * 2400);
  }
  function stop() { if (blinkTimer) clearTimeout(blinkTimer); if (saccadeTimer) clearTimeout(saccadeTimer); blinkTimer = saccadeTimer = null; svg.classList.remove('is-blinking'); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      running = es[0].isIntersecting;
      if (running) { if (!blinkTimer) scheduleBlink(); if (!saccadeTimer) scheduleSaccade(); }
      else stop();
    }, { threshold: 0.1 }).observe(wrap);
  }

  setEyes(0, 0);
  scheduleBlink();
  scheduleSaccade();
})();
