// Editor de Arte e 3D — edição, produto/medida e projetos
let W = 2362, H = 1122, DPI = 300;
let state = { pk: 'caneca', sid: '325', color: null, custom: null };
let manualData = {};
const PROPS = ['data', 'selectable', 'evented'];
const $ = (id) => document.getElementById(id);
const curP = () => PRODUCTS[state.pk];
function curS() {
  const P = curP();
  if (state.sid === 'custom' && state.custom) {
    const { w, h } = state.custom;
    return { id: 'custom', label: P.digital ? `Personalizado · ${w} × ${h} px` : `Personalizado · ${fmtCm(w)} × ${fmtCm(h)} cm`, w, h, side: 'front', top: P.mock === 'hoodie' ? 11 : 9 };
  }
  return P.sizes.find((s) => s.id === state.sid) || P.sizes[0];
}
const sizeTag = () => (curP().digital ? `${curS().w}x${curS().h}px` : `${fmtCm(curS().w)}x${fmtCm(curS().h)}cm`);
const sizeName = () => (curP().digital ? `${curS().w} × ${curS().h} px` : `${fmtCm(curS().w)} × ${fmtCm(curS().h)} cm`);
// tamanho padrão de enfeites/textos: na roupa ~8 cm; nos outros, proporcional à arte
const unit = () => (curP().molde && MOLDES[curP().model] ? ((W / MOLDES[curP().model].sheet.w) * 8) / 150 : Math.min(W, H) / 1122);   // pra enfeites/textos nascerem num tamanho bom em qualquer produto

fabric.Object.prototype.set({
  transparentCorners: false, cornerColor: '#ffffff', cornerStrokeColor: '#c8312f',
  borderColor: '#c8312f', cornerSize: 11, cornerStyle: 'circle', padding: 4,
});
const canvas = new fabric.Canvas('c', {
  preserveObjectStacking: true, backgroundColor: '#ffffff',
  selectionColor: 'rgba(200,49,47,.08)', selectionBorderColor: '#c8312f',
});

/* ---------- tamanho na tela ---------- */
function fit() {
  const stage = $('stage');
  const g = document.body.classList.contains('garment');
  const maxW = stage.clientWidth - (g ? 56 : 72), maxH = stage.clientHeight - (g ? 56 : 90);
  let dw = Math.min(maxW, (maxH * W) / H) * (g && typeof Garment !== 'undefined' ? Garment.zoom : 1);
  dw = Math.max(120, Math.floor(dw));
  const dh = Math.round((dw * H) / W);
  canvas.setDimensions({ width: dw, height: dh });
  canvas.setZoom(dw / W);
  $('wrap').style.width = dw + 'px';
  $('wrap').style.height = dh + 'px';
  canvas.renderAll();
}
window.addEventListener('resize', () => { fit(); Mock.resize(); });

/* ---------- histórico ---------- */
let hist = [], hi = -1, muted = false;
function snapshot() { return JSON.stringify(canvas.toJSON(PROPS)); }
function saveHistory() {
  if (muted) return;
  const s = snapshot();
  if (hist[hi] === s) return;
  hist = hist.slice(0, hi + 1);
  hist.push(s);
  if (hist.length > 40) hist.shift();
  hi = hist.length - 1;
  updateUndo(); queueMug(); markDirty();
}
function resetHistory() { hist = []; hi = -1; const m = muted; muted = false; saveHistory(); muted = m; }
function restore(i) {
  if (i < 0 || i >= hist.length) return;
  muted = true;
  canvas.loadFromJSON(hist[i], () => {
    findBase(); muted = false; hi = i;
    canvas.requestRenderAll(); updateUndo(); queueMug(); refreshProps(); markDirty();
  });
}
function updateUndo() { $('undo').disabled = hi <= 0; $('redo').disabled = hi >= hist.length - 1; }
$('undo').onclick = () => restore(hi - 1);
$('redo').onclick = () => restore(hi + 1);
canvas.on('object:added', saveHistory);
canvas.on('object:removed', saveHistory);
canvas.on('object:modified', saveHistory);
['object:moving', 'object:scaling', 'object:rotating', 'text:changed'].forEach((e) => canvas.on(e, queueMug));

/* ---------- produto e medida ---------- */
const selP = $('pProduct');
Object.entries(PRODUCTS).forEach(([k, P]) => selP.add(new Option(P.name, k)));

function fillProductUI() {
  const P = curP();
  selP.value = state.pk;
  const sel = $('pSize'); sel.innerHTML = '';
  P.sizes.forEach((s) => sel.add(new Option(s.label, s.id)));
  if (!P.molde) sel.add(new Option(state.custom && state.sid === 'custom' ? curS().label : 'Medida personalizada…', 'custom'));
  sel.value = state.sid;
  $('customBox').hidden = state.sid !== 'custom';
  if (state.sid === 'custom') { $('customW').value = curS().w; $('customH').value = curS().h; }
  const box = $('pColors'); box.innerHTML = '';
  $('colorBox').hidden = !P.colors;
  if (P.colors) {
    if (!state.color) state.color = P.colors[0][1];
    $('colorLabel').textContent = P.colorLabel || 'Cor';
    P.colors.forEach(([name, hex]) => {
      const b = document.createElement('button');
      b.title = name; b.style.background = hex;
      b.className = hex === state.color ? 'on' : '';
      b.onclick = () => {
        state.color = hex; fillProductUI();
        if (curP().molde) { pintarPecas(hex); saveHistory(); return; }
        Mock.set(curP(), curS(), state.color, W, H); queueMug(true); markDirty();
      };
      box.appendChild(b);
    });
  }
}
selP.onchange = () => {
  state.pk = selP.value; state.sid = curP().sizes[0].id; state.custom = null;
  state.color = curP().colors ? curP().colors[0][1] : null;
  fillProductUI(); applyProduct(true);
};
$('pSize').onchange = (e) => {
  if (e.target.value === 'custom') {
    const S = curS();
    $('customBox').hidden = false; $('customW').value = S.w; $('customH').value = S.h; $('customW').focus();
    return;
  }
  state.sid = e.target.value; state.custom = null; fillProductUI(); applyProduct(true);
};
function applyCustom() {
  const w = parseFloat(String($('customW').value).replace(',', '.'));
  const h = parseFloat(String($('customH').value).replace(',', '.'));
  const [mn, mx] = curP().digital ? [100, 4000] : [1, 200];
  if (!(w >= mn && w <= mx && h >= mn && h <= mx)) return;
  state.custom = curP().digital ? { w: Math.round(w), h: Math.round(h) } : { w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 }; state.sid = 'custom';
  fillProductUI(); applyProduct(true);
}
['customW', 'customH'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCustom(); }));
$('customH').addEventListener('change', applyCustom);

function applyProduct(rescale) {
  const P = curP(), S = curS();
  const oldW = W, oldH = H;
  const maxcm = Math.max(S.w, S.h);
  if (P.digital) { DPI = 72; W = Math.round(S.w); H = Math.round(S.h); }
  else { DPI = maxcm <= 60 ? 300 : maxcm <= 90 ? 200 : 150; W = Math.round((S.w / 2.54) * DPI); H = Math.round((S.h / 2.54) * DPI); }
  canvas.backgroundColor = P.transparent ? null : '#ffffff';
  $('wrap').classList.toggle('transparent', !!P.transparent);
  if (rescale && (oldW !== W || oldH !== H)) {
    const kx = W / oldW, ky = H / oldH, k = Math.min(kx, ky);
    muted = true;
    canvas.getObjects().forEach((o) => {
      if (o === base) return coverBase(o);
      if (o.data && (o.data.kind === 'fundo' || o.data.kind === 'peca')) return;
      const c = o.getCenterPoint();
      o.set({ scaleX: o.scaleX * k, scaleY: o.scaleY * k });
      o.setPositionByOrigin(new fabric.Point(c.x * kx, c.y * ky), 'center', 'center');
      o.setCoords();
    });
    muted = false;
  }
  refitFundo();
  ensurePecas();
  fit(); updateGuides(); updateInfo();
  if (typeof Garment !== 'undefined') Garment.onProduct();
  Mock.set(P, S, state.color, W, H);
  queueMug(true);
  if (rescale) { resetHistory(); markDirty(); }
}
/* ---------- molde (peças de roupa) ---------- */
const pecaObjs = () => canvas.getObjects().filter((o) => o.data && o.data.kind === 'peca');
const bottomCount = () => pecaObjs().length + (canvas.getObjects().some((o) => o.data && o.data.kind === 'fundo') ? 1 : 0);
function moldeAtual() { const P = curP(); return P.molde ? MOLDES[P.model] : null; }
function ensurePecas() {
  const m = moldeAtual();
  muted = true;
  if (!m) { pecaObjs().forEach((o) => canvas.remove(o)); muted = false; return; }
  const k = W / m.sheet.w;
  // peças de outra roupa (ou de outro tamanho de folha) saem: o molde é trocado inteiro
  pecaObjs().filter((o) => o.data.model !== curP().model || Math.abs((o.data.k || k) - k) > 1e-6).forEach((o) => canvas.remove(o));
  const have = new Set(pecaObjs().map((o) => o.data.peca));
  m.pecas.forEach((p, i) => {
    if (have.has(p.id)) return;
    const cor = state.color || '#f5f5f2';
    const poly = new fabric.Polygon(p.outline.map(([x, y]) => ({ x: x * k, y: y * k })), {
      fill: cor, stroke: cor, strokeWidth: 0.5 * k, strokeLineJoin: 'round', selectable: false, evented: false, objectCaching: false,
      data: { kind: 'peca', peca: p.id, model: curP().model, k },
    });
    canvas.insertAt(poly, i);
  });
  muted = false;
  fillPecasUI();
}
function pintarPecas(color) { pecaObjs().forEach((o) => o.set({ fill: color, stroke: color })); fillPecasUI(); canvas.requestRenderAll(); queueMug(); }
function fillPecasUI() {
  const m = moldeAtual(), box = $('pecasBox');
  box.hidden = !m; box.innerHTML = '';
  if (!m) return;
  box.insertAdjacentHTML('beforeend', '<p class="tiny">Cor de cada peça · ✓ = recebe a estampa dos Fundos</p>');
  m.pecas.forEach((p) => {
    const o = pecaObjs().find((x) => x.data.peca === p.id);
    const l = document.createElement('label');
    l.className = 'pecarow';
    const cor = o && typeof o.fill === 'string' ? o.fill : (o && typeof o.stroke === 'string' ? o.stroke : state.color);
    l.innerHTML = `<input type="checkbox" ${alvoOff.has(p.id) ? '' : 'checked'} title="Recebe estampa"><span>${p.label}</span><input type="color" value="${toHex(cor)}">`;
    const ck = l.querySelector('input[type=checkbox]');
    ck.onchange = () => { if (ck.checked) alvoOff.delete(p.id); else alvoOff.add(p.id); };
    const inp = l.querySelector('input[type=color]');
    inp.oninput = () => { const ob = pecaObjs().find((x) => x.data.peca === p.id); if (ob) { ob.set({ fill: inp.value, stroke: inp.value }); canvas.requestRenderAll(); queueMug(); } };
    inp.onchange = () => saveHistory();
    box.appendChild(l);
  });
}
function drawMoldeGuides() {
  const m = moldeAtual(), svg = $('moldeSvg');
  svg.style.display = m ? 'block' : 'none';
  if (!m) return;
  svg.setAttribute('viewBox', `0 0 ${m.sheet.w} ${m.sheet.h}`);
  const g = document.body.classList.contains('garment');
  svg.innerHTML = m.pecas.map((p) => {
    const xs = p.outline.map((q) => q[0]), ys = p.outline.map((q) => q[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, top = Math.min(...ys);
    const fs = g ? 1.55 : 2.2;
    const t1 = `<text x="${cx}" y="${top - fs * 1.15}" style="font-size:${fs}px;font-weight:600">${esc(p.label)}</text>`;
    const t2 = `<text x="${cx}" y="${top - 0.35}" style="font-size:${fs * 0.8}px;font-weight:400;opacity:.7">${fmtCm(p.w)} × ${fmtCm(p.h)} cm · corte 1</text>`;
    return `<polygon points="${p.outline.map((q) => q.join(',')).join(' ')}"></polygon>` + t1 + t2;
  }).join('');
}
async function loadMoldes() {
  await Promise.all(Object.values(PRODUCTS).filter((p) => p.molde).map(async (p) => {
    try {
      MOLDES[p.model] = await (await fetch(`modelos/${p.model}-molde.json`, { cache: 'no-store' })).json();
      p.sizes.forEach((s) => { s.w = MOLDES[p.model].sheet.w; s.h = MOLDES[p.model].sheet.h; });
    } catch (e) { console.error('molde', p.model, e); }
  }));
}

function updateGuides() {
  const P = curP(), S = curS();
  const px = ((P.safe / 10) / S.w) * 100, py = ((P.safe / 10) / S.h) * 100;
  Object.assign($('safeBox').style, { left: px + '%', right: px + '%', top: py + '%', bottom: py + '%', display: P.safe ? 'block' : 'none' });
  $('midLine').style.display = P.handle ? 'block' : 'none';
  drawMoldeGuides();
  document.querySelectorAll('.guides .tag').forEach((t) => { t.style.display = P.handle ? 'block' : 'none'; });
}
function updateInfo() {
  const P = curP(), S = curS();
  $('sizeInfo').textContent = P.digital ? `${P.name} · ${S.w} × ${S.h} px` : `${P.name} · ${fmtCm(S.w)} × ${fmtCm(S.h)} cm · sai em ${W} × ${H} px (${DPI} dpi)`;
  $('export').textContent = P.digital ? 'Baixar PNG' : 'Baixar estampa + manual';
  $('customUnit').textContent = (P.digital ? 'em pixels' : 'em centímetros') + ' · aperta Enter pra aplicar';
  $('previewTitle').textContent = P.na.charAt(0).toUpperCase() + P.na.slice(1);
}

/* ---------- arte de fundo ---------- */
let base = null;
function findBase() {
  base = canvas.getObjects().find((o) => o.data && o.data.kind === 'base') || null;
  if (base) applyLock(base, $('lockBase').checked);
}
function applyLock(o, locked) { o.set({ selectable: !locked, evented: !locked }); }
function coverBase(img) {
  const s = Math.max(W / img.width, H / img.height);
  img.set({ originX: 'left', originY: 'top', scaleX: s, scaleY: s, angle: 0, left: (W - img.width * s) / 2, top: (H - img.height * s) / 2 });
  img.setCoords();
}
function setBase(url) {
  fabric.Image.fromURL(url, (img) => {
    img.set({ data: { kind: 'base' } });
    coverBase(img);
    applyLock(img, $('lockBase').checked);
    muted = true;
    if (base) canvas.remove(base);
    canvas.insertAt(img, bottomCount());
    base = img;
    muted = false;
    canvas.requestRenderAll(); saveHistory();
  });
}
$('lockBase').onchange = (e) => {
  if (!base) return;
  applyLock(base, e.target.checked);
  if (e.target.checked && canvas.getActiveObject() === base) canvas.discardActiveObject();
  canvas.requestRenderAll();
};
$('showGuides').onchange = (e) => $('guides').classList.toggle('off', !e.target.checked);
$('swapBase').onchange = (e) => { const f = e.target.files[0]; if (f) readFile(f).then(setBase); e.target.value = ''; };
$('removeBase').onclick = () => { if (!base) return; muted = true; canvas.remove(base); base = null; muted = false; canvas.requestRenderAll(); saveHistory(); };

/* ---------- enfeites, emojis, texto, fotos ---------- */
function chips(box, cats, current, onPick) {
  box.innerHTML = '';
  cats.forEach((c) => {
    const b = document.createElement('button');
    b.textContent = c; b.className = c === current ? 'on' : '';
    b.onclick = () => onPick(c);
    box.appendChild(b);
  });
}
function showStickers(cat) {
  chips($('stickerCats'), STICKER_CATS, cat, showStickers);
  const box = $('stickers'); box.innerHTML = '';
  Object.entries(STICKERS).filter(([, s]) => s.cat === cat).forEach(([key, s]) => {
    const b = document.createElement('button');
    b.title = s.label; b.innerHTML = s.svg(s.color);
    b.onclick = () => addSticker(key);
    box.appendChild(b);
  });
}
showStickers('Natal');
function nextPos() {
  const j = () => (Math.random() - 0.5) * 160 * unit();
  const m = moldeAtual();
  if (m) {
    const p = m.pecas[0], k = W / m.sheet.w;
    const cx = p.outline.reduce((a, q) => a + q[0], 0) / p.outline.length, cy = p.outline.reduce((a, q) => a + q[1], 0) / p.outline.length;
    return { left: cx * k + j(), top: (cy - 8) * k + j() };
  }
  return { left: W / 2 + j(), top: H / 2 + j() };
}
function stickerObject(key, color, cb) {
  const s = STICKERS[key];
  fabric.loadSVGFromString(s.svg(color || s.color), (objs, opts) => {
    const g = fabric.util.groupSVGElements(objs, opts);
    g.set({ data: { kind: 'svg', key, color: color || s.color || null } });
    cb(g);
  });
}
function addSticker(key) {
  stickerObject(key, null, (g) => {
    const k = ((STICKERS[key].size || 150) * unit()) / Math.max(g.width, g.height);
    g.set({ originX: 'center', originY: 'center', scaleX: k, scaleY: k, ...nextPos() });
    canvas.add(g); canvas.setActiveObject(g); canvas.requestRenderAll();
  });
}
function showEmojis(cat) {
  chips($('emojiCats'), Object.keys(EMOJI_CATS), cat, showEmojis);
  const box = $('emojis'); box.innerHTML = '';
  EMOJI_CATS[cat].forEach((e) => {
    const b = document.createElement('button');
    b.textContent = e;
    b.onclick = () => {
      const t = new fabric.Text(e, { fontSize: 150 * unit(), fontFamily: '"Apple Color Emoji","Segoe UI Emoji",sans-serif', originX: 'center', originY: 'center', ...nextPos(), data: { kind: 'emoji' } });
      canvas.add(t); canvas.setActiveObject(t); canvas.requestRenderAll();
    };
    box.appendChild(b);
  });
}
showEmojis('Rostos');

/* ---------- fundos prontos ---------- */
let fundoId = null;
function fundoObj() { return canvas.getObjects().find((o) => o.data && o.data.kind === 'fundo') || null; }
const alvoOff = new Set(); // peças que NÃO recebem estampa de fundo
function setFundo(id, quiet) {
  const def = FUNDOS.find((f) => f.id === id);
  if (moldeAtual()) {
    pecaObjs().filter((o) => !alvoOff.has(o.data.peca)).forEach((o) => {
      if (!def) { o.set({ fill: state.color, stroke: state.color }); return; }
      const fill = def.type === 'cor' ? def.c
        : def.type === 'grad' ? new fabric.Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: 0, y1: 0, x2: 1, y2: 1 }, colorStops: [{ offset: 0, color: def.stops[0] }, { offset: 1, color: def.stops[1] }] })
        : new fabric.Pattern({ source: fundoTile(def, 90 * unit()), repeat: 'repeat' });
      o.set({ fill, stroke: def.type === 'cor' ? def.c : def.type === 'grad' ? def.stops[0] : def.bg });
    });
    canvas.requestRenderAll(); queueMug(); fillPecasUI();
    if (!quiet) saveHistory();
    return;
  }
  const old = fundoObj();
  muted = true;
  if (old) canvas.remove(old);
  fundoId = null;
  if (def) {
    const r = new fabric.Rect({
      left: 0, top: 0, originX: 'left', originY: 'top', width: W, height: H, strokeWidth: 0,
      fill: fundoFill(def, W, H, 90 * unit()), selectable: false, evented: false, data: { kind: 'fundo', id },
    });
    canvas.insertAt(r, pecaObjs().length);
    fundoId = id;
  }
  muted = false;
  markFundos();
  canvas.requestRenderAll();
  if (!quiet) saveHistory();
}
function refitFundo() { const f = fundoObj(); if (f) setFundo(f.data.id, true); }
function markFundos() { document.querySelectorAll('#fundos button').forEach((b) => b.classList.toggle('on', b.dataset.id === fundoId)); }
FUNDOS.forEach((f) => {
  const b = document.createElement('button');
  b.title = f.label; b.dataset.id = f.id; b.style.background = fundoThumbCss(f);
  b.onclick = () => setFundo(f.id);
  $('fundos').appendChild(b);
});
$('noFundo').onclick = () => setFundo(null);
$('addText').onclick = async () => {
  const font = 'Pacifico';
  try { await document.fonts.load(`140px "${font}"`); } catch (e) {}
  const t = new fabric.IText('Boas Festas', {
    fontFamily: font, fontSize: 140 * unit(), fill: '#d63333', originX: 'center', originY: 'center', textAlign: 'center',
    ...nextPos(), data: { kind: 'text' },
  });
  canvas.add(t); canvas.setActiveObject(t); canvas.requestRenderAll();
};
function readFile(f) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
}
function addImageUrl(url) {
  fabric.Image.fromURL(url, (img) => {
    if (!img || !img.width) return;
    const k = Math.min((420 * unit()) / img.height, (W * 0.8) / img.width, (H * 0.8) / img.height);
    img.set({ originX: 'center', originY: 'center', scaleX: k, scaleY: k, ...nextPos(), data: { kind: 'photo' } });
    canvas.add(img); canvas.setActiveObject(img); canvas.requestRenderAll();
  });
}
async function addImageFiles(files) {
  for (const f of files) if (f && f.type.startsWith('image/')) addImageUrl(await readFile(f));
}
$('addPhoto').onchange = async (e) => { await addImageFiles([...e.target.files]); e.target.value = ''; };
document.addEventListener('paste', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  const o = canvas.getActiveObject(); if (o && o.isEditing) return;
  const files = [...(e.clipboardData ? e.clipboardData.items : [])].filter((i) => i.type.startsWith('image/')).map((i) => i.getAsFile());
  if (files.length) { e.preventDefault(); addImageFiles(files); }
});
const stageEl = $('stage');
stageEl.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); $('wrap').classList.add('dropping'); } });
stageEl.addEventListener('dragleave', (e) => { if (e.target === stageEl) $('wrap').classList.remove('dropping'); });
stageEl.addEventListener('drop', (e) => { e.preventDefault(); $('wrap').classList.remove('dropping'); addImageFiles([...e.dataTransfer.files]); });
function makeOval(img) {
  const idx = canvas.getObjects().indexOf(img);
  const c = img.getCenterPoint();
  const { scaleX, scaleY, angle, flipX, opacity } = img;
  const w = img.width, h = img.height, rx = (w / 2) * 0.92, ry = (h / 2) * 0.96, pad = Math.max(w, h) * 0.035;
  img.set({ clipPath: new fabric.Ellipse({ rx, ry, originX: 'center', originY: 'center' }), left: 0, top: 0, originX: 'center', originY: 'center', scaleX: 1, scaleY: 1, angle: 0, flipX: false, opacity: 1 });
  const border = new fabric.Ellipse({
    rx: rx + pad, ry: ry + pad, left: 0, top: 0, originX: 'center', originY: 'center', fill: '#ffffff',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,.18)', blur: pad, offsetY: pad * 0.25 }),
  });
  muted = true;
  canvas.remove(img);
  const g = new fabric.Group([border, img], { data: { kind: 'sticker' } });
  g.set({ originX: 'center', originY: 'center' });
  g.set({ left: c.x, top: c.y, scaleX, scaleY, angle, flipX, opacity });
  canvas.insertAt(g, idx);
  muted = false;
  canvas.setActiveObject(g); canvas.requestRenderAll(); saveHistory();
}

/* ---------- painel do item ---------- */
const active = () => canvas.getActiveObject();
function refreshProps() {
  const o = active();
  $('propsEmpty').hidden = !!o; $('propsBody').hidden = !o;
  if (!o) return;
  const isText = o.type === 'i-text';
  const recolor = isText || (o.data && o.data.kind === 'svg' && o.data.color);
  $('rowColor').hidden = !recolor; $('rowFont').hidden = !isText; $('rowBold').hidden = !isText;
  $('bOval').hidden = o.type !== 'image' || (o.data && o.data.kind === 'base');
  $('bAsBase').hidden = o.type !== 'image' || (o.data && o.data.kind === 'base');
  if (recolor) $('pColor').value = toHex(isText ? o.fill : o.data.color);
  if (isText) { $('pFont').value = o.fontFamily; $('pBold').checked = o.fontWeight === 'bold' || o.fontWeight === 700; }
  $('pOpacity').value = Math.round((o.opacity ?? 1) * 100);
}
function toHex(c) { if (!c || typeof c !== 'string') return '#ffffff'; if (c[0] === '#' && c.length === 7) return c; return '#' + new fabric.Color(c).toHex(); }
canvas.on('selection:created', refreshProps);
canvas.on('selection:updated', refreshProps);
canvas.on('selection:cleared', refreshProps);
$('pColor').oninput = (e) => { const o = active(); if (o && o.type === 'i-text') { o.set('fill', e.target.value); canvas.requestRenderAll(); queueMug(); } };
$('pColor').onchange = (e) => {
  const o = active(); if (!o) return;
  if (o.type === 'i-text') return saveHistory();
  if (o.data && o.data.kind === 'svg') recolorSticker(o, e.target.value);
};
function recolorSticker(o, color) {
  const idx = canvas.getObjects().indexOf(o);
  stickerObject(o.data.key, color, (g) => {
    const k = (o.width * o.scaleX) / g.width, c = o.getCenterPoint();
    g.set({ originX: 'center', originY: 'center', left: c.x, top: c.y, scaleX: k, scaleY: k * (o.scaleY / o.scaleX), angle: o.angle, flipX: o.flipX, flipY: o.flipY, opacity: o.opacity });
    muted = true; canvas.remove(o); canvas.insertAt(g, idx); muted = false;
    canvas.setActiveObject(g); canvas.requestRenderAll(); saveHistory();
  });
}
$('pFont').onchange = async (e) => {
  const o = active(); if (!o || o.type !== 'i-text') return;
  try { await document.fonts.load(`${o.fontWeight === 'bold' ? 'bold ' : ''}140px "${e.target.value}"`); } catch (err) {}
  o.set('fontFamily', e.target.value); o.initDimensions && o.initDimensions(); o.setCoords();
  canvas.requestRenderAll(); saveHistory();
};
$('pBold').onchange = async (e) => {
  const o = active(); if (!o || o.type !== 'i-text') return;
  try { await document.fonts.load(`bold 140px "${o.fontFamily}"`); } catch (err) {}
  o.set('fontWeight', e.target.checked ? 'bold' : 'normal'); o.initDimensions && o.initDimensions(); o.setCoords();
  canvas.requestRenderAll(); saveHistory();
};
$('pOpacity').oninput = (e) => { const o = active(); if (!o) return; o.set('opacity', e.target.value / 100); canvas.requestRenderAll(); queueMug(); };
$('pOpacity').onchange = saveHistory;

function duplicate() {
  const objs = canvas.getActiveObjects(); if (!objs.length) return;
  canvas.discardActiveObject();
  const clones = []; let left = objs.length;
  objs.forEach((o) => o.clone((c) => {
    c.set({ left: c.left + 40 * unit(), top: c.top + 40 * unit(), data: { ...(o.data || {}) } });
    if (c.data.kind === 'base') { c.data.kind = 'photo'; c.set({ selectable: true, evented: true }); }
    canvas.add(c); clones.push(c);
    if (--left === 0) { canvas.setActiveObject(clones.length > 1 ? new fabric.ActiveSelection(clones, { canvas }) : clones[0]); canvas.requestRenderAll(); }
  }, PROPS));
}
function removeActive() {
  const objs = canvas.getActiveObjects(); if (!objs.length) return;
  canvas.discardActiveObject();
  muted = true; objs.forEach((o) => { canvas.remove(o); if (o === base) base = null; }); muted = false;
  canvas.requestRenderAll(); saveHistory();
}
document.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
  const o = active(); if (!o) return;
  const act = b.dataset.act;
  if (act === 'dup') return duplicate();
  if (act === 'del') return removeActive();
  if (act === 'oval') return makeOval(o);
  if (act === 'asbase') { const src = o.getSrc(); muted = true; canvas.remove(o); muted = false; canvas.discardActiveObject(); return setBase(src); }
  if (act === 'flip') o.set('flipX', !o.flipX);
  if (act === 'front') canvas.bringForward(o);
  if (act === 'back' && canvas.getObjects().indexOf(o) > (base ? 1 : 0) + bottomCount()) canvas.sendBackwards(o);
  canvas.requestRenderAll(); saveHistory();
});

/* ---------- teclado ---------- */
document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(true); return; }
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  if (!$('manualModal').hidden || !$('projModal').hidden) return;
  const o = active();
  if (o && o.isEditing) return;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? restore(hi + 1) : restore(hi - 1); return; }
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); return; }
  if (!o) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeActive(); return; }
  const step = (e.shiftKey ? 20 : 3) * unit();
  const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (mv) {
    e.preventDefault();
    o.set({ left: o.left + mv[0], top: o.top + mv[1] }); o.setCoords();
    canvas.requestRenderAll(); queueMug();
    clearTimeout(o.__t); o.__t = setTimeout(saveHistory, 300);
  }
});

/* ---------- exportar ---------- */
function exportCanvas() { return canvas.toCanvasElement(W / canvas.getWidth()); }
function download(blobOrUrl, name) {
  const a = document.createElement('a');
  a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---------- prévia 3D ---------- */
let mugTimer = 0, mugQueued = false;
function queueMug(now) {
  const run = () => { mugQueued = false; Mock.update(canvas.toCanvasElement(2048 / Math.max(canvas.getWidth(), canvas.getHeight()))); };
  if (now === true) { clearTimeout(mugTimer); return run(); }
  if (mugQueued) return;
  mugQueued = true; mugTimer = setTimeout(run, 70);
}

/* ---------- projetos (pasta projetos/ no servidor) ---------- */
let projectId = null, dirty = false, saving = false, autosaveT = 0, loadingProject = false;
function setStatus(txt, cls = '') { const s = $('saveStatus'); s.textContent = txt; s.className = cls; }
function markDirty() {
  if (loadingProject) return;
  dirty = true;
  if (projectId) { setStatus('Salvando…'); clearTimeout(autosaveT); autosaveT = setTimeout(() => saveProject(false), 2500); }
  else setStatus('Não salvo');
}
$('projName').addEventListener('input', markDirty);
async function api(path, body, raw) {
  const r = await fetch(path, { method: 'POST', headers: raw ? {} : { 'Content-Type': 'application/json' }, body: raw ? body : JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || 'Falha no servidor');
  return j;
}
function projectData() {
  const S = curS();
  return {
    versao: 2, nome: $('projName').value.trim(),
    produto: state.pk, produtoNome: curP().name, tamanho: state.sid, tamanhoNome: sizeName(),
    custom: state.custom, cor: state.color, manual: manualData, canvas: JSON.parse(snapshot()),
    look: typeof Garment !== 'undefined' ? Garment.getLook() : null,
  };
}
async function ensureProject() {
  if (projectId) return true;
  const nome = $('projName').value.trim();
  if (!nome) { $('projName').focus(); setStatus('Dá um nome pro projeto'); return false; }
  projectId = (await Store.novo(nome)).id;
  try { localStorage.setItem('editor-ultimo-projeto', projectId); } catch (e) {}
  return true;
}
async function saveProject(full) {
  if (saving) { clearTimeout(autosaveT); autosaveT = setTimeout(() => saveProject(full), 800); return; }
  saving = true;
  try {
    if (!(await ensureProject())) return false;
    const data = projectData();
    data.capa = Mock.shots(620, 500, 'cover')[0].c.toDataURL('image/png');
    if (full) data.estampa = exportCanvas().toDataURL('image/png');
    await Store.salvar(projectId, data);
    dirty = false;
    setStatus('Salvo ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 'ok');
    return true;
  } catch (e) {
    console.error(e); setStatus('Erro ao salvar'); return false;
  } finally { saving = false; }
}
async function saveFileToProject(nome, blob) {
  if (!projectId) return false;
  await Store.arquivo(projectId, nome, blob);
  return true;
}
$('saveBtn').onclick = () => saveProject(true);

$('clienteName').addEventListener('input', (e) => { manualData = { ...manualData, cliente: e.target.value.trim() }; markDirty(); });
function newProject() {
  projectId = null; $('projName').value = ''; manualData = {}; $('clienteName').value = ''; fundoId = null; markFundos();
  loadingProject = true;
  muted = true; canvas.clear(); base = null; muted = false;
  applyProduct(false);
  resetHistory();
  loadingProject = false; dirty = false; setStatus('Novo projeto');
  try { localStorage.removeItem('editor-ultimo-projeto'); } catch (e) {}
}
async function openProject(id) {
  const p = await Store.load(id);
  loadingProject = true;
  projectId = id; $('projName').value = p.nome || id;
  state = { pk: PRODUCTS[p.produto] ? p.produto : 'caneca', sid: p.tamanho, color: p.cor || null, custom: p.custom || null };
  manualData = p.manual || {};
  $('clienteName').value = manualData.cliente || '';
  if (p.look && typeof Garment !== 'undefined') Garment.setLook(p.look);
  fillProductUI(); applyProduct(false);
  await new Promise((res) => {
    muted = true;
    canvas.loadFromJSON(p.canvas, () => { findBase(); const f = fundoObj(); fundoId = f ? f.data.id : null; markFundos(); muted = false; ensurePecas(); canvas.requestRenderAll(); res(); });
  });
  resetHistory(); queueMug(true); refreshProps();
  loadingProject = false; dirty = false; clearTimeout(autosaveT);
  setStatus('Salvo', 'ok');
  try { localStorage.setItem('editor-ultimo-projeto', id); } catch (e) {}
}

/* aba Meus projetos */
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
async function openProjects() {
  if (dirty && projectId) await saveProject(false);
  $('projModal').hidden = false;
  const grid = $('pGrid');
  grid.innerHTML = '<p class="pempty">Carregando…</p>';
  let list = [];
  try { list = await Store.list(); } catch (e) { console.error(e); grid.innerHTML = '<p class="pempty">Não consegui abrir os projetos salvos.</p>'; return; }
  grid.innerHTML = '';
  const key = (p) => (p.cliente || p.nome || '').trim().toLowerCase();
  const first = {};
  list.forEach((p) => { const k = key(p), c = p.criado || p.atualizado || 0; if (!(k in first) || c < first[k]) first[k] = c; });
  const order = Object.keys(first).sort((a, b) => first[a] - first[b]);
  const num = Object.fromEntries(order.map((k, i) => [k, i + 1]));
  $('pCount').textContent = list.length ? `${order.length} ${order.length === 1 ? 'cliente' : 'clientes'} · ${list.length} ${list.length === 1 ? 'projeto' : 'projetos'}` : '';
  const nc = document.createElement('div'); nc.className = 'card newcard'; nc.textContent = '+ Novo projeto';
  nc.onclick = () => { newProject(); $('projModal').hidden = true; };
  grid.appendChild(nc);
  list.forEach((p) => {
    const card = document.createElement('div'); card.className = 'card';
    const data = p.atualizado ? new Date(p.atualizado).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    card.innerHTML = `
      <div class="thumb">${p.capa ? `<img src="${esc(p.capa)}" alt="">` : '<span>sem capa</span>'}</div>
      <div class="info"><span class="cli">Cliente #${num[key(p)]}${p.cliente ? ' · ' + esc(p.cliente) : ''}</span><b>${esc(p.nome)}</b><small>${esc(p.produto)} · ${esc(p.tamanho)}</small><small>${esc(data)}</small></div>
      <div class="acts">
        ${p.estampaUrl ? `<a href="${esc(p.estampaUrl)}" download="estampa-${esc(p.id)}.png">Estampa</a>` : ''}
        ${p.manualUrl ? `<a href="${esc(p.manualUrl)}" download="manual-${esc(p.id)}.pdf">Manual</a>` : ''}
        <button data-exp>Exportar</button><span class="sp"></span><button class="danger" data-del>Apagar</button>
      </div>`;
    card.onclick = async (e) => {
      if (e.target.closest('a')) return;
      if (e.target.closest('[data-exp]')) { e.stopPropagation(); exportProject(p); return; }
      const del = e.target.closest('[data-del]');
      if (del) {
        e.stopPropagation();
        if (del.dataset.armed) {
          await Store.apagar(p.id);
          if (projectId === p.id) newProject();
          openProjects();
        } else { del.dataset.armed = '1'; del.textContent = 'Confirmar?'; setTimeout(() => { if (del.isConnected) { delete del.dataset.armed; del.textContent = 'Apagar'; } }, 3000); }
        return;
      }
      try { await openProject(p.id); $('projModal').hidden = true; } catch (err) { console.error(err); }
    };
    grid.appendChild(card);
  });
  if (!list.length) grid.insertAdjacentHTML('beforeend', '<p class="pempty">Nenhum projeto salvo ainda. Dá um nome lá em cima e aperta Salvar.</p>');
}
async function toDataUrl(src) {
  const b = await (await fetch(src)).blob();
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
}
async function embedImages(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) await embedImages(n); return; }
  if (node.type === 'image' && node.src && !String(node.src).startsWith('data:')) {
    try { node.src = await toDataUrl(node.src); } catch (e) { console.warn('imagem não embutida', node.src); }
  }
  for (const k of ['objects', 'clipPath', 'backgroundImage', 'overlayImage']) if (node[k]) await embedImages(node[k]);
}
async function exportProject(p) {
  const data = await Store.load(p.id);
  await embedImages(data.canvas);
  let capa = null;
  try { capa = p.capa ? (String(p.capa).startsWith('data:') ? p.capa : await toDataUrl(p.capa)) : null; } catch (e) {}
  const out = { formato: 'editor-de-arte-e-3d', versao: 1, projeto: data, capa };
  download(new Blob([JSON.stringify(out)], { type: 'application/json' }), `projeto-${p.id}.json`);
}
async function importProjectFile(file) {
  const j = JSON.parse(await file.text());
  if (j.formato !== 'editor-de-arte-e-3d' || !j.projeto || !j.projeto.canvas) throw new Error('arquivo não é um projeto do editor');
  const { id } = await Store.novo(j.projeto.nome || 'projeto');
  await Store.salvar(id, { ...j.projeto, capa: j.capa || undefined });
  return id;
}
$('importProj').onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try { await importProjectFile(f); openProjects(); } catch (err) { console.error(err); $('pGrid').insertAdjacentHTML('afterbegin', `<p class="pempty">${esc(err.message)}</p>`); }
};
$('openProjects').onclick = openProjects;
$('pClose').onclick = () => { $('projModal').hidden = true; };
$('projModal').addEventListener('click', (e) => { if (e.target.id === 'projModal') $('projModal').hidden = true; });

/* ---------- começa ---------- */
Mock.init($('mug'));
fillProductUI();
(async () => {
  await loadMoldes();
  let last = null;
  try { last = localStorage.getItem('editor-ultimo-projeto'); } catch (e) {}
  if (last) { try { await openProject(last); return; } catch (e) { console.warn(e); } }
  newProject();
})();
