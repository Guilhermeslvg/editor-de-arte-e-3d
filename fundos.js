// Fundos prontos: cor lisa, degradê e estampas que repetem
const FUNDOS = [
  { id: 'branco', label: 'Branco', type: 'cor', c: '#ffffff' },
  { id: 'creme', label: 'Creme', type: 'cor', c: '#f6efe3' },
  { id: 'preto', label: 'Preto', type: 'cor', c: '#1d1d1f' },
  { id: 'vermelho', label: 'Vermelho', type: 'cor', c: '#c8312f' },
  { id: 'verde', label: 'Verde', type: 'cor', c: '#2f6b45' },
  { id: 'azul', label: 'Azul', type: 'cor', c: '#1f3b6b' },
  { id: 'rosa', label: 'Rosa', type: 'cor', c: '#f7c8d4' },
  { id: 'amarelo', label: 'Amarelo', type: 'cor', c: '#fbe7a1' },
  { id: 'lilas', label: 'Lilás', type: 'cor', c: '#d9c8f5' },
  { id: 'menta', label: 'Menta', type: 'cor', c: '#c9efdc' },
  { id: 'g-sol', label: 'Pôr do sol', type: 'grad', stops: ['#ff9a8b', '#ffd36e'] },
  { id: 'g-ceu', label: 'Céu', type: 'grad', stops: ['#a1c4fd', '#c2e9fb'] },
  { id: 'g-natal', label: 'Natal', type: 'grad', stops: ['#7a1717', '#c8312f'] },
  { id: 'g-noite', label: 'Noite', type: 'grad', stops: ['#0f2027', '#2c5364'] },
  { id: 'g-algodao', label: 'Algodão doce', type: 'grad', stops: ['#fbc2eb', '#a6c1ee'] },
  { id: 'g-limao', label: 'Limão', type: 'grad', stops: ['#d4fc79', '#96e6a1'] },
  { id: 'p-quadriculado', label: 'Quadriculado', type: 'pat', bg: '#faf8f4', fg: '#e2ddd3' },
  { id: 'p-bolinhas', label: 'Bolinhas', type: 'pat', bg: '#fff1f3', fg: '#f4a3b5' },
  { id: 'p-listras', label: 'Listras', type: 'pat', bg: '#ffffff', fg: '#fde2e2' },
  { id: 'p-xadrez', label: 'Xadrez', type: 'pat', bg: '#c8312f', fg: '#7a1717' },
  { id: 'p-coracoes', label: 'Corações', type: 'pat', bg: '#fff5f6', fg: '#f08a9b' },
  { id: 'p-flocos', label: 'Flocos de neve', type: 'pat', bg: '#1f3b6b', fg: '#ffffff' },
  { id: 'p-estrelas', label: 'Estrelinhas', type: 'pat', bg: '#fdf6e3', fg: '#f5c518' },
  { id: 'p-confete', label: 'Confete', type: 'pat', bg: '#ffffff', fg: '#000000' },
];

function fundoTile(def, s) {
  const c = document.createElement('canvas'); c.width = c.height = Math.max(8, Math.round(s));
  s = c.width;
  const x = c.getContext('2d');
  x.fillStyle = def.bg; x.fillRect(0, 0, s, s);
  x.fillStyle = def.fg; x.strokeStyle = def.fg; x.lineCap = 'round';
  const two = [[s / 4, s / 4], [(3 * s) / 4, (3 * s) / 4]];
  const heart = (cx, cy, r) => {
    x.beginPath(); x.moveTo(cx, cy + r * 0.9);
    x.bezierCurveTo(cx - r * 1.4, cy, cx - r * 0.9, cy - r * 1.1, cx, cy - r * 0.35);
    x.bezierCurveTo(cx + r * 0.9, cy - r * 1.1, cx + r * 1.4, cy, cx, cy + r * 0.9); x.fill();
  };
  const star = (cx, cy, r) => {
    x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
    x.closePath(); x.fill();
  };
  const flake = (cx, cy, r) => {
    x.lineWidth = Math.max(1, r * 0.16);
    for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); x.stroke(); }
  };
  switch (def.id) {
    case 'p-quadriculado': x.lineWidth = Math.max(1, s * 0.025); x.beginPath(); x.moveTo(0, 0.5); x.lineTo(s, 0.5); x.moveTo(0.5, 0); x.lineTo(0.5, s); x.stroke(); break;
    case 'p-bolinhas': two.forEach(([a, b]) => { x.beginPath(); x.arc(a, b, s * 0.11, 0, Math.PI * 2); x.fill(); }); break;
    case 'p-listras':
      x.lineWidth = s * 0.22;
      for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(k * (s / 2), 0); x.lineTo(k * (s / 2) + s, s); x.stroke(); }
      break;
    case 'p-xadrez':
      x.globalAlpha = 0.45; x.fillRect(0, 0, s / 2, s); x.fillRect(0, 0, s, s / 2);
      x.globalAlpha = 0.35; x.fillStyle = '#000'; x.fillRect(0, 0, s / 2, s / 2);
      x.globalAlpha = 0.25; x.fillStyle = '#ffffff'; x.fillRect(s * 0.74, 0, s * 0.03, s); x.fillRect(0, s * 0.74, s, s * 0.03);
      x.globalAlpha = 1; break;
    case 'p-coracoes': two.forEach(([a, b]) => heart(a, b, s * 0.1)); break;
    case 'p-flocos': two.forEach(([a, b]) => flake(a, b, s * 0.1)); break;
    case 'p-estrelas': two.forEach(([a, b]) => star(a, b, s * 0.11)); break;
    case 'p-confete': {
      const cs = ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#a855f7', '#f97316'];
      const pts = [[0.15, 0.2], [0.55, 0.12], [0.82, 0.4], [0.3, 0.55], [0.65, 0.7], [0.12, 0.85], [0.45, 0.9], [0.88, 0.82]];
      pts.forEach(([a, b], i) => {
        x.fillStyle = cs[i % cs.length];
        if (i % 2) { x.beginPath(); x.arc(a * s, b * s, s * 0.035, 0, Math.PI * 2); x.fill(); }
        else { x.save(); x.translate(a * s, b * s); x.rotate(i); x.fillRect(-s * 0.05, -s * 0.02, s * 0.1, s * 0.04); x.restore(); }
      });
      break;
    }
  }
  return c;
}

function fundoFill(def, W, H, cell) {
  if (def.type === 'cor') return def.c;
  if (def.type === 'grad') {
    return new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: 0, x2: W, y2: H }, colorStops: [{ offset: 0, color: def.stops[0] }, { offset: 1, color: def.stops[1] }] });
  }
  return new fabric.Pattern({ source: fundoTile(def, cell), repeat: 'repeat' });
}

function fundoThumbCss(def) {
  if (def.type === 'cor') return def.c;
  if (def.type === 'grad') return `linear-gradient(135deg, ${def.stops[0]}, ${def.stops[1]})`;
  return `url(${fundoTile(def, 22).toDataURL()}) repeat`;
}
