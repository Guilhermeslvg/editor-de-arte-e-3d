# Editor de Arte e 3D

Editor de estampas para produtos personalizados, com prévia em 3D e manual de produção em PDF.

**Produtos:** caneca, caneca mágica, quadro, camiseta, moletom, almofada, azulejo, chaveiro e boné, cada um com seus tamanhos e com opção de medida personalizada (em cm).

## O que faz
- Abre a arte no tamanho certo do produto, com a margem de segurança marcada
- Adiciona fotos (vira adesivo oval com borda branca), texto, enfeites e emojis
- Mostra o produto em 3D, atualizando enquanto edita
- Exporta a estampa em PNG no tamanho de impressão (300 dpi até 60 cm)
- Gera o **manual de produção** em PDF (A4): arte aberta com medidas, produto em 3 ângulos, especificações, nome do arquivo e faixa de reconhecimento
- Baixa estampa + manual juntos num `.zip`, ou só a arte em PNG
- **Meus projetos**: cada arte fica salva e aparece numa galeria com capa em 3D

## Onde os projetos ficam salvos
- **No GitHub Pages:** no próprio navegador (IndexedDB). Cada navegador tem os seus.
- **No computador, com o servidor:** cada projeto vira uma pasta em `projetos/<nome>/` com `projeto.json`, `capa.png`, `estampa.png` e `manual.pdf`. Essa pasta não vai pro GitHub.

## Rodar no computador
```bash
python3 server.py
```
Abre http://127.0.0.1:5180 no Chrome.

## Feito com
Fabric.js 5.3 (edição), Three.js r128 (prévia 3D), jsPDF 2.5 (manual) e JSZip 3.10 (download em zip).
