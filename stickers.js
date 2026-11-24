// Enfeites desenhados (SVG) no estilo das artes
const SVG = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${inner}</svg>`;
function snowflakeSvg(c) {
  let s = '';
  const line = (x1, y1, x2, y2) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    const p = (r, da = 0) => [50 + r * Math.cos(a + da), 50 + r * Math.sin(a + da)];
    const [ex, ey] = p(42), [bx, by] = p(26);
    s += line(50, 50, ex, ey);
    const ang = 0.55;
    s += line(bx, by, bx + 12 * Math.cos(a + ang), by + 12 * Math.sin(a + ang));
    s += line(bx, by, bx + 12 * Math.cos(a - ang), by + 12 * Math.sin(a - ang));
  }
  return SVG(s);
}
const HEART = 'M50 86 C 22 66 9 48 14 31 C 19 15 41 12 50 30 C 59 12 81 15 86 31 C 91 48 78 66 50 86 Z';
const STICKERS = {
  gorro: { label: 'Gorro', size: 360, svg: () => SVG(
    `<path d="M8 74 C 14 44 34 18 60 15 C 80 13 93 25 93 44 C 93 50 91 55 88 58 C 85 46 77 40 67 42 C 73 52 77 63 80 74 Z" fill="#d62b2b"/>
     <path d="M28 44 C 38 30 50 23 62 21" fill="none" stroke="#a81d1d" stroke-width="3" stroke-linecap="round" opacity=".55"/>
     <rect x="3" y="65" width="84" height="23" rx="11.5" fill="#ffffff" stroke="#dedede" stroke-width="2"/>
     <circle cx="88" cy="59" r="10.5" fill="#ffffff" stroke="#dedede" stroke-width="2"/>`) },
  arvore: { label: 'Árvore', svg: () => SVG(
    `<rect x="44" y="80" width="12" height="13" rx="2" fill="#8a5a2b"/>
     <path d="M50 14 L70 42 L60 42 L78 64 L64 64 L84 84 L16 84 L36 64 L22 64 L40 42 L30 42 Z" fill="#2f9e55" stroke="#26864a" stroke-width="2" stroke-linejoin="round"/>
     <path d="M50 3 L53 10 L61 10 L55 15 L57 23 L50 18 L43 23 L45 15 L39 10 L47 10 Z" fill="#f5c518"/>
     <circle cx="44" cy="50" r="3.6" fill="#e23b3b"/><circle cx="58" cy="57" r="3.6" fill="#f5c518"/>
     <circle cx="40" cy="73" r="3.6" fill="#f5c518"/><circle cx="57" cy="76" r="3.6" fill="#e23b3b"/><circle cx="66" cy="70" r="3.2" fill="#ffffff"/>`) },
  boneco: { label: 'Boneco de neve', svg: () => SVG(
    `<circle cx="50" cy="72" r="20" fill="#ffffff" stroke="#2b2b2b" stroke-width="3"/>
     <circle cx="50" cy="39" r="14" fill="#ffffff" stroke="#2b2b2b" stroke-width="3"/>
     <rect x="38" y="13" width="24" height="15" rx="2" fill="#222222"/><rect x="31" y="26" width="38" height="5" rx="2" fill="#222222"/>
     <circle cx="45" cy="37" r="2" fill="#222222"/><circle cx="55" cy="37" r="2" fill="#222222"/>
     <path d="M50 41 L63 44 L50 45.5 Z" fill="#f28c28"/>
     <rect x="35" y="50" width="30" height="7" rx="3.5" fill="#d62b2b"/><path d="M56 55 L61 68 L54 68 L52 56 Z" fill="#d62b2b"/>
     <circle cx="50" cy="66" r="2.2" fill="#222222"/><circle cx="50" cy="76" r="2.2" fill="#222222"/>`) },
  presente: { label: 'Presente', svg: () => SVG(
    `<rect x="18" y="42" width="64" height="48" rx="3" fill="#d62b2b"/><rect x="12" y="31" width="76" height="15" rx="3" fill="#e23b3b"/>
     <rect x="45" y="31" width="10" height="59" fill="#2f9e55"/>
     <path d="M50 31 C 40 13 25 17 31 27 C 35 32 44 31 50 31 Z" fill="#2f9e55"/>
     <path d="M50 31 C 60 13 75 17 69 27 C 65 32 56 31 50 31 Z" fill="#2f9e55"/>`) },
  floco: { label: 'Floco de neve', color: '#d63333', svg: snowflakeSvg },
  coracao: { label: 'Coração', color: '#d63333', svg: (c) => SVG(`<path d="${HEART}" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`) },
  coracaoCheio: { label: 'Coração cheio', color: '#e23b3b', svg: (c) => SVG(`<path d="${HEART}" fill="${c}"/>`) },
  brilho: { label: 'Brilho', color: '#d63333', svg: (c) => SVG(`<path d="M50 6 C 53 38 62 47 94 50 C 62 53 53 62 50 94 C 47 62 38 53 6 50 C 38 47 47 38 50 6 Z" fill="none" stroke="${c}" stroke-width="4.5" stroke-linejoin="round"/>`) },
  estrela: { label: 'Estrela', color: '#f5c518', svg: (c) => SVG(`<path d="M50 8 L61 37 L92 38 L68 58 L76 89 L50 71 L24 89 L32 58 L8 38 L39 37 Z" fill="${c}" stroke="#d9a800" stroke-width="3" stroke-linejoin="round"/>`) },
  risquinhos: { label: 'Risquinhos', color: '#2f9e55', svg: (c) => SVG(
    `<line x1="26" y1="40" x2="36" y2="56" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
     <line x1="50" y1="28" x2="50" y2="50" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
     <line x1="74" y1="40" x2="64" y2="56" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`) },
  bolinha: { label: 'Bolinha', color: '#2f9e55', size: 40, svg: (c) => SVG(`<circle cx="50" cy="50" r="40" fill="${c}"/>`) },
  bengala: { label: 'Bengala doce', svg: () => SVG(
    `<path d="M60 92 L60 34 C 60 14 32 14 32 32" fill="none" stroke="#d9d9d9" stroke-width="15" stroke-linecap="round"/>
     <path d="M60 92 L60 34 C 60 14 32 14 32 32" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/>
     <path d="M60 92 L60 34 C 60 14 32 14 32 32" fill="none" stroke="#d62b2b" stroke-width="12" stroke-dasharray="7 7"/>`) },
  azevinho: { label: 'Azevinho', svg: () => SVG(
    `<path d="M50 52 C 36 30 16 34 10 46 C 24 47 34 55 50 52 Z" fill="#2f9e55"/>
     <path d="M50 52 C 64 30 84 34 90 46 C 76 47 66 55 50 52 Z" fill="#2f9e55"/>
     <circle cx="44" cy="56" r="7" fill="#d62b2b"/><circle cx="56" cy="56" r="7" fill="#d62b2b"/><circle cx="50" cy="66" r="7" fill="#d62b2b"/>`) },
};

// ---------- mais enfeites (temas: Amor, Festa, Formas, Fofos) ----------
const STAR5 = 'M50 8 L61 37 L92 38 L68 58 L76 89 L50 71 L24 89 L32 58 L8 38 L39 37 Z';
Object.assign(STICKERS, {
  coracaoDuplo: { label: 'Dois corações', cat: 'Amor', svg: () => SVG(
    `<path d="M38 80 C 16 64 6 50 10 36 C 14 23 32 21 38 35 C 44 21 62 23 66 36 C 70 50 60 64 38 80 Z" fill="#e23b3b"/>
     <path d="M66 70 C 50 58 43 48 46 38 C 49 29 62 27 66 37 C 70 27 83 29 86 38 C 89 48 82 58 66 70 Z" fill="#f48aa0" stroke="#ffffff" stroke-width="3"/>`) },
  cartinha: { label: 'Cartinha', cat: 'Amor', svg: () => SVG(
    `<rect x="12" y="26" width="76" height="52" rx="6" fill="#fff4f0" stroke="#d63333" stroke-width="4"/>
     <path d="M14 30 L50 58 L86 30" fill="none" stroke="#d63333" stroke-width="4" stroke-linejoin="round"/>
     <path d="M50 70 C 40 63 36 57 38 52 C 40 47 47 47 50 52 C 53 47 60 47 62 52 C 64 57 60 63 50 70 Z" fill="#e23b3b"/>`) },
  balaoCoracao: { label: 'Balão de coração', cat: 'Amor', color: '#e23b3b', svg: (c) => SVG(
    `<path d="M50 66 C 26 50 16 38 20 26 C 24 14 42 12 50 26 C 58 12 76 14 80 26 C 84 38 74 50 50 66 Z" fill="${c}"/>
     <path d="M50 66 C 46 76 56 82 50 94" fill="none" stroke="#7a746b" stroke-width="2"/>
     <path d="M32 26 C 34 22 38 20 42 21" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`) },
  balao: { label: 'Balão', cat: 'Festa', color: '#3b82d6', svg: (c) => SVG(
    `<ellipse cx="50" cy="40" rx="26" ry="32" fill="${c}"/>
     <path d="M46 71 L54 71 L50 76 Z" fill="${c}"/>
     <path d="M50 76 C 44 84 56 88 50 97" fill="none" stroke="#7a746b" stroke-width="2"/>
     <path d="M36 28 C 38 22 43 18 48 18" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".6"/>`) },
  chapeuFesta: { label: 'Chapéu de festa', cat: 'Festa', svg: () => SVG(
    `<path d="M50 8 L78 88 L22 88 Z" fill="#8b5cf6"/>
     <path d="M41 34 L59 34 M35 52 L65 52 M29 70 L71 70" stroke="#facc15" stroke-width="6" stroke-linecap="round"/>
     <circle cx="50" cy="9" r="7" fill="#f472b6"/><rect x="18" y="84" width="64" height="8" rx="4" fill="#facc15"/>`) },
  confete: { label: 'Confete', cat: 'Festa', svg: () => SVG(
    `<rect x="14" y="18" width="10" height="5" rx="2" fill="#ef4444" transform="rotate(25 19 20)"/>
     <rect x="70" y="14" width="10" height="5" rx="2" fill="#3b82f6" transform="rotate(-30 75 16)"/>
     <circle cx="44" cy="30" r="4" fill="#facc15"/><circle cx="82" cy="52" r="4" fill="#22c55e"/>
     <rect x="24" y="60" width="10" height="5" rx="2" fill="#a855f7" transform="rotate(-20 29 62)"/>
     <rect x="58" y="74" width="10" height="5" rx="2" fill="#f97316" transform="rotate(40 63 76)"/>
     <circle cx="18" cy="84" r="4" fill="#3b82f6"/><circle cx="60" cy="46" r="3" fill="#ef4444"/>
     <path d="M36 44 q 6 -6 12 0 t 12 0" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>`) },
  bandeirinhas: { label: 'Bandeirinhas', cat: 'Festa', svg: () => SVG(
    `<path d="M4 22 C 30 36 70 36 96 22" fill="none" stroke="#7a746b" stroke-width="2"/>
     <path d="M10 25 L24 30 L15 52 Z" fill="#ef4444"/><path d="M30 31 L46 33 L37 56 Z" fill="#facc15"/>
     <path d="M54 33 L70 31 L63 56 Z" fill="#3b82f6"/><path d="M76 30 L90 25 L85 52 Z" fill="#22c55e"/>`) },
  bolo: { label: 'Bolo', cat: 'Festa', svg: () => SVG(
    `<rect x="18" y="52" width="64" height="36" rx="6" fill="#f9a8d4"/>
     <path d="M18 60 C 26 68 34 52 42 60 C 50 68 58 52 66 60 C 72 66 78 58 82 60 L82 52 L18 52 Z" fill="#ffffff"/>
     <rect x="47" y="30" width="6" height="22" rx="2" fill="#60a5fa"/><path d="M50 18 C 56 24 54 30 50 30 C 46 30 44 24 50 18 Z" fill="#f59e0b"/>
     <rect x="12" y="86" width="76" height="6" rx="3" fill="#d6d3d1"/>`) },
  estrelaCadente: { label: 'Estrela cadente', cat: 'Festa', svg: () => SVG(
    `<path d="M8 80 L52 46" stroke="#facc15" stroke-width="6" stroke-linecap="round" opacity=".5"/>
     <path d="M18 90 L54 58" stroke="#f472b6" stroke-width="4" stroke-linecap="round" opacity=".5"/>
     <path d="M66 14 L72 30 L89 31 L76 42 L80 59 L66 50 L52 59 L56 42 L43 31 L60 30 Z" fill="#facc15" stroke="#e0a800" stroke-width="2" stroke-linejoin="round"/>`) },
  coroa: { label: 'Coroa', cat: 'Festa', svg: () => SVG(
    `<path d="M14 72 L10 30 L32 48 L50 20 L68 48 L90 30 L86 72 Z" fill="#facc15" stroke="#d9a800" stroke-width="3" stroke-linejoin="round"/>
     <rect x="14" y="72" width="72" height="12" rx="3" fill="#f59e0b"/>
     <circle cx="50" cy="56" r="5" fill="#ef4444"/><circle cx="30" cy="62" r="4" fill="#3b82f6"/><circle cx="70" cy="62" r="4" fill="#22c55e"/>`) },
  sol: { label: 'Sol', cat: 'Fofos', svg: () => {
    let r = ''; for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; r += `<line x1="${(50 + 30 * Math.cos(a)).toFixed(1)}" y1="${(50 + 30 * Math.sin(a)).toFixed(1)}" x2="${(50 + 44 * Math.cos(a)).toFixed(1)}" y2="${(50 + 44 * Math.sin(a)).toFixed(1)}" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/>`; }
    return SVG(`${r}<circle cx="50" cy="50" r="22" fill="#facc15"/><circle cx="43" cy="47" r="2.5" fill="#7c2d12"/><circle cx="57" cy="47" r="2.5" fill="#7c2d12"/><path d="M42 56 C 46 61 54 61 58 56" fill="none" stroke="#7c2d12" stroke-width="2.5" stroke-linecap="round"/>`); } },
  nuvem: { label: 'Nuvem', cat: 'Fofos', svg: () => SVG(
    `<path d="M24 72 C 10 72 8 54 20 50 C 18 36 34 30 42 38 C 46 24 68 24 70 40 C 84 38 92 52 84 62 C 90 70 82 74 76 72 Z" fill="#ffffff" stroke="#93c5fd" stroke-width="4" stroke-linejoin="round"/>`) },
  flor: { label: 'Flor', cat: 'Fofos', color: '#f472b6', svg: (c) => {
    let p = ''; for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; p += `<circle cx="${(50 + 20 * Math.cos(a)).toFixed(1)}" cy="${(46 + 20 * Math.sin(a)).toFixed(1)}" r="14" fill="${c}"/>`; }
    return SVG(`<path d="M50 60 C 50 75 48 85 50 96" stroke="#22c55e" stroke-width="5" fill="none"/>${p}<circle cx="50" cy="46" r="11" fill="#facc15"/>`); } },
  folha: { label: 'Folha', cat: 'Fofos', color: '#22c55e', svg: (c) => SVG(
    `<path d="M20 82 C 18 40 46 14 86 14 C 86 54 62 84 20 82 Z" fill="${c}"/>
     <path d="M20 82 C 40 62 56 44 76 26" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`) },
  arcoIris: { label: 'Arco-íris', cat: 'Fofos', svg: () => SVG(
    `<path d="M10 74 A 40 40 0 0 1 90 74" fill="none" stroke="#ef4444" stroke-width="8"/>
     <path d="M18 74 A 32 32 0 0 1 82 74" fill="none" stroke="#f59e0b" stroke-width="8"/>
     <path d="M26 74 A 24 24 0 0 1 74 74" fill="none" stroke="#22c55e" stroke-width="8"/>
     <path d="M34 74 A 16 16 0 0 1 66 74" fill="none" stroke="#3b82f6" stroke-width="8"/>`) },
  raio: { label: 'Raio', cat: 'Formas', color: '#facc15', svg: (c) => SVG(`<path d="M58 6 L22 56 L46 56 L38 94 L78 40 L54 40 Z" fill="${c}" stroke="#1f1d1a" stroke-width="3" stroke-linejoin="round"/>`) },
  falas: { label: 'Balão de fala', cat: 'Formas', color: '#ffffff', svg: (c) => SVG(`<path d="M14 20 H86 A 8 8 0 0 1 94 28 V64 A 8 8 0 0 1 86 72 H40 L22 88 L26 72 H14 A 8 8 0 0 1 6 64 V28 A 8 8 0 0 1 14 20 Z" fill="${c}" stroke="#1f1d1a" stroke-width="4" stroke-linejoin="round"/>`) },
  faixa: { label: 'Faixa', cat: 'Formas', color: '#d63333', svg: (c) => SVG(
    `<path d="M4 40 L20 40 L20 70 L4 70 L12 55 Z" fill="${c}" opacity=".75"/><path d="M96 40 L80 40 L80 70 L96 70 L88 55 Z" fill="${c}" opacity=".75"/>
     <rect x="14" y="30" width="72" height="32" rx="2" fill="${c}"/>`) },
  circulo: { label: 'Círculo', cat: 'Formas', color: '#f4a3b5', svg: (c) => SVG(`<circle cx="50" cy="50" r="44" fill="${c}"/>`) },
  quadrado: { label: 'Quadrado', cat: 'Formas', color: '#93c5fd', svg: (c) => SVG(`<rect x="8" y="8" width="84" height="84" rx="14" fill="${c}"/>`) },
  estrelaForma: { label: 'Estrela', cat: 'Formas', color: '#facc15', svg: (c) => SVG(`<path d="${STAR5}" fill="${c}"/>`) },
  seta: { label: 'Seta', cat: 'Formas', color: '#1f1d1a', svg: (c) => SVG(`<path d="M10 70 C 30 30 60 26 80 36" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M68 24 L84 37 L66 48" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`) },
});
['gorro', 'arvore', 'boneco', 'presente', 'floco', 'bengala', 'azevinho'].forEach((k) => { STICKERS[k].cat = 'Natal'; });
['coracao', 'coracaoCheio'].forEach((k) => { STICKERS[k].cat = 'Amor'; });
['brilho', 'estrela', 'risquinhos', 'bolinha'].forEach((k) => { STICKERS[k].cat = 'Formas'; });
const STICKER_CATS = ['Natal', 'Amor', 'Festa', 'Fofos', 'Formas'];

const EMOJI_CATS = {
  'Rostos': ['😀', '😂', '🥰', '😍', '😎', '🤩', '😇', '🥳', '😘', '🤗', '😜', '🙃', '😴', '🤔', '😭', '😡'],
  'Amor': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💘', '💝', '💌', '💋', '🌹', '💐'],
  'Festa': ['🎉', '🎊', '🎈', '🎂', '🍰', '🎁', '🥂', '🍾', '🎆', '✨', '🎀', '👑', '🏆', '🥇', '🎵', '🪩'],
  'Natal': ['🎄', '🎅', '🤶', '⛄', '❄️', '🦌', '🔔', '🍪', '🕯️', '🧦', '🌟', '⭐', '🎁', '☃️', '🍬', '🛷'],
  'Natureza': ['🌸', '🌻', '🌷', '🌿', '🍀', '🌈', '☀️', '🌙', '⭐', '🌊', '🔥', '🦋', '🐶', '🐱', '🐰', '🦄'],
  'Comida': ['🍕', '🍔', '🍟', '🍩', '🍫', '🍦', '🍓', '🍉', '🍇', '🥑', '☕', '🧋', '🍿', '🍭', '🥐', '🍣'],
  'Objetos': ['📸', '💄', '💅', '👗', '👟', '💍', '🎮', '⚽', '🏀', '📚', '✏️', '💻', '📱', '🎧', '🚗', '✈️'],
};
