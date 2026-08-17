/* Aykiz Intelligence · the sky
   A live field of stardust over the night ground. Grains stream in from off the
   edges on load, then drift. The pointer is a black hole: it carves the dust
   away, swirls what it does not swallow, and carries a faint rim so it reads as
   an object rather than an absence.

   2D canvas, no dependency. No shadowBlur anywhere: a blurred sprite inside a
   per-frame loop is what makes this kind of thing expensive. Paused when the
   hero scrolls away and when the tab is hidden. One static frame under
   prefers-reduced-motion. */

(() => {
  'use strict';

  const canvas = document.getElementById('sky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const GROUND = '#04060D';
  const COLD = [169, 189, 216];   // cool silver
  const WARM = [242, 246, 255];   // moonlight white
  const TEAL = [107, 197, 189];   // the accent, on a few grains only

  const ARRIVE = 1.9;             // seconds for the field to stream in
  const HOLE_R = 152;             // black-hole radius in CSS px

  let W = 0, H = 0, DPR = 1;
  let pts = [];
  let mx = -9999, my = -9999;
  let holeR = 0;
  let elapsed = 0;
  let raf = 0, running = false, last = 0;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const sky = (window.__sky = { grains: 0, arrive: 0, hole: 0 });

  function size() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    // measure the element, not the window: innerWidth includes the scrollbar,
    // which would make the canvas wider than the layout viewport.
    const r = canvas.getBoundingClientRect();
    W = Math.round(r.width) || document.documentElement.clientWidth;
    H = Math.round(r.height) || document.documentElement.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function build() {
    const density = W < 700 ? 900 : 420;
    const n = Math.round(Math.min(W < 700 ? 1500 : 3400, Math.max(1100, (W * H) / density)));
    pts = new Array(n);
    for (let i = 0; i < n; i++) {
      const tone = Math.random();
      pts[i] = {
        // home in the field, in normalised space so a resize stays cheap
        fx: rnd(-0.06, 1.06),
        fy: rnd(-0.06, 1.06),
        // where it streams in from, off the edges
        sx: rnd(-0.5, 1.5),
        sy: rnd(-0.5, 1.5),
        x: 0, y: 0, vx: 0, vy: 0,
        r: rnd(0.5, 1.7),
        a: rnd(0.4, 1),
        tw: rnd(0, Math.PI * 2),
        tws: rnd(0.4, 1.5),
        c: tone > 0.955 ? TEAL : (tone > 0.62 ? WARM : COLD),
        dx: rnd(-0.55, 0.55),
        dy: rnd(-0.4, 0.4),
        lag: rnd(0, 0.55)           // staggers arrival so it is not one wall
      };
    }
    sky.grains = n;
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min(50, t - (last || t)) / 1000;
    last = t;
    elapsed += dt;

    const targetHole = (fine && mx > -9000) ? HOLE_R : 0;
    holeR += (targetHole - holeR) * Math.min(1, dt * 6);

    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];

      // arrival: off-edge to field home, staggered per grain
      let k = (elapsed - p.lag) / ARRIVE;
      k = k < 0 ? 0 : k > 1 ? 1 : k;
      const arrive = 1 - Math.pow(1 - k, 3);

      const homeX = p.fx * W, homeY = p.fy * H;
      const fromX = p.sx * W, fromY = p.sy * H;
      let tx = fromX + (homeX - fromX) * arrive;
      let ty = fromY + (homeY - fromY) * arrive;

      // never static once home
      tx += Math.sin(t * 0.00007 + p.tw) * 26 * arrive * p.dx;
      ty += Math.cos(t * 0.00006 + p.tw) * 20 * arrive * p.dy;

      p.vx += (tx - p.x) * 0.18;
      p.vy += (ty - p.y) * 0.18;

      // the black hole: push out radially, swirl tangentially
      if (holeR > 1) {
        const ddx = p.x - mx, ddy = p.y - my;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < holeR * holeR && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const infl = 1 - d / holeR;
          const push = infl * infl * 30;
          p.vx += (ddx / d) * push + (-ddy / d) * infl * 6;
          p.vy += (ddy / d) * push + (ddx / d) * infl * 6;
        }
      }

      p.vx *= 0.78; p.vy *= 0.78;
      p.x += p.vx; p.y += p.vy;

      p.tw += dt * p.tws;
      let alpha = p.a * (0.74 + 0.26 * Math.sin(p.tw));

      // anything still inside the hole fades toward nothing at the centre
      if (holeR > 1) {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < holeR) alpha *= Math.max(0, (d / holeR - 0.3) / 0.7);
      }
      if (alpha <= 0.004) continue;

      const c = p.c;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
      // squares, not arcs: a small rect fill is markedly cheaper per grain
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }

    // the rim, so the hole reads as an object. Two stroked arcs, no blur.
    if (holeR > 8) {
      const f = holeR / HOLE_R;
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(107,197,189,${(0.16 * f).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(mx, my, holeR * 0.52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(238,242,250,${(0.07 * f).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(mx, my, holeR * 0.86, 0, Math.PI * 2);
      ctx.stroke();
    }

    sky.arrive = Math.min(1, elapsed / (ARRIVE + 0.55));
    sky.hole = Math.round(holeR);
    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, W, H);
    for (const p of pts) {
      const c = p.c;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(p.a * 0.8).toFixed(3)})`;
      ctx.fillRect(p.fx * W - p.r, p.fy * H - p.r, p.r * 2, p.r * 2);
    }
  }

  function start() {
    if (running || reduce) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  size();
  build();
  for (const p of pts) { p.x = p.sx * W; p.y = p.sy * H; }
  if (reduce) drawStatic(); else start();

  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      size(); build();
      for (const p of pts) { p.x = p.fx * W; p.y = p.fy * H; }
      elapsed = ARRIVE + 1;             // a resize lands in the settled field
      if (reduce) drawStatic();
    }, 180);
  });

  if (fine) {
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    addEventListener('pointerleave', () => { mx = my = -9999; });
  }

  const hero = document.getElementById('hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver((es) => (es[0].isIntersecting ? start() : stop()),
      { rootMargin: '10% 0px' }).observe(hero);
  }
  addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
})();
