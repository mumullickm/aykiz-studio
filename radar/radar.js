(function () {
  var canvas = document.getElementById('radar');
  var ctx = canvas.getContext('2d');
  var feed = document.getElementById('feed');

  var FILES = [
    'auth/session.ts', 'api/routes.py', 'components/Radar.tsx',
    'db/migrations/003_index.sql', 'lib/cache.rs', 'workers/queue.go',
    'styles/tokens.css', 'tests/agent.spec.ts', 'scripts/deploy.sh',
    'lib/parser.rs', 'components/Feed.tsx', 'api/webhook.ts',
    'utils/retry.ts', 'db/seed.sql', 'workers/notify.go', 'lib/logger.ts'
  ];

  var HUBS = [
    { key: 'reasoning', name: 'Reasoning',     color: '#9B7FE0', x: 0.30, y: 0.22, count: 154, rate: 2.8 },
    { key: 'memory',    name: 'Memory',        color: '#5B8DEF', x: 0.62, y: 0.18, count: 88,  rate: 1.2 },
    { key: 'language',  name: 'Language',      color: '#E8615C', x: 0.76, y: 0.42, count: 210, rate: 3.4 },
    { key: 'concept',   name: 'Concept Layer', color: '#6BC5BD', x: 0.24, y: 0.58, count: 128, rate: 2.1 },
    { key: 'feature',   name: 'Feature Layer', color: '#E8B54C', x: 0.66, y: 0.68, count: 96,  rate: 1.6 },
    { key: 'motor',     name: 'Motor Cortex',  color: '#6FCF7A', x: 0.46, y: 0.85, count: 132, rate: 2.0 }
  ];

  var LEAVES_PER_HUB = 11;
  var MAX_PULSES = 7;
  var size = canvas.width;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var core = { x: 0.5, y: 0.5 };
  var pulses = [];
  var lastSpawn = 0;
  var spawnGap = 260;
  var startedAt = performance.now();
  var labelFont = '"Saira", sans-serif';

  document.fonts.load('10px "Geist Pixel Square"').then(function () {
    labelFont = '"Geist Pixel Square", "Saira", sans-serif';
  });

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    size = canvas.width;
  }
  window.addEventListener('resize', resize);
  resize();

  function px(fx, fy) {
    return { x: fx * size, y: fy * size };
  }

  HUBS.forEach(function (hub) {
    hub.leaves = [];
    for (var i = 0; i < LEAVES_PER_HUB; i++) {
      var jx = hub.x + (Math.random() - 0.5) * 0.16;
      var jy = hub.y + (Math.random() - 0.5) * 0.16;
      var bow = (Math.random() - 0.5) * 0.5;
      hub.leaves.push({
        fx: jx, fy: jy, bow: bow,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.5,
        flashAt: 0
      });
    }
  });

  function curvePoint(a, ctrl, b, t) {
    var u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y
    };
  }

  function controlPoint(a, b, bow) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var dx = b.x - a.x, dy = b.y - a.y;
    return { x: mx - dy * bow, y: my + dx * bow };
  }

  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function pushFeed(hub, file) {
    var el = document.createElement('div');
    el.className = 'line';
    el.innerHTML = '<span class="t">' + fmtTime(performance.now() - startedAt) + '</span>' +
      '<span class="k" style="color:' + hub.color + '">' + hub.name.toLowerCase() + '</span> → ' + file;
    feed.insertBefore(el, feed.firstChild);
    while (feed.children.length > 8) feed.removeChild(feed.lastChild);
  }

  function bumpHub(hub) {
    hub.count += Math.random() < 0.5 ? 1 : 0;
    hub.rate = Math.max(0.4, hub.rate + (Math.random() - 0.45) * 0.15);
    var el = document.querySelector('.hub[data-hub="' + hub.key + '"]');
    if (!el) return;
    el.querySelector('.hub-stat .n').textContent = hub.count;
    el.querySelector('.hub-stat .rate').textContent = hub.rate.toFixed(1) + 'k';
  }

  function spawnPulse(now) {
    if (pulses.length >= MAX_PULSES) return;
    var hub = HUBS[Math.floor(Math.random() * HUBS.length)];
    var leaf = hub.leaves[Math.floor(Math.random() * hub.leaves.length)];
    pulses.push({
      hub: hub, leaf: leaf,
      start: now, duration: 650 + Math.random() * 550
    });
    bumpHub(hub);
    pushFeed(hub, FILES[Math.floor(Math.random() * FILES.length)]);
  }

  function drawHubEdges(hub, now) {
    var corePx = px(core.x, core.y);
    ctx.lineWidth = 1 * dpr;
    hub.leaves.forEach(function (leaf) {
      var leafPx = px(leaf.fx, leaf.fy);
      var ctrl = controlPoint(corePx, leafPx, leaf.bow);
      var breathe = 0.18 + 0.1 * Math.sin(now / 900 * leaf.speed + leaf.phase);
      ctx.strokeStyle = hexToRgba(hub.color, breathe);
      ctx.beginPath();
      ctx.moveTo(corePx.x, corePx.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, leafPx.x, leafPx.y);
      ctx.stroke();

      var flashAlpha = leaf.flashAt && now - leaf.flashAt < 400 ? 1 - (now - leaf.flashAt) / 400 : 0;
      var r = (1.6 + flashAlpha * 2.5) * dpr;
      ctx.beginPath();
      ctx.arc(leafPx.x, leafPx.y, r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(hub.color, 0.5 + flashAlpha * 0.5);
      ctx.fill();
    });
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function drawCore(now) {
    var corePx = px(core.x, core.y);
    var pulse = 1 + 0.12 * Math.sin(now / 1100);
    var grad = ctx.createRadialGradient(corePx.x, corePx.y, 0, corePx.x, corePx.y, 60 * dpr * pulse);
    grad.addColorStop(0, 'rgba(238, 242, 250, 0.22)');
    grad.addColorStop(1, 'rgba(238, 242, 250, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(corePx.x, corePx.y, 60 * dpr * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(corePx.x, corePx.y, 3 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#EEF2FA';
    ctx.fill();
  }

  function drawPulses(now) {
    var corePx = px(core.x, core.y);
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      var t = (now - p.start) / p.duration;
      if (t >= 1) {
        p.leaf.flashAt = now;
        pulses.splice(i, 1);
        continue;
      }
      var leafPx = px(p.leaf.fx, p.leaf.fy);
      var ctrl = controlPoint(corePx, leafPx, p.leaf.bow);
      var pos = curvePoint(corePx, ctrl, leafPx, t);
      var r = 3 * dpr;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(p.hub.color, 0.22);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#EEF2FA';
      ctx.fill();
    }
  }

  function frame(now) {
    ctx.clearRect(0, 0, size, size);
    drawCore(now);
    HUBS.forEach(function (hub) { drawHubEdges(hub, now); });
    drawPulses(now);

    if (now - lastSpawn > spawnGap) {
      lastSpawn = now;
      spawnGap = 160 + Math.random() * 320;
      spawnPulse(now);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
