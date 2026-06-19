/* The Hirra cat: a flat 2.5D SVG face that follows the cursor, blinks, and
   smiles when you come near. Pupils are clipped inside the eye so the gaze can
   never leave the face. Eyes follow even under reduced motion (calm, non
   vestibular); blinking and idle float are gated on motion preference and
   pause when the mascot is offscreen. */
(function () {
  var wrap = document.getElementById('catMascot');
  if (!wrap) return;
  var svg = wrap.querySelector('.cat-svg');
  var face = svg.querySelector('#catFace');
  var mouth = svg.querySelector('#mouth');
  var pupilL = svg.querySelector('#pupilL');
  var pupilR = svg.querySelector('#pupilR');

  var eyes = [
    { el: pupilL, hx: 88, hy: 113, rx: 7, ry: 8 },
    { el: pupilR, hx: 152, hy: 113, rx: 7, ry: 8 }
  ];

  var MOUTH_CALM = 'M120 148 Q120 156 109 158 M120 148 Q120 156 131 158';
  var MOUTH_HAPPY = 'M120 149 Q120 163 103 162 M120 149 Q120 163 137 162';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var running = true, happy = false, blinkTimer = null, saccadeTimer = null;
  var aim = { x: 0, y: 0, tx: 0, ty: 0, has: false };

  function toSvg(clientX, clientY) {
    var r = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    return { x: (clientX - r.left) / r.width * vb.width, y: (clientY - r.top) / r.height * vb.height };
  }

  function placePupils(tx, ty) {
    eyes.forEach(function (e) {
      var dx = tx - e.hx, dy = ty - e.hy;
      var mag = Math.sqrt((dx * dx) / (e.rx * e.rx) + (dy * dy) / (e.ry * e.ry));
      if (mag > 1) { dx /= mag; dy /= mag; }
      e.el.setAttribute('cx', (e.hx + dx).toFixed(2));
      e.el.setAttribute('cy', (e.hy + dy).toFixed(2));
    });
  }
  function centerPupils() { eyes.forEach(function (e) { e.el.setAttribute('cx', e.hx); e.el.setAttribute('cy', e.hy); }); }

  function tiltFace(tx, ty) {
    var dx = Math.max(-1, Math.min(1, (tx - 120) / 120));
    var dy = Math.max(-1, Math.min(1, (ty - 110) / 110));
    face.setAttribute('transform', 'translate(' + (dx * 4).toFixed(2) + ' ' + (dy * 3).toFixed(2) + ')');
  }
  function resetFace() { face.setAttribute('transform', 'translate(0 0)'); }

  function setHappy(on) {
    if (happy === on) return;
    happy = on;
    svg.classList.toggle('is-happy', on);
    mouth.setAttribute('d', on ? MOUTH_HAPPY : MOUTH_CALM);
  }

  function onMove(ev) {
    var p = toSvg(ev.clientX, ev.clientY);
    aim.tx = p.x; aim.ty = p.y; aim.has = true;
    placePupils(p.x, p.y);
    if (!reduce) tiltFace(p.x, p.y);
    var r = wrap.getBoundingClientRect(), pad = 90;
    setHappy(ev.clientX > r.left - pad && ev.clientX < r.right + pad && ev.clientY > r.top - pad && ev.clientY < r.bottom + pad);
  }
  function onLeave() { aim.has = false; centerPupils(); resetFace(); setHappy(false); }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('blur', onLeave);
  document.addEventListener('mouseleave', onLeave);

  // blink: random 2.6 to 6.5s with occasional quick double blink
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
  // idle micro-saccade: tiny gaze drift when the cursor is away, so it stays alive
  function scheduleSaccade() {
    if (reduce || !running) { saccadeTimer = null; return; }
    saccadeTimer = setTimeout(function () {
      if (!aim.has) {
        var a = Math.random() * Math.PI * 2, m = 0.4 + Math.random() * 0.5;
        eyes.forEach(function (e) { e.el.setAttribute('cx', (e.hx + Math.cos(a) * e.rx * m).toFixed(2)); e.el.setAttribute('cy', (e.hy + Math.sin(a) * e.ry * m).toFixed(2)); });
      }
      scheduleSaccade();
    }, 1400 + Math.random() * 2200);
  }
  function stop() { if (blinkTimer) clearTimeout(blinkTimer); if (saccadeTimer) clearTimeout(saccadeTimer); blinkTimer = saccadeTimer = null; svg.classList.remove('is-blinking'); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      running = es[0].isIntersecting;
      if (running) { if (!blinkTimer) scheduleBlink(); if (!saccadeTimer) scheduleSaccade(); }
      else stop();
    }, { threshold: 0.1 }).observe(wrap);
  }

  centerPupils();
  setHappy(false);
  scheduleBlink();
  scheduleSaccade();
})();
