/* Aykiz Intelligence · the moon
   Aykiz means moon girl, so the hero carries tonight's moon: not a photograph,
   not a flat disc, a sphere shaded per pixel for the real phase. The surface is
   3D noise sampled on the sphere (so the maria wrap round the limb instead of
   sitting on it like a sticker), the light is Lommel-Seeliger (the reason the
   full moon looks flat rather than ball-shaped), and the dark side is opaque so
   it occludes the stars the way the real one does.

   Drawn once into ImageData, in row chunks across frames so the first paint is
   never blocked, then left alone. Redrawn on resize and once an hour. */

(() => {
  'use strict';

  const el = document.getElementById('moon');
  if (!el) return;
  const ctx = el.getContext('2d');
  if (!ctx) return;

  /* phase, same epoch and month as main.js so the two instruments agree */
  const SYNODIC = 29.530588853;
  const EPOCH = Date.UTC(2000, 0, 6, 18, 14, 0);
  function phase() {
    let p = (((Date.now() - EPOCH) / 86400000) % SYNODIC) / SYNODIC;
    return p < 0 ? p + 1 : p;
  }

  /* improved Perlin noise, fixed seed so the moon is the same moon every visit */
  const P = new Uint8Array(512);
  {
    const s = Array.from({ length: 256 }, (_, i) => i);
    let seed = 20260613;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = s[i]; s[i] = s[j]; s[j] = t; }
    for (let i = 0; i < 512; i++) P[i] = s[i & 255];
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  function grad(h, x, y, z) {
    h &= 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  function perlin(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z;
    const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z), u),
           lerp(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1), u),
           lerp(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  }
  function fbm(x, y, z, oct) {
    let a = 0.5, f = 1, s = 0;
    for (let i = 0; i < oct; i++) { s += a * perlin(x * f, y * f, z * f); a *= 0.5; f *= 2.03; }
    return s;
  }
  const smooth = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };

  let job = 0;
  const moon = (window.__moon = { size: 0, phase: 0, ms: 0, ready: false });

  function draw() {
    const D = el.clientWidth;
    if (!D) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const S = Math.min(720, Math.round(D * dpr));   // cap the pixel work, not the CSS size
    el.width = S; el.height = S;
    const img = ctx.createImageData(S, S);
    const d = img.data;

    const p = phase();
    const th = 2 * Math.PI * p;
    const lx = Math.sin(th), lz = -Math.cos(th);   // sun direction; p=.5 gives (0,0,1), full
    const c = (S - 1) / 2, r = S / 2 - 1.5;
    const AA = 1 / r;

    const mine = ++job;
    const t0 = performance.now();
    let y = 0;
    moon.size = S; moon.phase = +p.toFixed(4); moon.ready = false;
    el.classList.remove('ready');

    function rows(deadline) {
      const stop = y + 16;
      for (; y < S && y < stop; y++) {
        const ny = (y - c) / r;
        for (let x = 0; x < S; x++) {
          const nx = (x - c) / r;
          const d2 = nx * nx + ny * ny;
          if (d2 > 1.03) continue;
          const dist = Math.sqrt(d2);
          const edge = Math.min(1, Math.max(0, (1 - dist) / AA + 0.5));   // one-pixel antialiased limb
          if (edge <= 0) continue;
          const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, d2)));

          /* surface: broad maria from low-frequency noise, fine regolith on top,
             a few brighter rays so the disc is not one tone */
          const m = fbm(nx * 1.7 + 3.1, ny * 1.7 + 1.7, nz * 1.7 + 5.3, 4);
          const fine = fbm(nx * 8.5 + 7.7, ny * 8.5 + 2.2, nz * 8.5 + 1.1, 4);
          const ray = fbm(nx * 3.3 - 4.4, ny * 3.3 + 9.1, nz * 3.3 - 2.6, 2);
          let alb = 0.80 + fine * 0.17 + Math.max(0, ray - 0.18) * 0.5;
          alb *= 1 - 0.34 * smooth(0.04, 0.17, m);

          /* light: Lommel-Seeliger, normalised so the full disc reads ≈ 1 */
          const ci = nx * lx + nz * lz;
          const ce = nz;
          let I = ci > 0 ? (2 * ci) / (ci + ce + 1e-4) : 0;
          I = Math.min(1.08, I);
          /* the terminator is where craters throw their shadows: a touch of extra darkening */
          I *= 0.82 + 0.18 * smooth(0, 0.22, ci);

          const lit = alb * I;
          /* the dark side: a shade above the sky, so the disc occludes the stars
             without reading as a grey ball; earthshine is a rumour, not a light */
          const earth = 0.012 * alb;
          const R = 246 * lit + 60 * earth + 6 * (1 - I);
          const G = 243 * lit + 80 * earth + 8 * (1 - I);
          const B = 233 * lit + 120 * earth + 14 * (1 - I);

          const i = (y * S + x) * 4;
          d[i] = R > 255 ? 255 : R;
          d[i + 1] = G > 255 ? 255 : G;
          d[i + 2] = B > 255 ? 255 : B;
          d[i + 3] = 255 * edge;
        }
      }
      if (mine !== job) return;                       /* a newer draw superseded this one */
      if (y < S) { requestAnimationFrame(rows); return; }
      ctx.putImageData(img, 0, 0);
      moon.ms = Math.round(performance.now() - t0);
      moon.ready = true;
      el.classList.add('ready');
    }
    requestAnimationFrame(rows);
  }

  /* first draw after the page has painted; the field arrives, then the moon */
  if ('requestIdleCallback' in window) requestIdleCallback(draw, { timeout: 600 });
  else setTimeout(draw, 120);

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 220); });
  setInterval(draw, 3600000);
})();
