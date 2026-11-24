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
