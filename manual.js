// Manual de produção: ficha A4 deitada com medidas, arte aberta e prévia 3D
(() => {
  const MW = 3508, MH = 2480, M = 150;
  const ACC = '#c8312f', ACC_SOFT = '#fbeceb', INK = '#1f1d1a', MUT = '#7a746b', LINE = '#e4e0d8', CARD = '#f6f4f0';
  const form = $('mForm');
  const mCanvas = $('mCanvas');
  mCanvas.width = MW; mCanvas.height = MH;

  // campos comuns ficam lembrados no navegador; o modelo é por produto; tudo também vai no projeto
  function defaults() {
    let shared = {};
    try { shared = JSON.parse(localStorage.getItem('editor-manual') || '{}'); } catch (e) {}
    return { cliente: '', reconhecimento: '', qtd: '', obs: '', ...shared, modelo: curP().modelo };
  }
  function loadData() {
    const d = { ...defaults(), ...(manualData || {}) };
    if (!manualData || manualData.produto !== state.pk) d.modelo = (manualData && manualData.modelos && manualData.modelos[state.pk]) || curP().modelo;
    return d;
  }
  function readForm() { const d = {}; new FormData(form).forEach((v, k) => { d[k] = String(v).trim(); }); return d; }
  function storeForm() {
    const d = readForm();
    const modelos = { ...((manualData && manualData.modelos) || {}), [state.pk]: d.modelo };
    manualData = { ...d, produto: state.pk, modelos };
    try { localStorage.setItem('editor-manual', JSON.stringify({ cliente: d.cliente, reconhecimento: d.reconhecimento })); } catch (e) {}
    if ($('clienteName')) $('clienteName').value = d.cliente || '';
    return d;
  }
  function fillForm(d) { ['cliente', 'reconhecimento', 'modelo', 'qtd', 'obs'].forEach((k) => { form.elements[k].value = d[k] || ''; }); }

  /* ---------- desenho ---------- */
  const font = (w, px, fam = 'Poppins') => `${w} ${px}px "${fam}", Inter, system-ui, sans-serif`;
  function rr(ctx, x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  function wrap(ctx, text, x, y, maxW, lh, maxLines = 8) {
    let lines = 0;
    for (const para of String(text || '').split('\n')) {
      const words = [];
      for (const w0 of para.split(/\s+/).filter(Boolean)) {
        if (ctx.measureText(w0).width <= maxW) { words.push(w0); continue; }
        let part = '';
        for (const ch of w0) { if (ctx.measureText(part + ch).width > maxW) { words.push(part); part = ch; } else part += ch; }
        if (part) words.push(part);
      }
      let line = '';
      for (const word of words) {
        const t = line ? line + ' ' + word : word;
        if (ctx.measureText(t).width > maxW && line) {
          ctx.fillText(line, x, y); y += lh; line = word;
          if (++lines >= maxLines) return y;
        } else line = t;
      }
      if (line) { ctx.fillText(line, x, y); y += lh; if (++lines >= maxLines) return y; }
    }
    return y;
  }
  function arrowHead(ctx, x, y, dir) {
    const s = 22; ctx.beginPath();
    if (dir === 'l') { ctx.moveTo(x, y); ctx.lineTo(x + s, y - s * 0.55); ctx.lineTo(x + s, y + s * 0.55); }
    if (dir === 'r') { ctx.moveTo(x, y); ctx.lineTo(x - s, y - s * 0.55); ctx.lineTo(x - s, y + s * 0.55); }
    if (dir === 'u') { ctx.moveTo(x, y); ctx.lineTo(x - s * 0.55, y + s); ctx.lineTo(x + s * 0.55, y + s); }
    if (dir === 'd') { ctx.moveTo(x, y); ctx.lineTo(x - s * 0.55, y - s); ctx.lineTo(x + s * 0.55, y - s); }
    ctx.closePath(); ctx.fill();
  }
  function dimH(ctx, x1, x2, y, label) {
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.moveTo(x1, y - 26); ctx.lineTo(x1, y + 26); ctx.moveTo(x2, y - 26); ctx.lineTo(x2, y + 26); ctx.stroke();
    arrowHead(ctx, x1, y, 'l'); arrowHead(ctx, x2, y, 'r');
    ctx.font = font(600, 46); const w = ctx.measureText(label).width + 40;
    ctx.fillStyle = '#fff'; ctx.fillRect((x1 + x2) / 2 - w / 2, y - 34, w, 68);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, (x1 + x2) / 2, y + 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function dimV(ctx, x, y1, y2, label) {
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.moveTo(x - 26, y1); ctx.lineTo(x + 26, y1); ctx.moveTo(x - 26, y2); ctx.lineTo(x + 26, y2); ctx.stroke();
    arrowHead(ctx, x, y1, 'u'); arrowHead(ctx, x, y2, 'd');
    ctx.save(); ctx.translate(x, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2);
    ctx.font = font(600, 46); const w = ctx.measureText(label).width + 40;
    ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, -34, w, 68);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 2);
    ctx.restore();
  }
  function sectionLabel(ctx, text, x, y, color = MUT) {
    ctx.font = font(600, 32); ctx.fillStyle = color; ctx.letterSpacing = '4px';
    ctx.fillText(text.toUpperCase(), x, y); ctx.letterSpacing = '0px';
  }
  function checker(ctx, x, y, w, h) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#ebe8e2';
    const s = 24; for (let i = 0; i * s < w; i++) for (let j = 0; j * s < h; j++) if ((i + j) % 2) ctx.fillRect(x + i * s, y + j * s, s, s);
    ctx.restore();
  }
  const units = (n) => (n === '1' ? 'unidade' : 'unidades');
  const mm = (cm) => fmtCm(Math.round(cm * 10));
  const fileArt = () => `estampa-${slug()}-${sizeTag()}.png`;

  function drawSheet(ctx, d, art, shots) {
    const P = curP(), S = curS();
    const colorName = P.colors ? (P.colors.find((c) => c[1] === state.color) || [''])[0] : '';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, MW, MH);

    // cabeçalho
    ctx.fillStyle = INK; ctx.font = font(700, 104); ctx.fillText(P.title, M, 250);
    ctx.fillStyle = MUT; ctx.font = font(400, 52);
    ctx.fillText([d.cliente, `estampa ${fmtCm(S.w)} × ${fmtCm(S.h)} cm (${mm(S.w)} × ${mm(S.h)} mm)`].filter(Boolean).join('  ·  '), M, 335);
    ctx.textAlign = 'right'; ctx.font = font(500, 42);
    ctx.fillText(new Date().toLocaleDateString('pt-BR'), MW - M, 250);
    if (d.qtd) { ctx.fillStyle = INK; ctx.font = font(600, 46); ctx.fillText(`${d.qtd} ${units(d.qtd)}`, MW - M, 330); }
    ctx.textAlign = 'left';
    ctx.fillStyle = LINE; ctx.fillRect(M, 395, MW - 2 * M, 4);

    // arte aberta com medidas (cabe numa área de 1760 × 860)
    const boxX = 220, boxY = 590, boxW = 1760, boxH = 860;
    const k = Math.min(boxW / W, boxH / H);
    const aw = Math.round(W * k), ah = Math.round(H * k);
    const ax = boxX + Math.round((boxW - aw) / 2), ay = boxY;
    sectionLabel(ctx, 'Estampa aberta', M, 470);
    dimH(ctx, ax, ax + aw, 540, `${fmtCm(S.w)} cm`);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.12)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#fff'; ctx.fillRect(ax, ay, aw, ah); ctx.restore();
    if (P.transparent) checker(ctx, ax, ay, aw, ah);
    ctx.drawImage(art, ax, ay, aw, ah);
    ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.strokeRect(ax, ay, aw, ah);
    ctx.save(); ctx.setLineDash([18, 12]); ctx.lineWidth = 3;
    if (P.safe) {
      ctx.strokeStyle = 'rgba(200,49,47,.75)';
      const mx = (aw * (P.safe / 10)) / S.w, my = (ah * (P.safe / 10)) / S.h;
      ctx.strokeRect(ax + mx, ay + my, aw - 2 * mx, ah - 2 * my);
    }
    if (P.handle) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.moveTo(ax + aw / 2, ay - 10); ctx.lineTo(ax + aw / 2, ay + ah + 10); ctx.stroke(); }
    ctx.restore();
    dimV(ctx, ax + aw + 70, ay, ay + ah, `${fmtCm(S.h)} cm`);
    if (P.handle) {
      ctx.font = font(500, 34); ctx.fillStyle = ACC;
      ctx.fillText('← lado da alça', ax, ay + ah + 62);
      ctx.textAlign = 'right'; ctx.fillText('lado da alça →', ax + aw, ay + ah + 62);
      ctx.textAlign = 'center'; ctx.fillStyle = MUT; ctx.fillText('centro = frente da caneca', ax + aw / 2, ay + ah + 62);
      ctx.textAlign = 'left';
    }

    // prévia 3D em 3 ângulos
    const cy = 1610, cw = 590, ch = 476, gap = 40;
    sectionLabel(ctx, `Como fica ${P.na}`, M, cy - 40);
    shots.forEach((s, i) => {
      const x = 228 + i * (cw + gap);
      rr(ctx, x, cy, cw, ch, 28, CARD);
      ctx.drawImage(s.c, x, cy, cw, ch);
      ctx.font = font(600, 38); ctx.fillStyle = INK; ctx.textAlign = 'center';
      ctx.fillText(s.label, x + cw / 2, cy + ch + 60);
      ctx.textAlign = 'left';
    });

    // especificações
    const sx = 2330, sw = MW - M - sx, sy = 440, sh = 1700;
    rr(ctx, sx, sy, sw, sh, 32, CARD);
    let y = sy + 100;
    sectionLabel(ctx, 'Especificações', sx + 60, y);
    y += 50;
    const rows = [
      ['Produto', d.modelo],
      colorName ? [P.colorLabel || 'Cor', colorName] : null,
      ['Medida da estampa', `${fmtCm(S.w)} × ${fmtCm(S.h)} cm  (${mm(S.w)} × ${mm(S.h)} mm)`],
      ['Arquivo', `PNG ${W} × ${H} px · ${DPI} dpi (tamanho final)`],
      ['Nome do arquivo', fileArt()],
      P.safe ? ['Margem de segurança', `${fmtCm(P.safe)} mm nas bordas (linha vermelha)`] : ['Fundo', 'Transparente: só imprime o desenho'],
      ...P.notes(S),
      d.qtd ? ['Quantidade', `${d.qtd} ${units(d.qtd)}`] : null,
    ].filter((r) => r && r[1]);
    for (const [key, v] of rows) {
      y += 62;
      ctx.font = font(500, 30); ctx.fillStyle = MUT; ctx.fillText(key, sx + 60, y);
      y += 52;
      ctx.font = font(600, key === 'Nome do arquivo' ? 30 : 40); ctx.fillStyle = INK;
      y = wrap(ctx, v, sx + 60, y, sw - 120, 50, 3) - 50;
      y += 18;
      ctx.fillStyle = LINE; ctx.fillRect(sx + 60, y + 14, sw - 120, 3);
    }
    if (d.obs && y < sy + sh - 200) {
      y += 96;
      sectionLabel(ctx, 'Observações', sx + 60, y);
      y += 62;
      ctx.font = font(400, 38); ctx.fillStyle = INK;
      wrap(ctx, d.obs, sx + 60, y, sw - 120, 52, Math.max(1, Math.floor((sy + sh - 30 - y) / 52) + 1));
    }

    // reconhecimento
    const by = 2210, bh = 170;
    rr(ctx, M, by, MW - 2 * M, bh, 32, ACC_SOFT);
    sectionLabel(ctx, 'Reconhecimento', M + 70, by + bh / 2 + 12, ACC);
    ctx.font = font(700, 76); ctx.fillStyle = ACC; ctx.textBaseline = 'middle';
    ctx.fillText(d.reconhecimento || '—', M + 520, by + bh / 2 + 4);
    ctx.textBaseline = 'alphabetic';

    ctx.font = font(400, 32); ctx.fillStyle = MUT; ctx.textAlign = 'center';
    ctx.fillText('A tela mostra as cores mais vivas do que saem no produto: confira a prova antes de produzir tudo.', MW / 2, MH - 50);
    ctx.textAlign = 'left';
  }

  /* ---------- janela ---------- */
  let cache = null, drawTimer = 0;
  async function ensureFonts() {
    await Promise.all(['700 104px Poppins', '600 46px Poppins', '500 32px Poppins', '400 32px Poppins'].map((f) => document.fonts.load(f).catch(() => {})));
  }
  function redraw() { if (!cache) return; const d = storeForm(); drawSheet(mCanvas.getContext('2d'), d, cache.art, cache.shots); }
  async function openModal() {
    fillForm(loadData());
    $('mTitle').textContent = `Estampa + manual · ${curP().name}`;
    $('mSavedNote').textContent = projectId
      ? `Também fica guardado no projeto (${await Store.where()}).`
      : 'Dica: dá um nome e salva o projeto que a estampa e o manual ficam guardados nele.';
    $('manualModal').hidden = false; $('mLoading').hidden = false;
    await ensureFonts();
    canvas.discardActiveObject(); canvas.renderAll();
    const art = exportCanvas();
    Mock.update(art);
    cache = { art, shots: Mock.shots(1240, 1000) };
    $('mLoading').hidden = true;
    redraw();
    prepare();
  }
  function closeModal() { $('manualModal').hidden = true; cache = null; markDirty(); }
  form.addEventListener('input', () => { clearTimeout(drawTimer); drawTimer = setTimeout(redraw, 200); });
  $('mClose').onclick = closeModal;
  $('manualModal').addEventListener('click', (e) => { if (e.target.id === 'manualModal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('manualModal').hidden) closeModal(); }, true);
  function quickPng() {
    canvas.discardActiveObject(); canvas.renderAll();
    exportCanvas().toBlob((b) => {
      download(b, `${slug()}-${sizeTag()}.png`);
      if (projectId) saveFileToProject('estampa.png', b).catch(() => {});
    }, 'image/png');
  }
  $('export').onclick = () => (curP().digital ? quickPng() : openModal());

  function slug() {
    const d = readForm();
    const name = [d.cliente, d.reconhecimento].filter(Boolean).join(' ') || $('projName').value || curP().name;
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'arte';
  }
  window.manualSlug = slug;
  const artBlob = () => new Promise((res) => cache.art.toBlob(res, 'image/png'));
  function pdfBlob() {
    redraw();
    const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    pdf.addImage(mCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210);
    return pdf.output('blob');
  }
  async function keep(files) {
    if (!projectId) return;
    try { for (const [n, b] of files) await saveFileToProject(n, b); await saveProject(false); $('mSavedNote').textContent = 'Guardado também no projeto.'; }
    catch (e) { console.error(e); $('mSavedNote').textContent = 'Baixou, mas não consegui guardar no projeto.'; }
  }
  // o .zip fica pronto antes do clique: o Chrome só deixa baixar na hora do clique
  let ready = null, prepTimer = 0, prepId = 0;
  async function prepare() {
    if (!cache) return;
    const my = ++prepId; ready = null;
    const btn = $('mBoth'); btn.disabled = true; btn.textContent = 'Preparando arquivos…'; $('mArtOnly').disabled = true;
    const a = await artBlob();
    const p = pdfBlob();
    const zip = new JSZip();
    zip.file(fileArt(), a);
    zip.file(`manual-${slug()}.pdf`, p);
    const z = await zip.generateAsync({ type: 'blob' });
    if (my !== prepId || !cache) return;
    ready = { a, p, z, name: `${slug()}-estampa-e-manual.zip` };
    btn.disabled = false; btn.textContent = 'Baixar estampa + manual (1 arquivo .zip)'; $('mArtOnly').disabled = false;
  }
  window.manualPrepare = () => { clearTimeout(prepTimer); prepTimer = setTimeout(prepare, 500); };
  form.addEventListener('input', window.manualPrepare);
  $('mArtOnly').onclick = () => {
    if (!ready) return;
    download(ready.a, fileArt());
    keep([['estampa.png', ready.a]]);
  };
  $('mBoth').onclick = () => {
    if (!ready) return;
    download(ready.z, ready.name);
    keep([['estampa.png', ready.a], ['manual.pdf', ready.p]]);
  };
})();
