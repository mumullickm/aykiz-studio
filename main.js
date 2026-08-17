/* Aykiz Intelligence · studio site
   Three jobs, no dependencies: draw tonight's moon, keep Dhaka time, run the palette.
   Nothing here gates content. If this file fails to load, the page still reads. */

(() => {
  'use strict';

  /* ───────── the moon instrument ─────────
     Phase from the synodic month, terminator drawn as a real half-ellipse.
     Reference new moon: 2000-01-06 18:14 UTC. Synodic month 29.530588853 days. */

  const SYNODIC = 29.530588853;
  const EPOCH = Date.UTC(2000, 0, 6, 18, 14, 0);

  function moonPhase(date) {
    const days = (date.getTime() - EPOCH) / 86400000;
    let p = (days % SYNODIC) / SYNODIC;
    if (p < 0) p += 1;
    return p;                                  // 0 new, 0.25 first quarter, 0.5 full
  }

  function phaseName(p) {
    if (p < 0.02 || p > 0.98) return 'new moon';
    if (p < 0.23) return 'waxing crescent';
    if (p < 0.27) return 'first quarter';
    if (p < 0.48) return 'waxing gibbous';
    if (p < 0.52) return 'full moon';
    if (p < 0.73) return 'waning gibbous';
    if (p < 0.77) return 'last quarter';
    return 'waning crescent';
  }

  /* The lit limb: the disc's right semicircle plus the terminator ellipse.
     a = cos(2πp) is the signed semi-width of the terminator. It bulges toward
     the lit side for a crescent and away from it for a gibbous moon.
     Waning phases are the same shape mirrored. */
  function litPath(p, r) {
    const a = Math.cos(2 * Math.PI * p);
    const rx = Math.abs(a) * r;
    const sweep = a > 0 ? 0 : 1;
    return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx} ${r} 0 0 ${sweep} 0 ${-r} Z`;
  }

  function drawMoon(svg, p) {
    if (!svg) return;
    const r = 10.5;                            // inside the 24x24 viewBox
    const waning = p > 0.5;
    svg.innerHTML =
      `<g transform="translate(12 12)${waning ? ' scale(-1 1)' : ''}">` +
        `<circle class="rim" cx="0" cy="0" r="${r}" />` +
        `<path class="lit" d="${litPath(p, r)}" />` +
      `</g>`;
  }

  function paintSky() {
    const now = new Date();
    const p = moonPhase(now);
    const pct = Math.round((1 - Math.cos(2 * Math.PI * p)) / 2 * 100);
    const label = `${phaseName(p)} · ${pct}%`;

    drawMoon(document.getElementById('moonDisc'), p);
    drawMoon(document.getElementById('moonDiscFoot'), p);

    const l1 = document.getElementById('moonLabel');
    const l2 = document.getElementById('moonLabelFoot');
    if (l1) l1.textContent = label;
    if (l2) l2.textContent = label;
  }

  /* ───────── Dhaka clock ───────── */
  function tick() {
    const el = document.getElementById('dhakaClock');
    if (!el) return;
    const t = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
    el.textContent = `Dhaka ${t}`;
  }

  /* ───────── command palette ───────── */
  const ITEMS = [
    { name: 'Wasilah', kind: 'app',  href: 'https://wasilah.site' },
    { name: 'Drafy',   kind: 'app',  href: '/drafy/' },
    { name: 'Crisp',   kind: 'app',  href: '/crisp/' },
    { name: 'Misbah',  kind: 'app',  href: '/misbah/' },
    { name: 'Hirra',   kind: 'app',  href: '/hirra/' },
    { name: 'Verbatim', kind: 'app', href: '/verbatim/' },
    { name: 'Cadence', kind: 'page', href: '/cadence/' },
    { name: 'All work', kind: 'page', href: '/work/' },
    { name: 'Founder', kind: 'page', href: '/founder/' },
    { name: 'Cat care guide', kind: 'page', href: '/hirra/guide/' },
    { name: 'The idea', kind: 'section', href: '#about' },
    { name: 'Selected work', kind: 'section', href: '#work' },
    { name: 'How I work', kind: 'section', href: '#approach' },
    { name: 'Contact', kind: 'section', href: '#contact' },
    { name: 'Aykiz, the typeface', kind: 'link', href: 'https://github.com/mumullickm/aykiz-font' },
    { name: 'hello@aykizintelligence.com', kind: 'email', href: 'mailto:hello@aykizintelligence.com' }
  ];

  const palette = document.getElementById('palette');
  const input = document.getElementById('paletteInput');
  const list = document.getElementById('paletteList');
  const askBtn = document.getElementById('askBtn');
  let shown = [];
  let cursor = 0;
  let lastFocus = null;

  function render(q) {
    const needle = q.trim().toLowerCase();
    shown = needle
      ? ITEMS.filter((it) => it.name.toLowerCase().includes(needle) || it.kind.includes(needle))
      : ITEMS;
    cursor = 0;
    list.innerHTML = shown
      .map(
        (it, i) =>
          `<li role="option" aria-selected="${i === 0}" data-i="${i}">` +
          `<span class="p-name">${it.name}</span>` +
          `<span class="p-kind">${it.kind}</span></li>`
      )
      .join('');
  }

  function mark() {
    [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === cursor)));
    list.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    if (!palette) return;
    lastFocus = document.activeElement;
    palette.hidden = false;
    input.value = '';
    render('');
    input.focus();
  }

  function close() {
    if (!palette) return;
    palette.hidden = true;
    lastFocus?.focus?.();
  }

  function go(i) {
    const it = shown[i];
    if (!it) return;
    close();
    if (it.href.startsWith('#')) {
      document.querySelector(it.href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', it.href);
    } else if (it.href.startsWith('http')) {
      window.open(it.href, '_blank', 'noopener');
    } else {
      location.href = it.href;
    }
  }

  if (palette && input && list) {
    askBtn?.addEventListener('click', open);
    palette.querySelector('[data-close]')?.addEventListener('click', close);
    input.addEventListener('input', () => render(input.value));

    list.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-i]');
      if (li) go(Number(li.dataset.i));
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(cursor + 1, shown.length - 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(cursor - 1, 0); mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); go(cursor); }
      else if (e.key === 'Escape') { close(); }
    });

    addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open(); }
      else if (e.key === '/' && !typing && palette.hidden) { e.preventDefault(); open(); }
      else if (e.key === 'Escape' && !palette.hidden) { close(); }
    });
  }

  /* ───────── go ───────── */
  paintSky();
  tick();
  setInterval(tick, 20000);
  setInterval(paintSky, 3600000);
})();
