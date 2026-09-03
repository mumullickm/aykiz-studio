/* Aykiz Intelligence · the moon
   Aykiz means moon girl, so the hero carries tonight's moon: a sphere shaded per
   pixel for the real phase. The surface is the real near side, NASA's LRO albedo
   map (public domain, CGI Moon Kit, self-hosted as assets/moon-nearside.jpg)
   sampled by latitude and longitude, so Imbrium, Serenitatis and Tycho sit where
   they belong. If the map fails to load, 3D noise stands in. The light is
   Lommel-Seeliger (the reason the full moon looks flat rather than ball-shaped),
   and the dark side is opaque so it occludes the stars the way the real one does.

   Relief is a ridged height field bump-mapped into the normal, so crater rims throw
   shadow along the terminator the way they do in a photograph. The halo is drawn in
   the same pass, on the lit limb only.

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

  /* the near side: an equirectangular crop, longitude -96..96, north up */
  const MAP_L = 96 * Math.PI / 180;
  let map = null, mapW = 0, mapH = 0, lo = 60, hi = 170;   // lo/hi: the map's own mare/highland levels
  function loadMap() {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      const oc = document.createElement('canvas');
      oc.width = mapW = im.naturalWidth; oc.height = mapH = im.naturalHeight;
      const g = oc.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      const px = g.getImageData(0, 0, mapW, mapH).data;
      map = new Uint8Array(mapW * mapH);
      const hist = new Uint32Array(256);
      for (let i = 0, j = 0; i < px.length; i += 4, j++) { map[j] = px[i]; hist[px[i]]++; }
      /* self-calibrate: the 20th percentile is mare, the 85th is highland */
      let acc = 0, n = mapW * mapH;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.2 && lo === 60) lo = v; if (acc >= n * 0.85) { hi = v; break; } }
      if (hi <= lo) { lo = 60; hi = 170; }
      moon.map = true;
      draw();
    };
    im.onerror = () => { moon.map = false; };
    im.src = 'assets/moon-nearside.jpg';
  }
  function sampleMap(nx, ny, nz) {
    const lon = Math.atan2(nx, nz);                     // 0 at the centre of the disc
    const lat = Math.asin(Math.max(-1, Math.min(1, -ny)));
    let u = (lon + MAP_L) / (2 * MAP_L) * (mapW - 1);
    let v = (0.5 - lat / Math.PI) * (mapH - 1);
    u = u < 0 ? 0 : u > mapW - 1.001 ? mapW - 1.001 : u;
    v = v < 0 ? 0 : v > mapH - 1.001 ? mapH - 1.001 : v;
    const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0;
    const i = y0 * mapW + x0;
    const a = map[i], b = map[i + 1], cc = map[i + mapW], dd = map[i + mapW + 1];
    return (a + (b - a) * fx) * (1 - fy) + (cc + (dd - cc) * fx) * fy;
  }

  let job = 0;
  const moon = (window.__moon = { size: 0, phase: 0, ms: 0, ready: false, map: null });

  function draw() {
    const D = el.clientWidth;                          // canvas is 1.4x the disc, the margin is the halo
    if (!D) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const S = Math.min(820, Math.round(D * dpr));      // cap the pixel work, not the CSS size
    el.width = S; el.height = S;
    const img = ctx.createImageData(S, S);
    const d = img.data;

    const p = phase();
    const th = 2 * Math.PI * p;
    const lx = Math.sin(th), lz = -Math.cos(th);       // sun direction; p=.5 gives (0,0,1), full
    const c = (S - 1) / 2, r = S / 2.8;                // disc radius: canvas/1.4/2
    const AA = 1 / r;
    const EPS = 1.6 / r;                               // bump sample step, ~1.6px
    const BUMP = 0.42;

    const mine = ++job;
    const t0 = performance.now();
    let y = 0;
    moon.size = S; moon.phase = +p.toFixed(4); moon.ready = false;
    el.classList.remove('ready');

    /* height field: ridged noise reads as crater rims and highland relief */
    const relief = (x, yy, z) => {
      let a = 0.5, f = 1, s = 0;
      for (let i = 0; i < 4; i++) { const n = perlin(x * f + 11.3, yy * f - 4.7, z * f + 8.9); s += a * (1 - Math.abs(n)); a *= 0.5; f *= 2.1; }
      return s;
    };

    function rows() {
      const stop = y + 12;
      for (; y < S && y < stop; y++) {
        const ny = (y - c) / r;
        for (let x = 0; x < S; x++) {
          const nx = (x - c) / r;
          const d2 = nx * nx + ny * ny;
          const i = (y * S + x) * 4;

          if (d2 > 1.0) {
            /* the halo: only where the lit limb is, falling off fast, never behind the dark side */
            const dist = Math.sqrt(d2);
            if (dist > 1.7) continue;
            const dirx = nx / dist;
            const toward = 0.5 + 0.5 * (dirx * lx);                 // 1 facing the sun, 0 away
            const side = lz > 0.6 ? 1 : Math.pow(toward, 1.6);
            const g = 0.11 * Math.exp(-(dist - 1) * 6.5) * (0.06 + 0.94 * side);
            if (g < 0.003) continue;
            d[i] = 226; d[i + 1] = 232; d[i + 2] = 242; d[i + 3] = 255 * g;
            continue;
          }

          const dist = Math.sqrt(d2);
          const edge = Math.min(1, Math.max(0, (1 - dist) / AA + 0.5));   // one-pixel antialiased limb
          const nz = Math.sqrt(Math.max(0, 1 - d2));

          /* albedo: sharp-edged maria, a second smaller family, regolith grain, a few bright rays */
          const m1 = fbm(nx * 1.6 + 3.1, ny * 1.6 + 1.7, nz * 1.6 + 5.3, 4);
          const m2 = fbm(nx * 3.4 - 6.2, ny * 3.4 + 4.4, nz * 3.4 - 1.9, 3);
          /* maria cluster to the upper left of the near side, as they do on the real one */
          const bias = 0.05 * smooth(-1, 1, -nx * 0.6 - ny * 0.8);
          const mare = Math.max(smooth(0.03, 0.12, m1 + bias), 0.55 * smooth(0.15, 0.23, m2));
          const fine = fbm(nx * 9 + 7.7, ny * 9 + 2.2, nz * 9 + 1.1, 4);
          const ray = fbm(nx * 3.3 - 4.4, ny * 3.3 + 9.1, nz * 3.3 - 2.6, 2);
          let alb, mareK;
          if (map) {
            /* the real surface: map levels to mare ≈ 0.56, highland ≈ 0.88, a little grain on top */
            const s = (sampleMap(nx, ny, nz) - lo) / (hi - lo);
            alb = 0.62 + 0.36 * s + fine * 0.04;
            mareK = 1 - smooth(0.25, 0.7, s);
          } else {
            alb = 0.84 + fine * 0.12 + Math.max(0, ray - 0.22) * 0.5;
            alb *= 1 - 0.30 * mare * (0.85 + 0.3 * fine);
            alb *= 1 - 0.035 * (1 - mare) * smooth(0.3, 0.7, relief(nx * 6, ny * 6, nz * 6));
            mareK = mare;
          }

          /* bump: finite differences of the relief, stronger on the highlands than the flat maria */
          const k = 17;
          const h0 = relief(nx * k, ny * k, nz * k);
          const hx = relief((nx + EPS) * k, ny * k, nz * k);
          const hy = relief(nx * k, (ny + EPS) * k, nz * k);
          const b = BUMP * (1 - 0.65 * mareK) * (map ? 0.55 : 1);
          let bx = nx - (hx - h0) / EPS * b * 0.011, by = ny - (hy - h0) / EPS * b * 0.011, bz = nz;
          const bl = Math.hypot(bx, by, bz) || 1; bx /= bl; by /= bl; bz /= bl;

          /* light: Lommel-Seeliger on the bumped normal, normalised so the full disc reads ≈ 1 */
          const ci = bx * lx + bz * lz;
          const ce = nz;
          let I = ci > 0 ? (2 * ci) / (ci + ce + 1e-4) : 0;
          I = Math.min(1.05, I);
          const ci0 = nx * lx + nz * lz;                  /* geometric terminator, for the soft band */
          I *= smooth(-0.005, 0.045, ci) * (0.8 + 0.2 * smooth(0, 0.3, ci0));

          const lit = alb * I;
          /* dark side: a hair above the sky so the disc occludes the stars and nothing more */
          const dark = 1 - I;
          const R = 226 * lit + 6 * dark;
          const G = 225 * lit + 8 * dark;
          const B = 220 * lit + 13 * dark;

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
  loadMap();
  if ('requestIdleCallback' in window) requestIdleCallback(() => { if (!map) draw(); }, { timeout: 900 });
  else setTimeout(() => { if (!map) draw(); }, 300);

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 220); });
  setInterval(draw, 3600000);
})();
