(() => {
  'use strict';

  const list = document.querySelector('.pp-list');
  const nav = document.querySelector('.pp-jump');
  if (!list || !nav) return;

  const panels = [...list.querySelectorAll('.pp')];
  const tabs = [...nav.querySelectorAll('a')];
  if (!panels.length || panels.length !== tabs.length) return;

  const NS = 'http://www.w3.org/2000/svg';
  const useHash = list.dataset.hash !== 'off';
  let current = -1;

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'pp-next';

  function setActive(i, opts = {}) {
    if (i === current) return;
    current = i;
    panels.forEach((panel, k) => {
      const on = k === i;
      panel.classList.toggle('is-active', on);
      panel.setAttribute('aria-hidden', String(!on));
      panel.inert = !on;
      tabs[k].setAttribute('aria-selected', String(on));
      tabs[k].tabIndex = on ? 0 : -1;
    });
    const panel = panels[i];
    list.style.setProperty('--pp-bg', panel.style.getPropertyValue('--pp-bg'));
    list.style.setProperty('--pp-fg', panel.style.getPropertyValue('--pp-fg'));
    next.textContent = `Next: ${tabs[(i + 1) % tabs.length].textContent}`;

    nav.scrollTo({
      left: tabs[i].offsetLeft - (nav.clientWidth - tabs[i].offsetWidth) / 2,
      behavior: opts.instant ? 'auto' : 'smooth'
    });
    if (opts.focus) tabs[i].focus({ preventScroll: true });
    if (useHash && opts.hash !== false) history.replaceState(null, '', `#${panel.id}`);
  }

  function indexFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    return panels.findIndex((panel) => panel.id === id);
  }

  function setupTabs() {
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-orientation', 'vertical');
    tabs.forEach((tab, i) => {
      tab.setAttribute('role', 'tab');
      tab.id = `tab-${panels[i].id}`;
      tab.setAttribute('aria-controls', panels[i].id);
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].setAttribute('aria-labelledby', tab.id);
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        setActive(i);
      });
    });
    nav.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      let to = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') to = current === last ? 0 : current + 1;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') to = current === 0 ? last : current - 1;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = last;
      if (to === null) return;
      e.preventDefault();
      setActive(to, { focus: true });
    });
    next.addEventListener('click', () => setActive((current + 1) % tabs.length));
    list.prepend(nav);
    list.append(next);
    if (useHash) addEventListener('hashchange', () => {
      const i = indexFromHash();
      if (i >= 0) setActive(i, { hash: false });
    });
  }

  function setupFan(group) {
    const images = [...group.querySelectorAll('img')];
    if (images.length < 2) return;
    const buttons = images.map((img) => {
      img.loading = 'eager';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pp-shot';
      button.setAttribute('aria-label', `Show ${img.alt}`);
      img.replaceWith(button);
      button.append(img);
      return button;
    });
    const order = [...buttons.keys()];
    const dots = document.createElement('div');
    dots.className = 'pp-dots';
    const dotButtons = images.map((img) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'pp-dot';
      dot.setAttribute('aria-label', `Show ${img.alt}`);
      dots.append(dot);
      return dot;
    });
    const paint = () => {
      order.forEach((b, slot) => {
        buttons[b].dataset.slot = String(slot);
        buttons[b].setAttribute('aria-pressed', String(slot === 1));
      });
      dotButtons.forEach((dot, b) => dot.setAttribute('aria-current', String(order[1] === b)));
    };
    const bringFront = (b) => {
      const slot = order.indexOf(b);
      if (slot === 1) return;
      [order[1], order[slot]] = [order[slot], order[1]];
      paint();
    };
    buttons.forEach((button, b) => button.addEventListener('click', () => bringFront(b)));
    dotButtons.forEach((dot, b) => dot.addEventListener('click', () => bringFront(b)));
    group.after(dots);
    paint();
    group.classList.add('pp-fan');
  }

  function drawQr(host, text) {
    const qr = window.qrcode(0, 'M');
    qr.addData(text, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 4;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
      }
    }
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${n + quiet * 2} ${n + quiet * 2}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `QR code for ${text}`);
    svg.setAttribute('shape-rendering', 'crispEdges');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
    host.replaceChildren(svg);
  }

  function setupDrafy() {
    const panel = document.getElementById('drafy');
    const shots = panel && panel.querySelector('.pp-web');
    if (!shots || typeof window.qrcode !== 'function') return;

    const demo = document.createElement('div');
    demo.className = 'pp-shots pp-demo';

    const label = document.createElement('label');
    label.className = 'pp-demo-label';
    label.htmlFor = 'pp-qr-input';
    label.textContent = 'Try it. Type anything.';

    const input = document.createElement('input');
    input.id = 'pp-qr-input';
    input.type = 'text';
    input.maxLength = 300;
    input.value = 'https://aykizintelligence.com';
    input.autocomplete = 'off';
    input.spellcheck = false;

    const card = document.createElement('div');
    card.className = 'pp-demo-qr';

    const note = document.createElement('p');
    note.className = 'pp-demo-note';
    note.textContent = 'Made in this page. Nothing you type leaves your browser.';

    const paint = () => {
      const text = input.value.trim();
      if (!text) {
        card.replaceChildren();
        return;
      }
      drawQr(card, text);
    };
    input.addEventListener('input', paint);

    demo.append(label, input, card, note);
    shots.replaceWith(demo);
    paint();
  }

  setupTabs();
  panels.forEach((panel) => {
    const fan = panel.querySelector('.pp-phones');
    if (fan) setupFan(fan);
  });
  setupDrafy();

  list.classList.add('pp-live');
  const start = indexFromHash();
  setActive(useHash && start >= 0 ? start : 0, { instant: true, hash: false });
})();
