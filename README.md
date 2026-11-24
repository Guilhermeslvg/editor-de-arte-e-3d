# Editor de Arte e 3D

Editor de estampa de caneca (20 × 9,5 cm, 300 dpi) com prévia em 3D e manual de produção.

## O que faz
- Abre a arte já no tamanho da caneca, com margem de 3 mm, centro e lados da alça marcados
- Adiciona fotos (vira adesivo oval com borda branca), texto, enfeites de Natal e emojis
- Mostra a caneca em 3D girando, atualizando enquanto edita
- Exporta a estampa em PNG 2362 × 1122 px
- Gera o **manual da caneca** em PDF (A4): arte aberta com medidas, caneca em 3 ângulos, especificações, nome do arquivo e faixa de reconhecimento (ex.: "Setor Atendimento"), pronto pra mandar pro vendedor da Shopee

## Como rodar
```bash
python3 -m http.server 5180 --bind 127.0.0.1
```
Abre http://127.0.0.1:5180 no Chrome.

A arte de fundo é o arquivo `arte.png` (dá pra trocar pelo botão "Trocar arte de fundo").

## Feito com
Fabric.js 5.3 (edição), Three.js r128 (caneca 3D), jsPDF 2.5 (manual).
