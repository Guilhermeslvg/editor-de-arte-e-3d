// Onde os projetos ficam salvos:
//  - rodando com server.py (no Mac): na pasta projetos/<id>/
//  - no GitHub Pages (sem servidor): no próprio navegador (IndexedDB)
const Store = (() => {
  let mode = null; // 'server' | 'local'
  const DB = 'editor-arte-3d', ST = 'projetos';

  async function detect() {
    if (mode) return mode;
    try {
      const r = await fetch('/api/projetos', { cache: 'no-store' });
      const j = r.ok ? await r.json() : null;
      mode = Array.isArray(j) ? 'server' : 'local';
    } catch (e) { mode = 'local'; }
    return mode;
  }
  function slugify(nome) {
    return (nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'projeto';
  }
  async function post(path, body, raw) {
    const r = await fetch(path, { method: 'POST', headers: raw ? {} : { 'Content-Type': 'application/json' }, body: raw ? body : JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || 'Falha no servidor');
    return j;
  }

  /* ---------- IndexedDB ---------- */
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const q = indexedDB.open(DB, 1);
      q.onupgradeneeded = () => q.result.createObjectStore(ST, { keyPath: 'id' });
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
    return dbp;
  }
  async function tx(fn, rw) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(ST, rw ? 'readwrite' : 'readonly');
      const out = fn(t.objectStore(ST));
      t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
      t.onerror = () => rej(t.error);
    });
  }
  const getRec = (id) => tx((s) => s.get(id));
  const putRec = (rec) => tx((s) => s.put(rec), true);
  const allRecs = () => tx((s) => s.getAll());
  const dataUrlToBlob = async (u) => (await fetch(u)).blob();
  const urls = [];
  const objUrl = (b) => { if (!b) return null; const u = URL.createObjectURL(b); urls.push(u); return u; };

  /* ---------- api comum ---------- */
  async function list() {
    if ((await detect()) === 'server') {
      const l = await (await fetch('/api/projetos', { cache: 'no-store' })).json();
      return l.map((p) => ({
        ...p,
        estampaUrl: p.temEstampa ? `projetos/${p.id}/estampa.png` : null,
        manualUrl: p.temManual ? `projetos/${p.id}/manual.pdf` : null,
      }));
    }
    urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
    const recs = await allRecs();
    return recs.map((r) => ({
      id: r.id, nome: r.data.nome || r.id, produto: r.data.produtoNome || '', tamanho: r.data.tamanhoNome || '',
      cliente: (r.data.manual && r.data.manual.cliente) || '', criado: r.criado || r.atualizado || 0,
      atualizado: r.atualizado || 0, capa: r.capa || null, estampaUrl: objUrl(r.estampa), manualUrl: objUrl(r.manual),
    })).sort((a, b) => b.atualizado - a.atualizado);
  }
  async function novo(nome) {
    if ((await detect()) === 'server') return post('/api/projetos/novo', { nome });
    const base = slugify(nome);
    let id = base, i = 2;
    while (await getRec(id)) id = `${base}-${i++}`;
    await putRec({ id, data: { nome }, atualizado: Date.now(), criado: Date.now() });
    return { id };
  }
  async function salvar(id, dados) {
    if ((await detect()) === 'server') return post(`/api/projetos/${id}/salvar`, dados);
    const { capa, estampa, ...data } = dados;
    const rec = (await getRec(id)) || { id };
    rec.data = data; rec.atualizado = Date.now(); rec.criado = rec.criado || data.criado || Date.now();
    if (capa) rec.capa = capa;
    if (estampa) rec.estampa = await dataUrlToBlob(estampa);
    await putRec(rec);
    return { ok: true, atualizado: rec.atualizado };
  }
  async function arquivo(id, nome, blob) {
    if ((await detect()) === 'server') return post(`/api/projetos/${id}/arquivo?nome=${encodeURIComponent(nome)}`, blob, true);
    const rec = await getRec(id); if (!rec) return { ok: false };
    if (nome === 'estampa.png') rec.estampa = blob;
    if (nome === 'manual.pdf') rec.manual = blob;
    await putRec(rec);
    return { ok: true };
  }
  async function load(id) {
    if ((await detect()) === 'server') {
      const r = await fetch(`projetos/${id}/projeto.json?t=${Date.now()}`);
      if (!r.ok) throw new Error('não achei o projeto');
      return r.json();
    }
    const rec = await getRec(id);
    if (!rec || !rec.data || !rec.data.canvas) throw new Error('não achei o projeto');
    return rec.data;
  }
  async function apagar(id) {
    if ((await detect()) === 'server') return post(`/api/projetos/${id}/apagar`);
    await tx((s) => s.delete(id), true);
    return { ok: true };
  }
  const where = async () => ((await detect()) === 'server' ? 'pasta projetos/ no computador' : 'este navegador');
  return { detect, list, novo, salvar, arquivo, load, apagar, where };
})();
