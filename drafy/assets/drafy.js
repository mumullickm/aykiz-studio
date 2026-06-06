// Drafy on the web. Everything runs in this tab: the QR is built from the matrix
// and drawn to SVG (the vector source of truth), then rasterized for PNG export.
// No account, no network call, nothing leaves the browser.
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---- brand palette (Drafy blueprint) -------------------------------------
  const PRESETS = [
    { name: 'Coal / Paper', fg: '#0D0D12', bg: '#F1EADB' },
    { name: 'Blueprint / Paper', fg: '#0E2A4A', bg: '#F1EADB' },
    { name: 'Ink / White', fg: '#0D0D12', bg: '#FFFFFF' },
    { name: 'Blueprint / White', fg: '#0E2A4A', bg: '#FFFFFF' },
    { name: 'Amber / Blueprint', fg: '#FFB347', bg: '#0E2A4A' },
  ];

  const state = {
    type: 'link',
    fg: '#0D0D12',
    bg: '#F1EADB',
    cell: 'square', // square | round
    eye: 'square', // square | round
    ecc: 'M', // L M Q H
    logo: null, // dataURL
  };

  // ---- payload encoders ----------------------------------------------------
  const esc = (s) => String(s == null ? '' : s);
  // Wi-Fi / MeCard style escaping for reserved chars
  const wesc = (s) => esc(s).replace(/([\\;,:"])/g, '\\$1');

  const ENCODERS = {
    link: (f) => esc(f.url).trim(),
    text: (f) => esc(f.text),
    wifi: (f) =>
      `WIFI:T:${f.auth || 'WPA'};S:${wesc(f.ssid)};` +
      (f.auth === 'nopass' ? '' : `P:${wesc(f.pass)};`) +
      (f.hidden ? 'H:true;' : '') + ';',
    email: (f) => {
      const q = [];
      if (f.subject) q.push('subject=' + encodeURIComponent(f.subject));
      if (f.body) q.push('body=' + encodeURIComponent(f.body));
      return `mailto:${esc(f.to).trim()}${q.length ? '?' + q.join('&') : ''}`;
    },
    sms: (f) => `SMSTO:${esc(f.number).trim()}:${esc(f.message)}`,
    phone: (f) => `tel:${esc(f.number).trim()}`,
    geo: (f) => `geo:${esc(f.lat).trim()},${esc(f.lng).trim()}`,
    vcard: (f) =>
      [
        'BEGIN:VCARD', 'VERSION:3.0',
        `N:${esc(f.last)};${esc(f.first)};;;`,
        `FN:${(esc(f.first) + ' ' + esc(f.last)).trim()}`,
        f.org ? `ORG:${esc(f.org)}` : '',
        f.title ? `TITLE:${esc(f.title)}` : '',
        f.phone ? `TEL;TYPE=CELL:${esc(f.phone)}` : '',
        f.email ? `EMAIL:${esc(f.email)}` : '',
        f.web ? `URL:${esc(f.web)}` : '',
        'END:VCARD',
      ].filter(Boolean).join('\n'),
  };

  // ---- matrix --------------------------------------------------------------
  function buildMatrix(text, ecc) {
    // qrcode-generator: typeNumber 0 = auto-fit
    const qr = qrcode(0, ecc);
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const m = [];
    for (let r = 0; r < n; r++) {
      m[r] = [];
      for (let c = 0; c < n; c++) m[r][c] = qr.isDark(r, c);
    }
    return m;
  }

  const isFinder = (r, c, n) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  // ---- SVG render (vector source of truth) ---------------------------------
  function renderSVG(matrix, opt) {
    const n = matrix.length;
    const quiet = 4;
    const dim = n + quiet * 2;
    const { fg, bg, cell, eye, logo } = opt;
    const px = (v) => +v.toFixed(3);

    let body = '';
    const rd = cell === 'round' ? 0.5 : 0.12; // corner radius in module units

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!matrix[r][c] || isFinder(r, c, n)) continue;
        const x = c + quiet, y = r + quiet;
        if (cell === 'round') {
          body += `<circle cx="${px(x + 0.5)}" cy="${px(y + 0.5)}" r="0.46"/>`;
        } else {
          body += `<rect x="${px(x + 0.06)}" y="${px(y + 0.06)}" width="0.88" height="0.88" rx="${rd}"/>`;
        }
      }
    }

    // three finder eyes drawn explicitly for crisp, scannable corners
    const eyeR = eye === 'round' ? 1.6 : 0.6;
    const innR = eye === 'round' ? 0.9 : 0.3;
    const corners = [[0, 0], [0, n - 7], [n - 7, 0]];
    let eyes = '';
    for (const [er, ec] of corners) {
      const x = ec + quiet, y = er + quiet;
      // outer 7x7 frame: fg ring -> bg knockout -> fg 3x3 core
      eyes += `<rect x="${px(x)}" y="${px(y)}" width="7" height="7" rx="${eyeR}" fill="${fg}"/>`;
      eyes += `<rect x="${px(x + 1)}" y="${px(y + 1)}" width="5" height="5" rx="${px(eyeR * 0.7)}" fill="${bg}"/>`;
      eyes += `<rect x="${px(x + 2)}" y="${px(y + 2)}" width="3" height="3" rx="${innR}" fill="${fg}"/>`;
    }

    let logoTag = '';
    if (logo) {
      const s = dim * 0.22;
      const o = (dim - s) / 2;
      const pad = s * 0.12;
      logoTag =
        `<rect x="${px(o - pad)}" y="${px(o - pad)}" width="${px(s + pad * 2)}" height="${px(s + pad * 2)}" rx="${px(s * 0.16)}" fill="${bg}"/>` +
        `<image x="${px(o)}" y="${px(o)}" width="${px(s)}" height="${px(s)}" href="${logo}" preserveAspectRatio="xMidYMid meet"/>`;
    }

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
      `<rect width="${dim}" height="${dim}" fill="${bg}"/>` +
      `<g fill="${fg}">${body}</g>` +
      eyes + logoTag +
      `</svg>`
    );
  }

  // ---- contrast guard (WCAG) ----------------------------------------------
  function lum(hex) {
    const v = hex.replace('#', '');
    const n = v.length === 3 ? v.split('').map((x) => x + x).join('') : v;
    const c = [0, 2, 4].map((i) => {
      let ch = parseInt(n.substr(i, 2), 16) / 255;
      return ch <= 0.03928 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  // ---- collect form values for active type --------------------------------
  function readFields() {
    const panel = $(`.fields[data-type="${state.type}"]`);
    const f = {};
    if (!panel) return f;
    $$('[data-field]', panel).forEach((el) => {
      if (el.type === 'checkbox') f[el.dataset.field] = el.checked;
      else f[el.dataset.field] = el.value;
    });
    return f;
  }

  // ---- the render pipeline -------------------------------------------------
  let lastSVG = '';
  function update() {
    const f = readFields();
    const payload = (ENCODERS[state.type] || (() => ''))(f);
    const stage = $('#stage');
    const warn = $('#contrast');
    const meta = $('#meta');

    if (!payload || !payload.trim() || payload === 'mailto:' || payload === 'tel:' || payload === 'geo:,') {
      stage.innerHTML = '<div class="empty">Fill a field to draft a code.</div>';
      $('#count').textContent = '--';
      meta.textContent = 'awaiting input';
      lastSVG = '';
      return;
    }

    let matrix;
    try {
      const ecc = state.logo ? 'H' : state.ecc; // logo overlap needs the headroom
      matrix = buildMatrix(payload, ecc);
    } catch (e) {
      stage.innerHTML = '<div class="empty err">Too much data for one code. Trim the content.</div>';
      lastSVG = '';
      return;
    }

    lastSVG = renderSVG(matrix, state);
    stage.innerHTML = lastSVG;

    $('#count').textContent = matrix.length + '×' + matrix.length;
    meta.textContent = `${state.type.toUpperCase()} · ECC ${state.logo ? 'H' : state.ecc} · ${payload.length} chars`;

    const cr = ratio(state.fg, state.bg);
    warn.hidden = cr >= 3.0;
  }

  // ---- export --------------------------------------------------------------
  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportSVG() {
    if (!lastSVG) return;
    download(`drafy-${state.type}.svg`, new Blob([lastSVG], { type: 'image/svg+xml' }));
  }

  function exportPNG() {
    if (!lastSVG) return;
    const SIZE = 1240;
    const img = new Image();
    const svgBlob = new Blob([lastSVG], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = SIZE; cv.height = SIZE;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = state.bg;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      cv.toBlob((b) => download(`drafy-${state.type}.png`, b), 'image/png');
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  // ---- wire up UI ----------------------------------------------------------
  function init() {
    // type chips
    $$('.typechip').forEach((chip) => {
      chip.addEventListener('click', () => {
        state.type = chip.dataset.type;
        $$('.typechip').forEach((c) => c.classList.toggle('on', c === chip));
        $$('.fields').forEach((p) => (p.hidden = p.dataset.type !== state.type));
        update();
      });
    });

    // any field input -> re-draft
    $$('[data-field]').forEach((el) => {
      el.addEventListener('input', update);
      el.addEventListener('change', update);
    });

    // colour inputs
    const fgIn = $('#fg'), bgIn = $('#bg');
    fgIn.value = state.fg; bgIn.value = state.bg;
    fgIn.addEventListener('input', () => { state.fg = fgIn.value; update(); });
    bgIn.addEventListener('input', () => { state.bg = bgIn.value; update(); });

    // presets
    const presetWrap = $('#presets');
    PRESETS.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.title = p.name;
      b.style.background = p.bg;
      b.innerHTML = `<span style="background:${p.fg}"></span>`;
      b.addEventListener('click', () => {
        state.fg = p.fg; state.bg = p.bg;
        fgIn.value = p.fg; bgIn.value = p.bg;
        update();
      });
      presetWrap.appendChild(b);
    });

    // segmented controls (cell / eye / ecc)
    $$('.seg').forEach((seg) => {
      const key = seg.dataset.key;
      seg.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        state[key] = btn.dataset.val;
        $$('button', seg).forEach((b) => b.classList.toggle('on', b === btn));
        update();
      });
    });

    // logo embed
    const logoIn = $('#logo');
    logoIn.addEventListener('change', () => {
      const file = logoIn.files && logoIn.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => { state.logo = rd.result; $('#logoclear').hidden = false; update(); };
      rd.readAsDataURL(file);
    });
    $('#logoclear').addEventListener('click', () => {
      state.logo = null; logoIn.value = ''; $('#logoclear').hidden = true; update();
    });

    $('#dl-png').addEventListener('click', exportPNG);
    $('#dl-svg').addEventListener('click', exportSVG);

    // seed a friendly default so the stage is never blank on arrival
    const seed = $('[data-type="link"] [data-field="url"]');
    if (seed && !seed.value) seed.value = 'https://aykizintelligence.com/drafy';
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
