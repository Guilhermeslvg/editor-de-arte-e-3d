// Prévia 3D de cada produto (1 unidade = 1 cm)
const Mock = (() => {
  let renderer, scene, camera, el, group = null, texture = null, texCanvas, tctx;
  let mode = 'full', views = [], elev = 0.28, cover = 0, swayBase = 0, swayAmp = 0.5, swayT = 0, transparent = false;
  let dragging = false, lastX = 0, lastY = 0, vel = 0, pitch = 0, zoomK = 1, isGlb = false;
  const look = { ao: 1, normal: 0.6, luz: 1, rough: 0.92 };
  let envTex = null, knitTex = null, aoCache = {};
  let shotRenderer = null;

  function init(container) {
    el = container;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = THREE.sRGBEncoding;
    el.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(28, 1, 0.1, 1000);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xbdb8b0, 0.85); hemi.userData.base = 0.85; hemi.userData.roupa = 0.35; scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.75); key.position.set(3, 4, 5); key.userData.base = 0.75; key.userData.roupa = 0.0; scene.add(key);
    const lado = new THREE.DirectionalLight(0xfff4e8, 0); lado.position.set(-4, 3.5, 2.5); lado.userData.base = 0; lado.userData.roupa = 1.15; scene.add(lado);
    const rim = new THREE.DirectionalLight(0xffffff, 0.3); rim.position.set(-4, 2, -3); rim.userData.base = 0.3; rim.userData.roupa = 0.35; scene.add(rim);
    el.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; vel = 0; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (!dragging || !group) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      vel = dx * 0.01; group.rotation.y += vel;
      if (isGlb && Math.abs(dy) > 0) { pitch = Math.max(-0.3, Math.min(0.7, pitch + dy * 0.004)); fit(camera); }
    });
    el.addEventListener('wheel', (e) => {
      if (!group) return;
      e.preventDefault();
      zoomK = Math.max(0.4, Math.min(1.8, zoomK * Math.exp(e.deltaY * 0.0012)));
      fit(camera);
    }, { passive: false });
    const up = () => {
      if (!dragging) return; dragging = false;
      if (group && mode === 'sway') swayT = Math.asin(Math.max(-1, Math.min(1, (group.rotation.y - swayBase) / swayAmp)));
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    resize();
    requestAnimationFrame(loop);
  }
  function resize() {
    const w = el.clientWidth, h = document.body.classList.contains('garment') && el.clientHeight > 50 ? el.clientHeight : Math.round(w * 0.9);
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (group) fit(camera);
  }
  function loop() {
    if (group && !dragging) {
      if (Math.abs(vel) > 0.0005) { group.rotation.y += vel; vel *= 0.94; if (mode === 'sway' && Math.abs(vel) <= 0.0005) swayT = Math.asin(Math.max(-1, Math.min(1, (group.rotation.y - swayBase) / swayAmp))); }
      else if (document.getElementById('spin').checked) {
        if (mode === 'full') group.rotation.y += 0.006;
        else { swayT += 0.01; group.rotation.y = swayBase + Math.sin(swayT) * swayAmp; }
      }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  /* ---------- helpers ---------- */
  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => m.dispose());
    });
  }
  function std(color, rough = 0.5, extra = {}) { return new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: rough, metalness: 0, ...extra }); }
  function printMat(rough = 0.3) {
    return new THREE.MeshStandardMaterial({ map: texture, roughness: rough, transparent, alphaTest: transparent ? 0.02 : 0, polygonOffset: true, polygonOffsetFactor: -2 });
  }
  function roundedRect(w, h, r, cx = 0, cy = 0) {
    const s = new THREE.Shape(), x = cx - w / 2, y = cy - h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function shapePlane(shape, w, h, cx = 0, cy = 0) {
    const g = new THREE.ShapeGeometry(shape, 16);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - (cx - w / 2)) / w, (p.getY(i) - (cy - h / 2)) / h);
    return g;
  }
  function shade(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }

  /* ---------- realismo da roupa ---------- */
  function ambiente() {
    if (envTex) return envTex;
    const pm = new THREE.PMREMGenerator(renderer);
    const room = new THREE.Scene();
    const box = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({ color: 0x9a968e, side: THREE.BackSide }));
    room.add(box);
    const luz = (w, h, x, y, z, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 0.97), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); room.add(m); };
    luz(6, 3, 0, 3.8, 2, 7); luz(3, 4, -5.5, 1, 2, 4); luz(3, 4, 5.5, 1.5, -1, 2.5); luz(4, 2, 0, 0.5, 5.8, 2);
    envTex = pm.fromScene(room, 0.04).texture;
    return envTex;
  }
  function malha() {
    if (knitTex) return knitTex;
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, N, N);
    const cw = 8, ch = 7;
    for (let col = 0; col < N / cw; col++) for (let row = 0; row < N / ch + 1; row++) {
      const cx = col * cw + cw / 2, cy = row * ch + (col % 2) * 0.5;
      [-1, 1].forEach((sd) => {
        const g = x.createRadialGradient(cx + sd * 1.8, cy, 0, cx + sd * 1.8, cy, 4.2);
        g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.save(); x.translate(cx + sd * 1.8, cy); x.rotate(sd * 0.55); x.scale(0.55, 1.15); x.translate(-(cx + sd * 1.8), -cy);
        x.fillStyle = g; x.beginPath(); x.arc(cx + sd * 1.8, cy, 4.2, 0, Math.PI * 2); x.fill(); x.restore();
      });
    }
    const hgt = x.getImageData(0, 0, N, N).data, out = x.createImageData(N, N);
    const H = (i, j) => hgt[(((j + N) % N) * N + ((i + N) % N)) * 4] / 255;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const dx = (H(i + 1, j) - H(i - 1, j)) * 2.2, dy = (H(i, j + 1) - H(i, j - 1)) * 2.2;
      const l = Math.hypot(dx, dy, 1), k = (j * N + i) * 4;
      out.data[k] = (-dx / l * 0.5 + 0.5) * 255; out.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[k + 3] = 255;
    }
    x.putImageData(out, 0, 0);
    knitTex = new THREE.CanvasTexture(c); knitTex.wrapS = knitTex.wrapT = THREE.RepeatWrapping;
    knitTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return knitTex;
  }
  function aoMapa(model) {
    if (aoCache[model]) return aoCache[model];
    const t = new THREE.TextureLoader().load(`modelos/${model}-ao.png`);
    t.flipY = false; aoCache[model] = t; return t;
  }
  let roupaMats = [];
  function roupaMat(P) {
    const m = new THREE.MeshStandardMaterial({
      map: texture, aoMap: aoMapa(P.model), aoMapIntensity: look.ao, normalMap: malha(), normalScale: new THREE.Vector2(look.normal, look.normal),
      envMap: ambiente(), envMapIntensity: 0.85 * look.luz, roughness: look.rough, metalness: 0, side: THREE.DoubleSide,
    });
    const sheet = (typeof MOLDES !== 'undefined' && MOLDES[P.model]) ? MOLDES[P.model].sheet : { w: 120, h: 110 };
    const rep = new THREE.Vector2(sheet.w / 3.2, sheet.h / 3.2);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.knitRep = { value: rep };
      const chunk = THREE.ShaderChunk.normal_fragment_maps.split('texture2D( normalMap, vUv )').join('texture2D( normalMap, vUv * knitRep )');
      sh.fragmentShader = 'uniform vec2 knitRep;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', chunk);
    };
    roupaMats.push(m);
    return m;
  }
  function setLook(o) {
    Object.assign(look, o);
    roupaMats.forEach((m) => {
      m.aoMapIntensity = look.ao; m.normalScale.set(look.normal, look.normal);
      m.envMapIntensity = 0.85 * look.luz; m.roughness = look.rough;
    });
    if (scene) scene.children.forEach((c) => { if (c.isLight) c.intensity = (isGlb ? c.userData.roupa : c.userData.base) * (isGlb ? look.luz : 1); });
  }

  /* ---------- modelos ---------- */
  const glbCache = {};
  const BUILD = {
    glb(S, color, P) {
      const g = new THREE.Group();
      const usar = (scene) => {
        const sc = scene.clone(true);
        sc.traverse((o) => {
          if (!o.isMesh) return;
          o.geometry.setAttribute('uv2', o.geometry.attributes.uv);
          o.material = roupaMat(P);
        });
        g.add(sc);
        if (group === g) fit(camera);
      };
      if (glbCache[P.model]) usar(glbCache[P.model]);
      else new THREE.GLTFLoader().load(`modelos/${P.model}.glb`, (gltf) => { glbCache[P.model] = gltf.scene; usar(gltf.scene); }, undefined, (e) => console.error('modelo 3D', e));
      return { group: g, spin: 'full', elev: 0.08, start: -0.4, cover: 0, views: [['Frente', 0], ['Lado', -0.9], ['Costas', Math.PI]] };
    },

    mug(S, color, P) {
      const g = new THREE.Group();
      const R = 4.1, HM = S.h, CIRC = Math.PI * 2 * R;
      const L = Math.min((Math.PI * 2 * S.w) / CIRC, Math.PI * 2 - 0.35);
      const bodyColor = P.mock === 'mug' && P.name.includes('mágica') ? 0x161616 : 0xffffff;
      const body = std(bodyColor, 0.3);
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, HM, 180, 1, true, -L / 2, L), printMat(0.3)));
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, HM, 48, 1, true, L / 2, Math.PI * 2 - L), body));
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.94, R * 0.94, HM, 96, 1, true), std(0xf2f0ec, 0.35, { side: THREE.BackSide })));
      const lip = new THREE.Mesh(new THREE.TorusGeometry(R * 0.97, R * 0.03, 16, 160), body);
      lip.rotation.x = Math.PI / 2; lip.position.y = HM / 2; g.add(lip);
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(R, 64), body);
      bottom.rotation.x = Math.PI / 2; bottom.position.y = -HM / 2; g.add(bottom);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(R * 0.94, 64), std(0xf2f0ec, 0.35));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -HM / 2 + 0.8; g.add(floor);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(HM * 0.27, R * 0.11, 24, 72, Math.PI), body);
      handle.rotation.set(0, Math.PI / 2, -Math.PI / 2); handle.position.set(0, 0, -R * 0.97); g.add(handle);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(R * 1.25, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.05 }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = -HM / 2 - 0.05; sh.userData.noFit = true; g.add(sh);
      return { group: g, spin: 'full', start: -1.0, cover: 1, views: [['Lado esquerdo', 1.25], ['Frente', 0], ['Lado direito', -1.25]] };
    },

    frame(S, color) {
      const g = new THREE.Group();
      const w = S.w, h = S.h, b = Math.max(1.6, Math.min(w, h) * 0.07), d = 2.4;
      const fm = std(color || '#1c1c1c', 0.55);
      const box = (bw, bh, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, d), fm); m.position.set(x, y, 0); g.add(m); };
      box(w + 2 * b, b, 0, h / 2 + b / 2); box(w + 2 * b, b, 0, -h / 2 - b / 2);
      box(b, h, -w / 2 - b / 2, 0); box(b, h, w / 2 + b / 2, 0);
      const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), printMat(0.45));
      art.position.z = d / 2 - 0.5; g.add(art);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std(0xd8d2c8, 0.9));
      back.position.z = d / 2 - 0.52; back.rotation.y = Math.PI; g.add(back);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry((w + 2 * b) * 7, (h + 2 * b) * 7), std(0xebe7e0, 0.95));
      wall.position.z = -d / 2 - 0.02; wall.userData.noFit = true; g.add(wall);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(w + 2 * b + 1.2, h + 2 * b + 1.2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 }));
      sh.position.set(0.4, -0.8, -d / 2 - 0.01); sh.userData.noFit = true; g.add(sh);
      return { group: g, spin: 'sway', amp: 0.45, elev: 0.06, cover: 1, views: [['Ângulo esquerdo', 0.5], ['Frente', 0], ['Ângulo direito', -0.5]] };
    },

    shirt(S, color) { return clothing(S, color, false); },
    hoodie(S, color) { return clothing(S, color, true); },

    pillow(S) {
      const g = new THREE.Group();
      const w = S.w, h = S.h, t = Math.min(w, h) * 0.14;
      const geo = new THREE.PlaneGeometry(w, h, 90, 90);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = Math.abs((2 * p.getX(i)) / w), v = Math.abs((2 * p.getY(i)) / h);
        const f = Math.max(0, (1 - Math.pow(u, 2.5)) * (1 - Math.pow(v, 2.5)));
        p.setZ(i, t * Math.pow(f, 0.6));
      }
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, printMat(0.85)));
      const back = new THREE.Mesh(geo.clone(), std(0xf4f2ee, 0.9)); back.rotation.y = Math.PI; g.add(back);
      g.rotation.x = -0.08;
      return { group: g, spin: 'sway', amp: 0.55, elev: 0.18, cover: 1, views: [['Ângulo esquerdo', 0.55], ['Frente', 0], ['Ângulo direito', -0.55]] };
    },

    tile(S) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(S.w, S.h, 0.6), std(0xffffff, 0.25)));
      const art = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.h), printMat(0.15));
      art.position.z = 0.302; g.add(art);
      return { group: g, spin: 'sway', amp: 0.55, elev: 0.15, cover: 1, views: [['Ângulo esquerdo', 0.55], ['Frente', 0], ['Ângulo direito', -0.55]] };
    },

    keychain(S) {
      const g = new THREE.Group();
      const w = S.w, h = S.h, m = 0.25, tab = 1.0, dep = 0.3;
      const bodyShape = roundedRect(w + 2 * m, h + 2 * m + tab, 0.5, 0, tab / 2);
      const holeY = h / 2 + m + tab / 2;
      const hole = new THREE.Path(); hole.absarc(0, holeY, 0.28, 0, Math.PI * 2, false); bodyShape.holes.push(hole);
      const body = new THREE.Mesh(
        new THREE.ExtrudeGeometry(bodyShape, { depth: dep, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 24 }),
        new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1 }));
      body.position.z = -dep / 2; g.add(body);
      const art = new THREE.Mesh(shapePlane(roundedRect(w, h, 0.35), w, h), printMat(0.2));
      art.position.z = dep / 2 + 0.06; g.add(art);
      const metal = new THREE.MeshStandardMaterial({ color: 0xd4d4d4, metalness: 0.6, roughness: 0.3 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 16, 64), metal);
      ring.rotation.y = Math.PI / 2; ring.position.set(0, holeY + 0.62, 0); g.add(ring);
      return { group: g, spin: 'sway', amp: 0.6, elev: 0.1, cover: 1, views: [['Ângulo esquerdo', 0.6], ['Frente', 0], ['Ângulo direito', -0.6]] };
    },

    phone(S) {
      const g = new THREE.Group();
      const bw = 7.4, bh = 15.4, sw = 6.8, sh = 14.6;
      const body = new THREE.Mesh(
        new THREE.ExtrudeGeometry(roundedRect(bw, bh, 1.1), { depth: 0.6, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 4, curveSegments: 24 }),
        std('#16161a', 0.35));
      body.position.z = -0.3; g.add(body);
      const screen = new THREE.Mesh(shapePlane(roundedRect(sw, sh, 0.85), sw, sh), std('#ffffff', 0.6));
      screen.position.z = 0.43; g.add(screen);
      let pw = sw, ph = (sw * S.h) / S.w;
      if (ph > sh) { ph = sh; pw = (sh * S.w) / S.h; }
      const story = S.h / S.w > 1.6;
      const art = new THREE.Mesh(story ? shapePlane(roundedRect(pw, ph, 0.85), pw, ph) : new THREE.PlaneGeometry(pw, ph), printMat(0.5));
      art.position.set(0, story ? 0 : 0.6, 0.44); g.add(art);
      if (!story) {
        const bar = (y, w, h, c) => { const m = new THREE.Mesh(shapePlane(roundedRect(w, h, h / 2), w, h), std(c, 0.8)); m.position.set(-sw / 2 + 0.4 + w / 2, y, 0.441); g.add(m); };
        bar(0.6 + ph / 2 + 0.55, 2.2, 0.32, '#d9d6d0');
        const av = new THREE.Mesh(new THREE.CircleGeometry(0.32, 32), std('#cfcac2', 0.8)); av.position.set(-sw / 2 + 0.75, 0.6 + ph / 2 + 0.55, 0.442); g.add(av);
        bar(0.6 - ph / 2 - 0.5, 3.4, 0.26, '#e3e0da'); bar(0.6 - ph / 2 - 0.95, 2.4, 0.26, '#e3e0da');
      }
      const notch = new THREE.Mesh(shapePlane(roundedRect(2.0, 0.5, 0.25), 2.0, 0.5), std('#16161a', 0.4));
      notch.position.set(0, sh / 2 - 0.5, 0.445); g.add(notch);
      return { group: g, spin: 'sway', amp: 0.5, elev: 0.08, cover: 1, views: [['Ângulo esquerdo', 0.45], ['Frente', 0], ['Ângulo direito', -0.45]] };
    },

    cap(S, color) {
      const g = new THREE.Group();
      const R = 9.2, sy = 0.78;
      const fabric = std(color || '#1d1d1f', 0.85, { side: THREE.DoubleSide });
      const crown = new THREE.Group(); crown.scale.y = sy; g.add(crown);
      crown.add(new THREE.Mesh(new THREE.SphereGeometry(R, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2), fabric));
      const a = S.w / R, tl = S.h / (R * sy), tEnd = Math.PI / 2 - 0.12;
      crown.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 48, 24, Math.PI / 2 - a / 2, a, tEnd - tl, tl), printMat(0.85)));
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), fabric); btn.position.y = R * sy; g.add(btn);
      const pts = [];
      for (let i = 0; i <= 40; i++) { const t = (i / 40) * Math.PI; pts.push(new THREE.Vector2(Math.cos(t) * (R + 0.4), Math.sin(t) * (R + 7.5))); }
      for (let i = 40; i >= 0; i--) { const t = (i / 40) * Math.PI; pts.push(new THREE.Vector2(Math.cos(t) * R * 0.9, Math.sin(t) * R * 0.9)); }
      const brim = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 }), std(shade(color || '#1d1d1f', 0.92), 0.85));
      brim.rotation.x = Math.PI / 2 + 0.08; brim.position.y = 0.2; g.add(brim);
      return { group: g, spin: 'full', start: 0.5, elev: 0.2, cover: 1, views: [['Lado esquerdo', 0.9], ['Frente', 0], ['Lado direito', -0.9]] };
    },
  };

  function clothing(S, color, hood) {
    const g = new THREE.Group();
    const c = color || '#f5f5f2';
    const fabric = std(c, 0.92);
    const P = hood
      ? [[-10, 0], [-24, -4], [-30, -14], [-41, -56], [-33, -59], [-26, -26], [-27, -70], [27, -70], [26, -26], [33, -59], [41, -56], [30, -14], [24, -4], [10, 0]]
      : [[-9, 0], [-23, -3], [-35, -16], [-28, -24], [-25, -20], [-26, -72], [26, -72], [25, -20], [28, -24], [35, -16], [23, -3], [9, 0]];
    const s = new THREE.Shape();
    s.moveTo(P[0][0], P[0][1]);
    P.slice(1).forEach(([x, y]) => s.lineTo(x, y));
    s.quadraticCurveTo(0, hood ? -7 : -9, P[0][0], P[0][1]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.2, bevelSegments: 5, curveSegments: 24 });
    geo.translate(0, 0, -1.5);
    g.add(new THREE.Mesh(geo, fabric));
    const front = 2.72;
    if (hood) {
      const hs = new THREE.Shape(); hs.absellipse(0, -3, 17, 9, 0, Math.PI * 2, false, 0);
      const hm = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 4 }), std(shade(c, 0.88), 0.92));
      hm.position.z = -3.2; g.add(hm);
      const pocket = new THREE.Shape(); pocket.moveTo(-17, -47); pocket.lineTo(17, -47); pocket.lineTo(21, -63); pocket.lineTo(-21, -63); pocket.closePath();
      const pm = new THREE.Mesh(new THREE.ShapeGeometry(pocket), std(shade(c, 0.94), 0.92)); pm.position.z = front - 0.01; g.add(pm);
      const band = new THREE.Mesh(new THREE.PlaneGeometry(52, 5), std(shade(c, 0.9), 0.92)); band.position.set(0, -67, front - 0.01); g.add(band);
    }
    const print = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.h), printMat(0.9));
    const x = S.x || 0, y = -(S.top || 9) - S.h / 2;
    if (S.side === 'back') { print.rotation.y = Math.PI; print.position.set(-x, y, -front); }
    else print.position.set(x, y, front);
    g.add(print);
    const back = S.side === 'back';
    return {
      group: g, spin: 'full', elev: 0.1, start: back ? Math.PI - 0.4 : -0.4, cover: 0,
      views: back ? [['Costas', Math.PI], ['Em ângulo', Math.PI + 0.55], ['Frente', 0]] : [['Frente', 0], ['Em ângulo', -0.55], ['Costas', Math.PI]],
    };
  }

  /* ---------- câmera ---------- */
  function fit(cam) {
    if (!group || !group.children.length) return;
    const saved = group.rotation.y; group.rotation.y = 0; group.updateMatrixWorld(true);
    const box = new THREE.Box3();
    group.traverse((o) => {
      if (!o.isMesh || o.userData.noFit) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
    });
    group.rotation.y = saved; group.updateMatrixWorld(true);
    const s = box.getBoundingSphere(new THREE.Sphere());
    let center = s.center.clone(), radius = s.radius;
    if (isGlb && cam === camera) center.y -= radius * 0.02;
    if (mode === 'full') { radius += Math.hypot(center.x, center.z); center.x = 0; center.z = 0; }
    const vfov = (cam.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
    const dist = ((radius * 1.04) / Math.sin(Math.min(vfov, hfov) / 2)) * (cam === camera ? zoomK : 1) * (isGlb && cam === camera ? 0.84 : 1);
    const dir = new THREE.Vector3(0, elev + (cam === camera ? pitch : 0), 1).normalize();
    cam.position.copy(center).addScaledVector(dir, dist);
    cam.near = dist / 50; cam.far = dist * 20;
    cam.lookAt(center); cam.updateProjectionMatrix();
  }

  /* ---------- api ---------- */
  function set(P, S, color, W, H) {
    if (group) { scene.remove(group); disposeGroup(group); group = null; }
    if (texture) texture.dispose();
    transparent = !!P.transparent;
    const max = 2048;
    texCanvas = document.createElement('canvas');
    texCanvas.width = W >= H ? max : Math.round((max * W) / H);
    texCanvas.height = W >= H ? Math.round((max * H) / W) : max;
    tctx = texCanvas.getContext('2d');
    if (!transparent) { tctx.fillStyle = '#fff'; tctx.fillRect(0, 0, texCanvas.width, texCanvas.height); }
    texture = new THREE.CanvasTexture(texCanvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    isGlb = P.mock === 'glb';
    if (isGlb) texture.flipY = false;
    roupaMats = [];
    renderer.toneMapping = isGlb ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.05;
    pitch = 0; zoomK = 1;
    setLook({});
    const b = BUILD[P.mock](S, color, P);
    group = b.group; mode = b.spin || 'full'; views = b.views; elev = b.elev ?? 0.28; cover = b.cover ?? 0;
    swayAmp = b.amp ?? 0.5; swayBase = b.views[cover] ? b.views[cover][1] : 0; swayT = 0;
    group.rotation.y = mode === 'sway' ? swayBase : (b.start ?? 0);
    scene.add(group);
    fit(camera);
  }
  function update(src) {
    if (!tctx) return;
    tctx.clearRect(0, 0, texCanvas.width, texCanvas.height);
    if (!transparent) { tctx.fillStyle = '#fff'; tctx.fillRect(0, 0, texCanvas.width, texCanvas.height); }
    tctx.drawImage(src, 0, 0, texCanvas.width, texCanvas.height);
    texture.needsUpdate = true;
  }
  function shots(w, h, only) {
    if (!shotRenderer) {
      shotRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      shotRenderer.outputEncoding = THREE.sRGBEncoding; shotRenderer.setPixelRatio(1);
    }
    shotRenderer.setSize(w, h, false);
    const cam = new THREE.PerspectiveCamera(24, w / h, 0.1, 1000);
    const saved = group.rotation.y;
    fit(cam);
    const list = only === 'cover' ? [views[cover]] : views;
    const out = list.map(([label, rot]) => {
      group.rotation.y = rot;
      shotRenderer.render(scene, cam);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(shotRenderer.domElement, 0, 0);
      return { label, c };
    });
    group.rotation.y = saved;
    return out;
  }
  function view(v) {
    if (!group) return;
    const map = { frente: 0, costas: Math.PI, esq: Math.PI / 2, dir: -Math.PI / 2 };
    if (v in map) { group.rotation.y = map[v]; vel = 0; swayT = 0; }
    if (v === 'reset') { pitch = 0; zoomK = 1; group.rotation.y = 0; vel = 0; fit(camera); }
  }
  return { init, set, update, shots, resize, setLook, view, look };
})();
