(function () {
  var canvas = document.getElementById('radar');
  var ctx = canvas.getContext('2d');
  var feed = document.getElementById('feed');
  var statActive = document.getElementById('statActive');
  var statDone = document.getElementById('statDone');

  var COLOR_WORKING = '#6BC5BD';
  var COLOR_DONE = '#2F8C84';
  var COLOR_QUEUED = '#5A6273';
  var COLOR_GLOW = 'rgba(107, 197, 189, 0.55)';
  var COLOR_LINE = 'rgba(238, 242, 250, 0.10)';
  var COLOR_LINE_SOFT = 'rgba(238, 242, 250, 0.05)';

  var FILES = [
    'auth/session.ts', 'api/routes.py', 'components/Radar.tsx',
    'db/migrations/003_index.sql', 'lib/cache.rs', 'workers/queue.go',
    'styles/tokens.css', 'tests/agent.spec.ts', 'scripts/deploy.sh',
    'lib/parser.rs', 'components/Feed.tsx', 'api/webhook.ts',
    'utils/retry.ts', 'db/seed.sql', 'workers/notify.go', 'lib/logger.ts'
  ];

  var MAX_CONCURRENT = 6;
  var size = canvas.width;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var cx, cy, maxR;
  var agents = [];
  var doneCount = 0;
  var sweepAngle = 0;
  var lastSpawn = 0;
  var spawnGap = 900;
  var startedAt = performance.now();
  var conicSupported = typeof ctx.createConicGradient === 'function';

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.width * dpr;
    size = canvas.width;
    cx = size / 2;
    cy = size / 2;
    maxR = size * 0.44;
  }
  window.addEventListener('resize', resize);
  resize();

  function pickFile() {
    var inUse = agents.map(function (a) { return a.file; });
    var pool = FILES.filter(function (f) { return inUse.indexOf(f) === -1; });
    if (!pool.length) pool = FILES;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function pushFeed(kind, label, file) {
    var el = document.createElement('div');
    el.className = 'line';
    var kClass = kind === 'spawn' ? 'k-spawn' : 'k-done';
    el.innerHTML = '<span class="t">' + fmtTime(performance.now() - startedAt) + '</span>' +
      '<span class="' + kClass + '">' + label + '</span> ' + file;
    feed.insertBefore(el, feed.firstChild);
    while (feed.children.length > 8) feed.removeChild(feed.lastChild);
  }

  function spawnAgent() {
    if (agents.length >= MAX_CONCURRENT) return;
    var duration = 2200 + Math.random() * 2600;
    var agent = {
      file: pickFile(),
      angle: Math.random() * Math.PI * 2,
      radius: (0.28 + Math.random() * 0.62) * maxR,
      state: 'working',
      spawnedAt: performance.now(),
      duration: duration,
      doneAt: 0,
      flashAt: 0
    };
    agents.push(agent);
    pushFeed('spawn', 'spawn', agent.file);
  }

  function updateAgents(now) {
    for (var i = agents.length - 1; i >= 0; i--) {
      var a = agents[i];
      if (a.state === 'working' && now - a.spawnedAt >= a.duration) {
        a.state = 'done';
        a.doneAt = now;
        doneCount++;
        pushFeed('done', 'done', a.file);
      }
      if (a.state === 'done' && now - a.doneAt > 900) {
        agents.splice(i, 1);
      }
    }
    statActive.textContent = agents.filter(function (a) { return a.state === 'working'; }).length;
    statDone.textContent = doneCount;
  }

  function drawGrid() {
    ctx.strokeStyle = COLOR_LINE;
    ctx.lineWidth = 1 * dpr;
    for (var r = 1; r <= 4; r++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (maxR * r) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = COLOR_LINE_SOFT;
    for (var s = 0; s < 8; s++) {
      var ang = (s / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
      ctx.stroke();
    }
  }

  function drawSweep() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.clip();
    if (conicSupported) {
      var grad = ctx.createConicGradient(sweepAngle - Math.PI / 2, cx, cy);
      grad.addColorStop(0, 'rgba(107, 197, 189, 0.28)');
      grad.addColorStop(0.06, 'rgba(107, 197, 189, 0.10)');
      grad.addColorStop(0.16, 'rgba(107, 197, 189, 0)');
      grad.addColorStop(1, 'rgba(107, 197, 189, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.restore();

    ctx.strokeStyle = COLOR_GLOW;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * maxR, cy + Math.sin(sweepAngle) * maxR);
    ctx.stroke();
  }

  function angleDiff(a, b) {
    var d = Math.abs(a - b) % (Math.PI * 2);
    return d > Math.PI ? Math.PI * 2 - d : d;
  }

  function drawAgents(now) {
    agents.forEach(function (a) {
      var px = cx + Math.cos(a.angle) * a.radius;
      var py = cy + Math.sin(a.angle) * a.radius;

      if (angleDiff(sweepAngle, a.angle) < 0.06) a.flashAt = now;

      var pulse = 1 + Math.sin(now / 220) * 0.25;
      var baseR = 3.5 * dpr;
      var color = COLOR_WORKING;
      var alpha = 1;

      if (a.state === 'queued') {
        color = COLOR_QUEUED;
        pulse = 1;
      } else if (a.state === 'done') {
        color = COLOR_DONE;
        alpha = Math.max(0, 1 - (now - a.doneAt) / 900);
        pulse = 1 + alpha * 0.4;
      }

      var flashBoost = a.flashAt && now - a.flashAt < 250 ? (1 - (now - a.flashAt) / 250) * 2.2 : 0;
      var r = baseR * (pulse + flashBoost);

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, r * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = a.state === 'done' ? 'rgba(47,140,132,0.18)' : 'rgba(107,197,189,0.16)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (a.state === 'working') {
        ctx.font = (10 * dpr) + 'px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(194, 202, 217, ' + (0.85 * alpha) + ')';
        var label = a.file.split('/').pop();
        var lx = px + (Math.cos(a.angle) >= 0 ? 10 * dpr : -10 * dpr - ctx.measureText(label).width);
        ctx.fillText(label, lx, py + 3 * dpr);
      }
      ctx.globalAlpha = 1;
    });
  }

  function frame(now) {
    ctx.clearRect(0, 0, size, size);
    sweepAngle += 0.012;
    drawGrid();
    drawSweep();
    drawAgents(now);
    updateAgents(now);

    if (now - lastSpawn > spawnGap) {
      lastSpawn = now;
      spawnGap = 700 + Math.random() * 1000;
      spawnAgent();
    }

    requestAnimationFrame(frame);
  }

  spawnAgent();
  spawnAgent();
  requestAnimationFrame(frame);
})();
