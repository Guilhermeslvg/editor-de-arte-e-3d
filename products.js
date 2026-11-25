const MOLDES = {};
// Produtos: medidas em cm. safe = margem de segurança em mm.
const fmtCm = (n) => String(n).replace('.', ',');
const TECIDO = [
  ['Branca', '#f5f5f2'], ['Preta', '#1d1d1f'], ['Cinza mescla', '#b8b8b5'],
  ['Azul marinho', '#1f2a44'], ['Vermelha', '#b3262b'], ['Verde', '#2f5d3a'],
];
const posicaoRoupa = (S) => S.x
  ? `Peito esquerdo (lado do coração), ${fmtCm(S.top)} cm abaixo da gola`
  : `${S.side === 'back' ? 'Costas' : 'Frente'}, centralizada, ${fmtCm(S.top)} cm abaixo da gola`;

const PRODUCTS = {
  caneca: {
    name: 'Caneca', title: 'Manual da caneca', na: 'na caneca', mock: 'mug', safe: 3, handle: true,
    modelo: 'Cerâmica branca 325 ml (Ø 8,2 × 9,5 cm)',
    sizes: [{ id: '325', label: '325 ml · 20 × 9,5 cm', w: 20, h: 9.5 }],
    notes: () => [['Posição', 'Centro da arte na frente, oposto à alça']],
  },
  magica: {
    name: 'Caneca mágica', title: 'Manual da caneca mágica', na: 'na caneca', mock: 'mug', safe: 3, handle: true,
    modelo: 'Caneca mágica preta 325 ml (Ø 8,2 × 9,5 cm)',
    sizes: [{ id: '325', label: '325 ml · 20 × 9,5 cm', w: 20, h: 9.5 }],
    notes: () => [['Posição', 'Centro da arte na frente, oposto à alça'], ['Atenção', 'Caneca preta: a arte aparece com bebida quente']],
  },
  quadro: {
    name: 'Quadro', title: 'Manual do quadro', na: 'no quadro', mock: 'frame', safe: 5,
    modelo: 'Quadro decorativo com moldura',
    colorLabel: 'Moldura',
    colors: [['Preta', '#1c1c1c'], ['Branca', '#f2f1ee'], ['Madeira', '#9a6a3c']],
    sizes: [
      { id: '20x30', label: '20 × 30 cm', w: 20, h: 30 },
      { id: 'a4', label: 'A4 · 21 × 29,7 cm', w: 21, h: 29.7 },
      { id: '30x40', label: '30 × 40 cm', w: 30, h: 40 },
      { id: '40x60', label: '40 × 60 cm', w: 40, h: 60 },
      { id: '30x20', label: '30 × 20 cm (deitado)', w: 30, h: 20 },
      { id: '40x30', label: '40 × 30 cm (deitado)', w: 40, h: 30 },
      { id: '60x40', label: '60 × 40 cm (deitado)', w: 60, h: 40 },
    ],
    notes: () => [['Moldura', 'Cobre uns 5 mm de cada lado: nada importante na borda']],
  },
  camiseta: {
    name: 'Camiseta', title: 'Manual da camiseta', na: 'na camiseta', mock: 'glb', model: 'camiseta', camElev: 0.22, molde: true, safe: 0, transparent: true,
    modelo: 'Camiseta de malha (molde tamanho M)',
    colorLabel: 'Cor do tecido', colors: TECIDO,
    sizes: [{ id: 'molde-m', label: 'Molde completo · tamanho M', w: 112, h: 108 }],
    notes: () => (MOLDES.camiseta ? [['Peças (cm)', MOLDES.camiseta.pecas.map((p) => `${p.label} ${fmtCm(p.w)}×${fmtCm(p.h)}`).join(' · ')]] : []),
  },
  moletom: {
    name: 'Moletom', title: 'Manual do moletom', na: 'no moletom', mock: 'glb', model: 'moletom', camElev: 0.04, molde: true, safe: 0, transparent: true,
    modelo: 'Moletom canguru com capuz (molde tamanho M)',
    colorLabel: 'Cor do tecido', colors: TECIDO,
    sizes: [{ id: 'molde-m', label: 'Molde completo · tamanho M', w: 160, h: 191 }],
    notes: () => (MOLDES.moletom ? [['Peças (cm)', MOLDES.moletom.pecas.map((p) => `${p.label} ${fmtCm(p.w)}×${fmtCm(p.h)}`).join(' · ')]] : []),
  },
  sueter: {
    name: 'Suéter', title: 'Manual do suéter', na: 'no suéter', mock: 'glb', model: 'sueter', camElev: 0.1, molde: true, safe: 0, transparent: true,
    modelo: 'Suéter gola careca em moletom (molde tamanho M)',
    colorLabel: 'Cor do tecido', colors: TECIDO,
    sizes: [{ id: 'molde-m', label: 'Molde completo · tamanho M', w: 140, h: 150 }],
    notes: () => (MOLDES.sueter ? [['Peças (cm)', MOLDES.sueter.pecas.map((p) => `${p.label} ${fmtCm(p.w)}×${fmtCm(p.h)}`).join(' · ')]] : []),
  },
  almofada: {
    name: 'Almofada', title: 'Manual da almofada', na: 'na almofada', mock: 'pillow', safe: 15,
    modelo: 'Almofada em tecido oxford com enchimento',
    sizes: [
      { id: '40', label: '40 × 40 cm', w: 40, h: 40 },
      { id: '30', label: '30 × 30 cm', w: 30, h: 30 },
      { id: '45', label: '45 × 45 cm', w: 45, h: 45 },
      { id: '50x30', label: '50 × 30 cm (retangular)', w: 50, h: 30 },
    ],
    notes: () => [['Costura', 'A costura come 1,5 cm de cada lado']],
  },
  azulejo: {
    name: 'Azulejo', title: 'Manual do azulejo', na: 'no azulejo', mock: 'tile', safe: 3,
    modelo: 'Azulejo cerâmico branco para sublimação',
    sizes: [
      { id: '15', label: '15 × 15 cm', w: 15, h: 15 },
      { id: '20', label: '20 × 20 cm', w: 20, h: 20 },
      { id: '20x15', label: '20 × 15 cm (deitado)', w: 20, h: 15 },
    ],
    notes: () => [],
  },
  chaveiro: {
    name: 'Chaveiro', title: 'Manual do chaveiro', na: 'no chaveiro', mock: 'keychain', safe: 2,
    modelo: 'Chaveiro de acrílico com argola',
    sizes: [
      { id: '4x6', label: '4 × 6 cm', w: 4, h: 6 },
      { id: '5x5', label: '5 × 5 cm', w: 5, h: 5 },
      { id: '3x5', label: '3,5 × 5 cm', w: 3.5, h: 5 },
    ],
    notes: () => [['Furo', 'Furo da argola fica acima da arte, fora da estampa']],
  },
  bone: {
    name: 'Boné', title: 'Manual do boné', na: 'no boné', mock: 'glb', model: 'bone', molde: true, safe: 0, transparent: true, camElev: 0.32,
    modelo: 'Boné americano 6 gomos (aba curva, fecho regulável)',
    colorLabel: 'Cor', colors: TECIDO,
    sizes: [{ id: 'molde-u', label: 'Molde completo · tamanho único', w: 70, h: 75 }],
    notes: () => (MOLDES.bone ? [['Peças (cm)', MOLDES.bone.pecas.map((p) => `${p.label} ${fmtCm(p.w)}×${fmtCm(p.h)}`).join(' · ')]] : []),
  },
  instagram: {
    name: 'Post de Instagram', title: 'Arte digital', na: 'no celular', mock: 'phone', safe: 0, digital: true,
    modelo: 'Arte digital para redes sociais',
    sizes: [
      { id: 'quadrado', label: 'Feed quadrado · 1080 × 1080', w: 1080, h: 1080 },
      { id: 'retrato', label: 'Feed retrato · 1080 × 1350', w: 1080, h: 1350 },
      { id: 'story', label: 'Story / Reels · 1080 × 1920', w: 1080, h: 1920 },
      { id: 'paisagem', label: 'Paisagem · 1080 × 566', w: 1080, h: 566 },
    ],
    notes: () => [],
  },
};
