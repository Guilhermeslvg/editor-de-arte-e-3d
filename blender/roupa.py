# Fábrica de roupas 3D com molde de costura real.
# Rodar (sem janela): Blender -b -P blender/roupa.py -- <camiseta|moletom> <pasta_saida>
# Saída: <nome>.glb (UV = molde aberto), <nome>-molde.json, <nome>-ao.png (sombra de dobra), <nome>-preview.png
import bpy, bmesh, json, math, os, sys
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt
from mathutils.kdtree import KDTree

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
NOME = ARGS[0] if ARGS else 'camiseta'
OUT = ARGS[1] if len(ARGS) > 1 else os.getcwd()
os.makedirs(OUT, exist_ok=True)
CM = 0.01

# ---------------- utilidades 2D ----------------
def bez(p0, c, p1, n=60):
    return [((1-t)**2*p0[0] + 2*(1-t)*t*c[0] + t*t*p1[0], (1-t)**2*p0[1] + 2*(1-t)*t*c[1] + t*t*p1[1]) for t in (i/n for i in range(n+1))]
def bez3(p0, c0, c1, p1, n=60):
    out = []
    for i in range(n+1):
        t = i/n; u = 1-t
        out.append((u**3*p0[0] + 3*u*u*t*c0[0] + 3*u*t*t*c1[0] + t**3*p1[0], u**3*p0[1] + 3*u*u*t*c0[1] + 3*u*t*t*c1[1] + t**3*p1[1]))
    return out
def line(a, b): return [a, b]
def plen(pts): return sum(math.dist(pts[i], pts[i+1]) for i in range(len(pts)-1))
def resample(pts, n):
    L = plen(pts); seg = [math.dist(pts[i], pts[i+1]) for i in range(len(pts)-1)]
    out = []; acc = 0; j = 0
    for k in range(n+1):
        d = L * k / n
        while j < len(seg)-1 and acc + seg[j] < d: acc += seg[j]; j += 1
        t = 0 if seg[j] == 0 else min(1, (d - acc) / seg[j])
        out.append((pts[j][0] + (pts[j+1][0]-pts[j][0])*t, pts[j][1] + (pts[j+1][1]-pts[j][1])*t))
    return out
def split_curve(pts, frac):
    L = plen(pts); acc = 0
    for i in range(len(pts)-1):
        d = math.dist(pts[i], pts[i+1])
        if acc + d >= L * frac:
            t = (L * frac - acc) / d if d else 0
            m = (pts[i][0] + (pts[i+1][0]-pts[i][0])*t, pts[i][1] + (pts[i+1][1]-pts[i][1])*t)
            return pts[:i+1] + [m], [m] + pts[i+1:]
        acc += d
    return pts, [pts[-1]]
def mirror(segs): return [(n, [(-x, y) for x, y in pts]) for n, pts in segs]
def inside(pt, poly):
    x, y = pt; c = False
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[(i+1) % len(poly)]
        if (y1 > y) != (y2 > y) and x < (x2-x1)*(y-y1)/(y2-y1) + x1: c = not c
    return c
def dist_seg(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx-ax, by-ay; L2 = dx*dx + dy*dy
    t = 0 if L2 == 0 else max(0, min(1, ((px-ax)*dx + (py-ay)*dy)/L2))
    return math.hypot(px-(ax+t*dx), py-(ay+t*dy))

# ---------------- peças base ----------------
def tronco(W, L, shx, shy, nkx, nky, armx_low, army_low, arm_ctrl, neck_ctrl_y):
    neckR, neckL = split_curve(bez((nkx, nky), (0, neck_ctrl_y), (-nkx, nky)), 0.5)
    return [
        ('hem',   line((-W, 0), (W, 0))),
        ('sideR', line((W, 0), (W, army_low))),
        ('armR',  bez((W, army_low), arm_ctrl, (shx, shy))),
        ('shR',   line((shx, shy), (nkx, nky))),
        ('neckR', neckR),
        ('neckL', neckL),
        ('shL',   line((-nkx, nky), (-shx, shy))),
        ('armL',  bez((-shx, shy), (-arm_ctrl[0], arm_ctrl[1]), (-W, army_low))),
        ('sideL', line((-W, army_low), (-W, 0))),
    ]
def manga(hem_w, under_x, under_y, cap_y, c0, c1):
    return [
        ('hem',    line((-hem_w, 0), (hem_w, 0))),
        ('underR', line((hem_w, 0), (under_x, under_y))),
        ('capR',   bez3((under_x, under_y), c0, c1, (0, cap_y))),
        ('capL',   bez3((0, cap_y), (-c1[0], c1[1]), (-c0[0], c0[1]), (-under_x, under_y))),
        ('underL', line((-under_x, under_y), (-hem_w, 0))),
    ]
def tira(Lx, Hy, topo_dividido=False):
    segs = [('baixo', line((-Lx/2, 0), (Lx/2, 0))), ('ladoD', line((Lx/2, 0), (Lx/2, Hy)))]
    if topo_dividido: segs += [('topoA', line((Lx/2, Hy), (0, Hy))), ('topoB', line((0, Hy), (-Lx/2, Hy)))]
    else: segs += [('topo', line((Lx/2, Hy), (-Lx/2, Hy)))]
    segs += [('ladoE', line((-Lx/2, Hy), (-Lx/2, 0)))]
    return segs
def seg_len(segs, n): return plen(dict(segs)[n])

# ---------------- receitas ----------------
G = {}
if NOME == 'camiseta':
    # camiseta oversized, ombro caído
    FR = tronco(31, 70, 29.5, 66.5, 10, 70, 31, 40, (30.4, 53), 57)
    BK = tronco(31, 70, 29.5, 66.5, 10, 70, 31, 40, (30.4, 53), 67.5)
    SL = manga(22, 24, 12, 20, (16, 15.5), (8, 20))
    neck_len = seg_len(FR, 'neckR') + seg_len(FR, 'neckL') + seg_len(BK, 'neckR') + seg_len(BK, 'neckL')
    GL = round(neck_len * 1.0, 1)
    G = {
        'label': 'Camiseta oversized', 'z0': 0.82, 'arm_deg': 32, 'arm_len': 0.34, 'bend': 1.2, 'init': 1.08, 'gola_firme': 2.2, 'suave': 4, 'alisar': 28,
        'elipse': (0.27, 0.12), 'espessura': 0.0028,
        'manequim': {'peito': (0.238, 0.112), 'quadril': (0.236, 0.11), 'ombros': (0.255, 0.098)},
        'pespontos': [('frente', 'hem', [1.7, 2.3]), ('costas', 'hem', [1.7, 2.3]), ('mangaE', 'hem', [1.7, 2.3]), ('mangaD', 'hem', [1.7, 2.3]),
                      ('frente', 'armR', [0.7]), ('frente', 'armL', [0.7]), ('costas', 'armR', [0.7]), ('costas', 'armL', [0.7]),
                      ('frente', 'neckR', [0.6]), ('frente', 'neckL', [0.6]), ('costas', 'neckR', [0.6]), ('costas', 'neckL', [0.6])],
        'costuras': [('frente', 'armR'), ('frente', 'armL'), ('costas', 'armR'), ('costas', 'armL'), ('frente', 'sideR'), ('frente', 'sideL'),
                     ('costas', 'sideR'), ('costas', 'sideL'), ('frente', 'shR'), ('frente', 'shL'), ('costas', 'shR'), ('costas', 'shL'),
                     ('mangaE', 'capR'), ('mangaE', 'capL'), ('mangaD', 'capR'), ('mangaD', 'capL'), ('frente', 'hem'), ('costas', 'hem'), ('mangaE', 'hem'), ('mangaD', 'hem')],
        'pieces': {
            'frente': {'label': 'Frente', 'segs': FR, 'place': ('torso', 'F')},
            'costas': {'label': 'Costas', 'segs': BK, 'place': ('torso', 'B')},
            'mangaE': {'label': 'Manga esquerda', 'segs': SL, 'place': ('sleeve', 1)},
            'mangaD': {'label': 'Manga direita', 'segs': SL, 'place': ('sleeve', -1)},
            'gola':   {'label': 'Gola (ribana)', 'segs': [
                ('baseF', line((-GL/2, 0), (0, 0))), ('baseB', line((0, 0), (GL/2, 0))),
                ('ladoD', line((GL/2, 0), (GL/2, 2.4))), ('topo', line((GL/2, 2.4), (-GL/2, 2.4))),
                ('ladoE', line((-GL/2, 2.4), (-GL/2, 0)))], 'place': ('collar',)},
        },
        'seams': [
            (('frente', 'sideR', 0), ('costas', 'sideL', 1)), (('frente', 'sideL', 1), ('costas', 'sideR', 0)),
            (('frente', 'shR', 0), ('costas', 'shL', 1)), (('frente', 'shL', 0), ('costas', 'shR', 1)),
            (('frente', 'armR', 0), ('mangaE', 'capR', 0)), (('costas', 'armL', 1), ('mangaE', 'capL', 1)),
            (('frente', 'armL', 1), ('mangaD', 'capR', 0)), (('costas', 'armR', 0), ('mangaD', 'capL', 1)),
            (('mangaE', 'underR', 0), ('mangaE', 'underL', 1)), (('mangaD', 'underR', 0), ('mangaD', 'underL', 1)),
            (('gola', 'baseF', 0), ('frente', 'neckR', 0, 'neckL')), (('gola', 'baseB', 0), ('costas', 'neckR', 0, 'neckL')),
            (('gola', 'ladoD', 0), ('gola', 'ladoE', 1)),
        ],
        'tacks': [],
    }
elif NOME == 'moletom':
    FR = tronco(32, 64, 30, 57.5, 10, 61.5, 32, 35, (31, 45), 50)
    BK = tronco(32, 64, 30, 57.5, 10, 61.5, 32, 35, (31, 45), 59.5)
    SL = manga(14, 25.5, 44, 53, (17, 48.5), (8, 53))
    BAND = round((64 + 64) * 0.86, 1)
    CUFF = 22
    HOOD = [
        ('baseF', bez((0, 0), (7.5, -1.3), (14, -0.5))),
        ('baseB', bez((14, -0.5), (20.5, 0.2), (27, 3.2))),
        ('costura', bez3((27, 3.2), (33.5, 17.5), (30.5, 35.5), (14, 41))),
        ('topo', bez((14, 41), (6.5, 41.5), (0, 39))),
        ('rosto', bez((0, 39), (1.6, 19.5), (0, 0))),
    ]
    POCKET = [
        ('baixo', line((-22, 0), (22, 0))),
        ('abreD', bez((22, 0), (21.5, 12.5), (15.5, 21))),
        ('topo', line((15.5, 21), (-15.5, 21))),
        ('abreE', bez((-15.5, 21), (-21.5, 12.5), (-22, 0))),
    ]
    G = {
        'label': 'Moletom canguru', 'z0': 0.86, 'arm_deg': 68, 'arm_len': 0.6, 'bend': 1.0, 'init': 1.06, 'alisar': 16, 'espessura': 0.004,
        'elipse': (0.27, 0.12), 'manequim': {'peito': (0.24, 0.115), 'quadril': (0.236, 0.112), 'ombros': (0.255, 0.1)},
        'pespontos': [('punhoE', 'topo', [0.5]), ('punhoD', 'topo', [0.5]), ('barra', 'topoA', [0.5]), ('barra', 'topoB', [0.5]),
                      ('bolso', 'topo', [0.6]), ('bolso', 'baixo', [0.6]), ('bolso', 'abreD', [0.8]), ('bolso', 'abreE', [0.8])],
        'costuras': [('frente', 'armR'), ('frente', 'armL'), ('costas', 'armR'), ('costas', 'armL'), ('frente', 'sideR'), ('frente', 'sideL'),
                     ('costas', 'sideR'), ('costas', 'sideL'), ('mangaE', 'capR'), ('mangaE', 'capL'), ('mangaD', 'capR'), ('mangaD', 'capL'),
                     ('mangaE', 'hem'), ('mangaD', 'hem'), ('frente', 'hem'), ('costas', 'hem'), ('capuzE', 'costura'), ('capuzD', 'costura')],
        'pieces': {
            'frente': {'label': 'Frente', 'segs': FR, 'place': ('torso', 'F')},
            'costas': {'label': 'Costas', 'segs': BK, 'place': ('torso', 'B')},
            'mangaE': {'label': 'Manga esquerda', 'segs': SL, 'place': ('sleeve', 1)},
            'mangaD': {'label': 'Manga direita', 'segs': SL, 'place': ('sleeve', -1)},
            'capuzE': {'label': 'Capuz esquerdo', 'segs': HOOD, 'place': ('hood', 1)},
            'capuzD': {'label': 'Capuz direito', 'segs': mirror(HOOD), 'place': ('hood', -1)},
            'bolso':  {'label': 'Bolso canguru', 'segs': POCKET, 'place': ('pocket', 3.0)},
            'punhoE': {'label': 'Punho esquerdo', 'segs': tira(CUFF, 7), 'place': ('cuff', 1)},
            'punhoD': {'label': 'Punho direito', 'segs': tira(CUFF, 7), 'place': ('cuff', -1)},
            'barra':  {'label': 'Barra', 'segs': tira(BAND, 7, True), 'place': ('band',)},
        },
        'seams': [
            (('frente', 'sideR', 0), ('costas', 'sideL', 1)), (('frente', 'sideL', 1), ('costas', 'sideR', 0)),
            (('frente', 'shR', 0), ('costas', 'shL', 1)), (('frente', 'shL', 0), ('costas', 'shR', 1)),
            (('frente', 'armR', 0), ('mangaE', 'capR', 0)), (('costas', 'armL', 1), ('mangaE', 'capL', 1)),
            (('frente', 'armL', 1), ('mangaD', 'capR', 0)), (('costas', 'armR', 0), ('mangaD', 'capL', 1)),
            (('mangaE', 'underR', 0), ('mangaE', 'underL', 1)), (('mangaD', 'underR', 0), ('mangaD', 'underL', 1)),
            # capuz: esquerdo = metade "R" da frente (+x do molde) e metade "L" das costas
            (('capuzE', 'baseF', 0), ('frente', 'neckR', 1)), (('capuzE', 'baseB', 0), ('costas', 'neckL', 1)),
            (('capuzD', 'baseF', 0), ('frente', 'neckL', 0)), (('capuzD', 'baseB', 0), ('costas', 'neckR', 0)),
            (('capuzE', 'costura', 0), ('capuzD', 'costura', 0)), (('capuzE', 'topo', 0), ('capuzD', 'topo', 0)),
            # punhos e barra
            (('punhoE', 'topo', 1), ('mangaE', 'hem', 0)), (('punhoD', 'topo', 1), ('mangaD', 'hem', 0)),
            (('punhoE', 'ladoD', 0), ('punhoE', 'ladoE', 1)), (('punhoD', 'ladoD', 0), ('punhoD', 'ladoE', 1)),
            (('barra', 'topoA', 1), ('frente', 'hem', 0)), (('barra', 'topoB', 1), ('costas', 'hem', 0)),
            (('barra', 'ladoD', 0), ('barra', 'ladoE', 1)),
        ],
        'tacks': [('bolso', 'baixo', 'frente'), ('bolso', 'topo', 'frente')],
    }
elif NOME == 'sueter':
    FR = tronco(32, 64, 30, 57.5, 9.5, 61.5, 32, 35, (31, 45), 55)
    BK = tronco(32, 64, 30, 57.5, 9.5, 61.5, 32, 35, (31, 45), 60)
    SL = manga(14, 25.5, 44, 53, (17, 48.5), (8, 53))
    BAND = round((64 + 64) * 0.86, 1); CUFF = 22
    neck_len = seg_len(FR, 'neckR') + seg_len(FR, 'neckL') + seg_len(BK, 'neckR') + seg_len(BK, 'neckL')
    GL = round(neck_len * 1.0, 1)
    G = {
        'label': 'Suéter gola careca', 'z0': 0.86, 'arm_deg': 62, 'arm_len': 0.6, 'bend': 1.0, 'init': 1.06, 'alisar': 16, 'espessura': 0.004,
        'elipse': (0.27, 0.12), 'manequim': {'peito': (0.25, 0.12), 'quadril': (0.245, 0.118), 'ombros': (0.275, 0.11)}, 'pescoco': 0.062, 'shz': 0.585, 'cabide': True,
        'pespontos': [('punhoE', 'topo', [0.5]), ('punhoD', 'topo', [0.5]), ('barra', 'topoA', [0.5]), ('barra', 'topoB', [0.5])],
        'costuras': [('frente', 'armR'), ('frente', 'armL'), ('costas', 'armR'), ('costas', 'armL'), ('frente', 'sideR'), ('frente', 'sideL'),
                     ('costas', 'sideR'), ('costas', 'sideL'), ('mangaE', 'capR'), ('mangaE', 'capL'), ('mangaD', 'capR'), ('mangaD', 'capL'),
                     ('mangaE', 'hem'), ('mangaD', 'hem'), ('frente', 'hem'), ('costas', 'hem')],
        'pieces': {
            'frente': {'label': 'Frente', 'segs': FR, 'place': ('torso', 'F')},
            'costas': {'label': 'Costas', 'segs': BK, 'place': ('torso', 'B')},
            'mangaE': {'label': 'Manga esquerda', 'segs': SL, 'place': ('sleeve', 1)},
            'mangaD': {'label': 'Manga direita', 'segs': SL, 'place': ('sleeve', -1)},
            'gola':   {'label': 'Gola (ribana)', 'segs': [
                ('baseF', line((-GL/2, 0), (0, 0))), ('baseB', line((0, 0), (GL/2, 0))),
                ('ladoD', line((GL/2, 0), (GL/2, 3.0))), ('topo', line((GL/2, 3.0), (-GL/2, 3.0))),
                ('ladoE', line((-GL/2, 3.0), (-GL/2, 0)))], 'place': ('collar',)},
            'punhoE': {'label': 'Punho esquerdo', 'segs': tira(CUFF, 7), 'place': ('cuff', 1)},
            'punhoD': {'label': 'Punho direito', 'segs': tira(CUFF, 7), 'place': ('cuff', -1)},
            'barra':  {'label': 'Barra', 'segs': tira(BAND, 7, True), 'place': ('band',)},
        },
        'seams': [
            (('frente', 'sideR', 0), ('costas', 'sideL', 1)), (('frente', 'sideL', 1), ('costas', 'sideR', 0)),
            (('frente', 'shR', 0), ('costas', 'shL', 1)), (('frente', 'shL', 0), ('costas', 'shR', 1)),
            (('frente', 'armR', 0), ('mangaE', 'capR', 0)), (('costas', 'armL', 1), ('mangaE', 'capL', 1)),
            (('frente', 'armL', 1), ('mangaD', 'capR', 0)), (('costas', 'armR', 0), ('mangaD', 'capL', 1)),
            (('mangaE', 'underR', 0), ('mangaE', 'underL', 1)), (('mangaD', 'underR', 0), ('mangaD', 'underL', 1)),
            (('gola', 'baseF', 0), ('frente', 'neckR', 0, 'neckL')), (('gola', 'baseB', 0), ('costas', 'neckR', 0, 'neckL')),
            (('gola', 'ladoD', 0), ('gola', 'ladoE', 1)),
            (('punhoE', 'topo', 1), ('mangaE', 'hem', 0)), (('punhoD', 'topo', 1), ('mangaD', 'hem', 0)),
            (('punhoE', 'ladoD', 0), ('punhoE', 'ladoE', 1)), (('punhoD', 'ladoD', 0), ('punhoD', 'ladoE', 1)),
            (('barra', 'topoA', 1), ('frente', 'hem', 0)), (('barra', 'topoB', 1), ('costas', 'hem', 0)),
            (('barra', 'ladoD', 0), ('barra', 'ladoE', 1)),
        ],
        'tacks': [],
    }
if os.environ.get('SEMGOLA') and 'gola' in G['pieces']:
    del G['pieces']['gola']; G['seams'] = [sm for sm in G['seams'] if sm[0][0] != 'gola' and sm[1][0] != 'gola']
P = G['pieces']
STEP = 1.25

# costuras com o mesmo número de pontos dos dois lados (segmentos compostos: 4º item = segmento seguinte)
def side_pts(spec):
    pname, s1 = spec[0], spec[1]
    segs = dict(P[pname]['segs'])
    pts = list(segs[s1])
    if len(spec) > 3: pts = pts + list(segs[spec[3]])[1:]
    return pts
NSEG = {}
def n_total(spec):
    if len(spec) > 3: return NSEG.get((spec[0], spec[1]), 0) + NSEG.get((spec[0], spec[3]), 0)
    return NSEG.get((spec[0], spec[1]), 0)
def set_n(spec, n):
    if len(spec) > 3:  # segmento composto: divide os pontos na proporção do comprimento de cada metade
        segs = dict(P[spec[0]]['segs']); l1, l2 = plen(segs[spec[1]]), plen(segs[spec[3]])
        n1 = max(1, round(n * l1 / (l1 + l2))); NSEG[(spec[0], spec[1])] = n1; NSEG[(spec[0], spec[3])] = n - n1
    else:
        NSEG[(spec[0], spec[1])] = n
for _ in range(3):
    for a, b in G['seams']:
        la, lb = plen(side_pts(a)), plen(side_pts(b))
        n = max(2, round(max(la, lb) / STEP), n_total(a), n_total(b))
        set_n(a, n); set_n(b, n)

# ---------------- empacota as peças numa folha ----------------
GAP = 5; SHEET_W = {'moletom': 160, 'sueter': 150}.get(NOME, 140)
boxes = []
for pname, pc in P.items():
    xs = [x for _, pts in pc['segs'] for x, _ in pts]; ys = [y for _, pts in pc['segs'] for _, y in pts]
    boxes.append((pname, min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)))
boxes.sort(key=lambda b: -b[4])
cx, cy, row_h = GAP, GAP, 0
for pname, mx, my, w, h in boxes:
    if cx + w + GAP > SHEET_W: cx = GAP; cy += row_h + GAP; row_h = 0
    P[pname]['sheet'] = (cx - mx, cy - my)
    cx += w + GAP; row_h = max(row_h, h)
SHEET_H = math.ceil(cy + row_h + GAP)

# ---------------- posições iniciais (Blender: z pra cima, frente = -y) ----------------
Z0 = G['z0']
FW = max(x for _, pts in P['frente']['segs'] for x, _ in pts)
CIRC_REST = 4 * FW * CM
_A, _B = G.get('elipse', (0.19, 0.135))
_T = [i * 2 * math.pi / 4000 for i in range(4001)]
_P = [(_A * math.sin(t), -_B * math.cos(t)) for t in _T]
_S = [0.0]
for i in range(1, len(_P)): _S.append(_S[-1] + math.dist(_P[i-1], _P[i]))
_K = CIRC_REST / _S[-1]
_P = [(px * _K, py * _K) for px, py in _P]; _S = [v * _K for v in _S]; CIRC = _S[-1]
def elipse_em(arc):
    arc %= CIRC
    lo, hi = 0, len(_S) - 1
    while hi - lo > 1:
        m = (lo + hi) // 2
        if _S[m] < arc: lo = m
        else: hi = m
    t = 0 if _S[hi] == _S[lo] else (arc - _S[lo]) / (_S[hi] - _S[lo])
    return (_P[lo][0] + (_P[hi][0] - _P[lo][0]) * t, _P[lo][1] + (_P[hi][1] - _P[lo][1]) * t)
Y_ARM = dict(P['frente']['segs'])['sideR'][-1][1]
Y_TOP = max(py for _, pts in P['frente']['segs'] for _, py in pts)
def torso_pos(fb, x, y, out=0.0):
    z = Z0 + y * CM
    px, py = elipse_em(x * CM) if fb == 'F' else elipse_em(CIRC / 2 + x * CM)
    # acima da cava o tecido já começa fechando sobre o ombro e o decote perto do pescoço
    px *= G.get('init', 1.0); py *= G.get('init', 1.0)
    t = max(0.0, min(1.0, (y - Y_ARM) / (Y_TOP - Y_ARM)))
    k = 1 - 0.45 * t * t
    py *= k
    px *= 1 - 0.12 * t * t
    if out:
        n = Vector((px, py)).normalized(); px += n.x * out; py += n.y * out
    return Vector((px, py, z))
SH, SHZ = 0.16, Z0 + G.get('shz', 0.60)
ARM = math.radians(G['arm_deg'])
def arm_frame(s):
    a = Vector((s * math.cos(ARM), 0, -math.sin(ARM)))
    u = Vector((s * math.sin(ARM), 0, math.cos(ARM)))
    return Vector((s * SH, 0, SHZ)), a, u, Vector((0, -1, 0))
def arm_pts(s):
    if G.get('pose') == 'bolso':  # mãos no bolso: braço desce rente ao corpo e o antebraço vem pra frente até o bolso
        return [Vector((s * SH, 0, SHZ)), Vector((s * 0.285, 0.015, SHZ - 0.31)), Vector((s * 0.2, -0.19, SHZ - 0.45)), Vector((s * 0.135, -0.172, SHZ - 0.48))]
    o, a, u, f = arm_frame(s)
    return [o, o + a * 2.0]
def _frames(s):
    pts = arm_pts(s); out = []; prev = None
    for i in range(len(pts) - 1):
        a = (pts[i+1] - pts[i]).normalized()
        w = Vector((s, 0, 0.6)); u = (w - a * w.dot(a)).normalized()
        f = a.cross(u).normalized()
        if f.y > 0 and prev is None: f = -f
        if prev is not None:
            if f.dot(prev[1]) < 0: f = -f
            u = f.cross(a).normalized()
            if u.dot(prev[0]) < 0: u = -u
        else:
            u = f.cross(a).normalized() if f.cross(a).normalized().dot(w) > 0 else -f.cross(a).normalized()
        out.append((pts[i], a, u, f, (pts[i+1] - pts[i]).length)); prev = (u, f)
    return out
def arm_at(s, t):
    fr = _frames(s); acc = 0.0
    for k, (p0, a, u, f, L) in enumerate(fr):
        if t <= acc + L or k == len(fr) - 1: return p0 + a * (t - acc), a, u, f
        acc += L
SLW = max(x for _, pts in P['mangaE']['segs'] for x, _ in pts) * 2
SLH = max(y for _, pts in P['mangaE']['segs'] for _, y in pts)
RS = (SLW * CM) / (2 * math.pi)
def _path_len(s): return sum(f[4] for f in _frames(s))
def _comprime(s, t):
    if G.get('pose') != 'bolso': return t
    total = 0.08 + SLH * CM + 0.07
    return t * (_path_len(s) / total)
def sleeve_pos(s, x, y):
    th = (x * CM) / RS
    t = _comprime(s, 0.08 + (SLH - y) * CM)
    c, a, u, f = arm_at(s, t)
    return c + (u * math.cos(th) + f * math.sin(th)) * RS
def place(pc, x, y):
    kind = pc['place']
    if kind[0] == 'torso': return torso_pos(kind[1], x, y)
    if kind[0] == 'sleeve': return sleeve_pos(kind[1], x, y)
    if kind[0] == 'collar':
        # nasce em cima do decote: metade esquerda da gola na frente, metade direita nas costas
        L = max(px for _, pts in pc['segs'] for px, _ in pts) * 2
        def neck_loop(fb):
            segs = dict(P['frente' if fb == 'F' else 'costas']['segs'])
            pts = list(segs['neckR']) + list(segs['neckL'])[1:]
            return [torso_pos(fb, qx, qy) for qx, qy in pts]
        loop = neck_loop('F') if x <= 0 else neck_loop('B')
        u = (x + L/2) / (L/2) if x <= 0 else x / (L/2)
        acc = [0.0]
        for i in range(1, len(loop)): acc.append(acc[-1] + (loop[i] - loop[i-1]).length)
        d = u * acc[-1]; i = 1
        while i < len(acc) - 1 and acc[i] < d: i += 1
        f = 0 if acc[i] == acc[i-1] else (d - acc[i-1]) / (acc[i] - acc[i-1])
        p0 = loop[i-1].lerp(loop[i], max(0, min(1, f)))
        return Vector((p0.x * (1 - 0.02 * y), p0.y * (1 - 0.02 * y), p0.z + y * CM))
        psi = -((x + L/2) / L) * 2 * math.pi; rr = (L * CM) / (2 * math.pi)
        fmin = min(py for _, pts in P['frente']['segs'] if _ .startswith('neck') for _, py in pts)
        bmin = min(py for _, pts in P['costas']['segs'] if _ .startswith('neck') for _, py in pts)
        nz = Z0 + (fmin + bmin) / 2 * CM; amp = (bmin - fmin) / 2 * CM
        return Vector((rr * math.cos(psi), rr * math.sin(psi), nz + amp * math.sin(psi) + y * CM))
    if kind[0] == 'hood':
        s = kind[1]; u = x if s > 0 else -x
        return Vector((s * 0.125, -0.10 + u * CM, Z0 + 0.62 + y * CM))
    if kind[0] == 'pocket':
        return torso_pos('F', x, y + kind[1], out=0.012)
    if kind[0] == 'cuff':
        s = kind[1]
        L = max(px for _, pts in pc['segs'] for px, _ in pts) * 2; rr = (L * CM) / (2 * math.pi)
        th = (x / (L/2)) * math.pi
        t = _comprime(s, 0.08 + SLH * CM + (7 - y) * CM)
        c, a, uu, f = arm_at(s, t)
        return c + (uu * math.cos(th) + f * math.sin(th)) * rr
    if kind[0] == 'band':
        L = max(px for _, pts in pc['segs'] for px, _ in pts) * 2; rr = (L * CM) / (2 * math.pi)
        psi = math.pi + (x / (L/2)) * math.pi
        return Vector((rr * 1.02 * math.cos(psi), rr * 0.75 * math.sin(psi), Z0 - (7 - y) * CM))
    raise ValueError(kind)

# ---------------- malha ----------------
verts3, uvs, faces, flat_of = [], [], [], []
seg_idx, molde, piece_verts = {}, [], {}
for pname, pc in P.items():
    boundary, bidx = [], {}
    names = [s for s, _ in pc['segs']]
    for sname, pts in pc['segs']:
        n = NSEG.get((pname, sname), max(2, round(plen(pts) / STEP)))
        rs = resample(pts, n)
        st = len(boundary); boundary.extend(rs[:-1])
        bidx[sname] = list(range(st, st + n)) + [None]
    for i, s in enumerate(names): bidx[s][-1] = bidx[names[(i+1) % len(names)]][0]
    nb = len(boundary)
    xs = [p[0] for p in boundary]; ys = [p[1] for p in boundary]
    pts2 = list(boundary); gx = min(xs); row = 0
    while gx <= max(xs):
        gy = min(ys) + (STEP * 0.433 if row % 2 else 0)
        while gy <= max(ys):
            q = (gx, gy)
            if inside(q, boundary) and min(dist_seg(q, boundary[i], boundary[(i+1) % nb]) for i in range(nb)) > STEP * 0.55: pts2.append(q)
            gy += STEP * 0.866
        gx += STEP * 0.5; row += 1
    vout, _, fout, orig_v, _, _ = delaunay_2d_cdt([Vector(p) for p in pts2], [], [list(range(nb))], 1, 1e-5)
    base = len(verts3); lm = {}; piece_verts[pname] = []
    ox, oy = pc['sheet']
    for oi, ov in enumerate(vout):
        verts3.append(place(pc, ov.x, ov.y)); flat_of.append((pname, ov.x, ov.y))
        uvs.append(((ov.x + ox) / SHEET_W, (ov.y + oy) / SHEET_H))
        piece_verts[pname].append(base + oi)
        for o in orig_v[oi]:
            if o < nb: lm[o] = base + oi
    for f in fout: faces.append([base + i for i in f])
    for s, l in bidx.items(): seg_idx[(pname, s)] = [lm[i] for i in l]
    molde.append({'id': pname, 'label': pc['label'],
                  'outline': [(round(p[0] + ox, 2), round(SHEET_H - (p[1] + oy), 2)) for p in boundary],
                  'w': round(max(xs) - min(xs), 1), 'h': round(max(ys) - min(ys), 1)})

def side_idx(spec):
    l = list(seg_idx[(spec[0], spec[1])])
    if len(spec) > 3: l = l + seg_idx[(spec[0], spec[3])][1:]
    return list(reversed(l)) if spec[2] else l
sew = []
for a, b in G['seams']:
    ia, ib = side_idx(a), side_idx(b)
    if len(ia) != len(ib): print('aviso: costura com contagem diferente', a, b, len(ia), len(ib), flush=True)
    if len(ia) != len(ib):
        n = min(len(ia), len(ib))
        ia = [ia[round(i * (len(ia)-1) / (n-1))] for i in range(n)]; ib = [ib[round(i * (len(ib)-1) / (n-1))] for i in range(n)]
    for i, j in zip(ia, ib):
        if i != j: sew.append((i, j))
tacks = []
for pname, sname, onto in G['tacks']:
    kd = KDTree(len(piece_verts[onto]))
    for k, vi in enumerate(piece_verts[onto]): kd.insert((flat_of[vi][1], flat_of[vi][2], 0), k)
    kd.balance()
    dy = P[pname]['place'][1]
    for vi in seg_idx[(pname, sname)]:
        _, x, y = flat_of[vi]
        _, k, d = kd.find((x, y + dy, 0))
        if d < STEP: tacks.append((vi, piece_verts[onto][k]))
print('malha', len(verts3), 'verts', len(faces), 'tris', len(sew), 'costuras', len(tacks), 'pontos do bolso', flush=True)

# ---------------- cena ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
GOLA_FORA = bool(G.get('gola_firme')) and 'gola' in P
gset = set(piece_verts['gola']) if GOLA_FORA else set()
sew_sim = [(i, j) for i, j in sew if i not in gset and j not in gset]
if GOLA_FORA:
    for vi in gset: verts3[vi] = verts3[vi] + Vector((0, 0, 1.5))
me = bpy.data.meshes.new(NOME)
me.from_pydata([tuple(v) for v in verts3], sew_sim + tacks, faces)
me.update()
uvl = me.uv_layers.new(name='molde')
for poly in me.polygons:
    for li in poly.loop_indices: uvl.data[li].uv = uvs[me.loops[li].vertex_index]
ob = bpy.data.objects.new(NOME, me); scn.collection.objects.link(ob)
if os.environ.get('MALHA'):
    bm = bmesh.new(); bm.from_mesh(me)
    sew_set = set(map(frozenset, sew + tacks))
    soltas = [e for e in bm.edges if len(e.link_faces) == 1]
    meio = []
    for e in soltas:
        a_, b_ = e.verts[0].index, e.verts[1].index
        pa, pb = flat_of[a_], flat_of[b_]
        if pa[0] in ('frente', 'costas') and abs(pa[1]) < 3 and abs(pb[1]) < 3 and 2 < pa[2] < 60: meio.append((pa, pb))
    print('bordas abertas', len(soltas), 'no meio da frente/costas:', len(meio), meio[:6], flush=True)
    dup = {}
    for i, f in enumerate(flat_of): dup.setdefault((f[0], round(f[1], 3), round(f[2], 3)), []).append(i)
    print('vertices duplicados', sum(1 for v in dup.values() if len(v) > 1), flush=True)
    sus = [(flat_of[i], flat_of[j]) for i, j in sew + tacks if any(flat_of[k][0] in ('frente', 'costas') and abs(flat_of[k][1]) < 3 and flat_of[k][2] < 60 for k in (i, j))]
    print('costuras no centro:', len(sus), [(tuple(round(v, 1) if isinstance(v, float) else v for v in a_), tuple(round(v, 1) if isinstance(v, float) else v for v in b_)) for a_, b_ in sus[:8]], flush=True)
    import collections
    grau = collections.Counter([i for i, j in sew] + [j for i, j in sew])
    muitos = [(flat_of[k], c) for k, c in grau.items() if c > 2]
    print('vertices com muitas costuras:', len(muitos), [(tuple(round(v, 1) if isinstance(v, float) else v for v in a_), c) for a_, c in muitos[:8]], flush=True)
    print('hem frente idx', seg_idx[('frente', 'hem')][:3], '...', flush=True)
    sys.exit(0)

def ellipsoid(name, loc, scale, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = scale
    o.modifiers.new('Col', 'COLLISION'); o.collision.thickness_outer = 0.006; o.collision.cloth_friction = 0.5
    return o
zc = Z0 - 0.80; K = G.get('corpo', 1.0); KD = G.get('fundo', K)
body = [
    ellipsoid('peito', (0, 0, 1.30 + zc), G['manequim']['peito'] + (0.21,) if 'manequim' in G else (0.155 * K, 0.10 * KD, 0.21)),
    ellipsoid('quadril', (0, 0, 0.98 + zc), G['manequim']['quadril'] + (0.26,) if 'manequim' in G else (0.15 * K, 0.10 * KD, 0.26)),
    ellipsoid('ombros', (0, 0, SHZ + 0.01), G['manequim']['ombros'] + (0.055,) if 'manequim' in G else (0.175 * K, 0.08 * KD, 0.055)),
    ellipsoid('pescoco', (0, 0, SHZ + 0.16), (G.get('pescoco', 0.05), G.get('pescoco', 0.05), 0.10)),
]
if NOME == 'moletom':
    body.append(ellipsoid('cabeca', (0, 0.015, Z0 + 0.88), (0.088, 0.1, 0.108)))
for s in (1, -1):
    if G.get('pose') == 'bolso':
        pts = arm_pts(s)
        for i in range(len(pts) - 1):
            d = pts[i+1] - pts[i]; c = (pts[i] + pts[i+1]) / 2
            rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
            eb = ellipsoid('braco', tuple(c), (0.04, 0.04, d.length / 2 + 0.035), tuple(rot))
            eb.collision.cloth_friction = 40; body.append(eb)
        continue
    o, a, u, f = arm_frame(s)
    c = o + a * (G['arm_len'] / 2 + 0.02)
    ang = math.degrees(math.atan2(a.x, a.z))
    body.append(ellipsoid('braco', tuple(c), (0.042, 0.042, G['arm_len'] / 2 + 0.03), (0, math.radians(ang), 0)))

# forma de descanso = molde plano (o tecido "quer" ficar reto, como tecido de verdade)
flat3 = []
for pname, x, y in flat_of:
    ox, oy = P[pname]['sheet']
    flat3.append(Vector(((x + ox) * CM, (y + oy) * CM, 0)))
kb = ob.shape_key_add(name='Basis')
for i, v in enumerate(flat3): kb.data[i].co = v
kv = ob.shape_key_add(name='vestido', from_mix=False)
for i, v in enumerate(verts3): kv.data[i].co = v
kv.value = 1.0
for i, v in enumerate(flat3): me.vertices[i].co = v
cl = ob.modifiers.new('Cloth', 'CLOTH'); cs = cl.settings
cs.rest_shape_key = kb
pinos = set(gset)
if G.get('cabide'):  # decote preso como num cabide: a roupa não escorrega do manequim
    for pn in ('frente', 'costas'):
        for sg in ('neckR', 'neckL', 'shR', 'shL'): pinos |= set(seg_idx[(pn, sg)])
    pinos |= set(piece_verts.get('gola', []))
if G.get('pose') == 'bolso':
    for pn in ('punhoE', 'punhoD'): pinos |= set(piece_verts.get(pn, []))
if pinos:
    vg = ob.vertex_groups.new(name='pino'); vg.add(list(pinos), 1.0, 'REPLACE')
    cs.vertex_group_mass = 'pino'
cs.quality = 10; cs.mass = 0.2
cs.tension_stiffness = G.get('tensao', 12); cs.compression_stiffness = 12; cs.shear_stiffness = 4; cs.bending_stiffness = G['bend']
cs.air_damping = 1.5; cs.use_sewing_springs = True; cs.sewing_force_max = 6
cc = cl.collision_settings
cc.distance_min = 0.004; cc.use_self_collision = True; cc.self_distance_min = 0.003
FRAMES = 200
cl.point_cache.frame_start = 1; cl.point_cache.frame_end = FRAMES
scn.frame_start = 1; scn.frame_end = FRAMES
# tecido firme enquanto as costuras fecham (evita vinco), depois volta ao normal
cs.bending_stiffness = 4.0
cs.keyframe_insert(data_path='bending_stiffness', frame=1); cs.keyframe_insert(data_path='bending_stiffness', frame=75)
cs.bending_stiffness = G['bend']; cs.keyframe_insert(data_path='bending_stiffness', frame=115)
ew = cs.effector_weights
ew.gravity = 0.0; ew.keyframe_insert(data_path='gravity', frame=1); ew.keyframe_insert(data_path='gravity', frame=70)
ew.gravity = 1.0; ew.keyframe_insert(data_path='gravity', frame=110)
for f in range(1, FRAMES + 1):
    scn.frame_set(f)
    if f in (1, 2, 10) or f % 50 == 0:
        ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
        zs = [v.co.z for v in ev.data.vertices]; ys = [v.co.y for v in ev.data.vertices]
        print('frame', f, 'z', round(min(zs), 3), round(max(zs), 3), 'y', round(min(ys), 3), round(max(ys), 3), flush=True)
        if f == 2 and max(zs) - min(zs) < 0.05: print('ERRO: começou plano', flush=True); sys.exit(1)

dg = bpy.context.evaluated_depsgraph_get()
final = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); final.name = NOME + '_final'
res = bpy.data.objects.new(NOME.capitalize(), final); scn.collection.objects.link(res)
if os.environ.get('ESPETO'):
    xs = sorted(((v.co.x, v.index) for v in final.vertices))
    zz = [v.co.z for v in final.vertices]
    print('x min/max', round(xs[0][0], 3), round(xs[-1][0], 3), 'z', round(min(zz), 3), round(max(zz), 3), flush=True)
    for x, i in xs[:4] + xs[-4:]: print('  v', i, round(x, 3), flat_of[i], tuple(round(c, 3) for c in final.vertices[i].co), flush=True)
    pares = [(i, j, (final.vertices[i].co - final.vertices[j].co).length) for i, j in sew]
    pares.sort(key=lambda t: -t[2])
    for i, j, d in pares[:5]: print('  par', round(d, 3), flat_of[i], flat_of[j], flush=True)
if G.get('gola_firme') and 'gola' in P:
    fv = final.vertices
    def loop_final(fb):
        pn = 'frente' if fb == 'F' else 'costas'
        idx = seg_idx[(pn, 'neckR')] + seg_idx[(pn, 'neckL')][1:]
        return [fv[i].co.copy() for i in idx]
    LF, LB = loop_final('F'), loop_final('B')
    cen = sum(LF + LB, Vector()) / (len(LF) + len(LB))
    Lg = max(px for _, pts in P['gola']['segs'] for px, _ in pts) * 2
    def em(loop, u):
        acc = [0.0]
        for i in range(1, len(loop)): acc.append(acc[-1] + (loop[i] - loop[i-1]).length)
        d = u * acc[-1]; i = 1
        while i < len(acc) - 1 and acc[i] < d: i += 1
        f = 0 if acc[i] == acc[i-1] else (d - acc[i-1]) / (acc[i] - acc[i-1])
        return loop[i-1].lerp(loop[i], max(0, min(1, f)))
    for vi in piece_verts['gola']:
        _, x, y = flat_of[vi]
        b = em(LF, (x + Lg/2) / (Lg/2)) if x <= 0 else em(LB, x / (Lg/2))
        dentro = Vector((cen.x - b.x, cen.y - b.y, 0)).normalized()
        hg = G['gola_firme']; t = y / hg
        # ribana deita pra dentro em curva suave (sobe e vai pro pescoço), com volume no meio
        d = (Vector((0, 0, 1)) * 0.95 + dentro * (0.16 + 0.12 * t)).normalized()
        fv[vi].co = b + d * (y * CM) - dentro * 0.003 * math.sin(math.pi * t)
bm = bmesh.new(); bm.from_mesh(final); bm.verts.ensure_lookup_table()
alvo = {}
def raiz(i):
    while i in alvo: i = alvo[i]
    return i
for i, j in sew:
    ri, rj = raiz(i), raiz(j)
    if ri != rj: alvo[rj] = ri
tm = {bm.verts[j]: bm.verts[raiz(j)] for j in alvo}
for v, t in tm.items(): t.co = (v.co + t.co) / 2
bmesh.ops.weld_verts(bm, targetmap=tm)
bmesh.ops.delete(bm, geom=[e for e in bm.edges if not e.link_faces], context='EDGES')
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(final); bm.free()
for p in final.polygons: p.use_smooth = True
bpy.data.objects.remove(ob, do_unlink=True)
bpy.context.view_layer.update()
sm = res.modifiers.new('Suave', 'SMOOTH'); sm.factor = 0.5; sm.iterations = G.get('suave', 2)
if G.get('alisar'):
    # alisa pregas grandes mantendo o volume (a roupa não encolhe)
    ls = res.modifiers.new('Alisar', 'LAPLACIANSMOOTH'); ls.iterations = G['alisar']; ls.lambda_factor = 0.8
    ls.use_volume_preserve = False; ls.use_normalized = True; ls.lambda_border = 0.0
    bo = res.modifiers.new('Borda', 'SMOOTH'); bo.factor = 0.6; bo.iterations = 4
so = None
if G.get('espessura'):
    so = res.modifiers.new('Espessura', 'SOLIDIFY'); so.thickness = G['espessura']; so.offset = -1; so.use_even_offset = False; so.use_quality_normals = True
    so.show_render = False; so.show_viewport = False  # a sombra é assada sem a espessura
    so.material_offset = 1; so.material_offset_rim = 0  # lado de dentro do tecido usa o material 'dentro'
mat = bpy.data.materials.new('estampa'); mat.use_nodes = True; final.materials.append(mat)
if G.get('espessura'):
    mdentro = bpy.data.materials.new('dentro'); mdentro.use_nodes = True; final.materials.append(mdentro)

# sombra de dobra (AO) assada no molde
AO_W = 2048; AO_H = round(2048 * SHEET_H / SHEET_W)
scn.render.engine = 'CYCLES'; scn.cycles.samples = 64; scn.cycles.device = 'CPU'
img = bpy.data.images.new('ao', AO_W, AO_H, alpha=False)
nodes = mat.node_tree.nodes; tex = nodes.new('ShaderNodeTexImage'); tex.image = img; nodes.active = tex
for o in list(scn.objects):
    if o is not None: o.select_set(False)
res.select_set(True); bpy.context.view_layer.objects.active = res
scn.render.bake.margin = 12
bpy.ops.object.bake(type='AO')
import numpy as np
px = np.empty(AO_W * AO_H * 4, dtype=np.float32); img.pixels.foreach_get(px)
px = px.reshape(-1, 4); px[:, :3] = 0.38 + 0.62 * px[:, :3]  # sombra mais escura vira cinza, nunca preto
img2 = px[:, 0].reshape(AO_H, AO_W).copy()
def marca(x, y, fator, raio=1):
    c = int((x) / SHEET_W * AO_W); r = int((y) / SHEET_H * AO_H)
    if raio <= 1:
        if 0 <= r < AO_H and 0 <= c < AO_W: img2[r, c] *= fator
        return
    r0, r1, c0, c1 = max(0, r - raio + 1), min(AO_H, r + raio), max(0, c - raio + 1), min(AO_W, c + raio)
    img2[r0:r1, c0:c1] *= fator
def linha_offset(pname, sname, off, fator, tracejado):
    pc = P[pname]; ox, oy = pc['sheet']; poly = [p for _, pts in pc['segs'] for p in pts]
    pts = resample(dict(pc['segs'])[sname], max(8, int(plen(dict(pc['segs'])[sname]) * 12)))
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        if not inside((x0 + nx * 0.3, y0 + ny * 0.3), poly): nx, ny = -nx, -ny
        if tracejado and (i % 7) >= 4: continue
        marca(x0 + nx * off + ox, y0 + ny * off + oy, fator, 1 if tracejado else 2)
for pname, sname, offs in G.get('pespontos', []):
    for off in offs: linha_offset(pname, sname, off, 0.72, True)
for pname, sname in G.get('costuras', []):
    linha_offset(pname, sname, 0.12, 0.8, False)
px[:, 0] = px[:, 1] = px[:, 2] = img2.ravel()
img.pixels.foreach_set(px.ravel())
img.filepath_raw = os.path.join(OUT, NOME + '-ao.png'); img.file_format = 'PNG'; img.save()
nodes.remove(tex)
print('AO ok', flush=True)
if so is not None: so.show_render = True; so.show_viewport = True

bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, NOME + '.glb'), use_selection=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_materials='PLACEHOLDER', export_yup=True)
json.dump({'sheet': {'w': SHEET_W, 'h': SHEET_H}, 'pecas': molde, 'nome': G['label']},
          open(os.path.join(OUT, NOME + '-molde.json'), 'w'), ensure_ascii=False)

for o in body: o.hide_render = True
bb = [res.matrix_world @ Vector(c) for c in res.bound_box]
zmid = (min(v.z for v in bb) + max(v.z for v in bb)) / 2
cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
scn.collection.objects.link(cam); scn.camera = cam
cam.location = (0.45, -2.6, zmid + 0.15); cam.rotation_euler = (math.radians(87), 0, math.radians(10)); cam_data.lens = 70
scn.render.engine = 'BLENDER_WORKBENCH'
scn.display.shading.light = 'STUDIO'; scn.display.shading.color_type = 'SINGLE'
scn.display.shading.single_color = (0.92, 0.92, 0.9); scn.display.shading.show_cavity = True
scn.render.resolution_x = 700; scn.render.resolution_y = 900
scn.render.filepath = os.path.join(OUT, NOME + '-preview.png')
bpy.ops.render.render(write_still=True)
print('OK', NOME, flush=True)
