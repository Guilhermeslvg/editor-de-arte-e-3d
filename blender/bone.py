# Boné americano 6 gomos modelado por medida (sem simulação de tecido).
# Rodar: Blender -b -P blender/bone.py -- <pasta_saida>
# Saída: bone.glb (UV = molde aberto), bone-molde.json, bone-ao.png, bone-preview.png
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.getcwd()
os.makedirs(OUT, exist_ok=True)
CM = 0.01

# ---------------- forma da copa ----------------
A, B = 0.096, 0.108          # meia largura (x) e meia profundidade (y) da base da copa
HF, HB = 0.118, 0.104        # altura na frente e atrás
def copa(phi, t):
    """phi: ângulo em volta (0 = frente, + = lado esquerdo de quem usa); t: 0 topo .. 1 base"""
    fr = 0.5 + 0.5 * math.cos(phi)              # 1 na frente, 0 atrás
    h = HB + (HF - HB) * fr
    n = 2.4 + 0.9 * fr                           # superelipse: frente mais reta e estruturada
    th = t * math.pi / 2
    r = math.sin(th) ** (2 / n)
    z = h * math.cos(th) ** (2 / n)
    x = A * r * math.sin(phi)
    y = -B * r * math.cos(phi)
    if abs(phi) < math.pi / 2:  # frente estruturada (painel firme, levemente estufado)
        y -= 0.007 * math.sin(math.pi * t) * math.cos(phi) ** 2
    return Vector((x, y, z))

def achata(phi0, phi1, nphi, nt, t0=0.015):
    """malha (phi,t) e UV plano em cm: v = comprimento do meridiano a partir da base; u = arco do paralelo a partir do meio"""
    phic = (phi0 + phi1) / 2
    ts = [t0 + (1 - t0) * j / nt for j in range(nt + 1)]
    phis = [phi0 + (phi1 - phi0) * i / nphi for i in range(nphi + 1)]
    # v ao longo do meridiano central
    vj = [0.0] * len(ts)
    for j in range(len(ts) - 2, -1, -1):
        vj[j] = vj[j + 1] + (copa(phic, ts[j]) - copa(phic, ts[j + 1])).length / CM
    pos, uv = [], []
    for j, t in enumerate(ts):
        # u ao longo do paralelo, medido a partir do meio
        fino = 200; acc = {0: 0.0}
        def arco(p1):
            n = max(2, int(abs(p1 - phic) / (2 * math.pi) * fino * 6))
            s = 0.0; prev = copa(phic, t)
            for k in range(1, n + 1):
                p = phic + (p1 - phic) * k / n; q = copa(p, t); s += (q - prev).length; prev = q
            return s / CM * (1 if p1 >= phic else -1)
        for i, ph in enumerate(phis):
            pos.append(copa(ph, t)); uv.append((arco(ph), vj[j]))
    faces = []
    W = len(phis)
    for j in range(len(ts) - 1):
        for i in range(W - 1):
            a = j * W + i; faces.append((a, a + 1, a + W + 1, a + W))
    borda = [j * W for j in range(len(ts))][::-1]  # lado phi0 (base -> topo invertido abaixo)
    contorno = [(len(ts) - 1) * W + i for i in range(W)] + [j * W + (W - 1) for j in range(len(ts) - 2, -1, -1)] + \
               [i for i in range(W - 2, -1, -1)] + [j * W for j in range(1, len(ts) - 1)]
    return pos, uv, faces, contorno, (W, len(ts))

D = math.radians
PECAS = {}
PECAS['frente'] = dict(label='Frente (2 gomos)', **dict(zip(('pos', 'uv', 'faces', 'contorno', 'grade'), achata(D(-60), D(60), 48, 40))))
PECAS['lateralE'] = dict(label='Lateral esquerda', **dict(zip(('pos', 'uv', 'faces', 'contorno', 'grade'), achata(D(60), D(120), 24, 40))))
PECAS['lateralD'] = dict(label='Lateral direita', **dict(zip(('pos', 'uv', 'faces', 'contorno', 'grade'), achata(D(-120), D(-60), 24, 40))))
PECAS['traseira'] = dict(label='Traseira (2 gomos)', **dict(zip(('pos', 'uv', 'faces', 'contorno', 'grade'), achata(D(120), D(240), 48, 40))))
# a traseira é vista de trás: espelha o u pra estampa sair certa
PECAS['traseira']['uv'] = [(-u, v) for u, v in PECAS['traseira']['uv']]

# ---------------- aba ----------------
def aba(nphi=56, ns=14, baixo=False):
    pos, uv, faces = [], [], []
    p0, p1 = D(-102), D(102)
    for j in range(ns + 1):
        s = j / ns
        for i in range(nphi + 1):
            ph = p0 + (p1 - p0) * i / nphi
            b = Vector((A * math.sin(ph), -B * math.cos(ph), 0.0))
            n = Vector((math.sin(ph) / A, -math.cos(ph) / B, 0)).normalized()
            L = 0.074 * max(0.0, math.cos(ph * 0.86)) ** 1.15
            p = b + n * (L * s + 0.0015)
            # curva da aba presa na base da copa (em s=0 fica colada nela)
            p.z = 0.004 - 0.045 * ((p.x / 0.12) ** 2 - (b.x / 0.12) ** 2) - 0.34 * (L * s) - (0.0035 if baixo else 0.0)
            pos.append(p); uv.append(((-p.x if baixo else p.x) / CM, -p.y / CM))
    W = nphi + 1
    for j in range(ns):
        for i in range(nphi):
            a = j * W + i
            f = (a, a + 1, a + W + 1, a + W)
            faces.append(tuple(reversed(f)) if baixo else f)
    contorno = [i for i in range(W)] + [j * W + nphi for j in range(1, ns + 1)] + [ns * W + i for i in range(nphi - 1, -1, -1)] + [j * W for j in range(ns - 1, 0, -1)]
    return pos, uv, faces, contorno, (W, ns + 1)
PECAS['aba'] = dict(label='Aba (em cima)', **dict(zip(('pos', 'uv', 'faces', 'contorno', 'grade'), aba())))
PECAS['abaBaixo'] = dict(label='Aba (embaixo)', **dict(zip(('pos', 'uv', 'faces', 'contorno', 'grade'), aba(baixo=True))))
def borda_aba():
    t_, b_ = PECAS['aba'], PECAS['abaBaixo']; W, Hh = t_['grade']
    ids = [(Hh - 1) * W + i for i in range(W)]
    pos = [t_['pos'][i] for i in ids] + [b_['pos'][i] for i in ids]
    uv = [(t_['uv'][i][0], t_['uv'][i][1] + 0.35 * k) for k in (0, 1) for i in ids]
    faces = [(i, i + 1, W + i + 1, W + i) for i in range(W - 1)]
    contorno = list(range(W)) + list(range(2 * W - 1, W - 1, -1))
    return pos, uv, faces, contorno, (W, 2)
PECAS['abaBorda'] = dict(label='Viés da aba', **dict(zip(('pos', 'uv', 'faces', 'contorno', 'grade'), borda_aba())))

# ---------------- botão ----------------
def botao(n=24, m=6, R=0.0105, H=0.0055):
    top = copa(0, 0.015)
    pos, uv, faces = [], [], []
    for j in range(m + 1):
        t = j / m
        for i in range(n):
            a = 2 * math.pi * i / n
            r = R * math.sin(t * math.pi / 2); z = H * math.cos(t * math.pi / 2)
            pos.append(Vector((r * math.cos(a), r * math.sin(a), top.z + z - 0.001)))
            uv.append((r * math.cos(a) / CM * 1.4, r * math.sin(a) / CM * 1.4))
    for j in range(m):
        for i in range(n):
            a = j * n + i; b2 = j * n + (i + 1) % n
            faces.append((a, b2, b2 + n, a + n))
    contorno = [m * n + i for i in range(n)]
    return pos, uv, faces, contorno, (n, m + 1)
PECAS['botao'] = dict(label='Botão', **dict(zip(('pos', 'uv', 'faces', 'contorno', 'grade'), botao())))

# ---------------- empacota no molde ----------------
GAP = 4; SHEET_W = 70
boxes = []
for k, p in PECAS.items():
    us = [u for u, v in p['uv']]; vs = [v for u, v in p['uv']]
    boxes.append((k, min(us), min(vs), max(us) - min(us), max(vs) - min(vs)))
boxes.sort(key=lambda b: -b[4])
cx, cy, rh = GAP, GAP, 0
for k, mu, mv, w, h in boxes:
    if cx + w + GAP > SHEET_W: cx = GAP; cy += rh + GAP; rh = 0
    PECAS[k]['off'] = (cx - mu, cy - mv); cx += w + GAP; rh = max(rh, h)
SHEET_H = math.ceil(cy + rh + GAP)

# ---------------- cena ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
verts, uvs, faces, molde = [], [], [], []
for k, p in PECAS.items():
    base = len(verts); ox, oy = p['off']
    verts += [tuple(v) for v in p['pos']]
    uvs += [((u + ox) / SHEET_W, (v + oy) / SHEET_H) for u, v in p['uv']]
    faces += [tuple(base + i for i in f) for f in p['faces']]
    cont = [p['uv'][i] for i in p['contorno']]
    us = [u for u, v in p['uv']]; vs = [v for u, v in p['uv']]
    molde.append({'id': k, 'label': p['label'], 'outline': [(round(u + ox, 2), round(SHEET_H - (v + oy), 2)) for u, v in cont],
                  'w': round(max(us) - min(us), 1), 'h': round(max(vs) - min(vs), 1)})
me = bpy.data.meshes.new('bone'); me.from_pydata(verts, [], faces); me.update()
uvl = me.uv_layers.new(name='molde')
for poly in me.polygons:
    for li in poly.loop_indices: uvl.data[li].uv = uvs[me.loops[li].vertex_index]
ob = bpy.data.objects.new('Bone', me); scn.collection.objects.link(ob)
# costura: junta os gomos que se encostam (o UV continua separado)
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
mat = bpy.data.materials.new('estampa'); mat.use_nodes = True; me.materials.append(mat)
mdentro = bpy.data.materials.new('dentro'); mdentro.use_nodes = True; me.materials.append(mdentro)
sub = ob.modifiers.new('Sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
so = ob.modifiers.new('Espessura', 'SOLIDIFY'); so.thickness = 0.0025; so.offset = -1; so.use_quality_normals = True
so.material_offset = 1; so.material_offset_rim = 0
so.show_render = False; so.show_viewport = False

# cabeça invisível só pra sombra de dentro
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=(0, 0.01, -0.02))
cab = bpy.context.active_object; cab.scale = (0.088, 0.1, 0.11)

# sombra assada + costuras e pespontos
AO_W = 2048; AO_H = round(2048 * SHEET_H / SHEET_W)
scn.render.engine = 'CYCLES'; scn.cycles.samples = 64; scn.cycles.device = 'CPU'
img = bpy.data.images.new('ao', AO_W, AO_H, alpha=False)
tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = img; mat.node_tree.nodes.active = tex
for o in list(scn.objects): o.select_set(False)
ob.select_set(True); bpy.context.view_layer.objects.active = ob
scn.render.bake.margin = 12
bpy.ops.object.bake(type='AO')
mat.node_tree.nodes.remove(tex)
px = np.empty(AO_W * AO_H * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(-1, 4)
ao = 0.4 + 0.6 * px[:, 0].reshape(AO_H, AO_W)
def mark(u, v, f, r=1):
    c = int(u / SHEET_W * AO_W); rr = int(v / SHEET_H * AO_H)
    ao[max(0, rr - r + 1):min(AO_H, rr + r), max(0, c - r + 1):min(AO_W, c + r)] *= f
def linha(pts, f, tracejado, r=1):
    for i in range(len(pts) - 1):
        (u0, v0), (u1, v1) = pts[i], pts[i + 1]
        n = max(1, int(math.hypot(u1 - u0, v1 - v0) * 14))
        for k in range(n):
            if tracejado and (k % 7) >= 4: continue
            mark(u0 + (u1 - u0) * k / n, v0 + (v1 - v0) * k / n, f, r)
def coluna(p, i, du=0.0):
    W, Hh = p['grade']; ox, oy = p['off']
    return [(p['uv'][j * W + i][0] + ox + du, p['uv'][j * W + i][1] + oy) for j in range(Hh)]
for k in ('frente', 'lateralE', 'lateralD', 'traseira'):
    p = PECAS[k]; W, Hh = p['grade']
    for i, sgn in ((0, 1), (W - 1, -1)):
        linha(coluna(p, i), 0.7, False, 2)
        linha(coluna(p, i, sgn * 0.45), 0.78, True)
    if k in ('frente', 'traseira'):  # costura do meio entre os 2 gomos
        mid = (W - 1) // 2
        linha(coluna(p, mid), 0.72, False, 2); linha(coluna(p, mid, 0.45), 0.8, True); linha(coluna(p, mid, -0.45), 0.8, True)
    # ilhós (respiro) em cada gomo
    for gi in ([W // 4, 3 * W // 4] if k in ('frente', 'traseira') else [W // 2]):
        j = int(Hh * 0.28); ox, oy = p['off']; u, v = p['uv'][j * W + gi]
        for a in range(36):
            aa = 2 * math.pi * a / 36
            mark(u + ox + 0.32 * math.cos(aa), v + oy + 0.32 * math.sin(aa), 0.55, 2)
# pespontos da aba: fileiras paralelas à borda de fora
for k in ('aba', 'abaBaixo'):
    p = PECAS[k]; W, Hh = p['grade']; ox, oy = p['off']
    for row in range(1, 7):
        s = (Hh - 1) - row * 1.0
        j0 = int(s); f = s - j0
        pts = []
        for i in range(W):
            a_ = p['uv'][j0 * W + i]; b_ = p['uv'][min(Hh - 1, j0 + 1) * W + i]
            pts.append((a_[0] + (b_[0] - a_[0]) * f + ox, a_[1] + (b_[1] - a_[1]) * f + oy))
        linha(pts, 0.8, True)
px[:, 0] = px[:, 1] = px[:, 2] = ao.ravel(); px[:, 3] = 1
img.pixels.foreach_set(px.ravel())
img.filepath_raw = os.path.join(OUT, 'bone-ao.png'); img.file_format = 'PNG'; img.save()
bpy.data.objects.remove(cab, do_unlink=True)
so.show_render = True; so.show_viewport = True

for o in list(scn.objects): o.select_set(False)
ob.select_set(True); bpy.context.view_layer.objects.active = ob
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'bone.glb'), use_selection=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_materials='PLACEHOLDER', export_yup=True)
json.dump({'sheet': {'w': SHEET_W, 'h': SHEET_H}, 'pecas': molde, 'nome': 'Boné americano 6 gomos'},
          open(os.path.join(OUT, 'bone-molde.json'), 'w'), ensure_ascii=False)

cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
scn.collection.objects.link(cam); scn.camera = cam
cam.location = (0.32, -0.52, 0.2); cam.rotation_euler = (math.radians(72), 0, math.radians(31)); cam_data.lens = 60
scn.render.engine = 'BLENDER_WORKBENCH'
scn.display.shading.light = 'STUDIO'; scn.display.shading.color_type = 'SINGLE'
scn.display.shading.single_color = (0.92, 0.92, 0.9); scn.display.shading.show_cavity = True
scn.render.resolution_x = 800; scn.render.resolution_y = 600
scn.render.filepath = os.path.join(OUT, 'bone-preview.png')
bpy.ops.render.render(write_still=True)
print('OK bone', SHEET_W, SHEET_H, flush=True)
