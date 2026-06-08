(() => {
  const { PDFDocument, degrees, rgb, StandardFonts } = PDFLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.js';

  const $ = id => document.getElementById(id);
  const drop = $('drop'), file = $('file'), grid = $('pages'), stat = $('stat');
  const saveAll = $('saveAll'), saveSel = $('saveSel'), saveImg = $('saveImg');
  const selAll = $('selAll'), rotSel = $('rotSel'), delSel = $('delSel'), dupSel = $('dupSel'), reverseBtn = $('reverseBtn'), signBtn = $('signBtn'), clearAll = $('clearAll');
  const nameIn = $('fname'), numbersChk = $('numbers'), wmIn = $('wm'), batesIn = $('bates'), headerIn = $('header'), footerIn = $('footer');

  const srcs = {};
  let pages = [];
  let look = 'original', size = 'auto', compress = 'none', imgfmt = 'jpg', uid = 0, sid = 0;
  const sign = { url: null, pos: 'br', size: 24 };

  const A4 = [595.28, 841.89], LETTER = [612, 792];
  const COMPRESS = { light: { scale: 1.3, cap: 1700, q: 0.7 }, strong: { scale: 0.9, cap: 1150, q: 0.5 } };

  /* ---- intake ---------------------------------------------------------- */
  drop.addEventListener('click', () => file.click());
  file.addEventListener('change', e => { addFiles(e.target.files); file.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); if (ev === 'dragleave' && drop.contains(e.relatedTarget)) return; drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });

  async function addFiles(list) {
    busy('Reading…');
    for (const f of list) {
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      const isImg = f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name);
      try {
        if (isPdf) {
          const bytes = new Uint8Array(await f.arrayBuffer());
          const id = 's' + (++sid);
          const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
          srcs[id] = { bytes, doc, name: f.name };
          for (let i = 0; i < doc.numPages; i++) pages.push({ id: ++uid, source: 'pdf', srcId: id, pageIndex: i, rot: 0, sel: false });
        } else if (isImg) {
          pages.push({ id: ++uid, source: 'image', file: f, name: f.name, rot: 0, sel: false });
        }
      } catch (_) { /* skip */ }
    }
    render();
    scheduleThumbs();
  }

  /* ---- thumbnails (lazy, non-blocking) --------------------------------- */
  function scheduleThumbs() {
    for (const p of pages) {
      if (p.thumb || p.thumbState === 'pending') continue;
      p.thumbState = 'pending';
      withTimeout(thumb(p), 9000).then(u => { p.thumb = u; p.thumbState = 'done'; patchCard(p); }).catch(() => { p.thumbState = 'failed'; });
    }
  }
  function patchCard(p) { const w = grid.querySelector(`[data-pid="${p.id}"] .canvaswrap`); if (w && p.thumb) w.innerHTML = `<img src="${p.thumb}" alt="" draggable="false" />`; }
  function withTimeout(pr, ms) { return Promise.race([pr, new Promise((_, r) => setTimeout(() => r(new Error('t')), ms))]); }
  async function thumb(p) {
    if (p.source === 'pdf') {
      const page = await srcs[p.srcId].doc.getPage(p.pageIndex + 1);
      const v0 = page.getViewport({ scale: 1, rotation: p.rot });
      const vp = page.getViewport({ scale: 260 / Math.max(v0.width, v0.height), rotation: p.rot });
      const cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      return cv.toDataURL('image/jpeg', 0.8);
    }
    const bmp = await createImageBitmap(p.file, { imageOrientation: 'from-image' });
    const { cv } = drawImage(bmp, { rot: p.rot, cap: 300, crop: p.crop }); bmp.close?.();
    return cv.toDataURL('image/jpeg', 0.8);
  }

  /* ---- canvas helpers -------------------------------------------------- */
  function drawImage(bmp, opt) {
    const rot = opt.rot || 0, cap = opt.cap || 0, crop = opt.crop;
    let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
    if (crop) { sx = crop.x * bmp.width; sy = crop.y * bmp.height; sw = crop.w * bmp.width; sh = crop.h * bmp.height; }
    let w = sw, h = sh;
    if (cap) { const s = Math.min(1, cap / Math.max(w, h)); w = Math.round(w * s); h = Math.round(h * s); }
    const swap = rot === 90 || rot === 270;
    const cv = document.createElement('canvas'); cv.width = swap ? h : w; cv.height = swap ? w : h;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.translate(cv.width / 2, cv.height / 2); ctx.rotate(rot * Math.PI / 180);
    ctx.drawImage(bmp, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
    if (opt.doLook && look !== 'original') applyLook(ctx, cv.width, cv.height);
    return { cv, w: cv.width, h: cv.height };
  }
  function cropCanvas(cv, crop) {
    const x = Math.round(crop.x * cv.width), y = Math.round(crop.y * cv.height), w = Math.round(crop.w * cv.width), h = Math.round(crop.h * cv.height);
    const o = document.createElement('canvas'); o.width = Math.max(1, w); o.height = Math.max(1, h);
    o.getContext('2d').drawImage(cv, x, y, w, h, 0, 0, w, h); return o;
  }
  function rotateCanvas(cv, rot) {
    const swap = rot === 90 || rot === 270;
    const o = document.createElement('canvas'); o.width = swap ? cv.height : cv.width; o.height = swap ? cv.width : cv.height;
    const ctx = o.getContext('2d'); ctx.translate(o.width / 2, o.height / 2); ctx.rotate(rot * Math.PI / 180); ctx.drawImage(cv, -cv.width / 2, -cv.height / 2); return o;
  }
  function applyLook(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data; let lo = 255, hi = 0;
    for (let i = 0; i < d.length; i += 4) { const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0; d[i] = d[i + 1] = d[i + 2] = g; if (g < lo) lo = g; if (g > hi) hi = g; }
    const span = Math.max(1, hi - lo), bw = look === 'bw';
    for (let i = 0; i < d.length; i += 4) { let v = (d[i] - lo) * 255 / span; if (bw) v = 255 / (1 + Math.exp(-(v - 150) / 26)); d[i] = d[i + 1] = d[i + 2] = v; }
    ctx.putImageData(img, 0, 0);
  }
  const canvasBlob = (cv, type, q) => new Promise(r => cv.toBlob(r, type, q));
  const blobBytes = async b => new Uint8Array(await b.arrayBuffer());

  /* ---- options --------------------------------------------------------- */
  document.querySelectorAll('.seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    const k = seg.dataset.key, v = b.dataset.val;
    if (k === 'look') { look = v; render(); } else if (k === 'size') size = v; else if (k === 'compress') compress = v; else if (k === 'imgfmt') imgfmt = v;
  }));

  /* ---- render ---------------------------------------------------------- */
  function render() {
    grid.innerHTML = '';
    pages.forEach((p, i) => grid.appendChild(card(p, i)));
    const sel = pages.filter(p => p.sel).length;
    stat.innerHTML = pages.length ? `<b>${pages.length}</b> page${pages.length === 1 ? '' : 's'}${sel ? ` · ${sel} selected` : ''}` : '';
    saveAll.disabled = !pages.length; saveImg.disabled = !pages.length;
    saveSel.disabled = !sel; delSel.disabled = !sel; rotSel.disabled = !sel; dupSel.disabled = !sel;
    signBtn.disabled = !pages.length; reverseBtn.disabled = pages.length < 2;
    $('toolbar').hidden = !pages.length; clearAll.hidden = !pages.length;
    document.querySelector('.opts').style.display = pages.length ? '' : 'none';
    document.querySelector('.stamps').style.display = pages.length ? '' : 'none';
    selAll.textContent = (sel && sel === pages.length) ? 'Clear' : 'Select all';
  }

  function card(p, i) {
    const el = document.createElement('div');
    el.className = 'card' + (p.sel ? ' sel' : '') + (p.source === 'image' && look !== 'original' ? ' look-' + look : '');
    el.draggable = true; el.dataset.i = i; el.dataset.pid = p.id;
    const inner = p.thumb ? `<img src="${p.thumb}" alt="" draggable="false" />`
      : `<svg class="ph" viewBox="0 0 24 24" stroke-width="1.3"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>`;
    const badges = (p.crop ? '<span class="tag">crop</span>' : '') + (p.signed ? '<span class="tag">signed</span>' : '');
    el.innerHTML =
      `<div class="canvaswrap">${inner}</div>` +
      `<span class="num">${i + 1}</span>` +
      (badges ? `<span class="badges">${badges}</span>` : '') +
      `<div class="acts">
        <button data-act="rot" title="Rotate"><svg viewBox="0 0 24 24" stroke-width="1.7"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg></button>
        <button data-act="dup" title="Duplicate"><svg viewBox="0 0 24 24" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg></button>
        <button data-act="crop" title="Crop"><svg viewBox="0 0 24 24" stroke-width="1.7"><path d="M6 2v16h16M2 6h16v16"/></svg></button>
        <button data-act="del" title="Remove"><svg viewBox="0 0 24 24" stroke-width="1.7"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
      </div>` +
      `<span class="tick"><svg viewBox="0 0 24 24" stroke-width="2.4"><path d="M4 12l5 5L20 6"/></svg></span>` +
      `<span class="nm">${esc(p.source === 'pdf' ? srcs[p.srcId].name + ' · p' + (p.pageIndex + 1) : p.name)}</span>`;

    el.querySelector('[data-act="rot"]').addEventListener('click', e => { e.stopPropagation(); p.rot = (p.rot + 90) % 360; p.thumb = null; p.thumbState = undefined; render(); scheduleThumbs(); });
    el.querySelector('[data-act="dup"]').addEventListener('click', e => { e.stopPropagation(); duplicate([p]); });
    el.querySelector('[data-act="crop"]').addEventListener('click', e => { e.stopPropagation(); openCrop(p); });
    el.querySelector('[data-act="del"]').addEventListener('click', e => { e.stopPropagation(); pages = pages.filter(x => x !== p); render(); });
    el.querySelector('.tick').addEventListener('click', e => { e.stopPropagation(); p.sel = !p.sel; render(); });
    el.addEventListener('click', () => { p.sel = !p.sel; render(); });
    el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', i); el.classList.add('drag'); });
    el.addEventListener('dragend', () => el.classList.remove('drag'));
    el.addEventListener('dragover', e => e.preventDefault());
    el.addEventListener('drop', e => { e.preventDefault(); const f = +e.dataTransfer.getData('text/plain'); if (f === i) return; const [m] = pages.splice(f, 1); pages.splice(i, 0, m); render(); });
    return el;
  }

  /* ---- toolbar --------------------------------------------------------- */
  selAll.addEventListener('click', () => { const all = pages.every(p => p.sel); pages.forEach(p => p.sel = !all); render(); });
  delSel.addEventListener('click', () => { pages = pages.filter(p => !p.sel); render(); });
  rotSel.addEventListener('click', () => { pages.forEach(p => { if (p.sel) { p.rot = (p.rot + 90) % 360; p.thumb = null; p.thumbState = undefined; } }); render(); scheduleThumbs(); });
  dupSel.addEventListener('click', () => duplicate(pages.filter(p => p.sel)));
  reverseBtn.addEventListener('click', () => { pages.reverse(); render(); });
  clearAll.addEventListener('click', () => { pages = []; render(); });

  function duplicate(items) {
    if (!items.length) return;
    for (let i = pages.length - 1; i >= 0; i--) {
      if (items.includes(pages[i])) { const c = { ...pages[i], id: ++uid, sel: false }; pages.splice(i + 1, 0, c); }
    }
    render(); scheduleThumbs();
  }

  /* ---- signature modal ------------------------------------------------- */
  (function initSign() {
    const modal = $('signModal'), pad = $('sigPad'), ctx = pad.getContext('2d');
    let drawing = false, has = false, last = null;
    ctx.lineWidth = 2.6; ctx.lineJoin = ctx.lineCap = 'round'; ctx.strokeStyle = '#1a2e4f';
    const pos = e => { const r = pad.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: (t.clientX - r.left) * pad.width / r.width, y: (t.clientY - r.top) * pad.height / r.height }; };
    const start = e => { e.preventDefault(); drawing = true; has = true; last = pos(e); };
    const move = e => { if (!drawing) return; e.preventDefault(); const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; };
    const end = () => { drawing = false; };
    pad.addEventListener('pointerdown', start); pad.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
    $('sigClear').addEventListener('click', () => { ctx.clearRect(0, 0, pad.width, pad.height); has = false; });
    $('sigFile').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return; const bmp = await createImageBitmap(f);
      ctx.clearRect(0, 0, pad.width, pad.height); const s = Math.min(pad.width / bmp.width, pad.height / bmp.height);
      const w = bmp.width * s, h = bmp.height * s; ctx.drawImage(bmp, (pad.width - w) / 2, (pad.height - h) / 2, w, h); has = true; e.target.value = '';
    });
    signBtn.addEventListener('click', () => { if (!pages.length) return; $('sigNote').textContent = pages.some(p => p.sel) ? 'Applies to the selected pages.' : 'Applies to all pages (none selected).'; modal.hidden = false; });
    $('sigCancel').addEventListener('click', () => modal.hidden = true);
    $('sigApply').addEventListener('click', () => {
      if (!has) { modal.hidden = true; return; }
      sign.url = pad.toDataURL('image/png'); sign.pos = $('sigPos').value; sign.size = +$('sigSize').value;
      const targets = pages.some(p => p.sel) ? pages.filter(p => p.sel) : pages;
      targets.forEach(p => p.signed = true);
      modal.hidden = true; render();
    });
  })();

  /* ---- crop modal ------------------------------------------------------ */
  let cropTarget = null;
  (function initCrop() {
    const modal = $('cropModal'), stage = $('cropStage');
    let rectEl = null, sx = 0, sy = 0, dragging = false, media = null;
    function clearRect() { if (rectEl) rectEl.remove(); rectEl = null; }
    stage.addEventListener('pointerdown', e => {
      media = stage.querySelector('img,canvas'); if (!media) return;
      const r = media.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      dragging = true; clearRect(); sx = e.clientX; sy = e.clientY;
      rectEl = document.createElement('div'); rectEl.className = 'croprect'; stage.appendChild(rectEl);
      e.preventDefault();
    });
    stage.addEventListener('pointermove', e => {
      if (!dragging || !rectEl) return;
      const sr = stage.getBoundingClientRect();
      const x = Math.min(sx, e.clientX), y = Math.min(sy, e.clientY), w = Math.abs(e.clientX - sx), h = Math.abs(e.clientY - sy);
      rectEl.style.left = (x - sr.left) + 'px'; rectEl.style.top = (y - sr.top) + 'px'; rectEl.style.width = w + 'px'; rectEl.style.height = h + 'px';
    });
    window.addEventListener('pointerup', () => dragging = false);
    $('cropReset').addEventListener('click', () => { clearRect(); if (cropTarget) { cropTarget.crop = null; } });
    $('cropCancel').addEventListener('click', () => { clearRect(); modal.hidden = true; cropTarget = null; });
    $('cropApply').addEventListener('click', () => {
      if (rectEl && media) {
        const mr = media.getBoundingClientRect(), rr = rectEl.getBoundingClientRect();
        const x = (rr.left - mr.left) / mr.width, y = (rr.top - mr.top) / mr.height, w = rr.width / mr.width, h = rr.height / mr.height;
        if (w > 0.02 && h > 0.02) cropTarget.crop = { x: Math.max(0, x), y: Math.max(0, y), w: Math.min(1, w), h: Math.min(1, h) };
      }
      if (cropTarget) { cropTarget.thumb = null; cropTarget.thumbState = undefined; }
      clearRect(); modal.hidden = true; cropTarget = null; render(); scheduleThumbs();
    });
    window.__openCropStage = async (p) => {
      stage.innerHTML = ''; clearRect();
      if (p.source === 'image') {
        const bmp = await createImageBitmap(p.file, { imageOrientation: 'from-image' });
        const { cv } = drawImage(bmp, { cap: 1400 }); bmp.close?.(); stage.appendChild(cv);
      } else {
        const page = await srcs[p.srcId].doc.getPage(p.pageIndex + 1);
        const v0 = page.getViewport({ scale: 1, rotation: 0 });
        const vp = page.getViewport({ scale: Math.min(900 / v0.width, 1.5), rotation: 0 });
        const cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
        const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise; stage.appendChild(cv);
      }
    };
  })();
  function openCrop(p) { cropTarget = p; $('cropModal').hidden = false; window.__openCropStage(p).catch(() => {}); }

  /* ---- build pdf ------------------------------------------------------- */
  async function buildPdf(list) {
    const out = await PDFDocument.create();
    const font = await out.embedFont(StandardFonts.Helvetica);
    let sigImg = null;
    if (sign.url && list.some(p => p.signed)) sigImg = await out.embedPng(dataUrlBytes(sign.url));
    const comp = COMPRESS[compress], cache = new Map();
    for (let i = 0; i < list.length; i++) {
      const p = list[i]; let page;
      if (comp) {
        const cv = await pageCanvas(p, { pdfScale: comp.scale, imgCap: comp.cap });
        const jpg = await out.embedJpg(await blobBytes(await canvasBlob(cv, 'image/jpeg', comp.q)));
        page = out.addPage([cv.width, cv.height]); page.drawImage(jpg, { x: 0, y: 0, width: cv.width, height: cv.height });
      } else if (p.source === 'image') {
        const bmp = await createImageBitmap(p.file, { imageOrientation: 'from-image' });
        const { cv, w, h } = drawImage(bmp, { rot: p.rot, cap: 2200, doLook: true, crop: p.crop }); bmp.close?.();
        const jpg = await out.embedJpg(await blobBytes(await canvasBlob(cv, 'image/jpeg', 0.85)));
        page = placeImage(out, jpg, w, h);
      } else {
        let sd = cache.get(p.srcId); if (!sd) { sd = await PDFDocument.load(srcs[p.srcId].bytes, { ignoreEncryption: true }); cache.set(p.srcId, sd); }
        const [cp] = await out.copyPages(sd, [p.pageIndex]);
        if (p.crop) { const { width: W, height: H } = cp.getSize(); cp.setCropBox(p.crop.x * W, H - (p.crop.y + p.crop.h) * H, p.crop.w * W, p.crop.h * H); }
        if (p.rot) cp.setRotation(degrees((cp.getRotation().angle + p.rot) % 360));
        page = out.addPage(cp);
      }
      drawStamps(page, p, i, font, sigImg);
    }
    return out.save();
  }

  function placeImage(doc, img, w, h) {
    if (size === 'auto') { const pg = doc.addPage([w, h]); pg.drawImage(img, { x: 0, y: 0, width: w, height: h }); return pg; }
    const [pw, ph] = size === 'a4' ? A4 : LETTER, m = 24, pg = doc.addPage([pw, ph]);
    const s = Math.min((pw - m * 2) / w, (ph - m * 2) / h), iw = w * s, ih = h * s;
    pg.drawImage(img, { x: (pw - iw) / 2, y: (ph - ih) / 2, width: iw, height: ih }); return pg;
  }

  async function pageCanvas(p, opt) {
    const pdfScale = opt?.pdfScale || 2, imgCap = opt?.imgCap || 2400;
    if (p.source === 'pdf') {
      const page = await srcs[p.srcId].doc.getPage(p.pageIndex + 1);
      const vp = page.getViewport({ scale: pdfScale, rotation: 0 });
      let cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      if (p.crop) cv = cropCanvas(cv, p.crop);
      if (p.rot) cv = rotateCanvas(cv, p.rot);
      return cv;
    }
    const bmp = await createImageBitmap(p.file, { imageOrientation: 'from-image' });
    const { cv } = drawImage(bmp, { rot: p.rot, cap: imgCap, doLook: true, crop: p.crop }); bmp.close?.();
    return cv;
  }

  function drawStamps(page, p, idx, font, sigImg) {
    const { width: W, height: H } = page.getSize();
    const ink = rgb(0.1, 0.18, 0.31), gray = rgb(0.45, 0.48, 0.53);
    const center = (t, y, s, c) => page.drawText(t, { x: W / 2 - font.widthOfTextAtSize(t, s) / 2, y, size: s, font, color: c });
    const hd = (headerIn.value || '').trim(), ft = (footerIn.value || '').trim(), wm = (wmIn.value || '').trim();
    if (hd) center(hd, H - 22, 10, gray);
    if (ft) center(ft, 16, 10, gray);
    if (numbersChk.checked) { const t = String(idx + 1); page.drawText(t, { x: W - 16 - font.widthOfTextAtSize(t, 10), y: 16, size: 10, font, color: ink }); }
    const bt = batesFor(idx); if (bt) page.drawText(bt, { x: W - 16 - font.widthOfTextAtSize(bt, 9), y: H - 20, size: 9, font, color: gray });
    if (wm) { const s = Math.max(28, Math.min(W, H) / 8), tw = font.widthOfTextAtSize(wm, s); page.drawText(wm, { x: W / 2 - tw / 2 * 0.7071, y: H / 2 - tw / 2 * 0.7071, size: s, font, color: rgb(0.55, 0.58, 0.63), rotate: degrees(45), opacity: 0.22 }); }
    if (p.signed && sigImg) {
      const dim = sigImg.scale(1), aspect = dim.width / dim.height;
      let h = (sign.size / 100) * Math.min(W, H), w = h * aspect; if (w > W * 0.6) { w = W * 0.6; h = w / aspect; }
      const m = 24; const xy = { br: [W - m - w, m], bl: [m, m], tr: [W - m - w, H - m - h], tl: [m, H - m - h], center: [(W - w) / 2, (H - h) / 2] }[sign.pos];
      page.drawImage(sigImg, { x: xy[0], y: xy[1], width: w, height: h });
    }
  }
  function batesFor(idx) {
    const raw = (batesIn.value || '').trim(); if (!raw) return '';
    const m = raw.match(/^(.*?)(\d+)\s*$/);
    if (!m) return raw + (idx ? ' ' + (idx + 1) : '');
    const n = String(parseInt(m[2], 10) + idx).padStart(m[2].length, '0'); return m[1] + n;
  }

  /* ---- export ---------------------------------------------------------- */
  saveAll.addEventListener('click', () => exportPdf(pages));
  saveSel.addEventListener('click', () => exportPdf(pages.filter(p => p.sel)));
  async function exportPdf(list) {
    if (!list.length) return;
    busy(compress !== 'none' ? 'Compressing…' : 'Building PDF…');
    try { download(new Blob([await buildPdf(list)], { type: 'application/pdf' }), (cleanName() || 'crisp') + '.pdf'); render(); }
    catch (e) { fail('Could not build the PDF.'); console.error(e); }
  }

  saveImg.addEventListener('click', async () => {
    const list = pages.some(p => p.sel) ? pages.filter(p => p.sel) : pages;
    if (!list.length) return;
    busy('Rendering images…');
    try {
      const ext = imgfmt === 'png' ? 'png' : 'jpg', type = imgfmt === 'png' ? 'image/png' : 'image/jpeg';
      const files = [];
      for (let i = 0; i < list.length; i++) {
        const cv = await pageCanvas(list[i], {});
        const bytes = await blobBytes(await canvasBlob(cv, type, 0.9));
        files.push({ name: `${cleanName() || 'crisp'}-${String(i + 1).padStart(2, '0')}.${ext}`, data: bytes });
      }
      if (files.length === 1) download(new Blob([files[0].data], { type }), files[0].name);
      else download(new Blob([zipStore(files)], { type: 'application/zip' }), (cleanName() || 'crisp') + '-images.zip');
      render();
    } catch (e) { fail('Could not export images.'); console.error(e); }
  });

  /* ---- helpers --------------------------------------------------------- */
  function cleanName() { return (nameIn.value || '').trim().replace(/[^\w \-]+/g, '').replace(/\s+/g, '-').slice(0, 60); }
  function download(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
  function busy(m) { stat.innerHTML = esc(m); }
  function fail(m) { stat.innerHTML = `<b style="color:var(--warn)">${esc(m)}</b>`; setTimeout(render, 2600); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function dataUrlBytes(durl) { const b = atob(durl.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }

  const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipStore(files) {
    const enc = new TextEncoder(), chunks = [], central = []; let offset = 0;
    const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      const local = [0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(sz), ...u32(sz), ...u16(name.length), ...u16(0)];
      chunks.push(new Uint8Array(local), name, f.data);
      central.push(new Uint8Array([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(sz), ...u32(sz), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]));
      central.push(name);
      offset += local.length + name.length + sz;
    }
    let cenSize = 0; central.forEach(a => cenSize += a.length);
    const end = new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cenSize), ...u32(offset), ...u16(0)]);
    const all = [...chunks, ...central, end]; let total = 0; all.forEach(a => total += a.length);
    const o = new Uint8Array(total); let k = 0; for (const a of all) { o.set(a, k); k += a.length; } return o;
  }
})();
