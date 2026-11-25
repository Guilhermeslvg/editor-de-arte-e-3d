// Modo roupa: 3D grande em cima, molde embaixo, ferramentas na esquerda e painel completo na direita
const Garment = (() => {
  const api = { zoom: 1, ativo: false };
  const body = document.body;
  const LOOKS = {
    algodao: { rough: 0.92, normal: 0.22, ao: 1.35 },
    moletom: { rough: 0.97, normal: 0.4, ao: 1.45 },
    dryfit: { rough: 0.55, normal: 0.1, ao: 1.15 },
    linho: { rough: 0.9, normal: 0.55, ao: 1.35 },
  };
  const LOOK0 = { mat: 'algodao', ao: 100, norm: 60, luz: 100, bg: 'cinza', knit: 100, key: 215, bri: 100, con: 100 };
  let lookState = { ...LOOK0 };

  let ultimoModelo = null;
  /* ---------- liga/desliga o modo ---------- */
  function onProduct() {
    const on = !!curP().molde;
    if (on !== api.ativo) {
      api.ativo = on;
      body.classList.toggle('garment', on);
      document.querySelectorAll('.gonly').forEach((e) => { e.style.display = on ? 'block' : ''; });
      const mug = $('mug');
      if (on) { $('viewport').appendChild(mug); $('tecidoSlot').appendChild($('colorBox')); }
      else {
        $('previewBox').insertBefore(mug, $('previewBox').querySelector('.mugbar'));
        $('pSize').parentElement.appendChild($('colorBox'));
        closeDrawer(); setTool('sel');
      }
      api.zoom = 1;
      requestAnimationFrame(() => { fit(); Mock.resize(); });
    }
    if (on && curP().model !== ultimoModelo) { lookState.bg = curP().model === 'moletom' ? 'salvia' : 'cinza'; ultimoModelo = curP().model; }
    if (on) { aplicarLook(); renderPlace(); renderLayers(); }
  }

  /* ---------- barra de ferramentas ---------- */
  let tool = 'sel';
  const DRAWER = { formas: 'Enfeites', enfeites: 'Enfeites', emojis: 'Emojis', fundos: 'Fundos', produto: 'Cliente' };
  function setTool(t) {
    tool = t;
    document.querySelectorAll('.rail button[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    canvas.isDrawingMode = t === 'brush';
    $('brushSec').hidden = t !== 'brush';
    if (t === 'brush') {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = $('brColor').value;
      canvas.freeDrawingBrush.width = +$('brSize').value * (W / 3000);
    }
    const hand = t === 'hand';
    $('stage').classList.toggle('hand', hand);
    canvas.selection = !hand; canvas.skipTargetFind = hand;
    canvas.defaultCursor = hand ? 'grab' : 'default';
  }
  function openDrawer(kind) {
    const tools = document.querySelector('aside.tools');
    const was = tools.classList.contains('open') && tools.dataset.kind === kind;
    if (was) return closeDrawer();
    tools.classList.add('open'); tools.dataset.kind = kind;
    if (kind === 'formas') showStickers('Formas');
    const h = [...tools.querySelectorAll('h2')].find((x) => x.textContent.trim().startsWith(DRAWER[kind]));
    if (h) tools.scrollTop = h.offsetTop - 10;
    document.querySelectorAll('.rail button[data-tool]').forEach((b) => { if (DRAWER[b.dataset.tool]) b.classList.toggle('on', b.dataset.tool === kind); });
  }
  function closeDrawer() {
    const tools = document.querySelector('aside.tools');
    tools.classList.remove('open');
    document.querySelectorAll('.rail button[data-tool]').forEach((b) => { if (DRAWER[b.dataset.tool]) b.classList.remove('on'); });
  }
  $('rail').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tool]'); if (!b) return;
    const t = b.dataset.tool;
    if (t === 'sel' || t === 'hand' || t === 'brush') { closeDrawer(); return setTool(tool === t && t !== 'sel' ? 'sel' : t); }
    if (t === 'img') { closeDrawer(); return $('addPhoto').click(); }
    if (t === 'txt') { closeDrawer(); setTool('sel'); return $('addText').click(); }
    if (t === 'zin') return setZoom(api.zoom * 1.25);
    if (t === 'zout') return setZoom(api.zoom / 1.25);
    if (t === 'zfit') return setZoom(1);
    openDrawer(t);
  });
  document.addEventListener('mousedown', (e) => {
    const tools = document.querySelector('aside.tools');
    if (!api.ativo || !tools.classList.contains('open')) return;
    if (!tools.contains(e.target) && !$('rail').contains(e.target)) closeDrawer();
  });
  // itens adicionados pela gaveta fecham ela
  canvas.on('object:added', () => { if (api.ativo && !canvas.isDrawingMode) closeDrawer(); });
  $('brColor').oninput = () => { if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.color = $('brColor').value; };
  $('brSize').oninput = () => { if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.width = +$('brSize').value * (W / 3000); };
  canvas.on('path:created', (e) => { e.path.set({ data: { kind: 'desenho' } }); saveHistory(); renderLayers(); });
  document.addEventListener('keydown', (e) => {
    if (!api.ativo) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || e.metaKey || e.ctrlKey) return;
    const o = canvas.getActiveObject(); if (o && o.isEditing) return;
    const k = e.key.toLowerCase();
    if (k === 'v') setTool('sel'); else if (k === 'h') setTool('hand'); else if (k === 'b') setTool('brush'); else if (k === 't') $('addText').click();
  });

  /* ---------- zoom e mão no molde ---------- */
  function setZoom(z) {
    api.zoom = Math.max(0.5, Math.min(6, z));
    $('zoomTxt').textContent = Math.round(api.zoom * 100) + '%';
    fit();
  }
  const stage = $('stage');
  stage.addEventListener('wheel', (e) => {
    if (!api.ativo || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const fx = (e.clientX - r.left + stage.scrollLeft) / stage.scrollWidth, fy = (e.clientY - r.top + stage.scrollTop) / stage.scrollHeight;
    setZoom(api.zoom * Math.exp(-e.deltaY * 0.01));
    stage.scrollLeft = fx * stage.scrollWidth - (e.clientX - r.left); stage.scrollTop = fy * stage.scrollHeight - (e.clientY - r.top);
  }, { passive: false });
  let pan = null;
  stage.addEventListener('mousedown', (e) => {
    if (!api.ativo || tool !== 'hand') return;
    pan = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop }; e.preventDefault();
  }, true);
  window.addEventListener('mousemove', (e) => { if (!pan) return; stage.scrollLeft = pan.sl - (e.clientX - pan.x); stage.scrollTop = pan.st - (e.clientY - pan.y); });
  window.addEventListener('mouseup', () => { pan = null; });
  new ResizeObserver(() => { if (api.ativo) { fit(); Mock.resize(); } }).observe($('viewport'));

  /* ---------- medidas (cm) ---------- */
  const pxcm = () => (curP().molde ? W / MOLDES[curP().model].sheet.w : curP().digital ? 1 : DPI / 2.54);
  const r1 = (n) => Math.round(n * 10) / 10;
  function refreshTransform() {
    const o = canvas.getActiveObject();
    $('tEmpty').hidden = !!o; $('tBody').hidden = !o;
    $('vpCard').hidden = !o || !api.ativo;
    if (!o) return;
    const k = pxcm(), b = o.getBoundingRect(true, true);
    const set = (id, v) => { if (document.activeElement !== $(id)) $(id).value = v; };
    set('tW', r1(o.getScaledWidth() / k)); set('tH', r1(o.getScaledHeight() / k));
    set('tX', r1(b.left / k)); set('tY', r1(b.top / k)); set('tR', Math.round(o.angle || 0));
    $('tUnit').textContent = curP().digital ? 'medidas em pixels' : 'medidas em cm (X e Y a partir do canto da folha)';
    document.querySelectorAll('#vpCard [data-img]').forEach((x) => { x.hidden = o.type !== 'image'; });
  }
  function applyTransform(field) {
    const o = canvas.getActiveObject(); if (!o) return;
    const k = pxcm(), v = parseFloat($(field).value); if (!isFinite(v)) return;
    if (field === 'tW' || field === 'tH') {
      const cur = field === 'tW' ? o.getScaledWidth() : o.getScaledHeight();
      const f = (v * k) / cur;
      const c = o.getCenterPoint();
      if ($('tLock').checked) o.set({ scaleX: o.scaleX * f, scaleY: o.scaleY * f });
      else if (field === 'tW') o.set({ scaleX: o.scaleX * f }); else o.set({ scaleY: o.scaleY * f });
      o.setPositionByOrigin(c, 'center', 'center');
    } else if (field === 'tR') {
      const c = o.getCenterPoint(); o.rotate(v); o.setPositionByOrigin(c, 'center', 'center');
    } else {
      const b = o.getBoundingRect(true, true);
      if (field === 'tX') o.set({ left: o.left + (v * k - b.left) }); else o.set({ top: o.top + (v * k - b.top) });
    }
    o.setCoords(); canvas.requestRenderAll(); queueMug(); saveHistory(); refreshTransform();
  }
  ['tW', 'tH', 'tX', 'tY', 'tR'].forEach((id) => {
    $(id).addEventListener('change', () => applyTransform(id));
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') applyTransform(id); });
  });
  $('tFlipH').onclick = () => { const o = canvas.getActiveObject(); if (!o) return; o.set('flipX', !o.flipX); canvas.requestRenderAll(); saveHistory(); };
  $('tFlipV').onclick = () => { const o = canvas.getActiveObject(); if (!o) return; o.set('flipY', !o.flipY); canvas.requestRenderAll(); saveHistory(); };
  $('tCenter').onclick = () => {
    const o = canvas.getActiveObject(), pc = pecaSob(o); if (!o || !pc) return;
    const bb = pecaBox(pc), k = pxcm();
    o.setPositionByOrigin(new fabric.Point(bb.cx * k, o.getCenterPoint().y), 'center', 'center');
    o.setCoords(); canvas.requestRenderAll(); queueMug(); saveHistory(); refreshTransform();
  };
  ['selection:created', 'selection:updated', 'selection:cleared', 'object:moving', 'object:scaling', 'object:rotating', 'object:modified'].forEach((ev) => canvas.on(ev, refreshTransform));

  /* ---------- peças: caixa e "colocar em" ---------- */
  function pecaBox(pc) {
    const xs = pc.outline.map((q) => q[0]), ys = pc.outline.map((q) => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function dentro(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function pecaSob(o) {
    const m = moldeAtual(); if (!m || !o) return null;
    const k = pxcm(), c = o.getCenterPoint();
    return m.pecas.find((p) => dentro(c.x / k, c.y / k, p.outline)) || null;
  }
  const PLACES = [
    { id: 'peito', label: 'Peito (centro)', peca: 'frente', fx: 0.5, dy: 23, w: 26 },
    { id: 'peitoE', label: 'Peito esquerdo', peca: 'frente', fx: 0.7, dy: 19, w: 9 },
    { id: 'peitoD', label: 'Peito direito', peca: 'frente', fx: 0.3, dy: 19, w: 9 },
    { id: 'barra', label: 'Barra da frente', peca: 'frente', fx: 0.5, dy: -12, w: 18 },
    { id: 'costas', label: 'Costas', peca: 'costas', fx: 0.5, dy: 24, w: 30 },
    { id: 'nuca', label: 'Nuca', peca: 'costas', fx: 0.5, dy: 6.5, w: 8 },
    { id: 'mangaE', label: 'Manga esquerda', peca: 'mangaE', fx: 0.5, dy: 0.45, w: 9, rel: true },
    { id: 'mangaD', label: 'Manga direita', peca: 'mangaD', fx: 0.5, dy: 0.45, w: 9, rel: true },
    { id: 'capuz', label: 'Capuz', peca: 'capuzE', fx: 0.5, dy: 0.5, w: 10, rel: true },
    { id: 'bolso', label: 'Bolso', peca: 'bolso', fx: 0.5, dy: 0.5, w: 14, rel: true },
    { id: 'boneFrente', label: 'Frente do boné', peca: 'frente', fx: 0.5, dy: 0.6, w: 10, rel: true, so: 'bone' },
    { id: 'boneLadoE', label: 'Lateral esquerda', peca: 'lateralE', fx: 0.5, dy: 0.5, w: 4, rel: true, so: 'bone' },
    { id: 'boneLadoD', label: 'Lateral direita', peca: 'lateralD', fx: 0.5, dy: 0.5, w: 4, rel: true, so: 'bone' },
    { id: 'boneTras', label: 'Traseira', peca: 'traseira', fx: 0.5, dy: 0.55, w: 6, rel: true, so: 'bone' },
    { id: 'boneAba', label: 'Aba', peca: 'aba', fx: 0.5, dy: 0.6, w: 7, rel: true, so: 'bone' },
  ];
  function renderPlace() {
    const m = moldeAtual(), box = $('placeBox'); box.innerHTML = '';
    if (!m) return;
    PLACES.filter((pl) => m.pecas.some((p) => p.id === pl.peca) && (curP().model === 'bone' ? pl.so === 'bone' : !pl.so)).forEach((pl) => {
      const b = document.createElement('button'); b.textContent = pl.label;
      b.onclick = () => colocar(pl);
      box.appendChild(b);
    });
  }
  function colocar(pl) {
    const o = canvas.getActiveObject();
    if (!o) { $('placeBox').insertAdjacentHTML('afterend', ''); return; }
    const m = moldeAtual(), pc = m.pecas.find((p) => p.id === pl.peca); if (!pc) return;
    const bb = pecaBox(pc), k = pxcm();
    const x = bb.x0 + bb.w * pl.fx;
    const y = pl.rel ? bb.y0 + bb.h * pl.dy : pl.dy >= 0 ? bb.y0 + pl.dy : bb.y1 + pl.dy;
    const f = (pl.w * k) / Math.max(o.getScaledWidth(), 1);
    o.set({ scaleX: o.scaleX * f, scaleY: o.scaleY * f, angle: 0 });
    o.setPositionByOrigin(new fabric.Point(x * k, y * k), 'center', 'center');
    o.setCoords(); canvas.requestRenderAll(); queueMug(); saveHistory(); refreshTransform();
    Mock.view(pl.peca === 'costas' ? 'costas' : pl.peca === 'mangaE' ? 'esq' : pl.peca === 'mangaD' ? 'dir' : 'frente');
  }

  /* ---------- camadas ---------- */
  function nomeDe(o) {
    const d = o.data || {};
    if (d.kind === 'fundo') return ['▦', 'Fundo: ' + ((FUNDOS.find((f) => f.id === d.id) || {}).label || '')];
    if (d.kind === 'base') return ['🖼', 'Arte de fundo'];
    if (d.kind === 'svg') return ['★', (STICKERS[d.key] || {}).label || 'Enfeite'];
    if (d.kind === 'emoji') return [o.text, 'Emoji'];
    if (o.type === 'i-text') return ['T', o.text.split('\n')[0].slice(0, 28) || 'Texto'];
    if (d.kind === 'desenho') return ['✎', 'Desenho'];
    if (d.kind === 'sticker') return ['◯', 'Adesivo de foto'];
    if (o.type === 'image') return ['🖼', 'Imagem'];
    return ['•', o.type];
  }
  let layersT = 0;
  function renderLayers() {
    if (!api.ativo) return;
    clearTimeout(layersT);
    layersT = setTimeout(() => {
      const box = $('layers'); box.innerHTML = '';
      const act = canvas.getActiveObjects();
      const objs = canvas.getObjects().filter((o) => !(o.data && o.data.kind === 'peca')).reverse();
      if (!objs.length) { box.innerHTML = '<p class="empty2">Nada no molde ainda. Usa as ferramentas da esquerda.</p>'; return; }
      objs.forEach((o) => {
        const [ic, nm] = nomeDe(o);
        const travado = o.selectable === false;
        const row = document.createElement('div');
        row.className = 'layer' + (act.includes(o) ? ' on' : '') + (o.visible === false ? ' off' : '');
        row.innerHTML = `<span class="ic">${esc(ic)}</span><span class="nm">${esc(nm)}</span>
          <button data-a="up" title="Subir">▲</button><button data-a="down" title="Descer">▼</button>
          <button data-a="eye" title="Mostrar/esconder">${o.visible === false ? '◌' : '👁'}</button>
          <button data-a="lock" title="Travar">${travado ? '🔒' : '🔓'}</button>`;
        row.onclick = (e) => {
          const a = e.target.closest('button') && e.target.closest('button').dataset.a;
          if (a === 'eye') { o.set('visible', o.visible === false); queueMug(); saveHistory(); }
          else if (a === 'lock') { o.set({ selectable: travado, evented: travado }); if (!travado && canvas.getActiveObject() === o) canvas.discardActiveObject(); saveHistory(); }
          else if (a === 'up') canvas.bringForward(o);
          else if (a === 'down') { if (canvas.getObjects().indexOf(o) > bottomCount() + (base && o !== base ? 1 : 0)) canvas.sendBackwards(o); }
          else if (o.selectable !== false) canvas.setActiveObject(o);
          canvas.requestRenderAll(); queueMug(); renderLayers();
        };
        box.appendChild(row);
      });
    }, 60);
  }
  ['object:added', 'object:removed', 'object:modified', 'selection:created', 'selection:updated', 'selection:cleared', 'text:changed'].forEach((ev) => canvas.on(ev, renderLayers));

  /* ---------- card do item em cima do 3D ---------- */
  $('vpCard').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-q]'); if (!b) return;
    const o = canvas.getActiveObject(); if (!o) return;
    const q = b.dataset.q;
    if (q === 'flip') { o.set('flipX', !o.flipX); }
    if (q === 'crop' && o.type === 'image') { $('cropBox').hidden = !$('cropBox').hidden; syncCrop(o); return; }
    if (q === 'cropreset' && o.type === 'image') {
      const el = o.getElement(); const c = o.getCenterPoint();
      o.set({ cropX: 0, cropY: 0, width: el.naturalWidth || el.width, height: el.naturalHeight || el.height, data: { ...(o.data || {}), crop: null } });
      o.setPositionByOrigin(c, 'center', 'center'); syncCrop(o);
    }
    if (q === 'dup') return duplicate();
    if (q === 'front') canvas.bringForward(o);
    if (q === 'back') { if (canvas.getObjects().indexOf(o) > bottomCount() + (base ? 1 : 0)) canvas.sendBackwards(o); }
    if ((q === 'invert' || q === 'nobg') && o.type === 'image') {
      const f = o.filters || [];
      if (q === 'invert') { const i = f.findIndex((x) => x.type === 'Invert'); if (i >= 0) f.splice(i, 1); else f.push(new fabric.Image.filters.Invert()); }
      if (q === 'nobg') { const i = f.findIndex((x) => x.type === 'RemoveColor'); if (i >= 0) f.splice(i, 1); else f.push(new fabric.Image.filters.RemoveColor({ color: '#FFFFFF', distance: 0.12 })); }
      o.filters = f; o.applyFilters();
    }
    canvas.requestRenderAll(); queueMug(); saveHistory(); renderLayers();
  });
  function syncCrop(o) {
    const c = (o && o.data && o.data.crop) || { l: 0, r: 0, t: 0, b: 0 };
    $('crL').value = c.l; $('crR').value = c.r; $('crT').value = c.t; $('crB').value = c.b;
  }
  function applyCrop() {
    const o = canvas.getActiveObject(); if (!o || o.type !== 'image') return;
    const el = o.getElement(), nw = el.naturalWidth || el.width, nh = el.naturalHeight || el.height;
    let l = +$('crL').value, r = +$('crR').value, t = +$('crT').value, b = +$('crB').value;
    if (l + r > 95) r = 95 - l; if (t + b > 95) b = 95 - t;
    const c = o.getCenterPoint();
    o.set({ cropX: (nw * l) / 100, cropY: (nh * t) / 100, width: (nw * (100 - l - r)) / 100, height: (nh * (100 - t - b)) / 100, data: { ...(o.data || {}), crop: { l, r, t, b } } });
    o.setPositionByOrigin(c, 'center', 'center'); o.setCoords();
    canvas.requestRenderAll(); queueMug(); refreshTransform();
  }
  ['crL', 'crR', 'crT', 'crB'].forEach((id) => { $(id).addEventListener('input', applyCrop); $(id).addEventListener('change', () => saveHistory()); });
  canvas.on('selection:created', () => { $('cropBox').hidden = true; });
  canvas.on('selection:updated', () => { $('cropBox').hidden = true; });
  $('qFill').addEventListener('input', () => {
    const pc = pecaSob(canvas.getActiveObject()); if (!pc) return;
    const ob = pecaObjs().find((x) => x.data.peca === pc.id); if (!ob) return;
    ob.set({ fill: $('qFill').value, stroke: $('qFill').value }); canvas.requestRenderAll(); queueMug();
  });
  $('qFill').addEventListener('change', () => { saveHistory(); fillPecasUI(); });

  /* ---------- vistas do 3D ---------- */
  $('vpBar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    const v = b.dataset.v;
    if (v === 'girar') { $('spin').checked = !$('spin').checked; b.classList.toggle('on', $('spin').checked); return; }
    $('spin').checked = false; $('vpBar').querySelector('[data-v="girar"]').classList.remove('on');
    Mock.view(v);
    $('vpBar').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b && v !== 'reset'));
  });

  /* ---------- aparência ---------- */
  function aplicarLook() {
    const base = LOOKS[lookState.mat] || LOOKS.algodao;
    Mock.setLook({ rough: base.rough, ao: (base.ao * lookState.ao) / 100, normal: (base.normal * lookState.norm) / 60, luz: lookState.luz / 100,
      knit: lookState.knit / 100, key: lookState.key, bri: lookState.bri / 100, con: lookState.con / 100 });
    $('viewport').className = 'viewport bg-' + lookState.bg;
    $('lkMat').value = lookState.mat; $('lkAo').value = lookState.ao; $('lkNorm').value = lookState.norm; $('lkLuz').value = lookState.luz; $('lkBg').value = lookState.bg;
    $('lkKnit').value = lookState.knit; $('lkKey').value = lookState.key; $('lkBri').value = lookState.bri; $('lkCon').value = lookState.con;
  }
  const lk = (id, key, num) => $(id).addEventListener('input', () => { lookState[key] = num ? +$(id).value : $(id).value; aplicarLook(); markDirty(); });
  lk('lkMat', 'mat'); lk('lkAo', 'ao', 1); lk('lkNorm', 'norm', 1); lk('lkLuz', 'luz', 1); lk('lkBg', 'bg');
  lk('lkKnit', 'knit', 1); lk('lkKey', 'key', 1); lk('lkBri', 'bri', 1); lk('lkCon', 'con', 1);
  $('lkReset').onclick = () => { lookState = { ...LOOK0 }; aplicarLook(); markDirty(); };
  api.getLook = () => ({ ...lookState });
  api.setLook = (l) => { lookState = { ...lookState, ...(l || {}) }; ultimoModelo = curP().model; if (api.ativo) aplicarLook(); };

  api.onProduct = onProduct;
  api.renderLayers = renderLayers;
  return api;
})();
