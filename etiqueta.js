// Etiqueta de preço (arte de impressão): modelos prontos, logo sem fundo, preço e folha A4 pra imprimir
const Etiqueta = (() => {
  const MODELOS = {
    classica: { label: 'Clássica', preco: '#9b2c6b', det: '#a8843f' },
    faixa: { label: 'Faixa embaixo', preco: '#ffffff', det: '#9b2c6b' },
    simples: { label: 'Simples', preco: '#1f1d1a', det: '#cfc8bc' },
  };
  const PRECO_INICIAL = 'R$ 487,00';
  const cores = { preco: MODELOS.classica.preco, det: MODELOS.classica.det };
  const objs = () => canvas.getObjects();
  const doPapel = (role) => objs().filter((o) => o.data && o.data.role === role);
  const precoObj = () => doPapel('preco').find((o) => o.type === 'i-text' || o.type === 'text') || null;
  const logoObj = () => doPapel('logo')[0] || null;
  const modeloAtual = () => { const o = objs().find((x) => x.data && x.data.tpl && x.data.modelo); return o ? o.data.modelo : null; };
  const temArte = () => objs().some((o) => !o.data || !['fundo', 'peca', 'base'].includes(o.data.kind));
  const corDet = (o) => (o.data.paint === 'stroke' ? o.stroke : o.fill);

  /* ---------- preço ---------- */
  // o que vem antes do número ("R$ "): lembra do último preço completo pra não perder no meio da digitação
  function prefixo() {
    const p = precoObj(); if (!p) return 'R$ ';
    const m = String(p.text).match(/^(\D*)\d[\d.]*,\d\d$/);
    if (m) p.data.pre = m[1];
    return p.data.pre ?? 'R$ ';
  }
  // "487" → R$ 487,00 · "1.299,9" → R$ 1.299,90 · "487.5" → R$ 487,50 · texto livre fica como está
  function formatar(txt, pre = prefixo()) {
    const t = String(txt || '').trim();
    const n = t.replace(/^r\$\s*/i, '');
    let v = null;
    if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(n)) v = parseFloat(n.replace(/\./g, '').replace(',', '.'));
    else if (/^\d+\.\d{1,2}$/.test(n)) v = parseFloat(n);
    if (v === null || !isFinite(v)) return t;
    return pre + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // o preço nunca passa da largura da etiqueta: diminui sozinho se o número crescer
  function caber(o) {
    const c = o.getCenterPoint();
    if (o.initDimensions) o.initDimensions();
    const k = Math.min(o.data.s0 || 1, (o.data.maxW || W * 0.86) / o.width);
    o.set({ scaleX: k, scaleY: k });
    o.setPositionByOrigin(c, 'center', 'center'); o.setCoords();
  }
  function porPreco(o, txt) { o.set('text', txt); caber(o); }

  /* ---------- modelos ---------- */
  async function fontes() { await Promise.all(['700 100px Poppins', '600 100px Poppins'].map((f) => document.fonts.load(f).catch(() => {}))); }
  function layout(id) {
    const s = Math.min(W, H), m = s * 0.05, iw = W - 2 * m, ih = H - 2 * m;
    if (id === 'faixa') {
      const band = H * 0.6;
      return { s, m, band, logo: { cx: W / 2, cy: band / 2, w: W * 0.74, h: band * 0.6 }, preco: { cx: W / 2, cy: band + (H - band) / 2, maxW: W * 0.84, fs: (H - band) * 0.5 } };
    }
    return { s, m, div: m + ih * 0.5, logo: { cx: W / 2, cy: m + ih * 0.27, w: iw * 0.74, h: ih * 0.32 }, preco: { cx: W / 2, cy: m + ih * 0.71, maxW: iw * 0.86, fs: ih * 0.22 } };
  }
  function deco(id, L, cor) {
    const { s, m } = L, out = [];
    const d = (paint, o) => ({ ...o, data: { kind: 'shape', role: 'detalhe', tpl: true, modelo: id, paint } });
    if (id === 'classica' || id === 'simples') {
      const sw = s * (id === 'simples' ? 0.005 : 0.007);
      out.push(new fabric.Rect(d('stroke', { left: m - sw / 2, top: m - sw / 2, width: W - 2 * m, height: H - 2 * m, rx: s * 0.035, ry: s * 0.035, fill: '', stroke: cor, strokeWidth: sw, perPixelTargetFind: true })));
    }
    if (id === 'classica') {
      const t = s * 0.1, a = s * 0.065;
      out.push(new fabric.Polygon([{ x: 0, y: 0 }, { x: t, y: 0 }, { x: t * 0.4, y: a }], d('fill', { left: m + s * 0.05, top: m, fill: cor, strokeWidth: 0 })));
      out.push(new fabric.Polygon([{ x: 0, y: a }, { x: t, y: a }, { x: t * 0.6, y: 0 }], d('fill', { left: W - m - s * 0.05 - t, top: H - m - a, fill: cor, strokeWidth: 0 })));
    }
    if (id === 'simples') out.push(new fabric.Rect(d('fill', { left: W * 0.38, top: L.div - s * 0.003, width: W * 0.24, height: s * 0.006, fill: cor, strokeWidth: 0 })));
    if (id === 'faixa') out.push(new fabric.Rect(d('fill', { left: 0, top: L.band, width: W, height: H - L.band, fill: cor, strokeWidth: 0 })));
    return out;
  }
  function novoPreco(id, L, txt, cor) {
    const t = new fabric.IText(txt, {
      fontFamily: 'Poppins', fontWeight: 700, fontSize: L.preco.fs, fill: cor, charSpacing: -15,
      originX: 'center', originY: 'center', textAlign: 'center', left: L.preco.cx, top: L.preco.cy,
      data: { kind: 'text', role: 'preco', tpl: true, modelo: id, maxW: L.preco.maxW, s0: 1 },
    });
    caber(t);
    return t;
  }
  function novoSlot(id, box) {
    const s = Math.min(W, H), fs = Math.min(box.h * 0.24, box.w * 0.11);
    const r = new fabric.Rect({ width: box.w, height: box.h, originX: 'center', originY: 'center', left: 0, top: 0, rx: s * 0.02, ry: s * 0.02, fill: 'rgba(31,29,26,.03)', stroke: '#bdb6aa', strokeWidth: s * 0.004, strokeDashArray: [s * 0.02, s * 0.014] });
    const t1 = new fabric.Text('SUA LOGO', { fontFamily: 'Poppins', fontWeight: 600, fontSize: fs, fill: '#a39d93', charSpacing: 120, originX: 'center', originY: 'center', left: 0, top: -fs * 0.35 });
    const t2 = new fabric.Text('clique 2x pra escolher', { fontFamily: 'Poppins', fontWeight: 400, fontSize: fs * 0.48, fill: '#b5afa5', originX: 'center', originY: 'center', left: 0, top: fs * 0.62 });
    return new fabric.Group([r, t1, t2], { originX: 'center', originY: 'center', left: box.cx, top: box.cy, data: { kind: 'slot', role: 'logo', tpl: true, modelo: id, box } });
  }
  function encaixar(img, box) {
    const k = Math.min(box.w / img.width, box.h / img.height);
    img.set({ originX: 'center', originY: 'center', left: box.cx, top: box.cy, scaleX: k, scaleY: k, angle: 0 });
    img.setCoords();
  }

  let aplicando = false;
  async function aplicar(id) {
    if (aplicando) return;
    aplicando = true;
    try {
      await fontes();
      if (!curP().print) return;
      const p = precoObj(), txt = p ? p.text : PRECO_INICIAL;
      if (modeloAtual() === id) {   // mesmo modelo (ex.: trocou a medida): mantém as cores
        if (p && typeof p.fill === 'string') cores.preco = p.fill;
        const d = doPapel('detalhe')[0]; if (d && typeof corDet(d) === 'string') cores.det = corDet(d);
      } else { cores.preco = MODELOS[id].preco; cores.det = MODELOS[id].det; }
      const L = layout(id);
      const logo = objs().find((o) => o.data && o.data.role === 'logo' && o.data.kind !== 'slot');
      muted = true;
      objs().filter((o) => o.data && o.data.tpl).forEach((o) => canvas.remove(o));
      let at = bottomCount() + (base ? 1 : 0);
      deco(id, L, cores.det).forEach((o) => canvas.insertAt(o, at++));
      canvas.add(novoPreco(id, L, txt, cores.preco));
      if (logo) { encaixar(logo, L.logo); logo.data = { ...logo.data, box: L.logo }; } else canvas.add(novoSlot(id, L.logo));
      muted = false;
      canvas.discardActiveObject(); canvas.requestRenderAll();
      sync(); saveHistory();
    } finally { muted = false; aplicando = false; }
  }

  /* ---------- logo: tira o fundo claro e apara as sobras ---------- */
  function carregar(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); }
  function tirarFundoClaro(d, w, h) {
    const borda = [];
    const add = (i) => { if (d[i * 4 + 3] > 200) borda.push(i); };
    for (let x = 0; x < w; x++) { add(x); add((h - 1) * w + x); }
    for (let y = 1; y < h - 1; y++) { add(y * w); add(y * w + w - 1); }
    if (borda.length < w + h) return;                       // a logo já tem fundo transparente
    const med = (c) => { const a = borda.map((i) => d[i * 4 + c]).sort((p, q) => p - q); return a[a.length >> 1]; };
    const bg = [med(0), med(1), med(2)];
    if (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2] < 190) return;   // fundo escuro ou colorido: deixa
    const dist = (i) => Math.hypot(d[i * 4] - bg[0], d[i * 4 + 1] - bg[1], d[i * 4 + 2] - bg[2]);
    const LO = 24, HI = 72, BURACO = 7;
    const seen = new Uint8Array(w * h), fila = new Int32Array(w * h);
    let qh = 0, qt = 0;
    const visit = (j) => { if (!seen[j] && d[j * 4 + 3] > 0 && dist(j) < HI) { seen[j] = 1; fila[qt++] = j; } };
    borda.forEach(visit);
    while (qh < qt) {
      const i = fila[qh++], e = dist(i);
      if (e <= LO) d[i * 4 + 3] = 0;
      else {   // borda suave: tira o fundo misturado na cor
        const a = (e - LO) / (HI - LO);
        for (let c = 0; c < 3; c++) d[i * 4 + c] = Math.max(0, Math.min(255, Math.round(bg[c] + (d[i * 4 + c] - bg[c]) / a)));
        d[i * 4 + 3] = Math.round(d[i * 4 + 3] * a);
        continue;
      }
      const x = i % w, y = (i / w) | 0;
      if (x > 0) visit(i - 1); if (x < w - 1) visit(i + 1); if (y > 0) visit(i - w); if (y < h - 1) visit(i + w);
    }
    for (let i = 0; i < w * h; i++) if (!seen[i] && d[i * 4 + 3] > 0 && dist(i) < BURACO) d[i * 4 + 3] = 0;   // miolos fechados (ex.: dentro de um arco)
  }
  function aparar(c, d, w, h) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return c;
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(w - 1, x1 + 2); y1 = Math.min(h - 1, y1 + 2);
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return o;
  }
  async function limparLogo(url, tirarFundo) {
    const im = await carregar(url);
    const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0, w, h);
    const img = x.getImageData(0, 0, w, h);
    if (tirarFundo) tirarFundoClaro(img.data, w, h);
    x.putImageData(img, 0, 0);
    return aparar(c, img.data, w, h).toDataURL('image/png');
  }
  async function porLogo(file) {
    const url = await limparLogo(await readFile(file), $('etqNoBg').checked);
    fabric.Image.fromURL(url, (img) => {
      if (!img || !img.width) return;
      const old = logoObj();
      let box;
      if (old) {
        const c = old.getCenterPoint();
        const b = old.data.kind === 'slot' ? { w: old.width * old.scaleX, h: old.height * old.scaleY } : (old.data.box || { w: old.width * old.scaleX, h: old.height * old.scaleY });
        box = { cx: c.x, cy: c.y, w: b.w, h: b.h };
      } else box = layout(modeloAtual() || 'classica').logo;
      img.set({ data: { kind: 'photo', role: 'logo', box } });
      encaixar(img, box);
      muted = true;
      if (old) { const i = objs().indexOf(old); canvas.remove(old); canvas.insertAt(img, i); } else canvas.add(img);
      muted = false;
      canvas.setActiveObject(img); canvas.requestRenderAll(); saveHistory();
    });
  }

  /* ---------- painel ---------- */
  const mBox = $('etqModelos');
  Object.entries(MODELOS).forEach(([id, M]) => {
    const b = document.createElement('button');
    b.textContent = M.label; b.dataset.id = id;
    b.onclick = () => aplicar(id);
    mBox.appendChild(b);
  });
  function sync() {
    if (!curP().print) return;
    const id = modeloAtual();
    mBox.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    const p = precoObj();
    if (p && document.activeElement !== $('etqPreco')) $('etqPreco').value = String(p.text).replace(/^[^\d]*/, '');
    if (p && typeof p.fill === 'string') $('etqCorPreco').value = toHex(p.fill);
    const d = doPapel('detalhe')[0];
    if (d && typeof corDet(d) === 'string') $('etqCorDet').value = toHex(corDet(d));
  }
  $('etqLogo').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) porLogo(f).catch((err) => console.error('logo', err)); };
  $('etqPreco').addEventListener('input', (e) => {
    let p = precoObj();
    if (!p) {   // apagaram o preço: volta um no lugar do modelo
      p = novoPreco(modeloAtual() || 'classica', layout(modeloAtual() || 'classica'), PRECO_INICIAL, $('etqCorPreco').value);
      muted = true; canvas.add(p); muted = false;
    }
    const v = e.target.value.trim(), txt = v ? formatar(v) : prefixo() + '0,00';
    if (v && txt === v && /^(r\$\s*)?[\d.,\s]+$/i.test(v)) return;   // número pela metade (ex.: "12,"): espera terminar
    porPreco(p, txt);
    canvas.requestRenderAll(); queueMug();
  });
  $('etqPreco').addEventListener('change', () => saveHistory());
  $('etqCorPreco').oninput = (e) => { doPapel('preco').forEach((o) => o.set('fill', e.target.value)); canvas.requestRenderAll(); queueMug(); };
  $('etqCorPreco').onchange = () => saveHistory();
  $('etqCorDet').oninput = (e) => { doPapel('detalhe').forEach((o) => o.set(o.data.paint === 'stroke' ? 'stroke' : 'fill', e.target.value)); canvas.requestRenderAll(); queueMug(); };
  $('etqCorDet').onchange = () => saveHistory();
  canvas.on('mouse:dblclick', (e) => { if (e.target && e.target.data && e.target.data.kind === 'slot') $('etqLogo').click(); });
  canvas.on('object:modified', (e) => {   // aumentou/diminuiu o preço na mão: vira o novo tamanho
    const o = e.target;
    if (o && o.data && o.data.role === 'preco') { o.data.s0 = o.scaleX; o.data.maxW = Math.max(o.data.maxW || 0, o.width * o.scaleX); }
  });

  function onProduct(rescale) {
    const P = curP();
    $('etqBox').hidden = !P.print;
    if (!P.print) return;
    sync();
    if (!rescale) return;
    const m = modeloAtual();
    if (m) aplicar(m); else if (!temArte()) aplicar('classica');
  }
  async function novo() {
    if (!curP().print) return;
    await aplicar('classica');
    resetHistory(); dirty = false; setStatus('Novo projeto');
  }

  /* ---------- folha A4 pra imprimir ---------- */
  const A4W = 210, A4H = 297, MARG = 5, PX = 1240 / A4W;   // prévia em 150 dpi
  const prForm = $('prForm'), prCanvas = $('prCanvas');
  prCanvas.width = 1240; prCanvas.height = 1754;
  function lerForm() {
    const f = new FormData(prForm);
    return {
      precos: String(f.get('precos') || '').split('\n').map((s) => s.trim()).filter(Boolean),
      copias: Math.max(0, Math.min(500, parseInt(f.get('copias'), 10) || 0)),
      gap: parseFloat(f.get('espaco')) || 0,
      linhas: !!f.get('linhas'),
    };
  }
  function grade(gap) {
    const S = curS(), w = S.w * 10, h = S.h * 10;
    const n = (tot, sz) => Math.max(1, Math.floor((tot - 2 * MARG + gap + 1e-6) / (sz + gap)));
    const cols = n(A4W, w), rows = n(A4H, h);
    const gw = cols * w + (cols - 1) * gap, gh = rows * h + (rows - 1) * gap;
    return { w, h, gap, cols, rows, per: cols * rows, x0: (A4W - gw) / 2, y0: (A4H - gh) / 2 };
  }
  const pos = (g, i) => ({ x: g.x0 + (i % g.cols) * (g.w + g.gap), y: g.y0 + Math.floor(i / g.cols) * (g.h + g.gap) });
  // marcas de corte (pretas, fora da arte) + linha fininha cinza em volta de cada etiqueta
  function tracos(g, n, linhas) {
    const out = [], X = new Set(), Y = new Set();
    for (let i = 0; i < n; i++) { const { x, y } = pos(g, i); X.add(+x.toFixed(3)); X.add(+(x + g.w).toFixed(3)); Y.add(+y.toFixed(3)); Y.add(+(y + g.h).toFixed(3)); }
    const xs = [...X].sort((a, b) => a - b), ys = [...Y].sort((a, b) => a - b);
    const top = ys[0], bot = ys[ys.length - 1], left = xs[0], right = xs[xs.length - 1], L = 4, off = 1;
    xs.forEach((x) => out.push(['marca', x, Math.max(0.5, top - off - L), x, top - off], ['marca', x, bot + off, x, Math.min(A4H - 0.5, bot + off + L)]));
    ys.forEach((y) => out.push(['marca', Math.max(0.5, left - off - L), y, left - off, y], ['marca', right + off, y, Math.min(A4W - 0.5, right + off + L), y]));
    if (linhas) for (let i = 0; i < n; i++) {
      const { x, y } = pos(g, i);
      out.push(['corte', x, y, x + g.w, y], ['corte', x + g.w, y, x + g.w, y + g.h], ['corte', x, y + g.h, x + g.w, y + g.h], ['corte', x, y, x, y + g.h]);
    }
    return out;
  }
  const ESTILO = { marca: { cor: '#000000', mm: 0.2 }, corte: { cor: '#b5b5b5', mm: 0.12 } };
  function variantes(precos) {
    canvas.discardActiveObject();
    const slots = objs().filter((o) => o.data && o.data.kind === 'slot');
    slots.forEach((o) => { o.visible = false; });
    const p = precoObj();
    const lista = precos.length && p ? precos : [null];
    const salvo = p && { text: p.text, scaleX: p.scaleX, scaleY: p.scaleY, left: p.left, top: p.top };
    const out = lista.map((t) => {
      if (t !== null) porPreco(p, formatar(t));
      return { t, c: exportCanvas(), jpg: null };
    });
    if (p) { p.set(salvo); p.setCoords(); }
    slots.forEach((o) => { o.visible = true; });
    canvas.renderAll();
    return out;
  }
  function sequencia(vs, f, g) {
    if (vs[0].t === null) return Array(f.copias || g.per).fill(0);
    const seq = [];
    vs.forEach((v, i) => { for (let k = 0; k < (f.copias || 1); k++) seq.push(i); });
    return seq.slice(0, 2000);
  }
  function jpg(c) {
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    const x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0);
    return o.toDataURL('image/jpeg', 0.95);
  }
  let atual = null, prT = 0;
  function montar() {
    const f = lerForm(), g = grade(f.gap), vs = variantes(f.precos), seq = sequencia(vs, f, g);
    const pag1 = seq.slice(0, g.per);
    const x = prCanvas.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, prCanvas.width, prCanvas.height);
    pag1.forEach((vi, i) => { const p = pos(g, i); x.drawImage(vs[vi].c, p.x * PX, p.y * PX, g.w * PX, g.h * PX); });
    tracos(g, pag1.length, f.linhas).forEach(([tipo, x1, y1, x2, y2]) => {
      x.strokeStyle = ESTILO[tipo].cor; x.lineWidth = Math.max(1, ESTILO[tipo].mm * PX);
      x.beginPath(); x.moveTo(x1 * PX, y1 * PX); x.lineTo(x2 * PX, y2 * PX); x.stroke();
    });
    const paginas = Math.ceil(seq.length / g.per);
    const avisos = [];
    if (objs().some((o) => o.data && o.data.kind === 'slot')) avisos.push('Falta pôr a logo (o quadrado "SUA LOGO" não sai na impressão).');
    if (f.precos.length && !precoObj()) avisos.push('Não achei o preço na arte: a lista de preços foi ignorada.');
    $('prInfo').innerHTML = `<b>${g.per} por folha</b> (${g.cols} × ${g.rows}) · ${seq.length} ${seq.length === 1 ? 'etiqueta' : 'etiquetas'} · ${paginas} ${paginas === 1 ? 'folha' : 'folhas'}` +
      (paginas > 1 ? '<br>A prévia mostra a 1ª folha.' : '') + avisos.map((a) => `<br><span style="color:var(--accent)">${esc(a)}</span>`).join('');
    atual = { f, g, vs, seq, paginas };
  }
  function pdfBlob() {
    const { f, g, vs, seq, paginas } = atual;
    const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    vs.forEach((v) => { if (!v.jpg) v.jpg = jpg(v.c); });
    for (let pg = 0; pg < paginas; pg++) {
      if (pg) pdf.addPage();
      const parte = seq.slice(pg * g.per, (pg + 1) * g.per);
      parte.forEach((vi, i) => { const p = pos(g, i); pdf.addImage(vs[vi].jpg, 'JPEG', p.x, p.y, g.w, g.h, 'etq' + vi, 'NONE'); });
      tracos(g, parte.length, f.linhas).forEach(([tipo, x1, y1, x2, y2]) => {
        pdf.setDrawColor(ESTILO[tipo].cor); pdf.setLineWidth(ESTILO[tipo].mm); pdf.line(x1, y1, x2, y2);
      });
    }
    return pdf.output('blob');
  }
  async function guardar(blob) {
    if (!projectId) return;
    try { await saveFileToProject('estampa.png', blob); await saveProject(false); } catch (e) { console.error(e); }
  }
  async function abrirImpressao() {
    $('prTitle').textContent = `Folha pra imprimir · ${curP().name} ${sizeName()}`;
    $('printModal').hidden = false; $('prLoading').hidden = false;
    await fontes();
    montar();
    $('prLoading').hidden = true;
  }
  function fechar() { $('printModal').hidden = true; atual = null; }
  prForm.addEventListener('input', () => { clearTimeout(prT); prT = setTimeout(montar, 250); });
  $('prClose').onclick = fechar;
  $('printModal').addEventListener('click', (e) => { if (e.target.id === 'printModal') fechar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('printModal').hidden) fechar(); }, true);
  $('prPdf').onclick = () => {
    if (!atual) return;
    download(pdfBlob(), `etiquetas-${window.manualSlug()}-${sizeTag()}.pdf`);
    atual.vs[0].c.toBlob(guardar, 'image/png');
  };
  $('prPng').onclick = () => {
    if (!atual) return;
    variantes([])[0].c.toBlob((b) => { download(b, `etiqueta-${window.manualSlug()}-${sizeTag()}.png`); guardar(b); }, 'image/png');
  };

  return { onProduct, novo, sync, abrirImpressao, formatar };
})();
