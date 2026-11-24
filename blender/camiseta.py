# Camiseta 3D com molde de costura real (tamanho M)
# Rodar: /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/camiseta.py -- <pasta_saida>
# Saída: camiseta.glb (UV = molde aberto), camiseta-molde.json (peças em cm), camiseta-preview.png
import bpy, bmesh, json, math, os, sys
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.getcwd()
os.makedirs(OUT, exist_ok=True)
CM = 0.01
STEP = 1.6  # cm entre pontos da malha

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
def rev(p): return list(reversed(p))
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

# ---------------- molde (cm, y pra cima) ----------------
def tronco(neck_ctrl_y):
    return [
        ('hem',   line((-26, 0), (26, 0))),
        ('sideR', line((26, 0), (26, 49))),
        ('armR',  bez((26, 49), (22, 52), (22.5, 71))),
        ('shR',   line((22.5, 71), (8, 74))),
        ('neck',  bez((8, 74), (0, neck_ctrl_y), (-8, 74))),
        ('shL',   line((-8, 74), (-22.5, 71))),
        ('armL',  bez((-22.5, 71), (-22, 52), (-26, 49))),
        ('sideL', line((-26, 49), (-26, 0))),
    ]
def manga():
    return [
        ('hem',    line((-20, 0), (20, 0))),
        ('underR', line((20, 0), (21, 10))),
        ('capR',   bez3((21, 10), (14, 15), (7, 22.5), (0, 22.5))),
        ('capL',   bez3((0, 22.5), (-7, 22.5), (-14, 15), (-21, 10))),
        ('underL', line((-21, 10), (-20, 0))),
    ]
PIECES = {
    'frente':  {'label': 'Frente',  'segs': tronco(58), 'sheet': (28, 30)},
    'costas':  {'label': 'Costas',  'segs': tronco(70), 'sheet': (84, 30)},
    'mangaE':  {'label': 'Manga esquerda', 'segs': manga(), 'sheet': (24, 3)},
    'mangaD':  {'label': 'Manga direita',  'segs': manga(), 'sheet': (70, 3)},
}
NECK_LEN = plen(dict(PIECES['frente']['segs'])['neck']) + plen(dict(PIECES['costas']['segs'])['neck'])
GL = round(NECK_LEN * 0.92, 1)  # ribana um pouco menor que a gola, pra ficar justinha
PIECES['gola'] = {'label': 'Gola (ribana)', 'sheet': (56, 26.6), 'segs': [
    ('baseF', line((-GL/2, 0), (0, 0))),
    ('baseB', line((0, 0), (GL/2, 0))),
    ('ladoD', line((GL/2, 0), (GL/2, 2.2))),
    ('topo',  line((GL/2, 2.2), (-GL/2, 2.2))),
    ('ladoE', line((-GL/2, 2.2), (-GL/2, 0))),
]}
SHEET_W, SHEET_H = 112, 108
# costuras: (peça, segmento, invertido) <-> (peça, segmento, invertido), sempre no mesmo sentido
SEAMS = [
    (('frente', 'sideR', False), ('costas', 'sideL', True)),
    (('frente', 'sideL', True),  ('costas', 'sideR', False)),
    (('frente', 'shR', False),   ('costas', 'shL', True)),
    (('frente', 'shL', False),   ('costas', 'shR', True)),
    (('frente', 'armR', False),  ('mangaE', 'capR', False)),
    (('costas', 'armL', True),   ('mangaE', 'capL', True)),
    (('frente', 'armL', True),   ('mangaD', 'capR', False)),
    (('costas', 'armR', False),  ('mangaD', 'capL', True)),
    (('mangaE', 'underR', False), ('mangaE', 'underL', True)),
    (('mangaD', 'underR', False), ('mangaD', 'underL', True)),
    (('gola', 'baseF', False), ('frente', 'neck', False)),
    (('gola', 'baseB', False), ('costas', 'neck', False)),
    (('gola', 'ladoD', False), ('gola', 'ladoE', True)),
]
# número de intervalos por segmento: costuras usam o mesmo número dos dois lados
NSEG = {}
for (a, b) in SEAMS:
    la = plen(dict(PIECES[a[0]]['segs'])[a[1]]); lb = plen(dict(PIECES[b[0]]['segs'])[b[1]])
    n = max(2, round(max(la, lb) / STEP))
    NSEG[(a[0], a[1])] = max(NSEG.get((a[0], a[1]), 0), n)
    NSEG[(b[0], b[1])] = max(NSEG.get((b[0], b[1]), 0), n)
for (a, b) in SEAMS:  # garante igualdade depois do max
    n = max(NSEG[(a[0], a[1])], NSEG[(b[0], b[1])]); NSEG[(a[0], a[1])] = NSEG[(b[0], b[1])] = n

# ---------------- posição inicial 3D (Blender: z pra cima, frente = -y) ----------------
Z0 = 0.78
# tronco enrolado numa elipse com a mesma volta do molde (104 cm): não estica nada
_A, _B = 0.19, 0.135
_T = [i * 2 * math.pi / 4000 for i in range(4001)]
_P = [(_A * math.sin(t), -_B * math.cos(t)) for t in _T]
_S = [0.0]
for i in range(1, len(_P)): _S.append(_S[-1] + math.dist(_P[i-1], _P[i]))
_K = 1.04 / _S[-1]
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
def torso_pos(name, x, y):
    z = Z0 + y * CM
    px, py = elipse_em(x * CM) if name == 'frente' else elipse_em(CIRC / 2 + x * CM)
    return Vector((px, py, z))
SH = 0.16; SHZ = 1.42; R0 = 0.42 / (2 * math.pi)
def sleeve_pos(side, x, y):
    s = 1 if side == 'E' else -1
    a = Vector((s * math.cos(math.radians(45)), 0, -math.sin(math.radians(45))))
    u = Vector((s * math.sin(math.radians(45)), 0, math.cos(math.radians(45))))
    f = Vector((0, -1, 0))
    th = (x * CM) / R0
    t = 0.10 + (22.5 - y) * CM
    return Vector((s * SH, 0, SHZ)) + a * t + (u * math.cos(th) + f * math.sin(th)) * R0

# ---------------- malha das peças ----------------
verts3, flat, uvs, faces = [], [], [], []
seg_idx = {}   # (peça, seg) -> lista de índices globais
molde = []
for pname, P in PIECES.items():
    boundary, bidx_local = [], {}
    for sname, pts in P['segs']:
        n = NSEG.get((pname, sname), max(2, round(plen(pts) / STEP)))
        rs = resample(pts, n)
        start = len(boundary)
        boundary.extend(rs[:-1])
        bidx_local[sname] = list(range(start, start + n)) + [None]  # último = primeiro do próximo
    nb = len(boundary)
    names = [s for s, _ in P['segs']]
    for i, s in enumerate(names):
        nxt = bidx_local[names[(i+1) % len(names)]][0]
        bidx_local[s][-1] = nxt
    xs = [p[0] for p in boundary]; ys = [p[1] for p in boundary]
    pts2 = list(boundary)
    gx = min(xs)
    while gx <= max(xs):
        gy = min(ys)
        while gy <= max(ys):
            q = (gx + (hash((round(gx,2), round(gy,2))) % 7) * 0.04, gy)
            if inside(q, boundary) and min(dist_seg(q, boundary[i], boundary[(i+1) % nb]) for i in range(nb)) > STEP * 0.55:
                pts2.append(q)
            gy += STEP * 0.866
        gx += STEP
    vin = [Vector((p[0], p[1])) for p in pts2]
    res = delaunay_2d_cdt(vin, [], [list(range(nb))], 1, 1e-5)
    vout, _, fout, orig_v, _, _ = res
    base = len(verts3)
    local_map = {}
    for oi, ov in enumerate(vout):
        x, y = ov.x, ov.y
        if pname in ('frente', 'costas'): p3 = torso_pos(pname, x, y)
        elif pname == 'gola':
            psi = -((x + GL/2) / GL) * 2 * math.pi
            rr = (GL * CM) / (2 * math.pi)
            p3 = Vector((rr * math.cos(psi), rr * math.sin(psi), 1.47 + 0.03 * math.sin(psi) + y * CM))
        else: p3 = sleeve_pos('E' if pname == 'mangaE' else 'D', x, y)
        verts3.append(p3)
        flat.append(Vector((x * CM, y * CM, 0)))
        ox, oy = P['sheet']
        uvs.append(((x + ox) / SHEET_W, (y + oy) / SHEET_H))
        for o in orig_v[oi]:
            if o < nb: local_map[o] = base + oi
    for f in fout: faces.append([base + i for i in f])
    for sname, lst in bidx_local.items():
        seg_idx[(pname, sname)] = [local_map[i] for i in lst]
    ox, oy = P['sheet']
    out = [(round(p[0] + ox, 2), round(SHEET_H - (p[1] + oy), 2)) for p in boundary]
    molde.append({'id': pname, 'label': P['label'], 'outline': out,
                  'w': round(max(xs) - min(xs), 1), 'h': round(max(ys) - min(ys), 1)})

sew = []
for (a, b) in SEAMS:
    ia = seg_idx[(a[0], a[1])]; ib = seg_idx[(b[0], b[1])]
    if a[2]: ia = rev(ia)
    if b[2]: ib = rev(ib)
    assert len(ia) == len(ib), (a, b, len(ia), len(ib))
    for i, j in zip(ia, ib):
        if i != j: sew.append((i, j))

# ---------------- cena ----------------
if bpy.app.background:
    bpy.ops.wm.read_factory_settings(use_empty=True)
else:
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
scn = bpy.context.scene
me = bpy.data.meshes.new('camiseta')
me.from_pydata([tuple(v) for v in verts3], sew, faces)
me.update()
uvl = me.uv_layers.new(name='molde')
for poly in me.polygons:
    for li in poly.loop_indices:
        uvl.data[li].uv = uvs[me.loops[li].vertex_index]
ob = bpy.data.objects.new('camiseta', me)
scn.collection.objects.link(ob)

def ellipsoid(name, loc, scale, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = scale
    o.modifiers.new('Col', 'COLLISION')
    o.collision.thickness_outer = 0.006
    o.collision.cloth_friction = 8
    return o
body = [
    ellipsoid('peito', (0, 0, 1.28), (0.155, 0.10, 0.21)),
    ellipsoid('quadril', (0, 0, 0.98), (0.15, 0.10, 0.24)),
    ellipsoid('ombros', (0, 0, 1.43), (0.175, 0.08, 0.055)),
    ellipsoid('pescoco', (0, 0, 1.55), (0.048, 0.048, 0.10)),
]
for s in (1, -1):
    a = Vector((s * 0.7071, 0, -0.7071))
    c = Vector((s * SH, 0, SHZ)) + a * 0.19
    body.append(ellipsoid('braco', tuple(c), (0.04, 0.04, 0.21), (0, math.radians(135 * s), 0)))

cl = ob.modifiers.new('Cloth', 'CLOTH')
cs = cl.settings
cs.quality = 8
cs.mass = 0.15
cs.tension_stiffness = 15; cs.compression_stiffness = 15
cs.shear_stiffness = 5; cs.bending_stiffness = 0.4
cs.air_damping = 1.5
cs.use_sewing_springs = True
cs.sewing_force_max = 6
cc = cl.collision_settings
cc.distance_min = 0.004
cc.use_self_collision = True
cc.self_distance_min = 0.003
FR = 160
cl.point_cache.frame_start = 1; cl.point_cache.frame_end = FR
scn.frame_start = 1; scn.frame_end = FR
cs.effector_weights.gravity = 0.0
cs.effector_weights.keyframe_insert(data_path='gravity', frame=1)
cs.effector_weights.keyframe_insert(data_path='gravity', frame=55)
cs.effector_weights.gravity = 1.0
cs.effector_weights.keyframe_insert(data_path='gravity', frame=85)


def finalizar():
    dg = bpy.context.evaluated_depsgraph_get()
    final = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    final.name = 'camiseta_final'
    res_ob = bpy.data.objects.new('Camiseta', final)
    scn.collection.objects.link(res_ob)
    bm = bmesh.new(); bm.from_mesh(final)
    bm.verts.ensure_lookup_table()
    # solda as costuras: o UV continua separado por peça (fica nos cantos de cada face)
    alvo = {}
    def raiz(i):
        while i in alvo: i = alvo[i]
        return i
    for i, j in sew:
        ri, rj = raiz(i), raiz(j)
        if ri != rj: alvo[rj] = ri
    tm = {bm.verts[j]: bm.verts[raiz(j)] for j in alvo}
    for j, v in tm.items():
        mid = (j.co + v.co) / 2; v.co = mid
    bmesh.ops.weld_verts(bm, targetmap=tm)
    loose = [e for e in bm.edges if not e.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='EDGES')
    bm.to_mesh(final); bm.free()
    for p in final.polygons: p.use_smooth = True
    ob.hide_viewport = True; ob.hide_render = True
    for o in body: o.hide_render = True; o.display_type = 'WIRE'
    mat = bpy.data.materials.new('estampa'); mat.use_nodes = True
    final.materials.append(mat)
    sm = res_ob.modifiers.new('Suave', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 4
    sub = res_ob.modifiers.new('Sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
    for o in bpy.context.view_layer.objects: o.select_set(False)
    res_ob.select_set(True); bpy.context.view_layer.objects.active = res_ob
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'camiseta.glb'), use_selection=True, export_apply=True,
                              export_texcoords=True, export_normals=True, export_materials='PLACEHOLDER', export_yup=True)
    json.dump({'sheet': {'w': SHEET_W, 'h': SHEET_H}, 'pecas': molde}, open(os.path.join(OUT, 'camiseta-molde.json'), 'w'), ensure_ascii=False)
    cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
    scn.collection.objects.link(cam); scn.camera = cam
    cam.location = (0.35, -2.3, 1.25); cam.rotation_euler = (math.radians(90), 0, math.radians(8.5))
    cam_data.lens = 70
    scn.render.engine = 'BLENDER_WORKBENCH'
    scn.display.shading.light = 'STUDIO'; scn.display.shading.color_type = 'SINGLE'
    scn.display.shading.single_color = (0.92, 0.92, 0.9)
    scn.display.shading.show_cavity = True
    scn.render.resolution_x = 700; scn.render.resolution_y = 900
    scn.render.filepath = os.path.join(OUT, 'camiseta-preview.png')
    bpy.ops.render.render(write_still=True)
    print('OK', len(verts3), 'verts', len(faces), 'tris', len(sew), 'costuras', flush=True)

if bpy.app.background:
    for f in range(1, FR + 1):
        scn.frame_set(f)
        if f in (1, 2, 5, 10, 30, 60, 100, 160):
            dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg)
            zs = [v.co.z for v in ev.data.vertices]; xs = [v.co.x for v in ev.data.vertices]; ys = [v.co.y for v in ev.data.vertices]
            print('frame', f, 'z', round(min(zs), 3), round(max(zs), 3), 'x', round(min(xs), 3), round(max(xs), 3), 'y', round(min(ys), 3), round(max(ys), 3), flush=True)
        if os.environ.get('ATE') and f >= int(os.environ['ATE']): break
    finalizar()
else:
    # modo ao vivo: mostra a simulação na janela e exporta no fim
    scn.sync_mode = 'NONE'
    def area3d():
        for w in bpy.context.window_manager.windows:
            for a in w.screen.areas:
                if a.type == 'VIEW_3D': return w, a
        return None, None
    def preparar():
        w, a = area3d()
        if not a: return 0.5
        sp = a.spaces.active
        sp.shading.type = 'SOLID'; sp.shading.color_type = 'SINGLE'; sp.shading.single_color = (0.93, 0.93, 0.9)
        sp.overlay.show_floor = False; sp.overlay.show_axis_x = False; sp.overlay.show_axis_y = False
        r3 = sp.region_3d
        from mathutils import Euler
        r3.view_rotation = Euler((math.radians(82), 0, math.radians(18))).to_quaternion()
        r3.view_location = (0, 0, 1.15); r3.view_distance = 2.4; r3.view_perspective = 'PERSP'
        scn.frame_set(1)
        with bpy.context.temp_override(window=w, area=a):
            bpy.ops.screen.animation_play()
        return None
    estado = {'feito': False}
    def no_frame(scene, *args):
        if scene.frame_current >= FR and not estado['feito']:
            estado['feito'] = True
            def fim():
                w, a = area3d()
                with bpy.context.temp_override(window=w, area=a):
                    bpy.ops.screen.animation_cancel(restore_frame=False)
                    finalizar()
                return None
            bpy.app.timers.register(fim, first_interval=0.3)
    bpy.app.handlers.frame_change_post.append(no_frame)
    bpy.app.timers.register(preparar, first_interval=1.0)
