/* The Hirra cat: a lounging cat on a sunny sill. Body breathes and tail swishes
   on their own (CSS). This script adds the life that reacts to the visitor: the
   head turns and the pupils shift toward the cursor, it blinks on a human-like
   random cadence, and it does a happy slow-blink when the cursor comes near.
   Placeholder art; the rig is built to carry the final Claude Design cat.
   Blinking and reactions are gated on reduced motion and pause when offscreen. */
(function () {
  var wrap = document.getElementById('catMascot');
  if (!wrap) return;
  var svg = wrap.querySelector('.cat-svg');
  if (!svg) return;
  var head = svg.querySelector('.cat-head');
  var pupils = Array.prototype.slice.call(svg.querySelectorAll('.cat-pupil'));

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var running = true, happy = false, blinkTimer = null;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function look(clientX, clientY) {
    var r = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    var x = (clientX - r.left) / r.width * vb.width;
    var y = (clientY - r.top) / r.height * vb.height;
    var nx = clamp((x - 150) / 150, -1, 1);
    var ny = clamp((y - 95) / 130, -1, 1);
    if (head) head.setAttribute('transform', 'translate(' + (nx * 5).toFixed(2) + ' ' + (ny * 2.4).toFixed(2) + ') rotate(' + (nx * 4).toFixed(2) + ' 150 150)');
    var px = (nx * 2.6).toFixed(2), py = (ny * 2).toFixed(2);
    pupils.forEach(function (p) { p.setAttribute('transform', 'translate(' + px + ' ' + py + ')'); });
  }
  function rest() {
    if (head) head.setAttribute('transform', 'translate(0 0)');
    pupils.forEach(function (p) { p.setAttribute('transform', 'translate(0 0)'); });
  }

  function setHappy(on) {
    if (happy === on) return;
    happy = on;
    svg.classList.toggle('is-happy', on);
  }

  function onMove(ev) {
    look(ev.clientX, ev.clientY);
    var r = wrap.getBoundingClientRect(), pad = 110;
    setHappy(ev.clientX > r.left - pad && ev.clientX < r.right + pad && ev.clientY > r.top - pad && ev.clientY < r.bottom + pad);
  }
  function onLeave() { rest(); setHappy(false); }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('blur', onLeave);
  document.addEventListener('mouseleave', onLeave);

  function blink(after) {
    svg.classList.add('is-blinking');
    setTimeout(function () { svg.classList.remove('is-blinking'); if (after) after(); }, 115);
  }
  function scheduleBlink() {
    if (reduce || !running) { blinkTimer = null; return; }
    blinkTimer = setTimeout(function () {
      blink(function () {
        if (Math.random() < 0.22) setTimeout(function () { blink(scheduleBlink); }, 170);
        else scheduleBlink();
      });
    }, 2800 + Math.random() * 4200);
  }
  function stop() { if (blinkTimer) clearTimeout(blinkTimer); blinkTimer = null; svg.classList.remove('is-blinking'); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      running = es[0].isIntersecting;
      if (running) { if (!blinkTimer) scheduleBlink(); } else stop();
    }, { threshold: 0.05 }).observe(wrap);
  }

  scheduleBlink();
})();
