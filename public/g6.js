/* Spiele 101–108: 3D (three.js). Alle Spieler im Raum sind als 3D-Figuren zu sehen. Steuerung auch per Touch. */
(function () {
  'use strict';
  const D = '3D', OPT = { three: true };
  // Steuerung: Tastatur oder Touch/Maus (links gedrückt halten = bewegen, rechts unten tippen = springen, rechts tippen = schießen)
  function controls(w) {
    let usedKeys = false;
    return {
      move() { const k = w.inp.k; let fx = (k.right ? 1 : 0) - (k.left ? 1 : 0), fz = (k.down ? 1 : 0) - (k.up ? 1 : 0); if (fx || fz) usedKeys = true; if (!usedKeys && w.inp.down && w.inp.x <= 480) { fx = (w.inp.x - 320) / 120; fz = (w.inp.y - 200) / 90; const m = Math.hypot(fx, fz); if (m > 1) { fx /= m; fz /= m; } if (m < 0.15) fx = fz = 0; } return [fx, fz]; },
      jump() { if (w.inp.e.space) { usedKeys = true; return true; } const t = w.inp.tap; return !!(t && t.x > 480 && t.y > 230); },
      tap() { return w.inp.tap && (usedKeys || w.inp.tap.x >= 320) ? w.inp.tap : null; },
      keys() { return usedKeys; },
      hud() { if (!usedKeys) { w.circ(560, 320, 34, 'rgba(255,255,255,.2)'); w.tx('⬆', 560, 320, 24); w.tx('springen', 560, 358, 10, '#fff'); w.tx('Links halten = bewegen', 110, 372, 11, '#fff'); } }
    };
  }
  const mat = (THREE, c) => new THREE.MeshLambertMaterial({ color: c });
  const hsl = (THREE, h, s, l) => new THREE.Color().setHSL(h, s, l);

  reg('cube-runner-3d', 'Cube Runner 3D', '🟦', D, 'Renne in 3D über die Bahn, wechsle die Spur, springe über Hürden und sammle Münzen – alle auf derselben Strecke!', '← → Spur wechseln · Leertaste springen · Touch: links/rechts/Mitte tippen', Object.assign({ dur: 60 }, OPT), w => {
    const T = w.gl3(), THREE = T.THREE, sc = T.scene, cam = T.camera;
    sc.background = new THREE.Color(0x9fd8ff); sc.fog = new THREE.Fog(0x9fd8ff, 30, 130);
    const ground = T.box(14, 1, 400, 0x3bb273, 0, -0.5, -150), l1 = T.box(0.12, 0.05, 400, 0xffffff, -1.5, 0.02, -150), l2 = T.box(0.12, 0.05, 400, 0xffffff, 1.5, 0.02, -150);
    const me = T.box(1.2, 1.2, 1.2, 0x2979ff, 0, 0.6, 0); let z = 0, x = 0, lane = 0, y = 0, vy = 0, sp = 16, next = -25; const obs = [], coins = [];
    const spawn = () => { while (next > z - 110) { const k = w.rnd(), l = w.ri(-1, 2) * 3; if (k < 0.35) obs.push({ m: T.box(2.6, 0.9, 0.8, 0xff7043, l, 0.45, next), x: l, z: next, h: 0.9 }); else if (k < 0.65) obs.push({ m: T.box(2.6, 3, 0.8, 0xd32f2f, l, 1.5, next), x: l, z: next, h: 3 }); else for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 14), mat(THREE, 0xffd54f)); m.rotation.x = Math.PI / 2; m.position.set(l, 1, next - i * 2); sc.add(m); coins.push({ m, x: l, z: next - i * 2 }); } next -= w.r(9, 16) * (1 + sp / 80); } };
    spawn();
    return {
      noGhost: true,
      step(dt) {
        const e = w.inp.e, t = w.inp.tap; if (e.left || (t && t.x < 200)) lane = Math.max(-1, lane - 1); if (e.right || (t && t.x > 440)) lane = Math.min(1, lane + 1);
        if ((e.space || e.up || (t && t.x >= 200 && t.x <= 440)) && y === 0) vy = 9; vy -= 26 * dt; y = Math.max(0, y + vy * dt); if (y === 0 && vy < 0) vy = 0;
        sp += 0.4 * dt; z -= sp * dt; x += (lane * 3 - x) * Math.min(1, dt * 12); spawn(); w.score += sp * dt * 0.2;
        for (const o of obs) if (Math.abs(o.z - z) < 0.9 && Math.abs(o.x - x) < 1.6 && y < o.h) w.die();
        for (const c of coins) { c.m.rotation.z += dt * 4; if (!c.d && Math.abs(c.z - z) < 1 && Math.abs(c.x - x) < 1.4 && y < 2) { c.d = 1; sc.remove(c.m); w.add(10); } }
        for (const a of [obs, coins]) for (let i = a.length - 1; i >= 0; i--) if (a[i].z > z + 15) { sc.remove(a[i].m); a.splice(i, 1); }
      },
      draw() { ground.position.z = l1.position.z = l2.position.z = z - 150; me.position.set(x, y + 0.6, z); me.rotation.z = (lane * 3 - x) * 0.1; cam.position.set(x * 0.5, 4.2, z + 8); cam.lookAt(x * 0.5, 1.2, z - 8); T.people(w); T.render(); },
      pub() { return { x, y, z, r: Math.PI }; }
    };
  });

  reg('sky-obby-3d', 'Sky Obby 3D', '🧗', D, 'Das Roblox-Gefühl: Hüpfe in 3D über schwebende Plattformen, vorbei an der Lava. Gelbe Plattformen sind Checkpoints!', 'WASD/Pfeile laufen · Leertaste springen · Touch: links halten, rechts tippen = springen', Object.assign({ dur: 120 }, OPT), w => {
    const T = w.gl3(), THREE = T.THREE, sc = T.scene, cam = T.camera, C = controls(w); sc.background = new THREE.Color(0x87ceeb); sc.fog = new THREE.Fog(0x87ceeb, 40, 150);
    const P = [{ x: 0, y: 0, z: 0, sx: 8, sz: 8, i: 0, cp: true }]; let px = 0, py = 0, pz = 0;
    for (let i = 1; i <= 70; i++) { pz -= w.r(5.5, 9.5); px = w.clamp(px + w.r(-5, 5), -14, 14); py = w.clamp(py + w.r(-1, 1.6), -3, 14); const big = i % 10 === 0; P.push({ x: px, y: py, z: pz, sx: big ? 8 : w.r(3, 6), sz: big ? 8 : w.r(3, 6), i, mv: !big && i > 4 && i % 4 === 0, ph: w.r(0, 6), am: w.r(2, 4), cp: big }); }
    P.forEach(p => { p.m = T.box(p.sx, 0.6, p.sz, p.cp ? 0xffd54f : hsl(THREE, (p.i * 0.043) % 1, 0.6, 0.6), p.x, p.y - 0.3, p.z); p.cx = p.x; });
    const lava = T.box(400, 1, 400, 0xff3d00, 0, -12, -200);
    const me = T.avatar(0x2979ff); sc.add(me); let x = 0, y = 0.1, z = 0, vy = 0, cp = P[0], best = 0, cur = null;
    return {
      noGhost: true,
      step(dt) {
        const [fx, fz] = C.move(); x += fx * 9 * dt; z += fz * 9 * dt; const py0 = y; vy -= 26 * dt; if (cur && C.jump()) { vy = 10; } y += vy * dt; cur = null;
        for (const p of P) { const nx = p.mv ? p.x + Math.sin(w.t * 1.3 + p.ph) * p.am : p.x, dx = nx - p.cx; p.cx = nx; p.m.position.x = nx; if (Math.abs(x - nx) < p.sx / 2 + 0.3 && Math.abs(z - p.z) < p.sz / 2 + 0.3 && py0 >= p.y - 0.05 && y <= p.y && vy <= 0) { y = p.y; vy = 0; cur = p; x += dx; } }
        if (cur) { if (cur.cp) cp = cur; if (cur.i > best) { best = cur.i; w.score = best * 10; if (best >= 70) { w.add(200 + Math.floor(w.left)); w.finish(); } } }
        if (y < -9) { x = cp.cx; y = cp.y + 0.5; z = cp.z; vy = 0; w.beep(200, 0.2, 'square'); }
        if (fx || fz) me.rotation.y = Math.atan2(fx, fz);
      },
      draw() { me.position.set(x, y, z); cam.position.set(x * 0.8, y + 7, z + 11); cam.lookAt(x, y + 1.5, z - 3); T.people(w); T.render(); C.hud(); },
      pub() { return { x, y, z, r: me.rotation.y }; }
    };
  });

  reg('kart-race-3d', 'Kart Race 3D', '🏎️', D, 'Rase mit anderen Spielern auf der Rundstrecke! Sammle Turbo-Pads und fahre so viele Runden wie möglich.', '↑ Gas · ← → lenken · ↓ bremsen · Touch: gedrückt halten = Gas, links/rechts = lenken', Object.assign({ dur: 75 }, OPT), w => {
    const T = w.gl3(), THREE = T.THREE, sc = T.scene, cam = T.camera; sc.background = new THREE.Color(0x9fd8ff); sc.fog = new THREE.Fog(0x9fd8ff, 60, 200);
    T.box(300, 1, 300, 0x4caf50, 0, -0.6, 0); const ring = (a, b, c, y) => { const m = new THREE.Mesh(new THREE.RingGeometry(a, b, 64), new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = y; sc.add(m); };
    ring(26, 42, 0x555a63, 0.02); ring(25.2, 26, 0xe53935, 0.03); ring(42, 42.8, 0xffffff, 0.03); T.box(16, 0.05, 1.2, 0xffffff, 34, 0.05, 0);
    for (let i = 0; i < 40; i++) { const a = w.r(0, 6.28), r = w.r(50, 90), tr = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 8), mat(THREE, 0x2e7d32)); tr.position.set(Math.cos(a) * r, 3, Math.sin(a) * r); sc.add(tr); }
    const kart = c => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.6), mat(THREE, c)); b.position.y = 0.6; g.add(b); const d = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), mat(THREE, 0x222222)); d.position.set(0, 1.1, -0.3); g.add(d); for (const [wx, wz] of [[-0.9, 0.9], [0.9, 0.9], [-0.9, -0.9], [0.9, -0.9]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12), mat(THREE, 0x111111)); wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.4, wz); g.add(wh); } return g; };
    const me = kart(0xe53935); sc.add(me); const pads = []; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; pads.push({ x: Math.cos(a) * 34, z: Math.sin(a) * 34, m: T.box(3, 0.06, 3, 0xffeb3b, Math.cos(a) * 34, 0.06, Math.sin(a) * 34) }); }
    let x = 34, z = 0, h = 0, v = 0, prog = 0, prevA = 0, boost = 0;
    return {
      noGhost: true,
      step(dt) {
        const k = w.inp.k; const keys = k.up || k.down || k.left || k.right || k.space; const gas = k.up || k.space || (!keys && w.inp.down); let steer = (k.right ? 1 : 0) - (k.left ? 1 : 0); if (!steer && w.inp.down) steer = w.clamp((w.inp.x - 320) / 160, -1, 1);
        v += ((gas ? 18 : 0) - (k.down ? 30 : 0) - v * 0.35) * dt; if (boost > 0) { boost -= dt; v = Math.min(v + 40 * dt, 42); } else v = Math.min(v, 26); v = Math.max(-6, v);
        h -= steer * 1.7 * dt * Math.min(1, Math.abs(v) / 8); x += Math.sin(h) * v * dt; z += Math.cos(h) * v * dt;
        const d = Math.hypot(x, z); if (d < 25.2 || d > 42.8) { v *= Math.pow(0.12, dt); const cd = w.clamp(d, 22, 46); x *= cd / d; z *= cd / d; }
        const a = Math.atan2(z, x); let da = a - prevA; if (da > Math.PI) da -= 6.2832; if (da < -Math.PI) da += 6.2832; prog += da; prevA = a; w.score = Math.max(0, prog / 6.2832 * 100);
        for (const p of pads) if (w.hit(x, z, p.x, p.z, 3)) { if (boost <= 0) w.beep(900, 0.25, 'square', 0.04); boost = 1.2; }
      },
      draw() { me.position.set(x, 0, z); me.rotation.y = h; cam.position.set(x - Math.sin(h) * 9, 4.5, z - Math.cos(h) * 9); cam.lookAt(x + Math.sin(h) * 6, 1, z + Math.cos(h) * 6); T.people(w, (n, c) => kart(c)); T.render(); w.tx('Runde ' + (Math.floor(prog / 6.2832) + 1) + ' · ' + Math.floor(Math.abs(w.score)) + ' m', 320, 20, 15, '#fff'); },
      pub() { return { x, y: 0, z, r: h }; }
    };
  });

  reg('ring-flight-3d', 'Ring Flight 3D', '✈️', D, 'Fliege mit deinem Flugzeug durch die Ringe! Ringe hintereinander geben Bonus – berühre den Boden nicht.', '← → lenken · ↑ ↓ steigen/sinken · Touch: halten und zum Finger lenken', Object.assign({ dur: 60 }, OPT), w => {
    const T = w.gl3(), THREE = T.THREE, sc = T.scene, cam = T.camera; sc.background = new THREE.Color(0x7ec8ff); sc.fog = new THREE.Fog(0x7ec8ff, 60, 260);
    const ground = T.box(1200, 1, 1200, 0x5cb85c, 0, -0.5, 0), grid = new THREE.GridHelper(1200, 60, 0x2e7d32, 0x2e7d32); grid.position.y = 0.02; sc.add(grid);
    const rings = [{ x: 0, y: 22, z: -60 }]; const gen = () => { while (rings.length < k + 9) { const p = rings[rings.length - 1]; rings.push({ x: p.x + w.r(-20, 20), y: w.clamp(p.y + w.r(-9, 9), 10, 46), z: p.z - w.r(45, 65) }); } };
    let k = 0; gen();
    const ringMesh = i => { const r = rings[i]; if (!r.m) { r.m = new THREE.Mesh(new THREE.TorusGeometry(5, 0.45, 10, 28), mat(THREE, hsl(THREE, (i * 0.11) % 1, 0.8, 0.55).getHex())); r.m.position.set(r.x, r.y, r.z); sc.add(r.m); } return r.m; };
    const plane = new THREE.Group(); const body = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 10), mat(THREE, 0xeeeeee)); body.rotation.x = Math.PI / 2; plane.add(body); const wing = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 1.2), mat(THREE, 0xe53935)); wing.position.z = -0.2; plane.add(wing); const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.7), mat(THREE, 0xe53935)); tail.position.z = -1.4; plane.add(tail); const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.7), mat(THREE, 0xe53935)); fin.position.set(0, 0.4, -1.4); plane.add(fin); sc.add(plane);
    const mkPlane = (n, c) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 10), mat(THREE, c)); b.rotation.x = Math.PI / 2; const wg = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 1.2), mat(THREE, c)); g.add(b, wg); const ho = new THREE.Group(); ho.add(g); return ho; };
    let px = 0, py = 22, pz = 0, yaw = 0, pitch = 0, streak = 0; const f = () => new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    return {
      noGhost: true,
      step(dt) {
        const kk = w.inp.k; let st = (kk.right ? 1 : 0) - (kk.left ? 1 : 0), pt = (kk.up ? 1 : 0) - (kk.down ? 1 : 0);
        if (!st && !pt && w.inp.down) { st = w.clamp((w.inp.x - 320) / 140, -1, 1); pt = w.clamp(-(w.inp.y - 200) / 100, -1, 1); }
        yaw = w.clamp(yaw - st * 1.3 * dt, -1.1, 1.1); pitch = w.clamp(pitch + pt * 1.0 * dt, -0.8, 0.8); if (!pt) pitch *= Math.pow(0.5, dt); if (!st) yaw *= Math.pow(0.7, dt);
        const sp = 24 + Math.min(14, w.score * 0.15), v = f(), oz = pz; px += v.x * sp * dt; py += v.y * sp * dt; pz += v.z * sp * dt;
        const r = rings[k]; if (oz > r.z && pz <= r.z) { if (Math.hypot(px - r.x, py - r.y) < 5.6) { streak++; w.add(10 + streak * 2); w.beep(700 + streak * 40, 0.15, 'triangle', 0.05); } else streak = 0; if (r.m) { sc.remove(r.m); r.m = null; } k++; gen(); }
        if (py < 1.2 || py > 90) w.die();
      },
      draw() { ground.position.set(px, -0.5, pz); grid.position.set(Math.round(px / 20) * 20, 0.02, Math.round(pz / 20) * 20); for (let i = k; i < k + 8; i++) ringMesh(i); const v = f(); plane.position.set(px, py, pz); plane.lookAt(px + v.x, py + v.y, pz + v.z); plane.rotation.z = -yaw * 0.8; cam.position.set(px - v.x * 11, py - v.y * 11 + 3, pz - v.z * 11); cam.lookAt(px + v.x * 12, py + v.y * 12, pz + v.z * 12); T.people(w, mkPlane); T.render(); w.tx(streak > 1 ? '🔥 Serie ×' + streak : '', 320, 40, 18, '#fff'); },
      pub() { const v = f(); return { x: px, y: py, z: pz, r: Math.atan2(-v.x, -v.z) + Math.PI }; }
    };
  });

  reg('maze-3d', 'Maze 3D', '🌀', D, 'Verirre dich im 3D-Labyrinth aus der Ich-Perspektive – finde als Erster den grünen Ausgang!', '↑ ↓ laufen · ← → drehen · Touch: halten = laufen, links/rechts vom Mittelpunkt = drehen', Object.assign({ dur: 120 }, OPT), w => {
    const T = w.gl3(), THREE = T.THREE, sc = T.scene, cam = T.camera, N = 19, CS = 4; sc.background = new THREE.Color(0x14141f); sc.fog = new THREE.Fog(0x14141f, 4, 38); cam.rotation.order = 'YXZ';
    T.box(200, 1, 200, 0x3a3a4a, 0, -0.5, 0); T.box(200, 1, 200, 0x23232f, 0, 3.7, 0); const grp = new THREE.Group(); sc.add(grp); let m, px, pz, yaw, exitM;
    const make = () => {
      while (grp.children.length) grp.remove(grp.children[0]); m = Array.from({ length: N }, () => Array(N).fill(1)); const st = [[1, 1]]; m[1][1] = 0;
      while (st.length) { const [x, y] = st[st.length - 1], o = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => x + dx > 0 && y + dy > 0 && x + dx < N - 1 && y + dy < N - 1 && m[y + dy][x + dx]); if (!o.length) { st.pop(); continue; } const [dx, dy] = o[w.ri(0, o.length)]; m[y + dy / 2][x + dx / 2] = 0; m[y + dy][x + dx] = 0; st.push([x + dx, y + dy]); }
      const wm = mat(THREE, 0x8d6e63), geo = new THREE.BoxGeometry(CS, 3.6, CS); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m[y][x]) { const b = new THREE.Mesh(geo, wm); b.position.set(x * CS + CS / 2, 1.8, y * CS + CS / 2); grp.add(b); }
      exitM = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.4, 1.2), new THREE.MeshBasicMaterial({ color: 0x00e676 })); exitM.position.set((N - 2) * CS + CS / 2, 1.7, (N - 2) * CS + CS / 2); grp.add(exitM); px = 1 * CS + CS / 2; pz = 1 * CS + CS / 2; yaw = !m[1][2] ? -Math.PI / 2 : Math.PI; // Blick in den offenen Gang
    };
    make(); const light = new THREE.PointLight(0xfff2cc, 1.3, 22); sc.add(light);
    const blocked = (x, z) => { for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) { const cx = Math.floor((x + dx) / CS), cz = Math.floor((z + dz) / CS); if (cx < 0 || cz < 0 || cx >= N || cz >= N || m[cz][cx]) return true; } return false; };
    return {
      noGhost: true,
      step(dt) {
        const k = w.inp.k; const keys = k.up || k.down || k.left || k.right; let turn = (k.left ? 1 : 0) - (k.right ? 1 : 0), fwd = (k.up ? 1 : 0) - (k.down ? 1 : 0);
        if (!keys && w.inp.down) { fwd = 1; turn = -w.clamp((w.inp.x - 320) / 140, -1, 1); }
        yaw += turn * 2.2 * dt; const dx = -Math.sin(yaw) * fwd * 6 * dt, dz = -Math.cos(yaw) * fwd * 6 * dt; if (!blocked(px + dx, pz)) px += dx; if (!blocked(px, pz + dz)) pz += dz;
        exitM.rotation.y += dt; if (Math.hypot(px - exitM.position.x, pz - exitM.position.z) < 1.6) { w.add(100); w.beep(880, 0.3, 'triangle'); make(); }
      },
      draw() { cam.position.set(px, 1.7, pz); cam.rotation.y = yaw; light.position.set(px, 2.5, pz); T.people(w); T.render(); const s = 5; w.box(520, 270, N * s + 6, N * s + 6, 'rgba(0,0,0,.5)'); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m[y][x]) w.box(523 + x * s, 273 + y * s, s, s, '#8d6e63'); w.circ(523 + px / CS * s, 273 + pz / CS * s, 2.5, '#4f8cff'); w.circ(523 + exitM.position.x / CS * s, 273 + exitM.position.z / CS * s, 2.5, '#00e676'); for (const o of Object.values(w.others)) if (typeof o.x === 'number') w.circ(523 + o.x / CS * s, 273 + o.z / CS * s, 2, '#ff8a65'); },
      pub() { return { x: px, y: 0, z: pz, r: yaw }; }
    };
  });

  reg('tank-arena-3d', 'Tank Arena 3D', '🪖', D, 'Panzer-Schlacht in 3D: Fahre, ziele mit der Maus oder tippe, und triff die anderen Panzer (allein: Zielscheiben).', 'WASD fahren · Maus zielen · Klick/Leertaste schießen · Touch: links halten = fahren, rechts tippen = schießen', Object.assign({ dur: 60 }, OPT), w => {
    const T = w.gl3(), THREE = T.THREE, sc = T.scene, cam = T.camera, C = controls(w); sc.background = new THREE.Color(0x2d3a4a);
    T.box(70, 1, 50, 0x4a5d3a, 0, -0.5, 0); for (const [bx, bz, sx, sz] of [[0, -25.5, 70, 1], [0, 25.5, 70, 1], [-35.5, 0, 1, 52], [35.5, 0, 1, 52]]) T.box(sx, 2, sz, 0x6d6d6d, bx, 1, bz);
    const blocks = []; for (let i = 0; i < 9; i++) { const sx = w.r(3, 6), sz = w.r(3, 6), bx = w.r(-28, 28), bz = w.r(-18, 18); if (Math.hypot(bx, bz) < 8) continue; blocks.push({ x: bx, z: bz, hw: sx / 2, hd: sz / 2 }); T.box(sx, 2.4, sz, 0x8d6e63, bx, 1.2, bz); }
    const tank = c => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 3.2), mat(THREE, c)); b.position.y = 0.6; const t = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.4), mat(THREE, c)); t.position.y = 1.25; const br = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2.2), mat(THREE, 0x333333)); br.position.set(0, 1.25, 1.5); g.add(b, t, br); return g; };
    const me = tank(0x66bb6a); sc.add(me); const rc = new THREE.Raycaster(), aimAt = (px, py) => { rc.setFromCamera(new THREE.Vector2(px / 320 - 1, -(py / 200 - 1)), cam); const o = rc.ray.origin, d = rc.ray.direction; if (Math.abs(d.y) < 1e-4) return null; const t = -o.y / d.y; return { x: o.x + d.x * t, z: o.z + d.z * t }; };
    let x = w.r(-25, 25), z = w.r(-15, 15), hd = 0, ta = 0, cd = 0, inv = 1.5, dead = 0, shells = [], bots = []; for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.6, 12), mat(THREE, 0xe53935)); b.position.y = 0.8; sc.add(b); bots.push({ m: b, x: w.r(-25, 25), z: w.r(-15, 15), a: w.r(0, 6) }); }
    const hitBlock = (px, pz, r) => blocks.some(b => Math.abs(px - b.x) < b.hw + r && Math.abs(pz - b.z) < b.hd + r);
    const fire = (sx, sz, a, own) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), mat(THREE, own === w.name ? 0xffeb3b : 0xff5722)); m.position.set(sx, 1.2, sz); sc.add(m); shells.push({ m, x: sx, z: sz, vx: Math.sin(a) * 26, vz: Math.cos(a) * 26, t: 1.6, own }); w.beep(240, 0.1, 'square', 0.04); };
    return {
      noGhost: true,
      net(ev, from) { if (ev.s) fire(ev.s[0], ev.s[1], ev.s[2], from); if (ev.hit === w.name) w.add(10); },
      step(dt) {
        if (dead > 0) { dead -= dt; if (dead <= 0) { x = w.r(-25, 25); z = w.r(-15, 15); inv = 2; } return; }
        const [fx, fz] = C.move(); const nx = x + fx * 9 * dt, nz = z + fz * 9 * dt; if (!hitBlock(nx, z, 1.3)) x = w.clamp(nx, -33, 33); if (!hitBlock(x, nz, 1.3)) z = w.clamp(nz, -23, 23); if (fx || fz) hd = Math.atan2(fx, fz);
        cd -= dt; inv -= dt; const ap = C.keys() ? aimAt(w.inp.x, w.inp.y) : null; if (ap) ta = Math.atan2(ap.x - x, ap.z - z); const tp = C.tap();
        if ((tp || w.inp.k.space) && cd <= 0) { const a2 = tp ? aimAt(tp.x, tp.y) : null; if (a2) ta = Math.atan2(a2.x - x, a2.z - z); fire(x, z, ta, w.name); w.send({ s: [x, z, ta] }); cd = 0.45; }
        for (const s of shells) { s.x += s.vx * dt; s.z += s.vz * dt; s.t -= dt; s.m.position.x = s.x; s.m.position.z = s.z; if (hitBlock(s.x, s.z, 0.3) || Math.abs(s.x) > 35 || Math.abs(s.z) > 25) s.t = 0; if (s.own !== w.name && inv <= 0 && w.hit(s.x, s.z, x, z, 1.6)) { s.t = 0; w.send({ hit: s.own }); dead = 1.6; w.beep(120, 0.3, 'sawtooth'); } else if (s.own === w.name) for (const b of bots) if (s.t > 0 && w.hit(s.x, s.z, b.x, b.z, 1.4)) { s.t = 0; w.add(5); b.x = w.r(-25, 25); b.z = w.r(-15, 15); } }
        shells = shells.filter(s => { if (s.t <= 0) { sc.remove(s.m); return false; } return true; }); for (const b of bots) { b.a += dt * 0.5; b.x = w.clamp(b.x + Math.cos(b.a) * 3 * dt, -30, 30); b.z = w.clamp(b.z + Math.sin(b.a) * 3 * dt, -20, 20); b.m.position.x = b.x; b.m.position.z = b.z; b.m.visible = w.live().length < 2; }
      },
      draw() { me.visible = dead <= 0; me.position.set(x, 0, z); me.rotation.y = ta; cam.position.set(x * 0.8, 27, z * 0.8 + 18); cam.lookAt(x * 0.8, 0, z * 0.8); T.people(w, (n, c) => tank(c)); T.render(); C.hud(); if (dead > 0) w.tx('Zerstört – Respawn…', 320, 200, 24, '#fff'); },
      pub() { return { x, y: 0, z, r: ta, a: dead <= 0 }; }
    };
  });

  reg('town-3d', 'Town 3D', '🏙️', D, 'Eine 3D-Stadt zum Treffen: Laufe herum, sammle Münzen und zeige Emotes – alle Spieler sehen sich als 3D-Figuren.', 'WASD/Pfeile laufen · Emote-Leiste unten antippen · Touch: links halten = laufen', { mode: 'free', max: 12, three: true }, w => {
    const T = w.gl3(), THREE = T.THREE, sc = T.scene, cam = T.camera, C = controls(w); sc.background = new THREE.Color(0x9fd8ff); sc.fog = new THREE.Fog(0x9fd8ff, 50, 140);
    T.box(160, 1, 160, 0x6abf69, 0, -0.5, 0); T.box(160, 0.05, 8, 0x555a63, 0, 0.03, 0); T.box(8, 0.05, 160, 0x555a63, 0, 0.04, 0);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + 0.3, r = w.r(22, 48), hx = Math.cos(a) * r, hz = Math.sin(a) * r, c = hsl(THREE, w.rnd(), 0.5, 0.65); T.box(7, 5, 7, c, hx, 2.5, hz); const ro = new THREE.Mesh(new THREE.ConeGeometry(6, 3, 4), mat(THREE, 0xb23a2e)); ro.position.set(hx, 6.5, hz); ro.rotation.y = Math.PI / 4; sc.add(ro); }
    for (let i = 0; i < 30; i++) { const a = w.r(0, 6.28), r = w.r(14, 70), tx = Math.cos(a) * r, tz = Math.sin(a) * r; if (Math.abs(tx) < 6 || Math.abs(tz) < 6) continue; T.box(0.6, 2, 0.6, 0x6d4c41, tx, 1, tz); const cn = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 8), mat(THREE, 0x2e7d32)); cn.position.set(tx, 4, tz); sc.add(cn); }
    const fo = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 1, 20), mat(THREE, 0x90caf9)); fo.position.y = 0.5; sc.add(fo);
    const label = txt => { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const x = cv.getContext('2d'); x.font = '90px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 64, 70); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false })); sp.scale.set(2, 2, 1); sp.renderOrder = 11; return sp; };
    const d = w.data || {}; let coins = d.coins || 0, dirty = false, last = 0; const save = () => { w.save({ coins }); dirty = false; last = performance.now(); };
    const me = T.avatar(0xff7043); sc.add(me); let x = 6, z = 8, r = 0; const bub = {}, cs = []; const emo = ['👋', '😂', '❤️', '👍', '🎉'];
    const say = (n, t) => { if (bub[n]) sc.remove(bub[n].sp); const sp = label(t); sc.add(sp); bub[n] = { sp, t: 4 }; };
    const spawnCoin = () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16), mat(THREE, 0xffd54f)); m.rotation.x = Math.PI / 2; const cx = Math.random() * 90 - 45, cz = Math.random() * 90 - 45; m.position.set(cx, 1.2, cz); sc.add(m); cs.push({ m, x: cx, z: cz }); };
    for (let i = 0; i < 12; i++) spawnCoin();
    return {
      noGhost: true, flush: save,
      net(ev, from) { if (ev.say) say(from, String(ev.say).slice(0, 4)); },
      step(dt) {
        const [fx, fz] = C.move(); x = w.clamp(x + fx * 8 * dt, -78, 78); z = w.clamp(z + fz * 8 * dt, -78, 78); if (fx || fz) r = Math.atan2(fx, fz);
        for (let k = 0; k < 5; k++) if (w.inp.e[String(k + 1)]) { w.send({ say: emo[k] }); say(w.name, emo[k]); } const t = w.inp.tap; if (t && t.y > 350) { const k = Math.floor((t.x - 150) / 70); if (k >= 0 && k < 5) { w.send({ say: emo[k] }); say(w.name, emo[k]); } }
        for (const c of cs) { c.m.rotation.z += dt * 3; if (w.hit(x, z, c.x, c.z, 1.6)) { coins++; dirty = true; w.beep(900, 0.1, 'triangle', 0.04); c.x = Math.random() * 90 - 45; c.z = Math.random() * 90 - 45; c.m.position.set(c.x, 1.2, c.z); } }
        for (const n in bub) { bub[n].t -= dt; if (bub[n].t <= 0) { sc.remove(bub[n].sp); delete bub[n]; } }
        w.score = coins; if (dirty && performance.now() - last > 4000) save();
      },
      draw() { me.position.set(x, 0, z); me.rotation.y = r; cam.position.set(x, 10, z + 13); cam.lookAt(x, 1.5, z); for (const n in bub) { const o = n === w.name ? { x, z } : w.others[n]; if (o) bub[n].sp.position.set(o.x, 3.6, o.z); } T.people(w); T.render(); w.tx('🪙 ' + coins, 60, 20, 18, '#223', 'left'); emo.forEach((e, k) => { w.box(150 + k * 70 + 4, 358, 62, 34, 'rgba(0,0,0,.35)'); w.e(e, 150 + k * 70 + 35, 376, 24); }); C.hud(); },
      pub() { return { x, y: 0, z, r, s: coins }; }
    };
  });

  reg('stack-tower-3d', 'Stack Tower 3D', '🏗️', D, 'Stapel Blöcke in 3D so genau wie möglich – der Turm wächst, die Plattform wird immer schmaler!', 'Leertaste / Klick = Block ablegen', Object.assign({ dur: 75 }, OPT), w => {
    const T = w.gl3(), THREE = T.THREE, sc = T.scene, cam = T.camera; sc.background = new THREE.Color(0xbde0fe); sc.fog = new THREE.Fog(0xbde0fe, 30, 90);
    T.box(60, 1, 60, 0xa5d6a7, 0, -3, 0); const col = i => hsl(THREE, (i * 0.045) % 1, 0.6, 0.6); const st = [{ x: 0, z: 0, sx: 6, sz: 6 }]; T.box(6, 1, 6, col(0), 0, 0, 0);
    let axis = 0, pos = -9, dir = 1, mv = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6), mat(THREE, col(1))), floors = 1, perf = 0, camY = 6, falls = []; mv.position.set(-9, 1, 0); sc.add(mv);
    const mkMv = () => { const t = st[st.length - 1]; mv.geometry = new THREE.BoxGeometry(t.sx, 1, t.sz); mv.material = mat(THREE, col(floors)); mv.position.y = floors; pos = -9; dir = 1; };
    return {
      noGhost: true,
      step(dt) {
        const sp = 7 + floors * 0.35; pos += dir * sp * dt; if (pos > 9) dir = -1; if (pos < -9) dir = 1; const t = st[st.length - 1]; if (axis === 0) mv.position.set(pos, floors, t.z); else mv.position.set(t.x, floors, pos);
        if (w.inp.tap || w.inp.e.space) {
          const a = axis === 0 ? 'x' : 'z', s = axis === 0 ? 'sx' : 'sz', lo = Math.max(pos - t[s] / 2, t[a] - t[s] / 2), hi = Math.min(pos + t[s] / 2, t[a] + t[s] / 2), ov = hi - lo;
          if (ov <= 0.08) { w.die(); return; }
          const nb = Object.assign({}, t), perfect = Math.abs(pos - t[a]) < 0.25; if (perfect) { nb[a] = t[a]; w.add(3); perf++; w.beep(1000, 0.15, 'triangle'); } else { nb[s] = ov; nb[a] = (lo + hi) / 2; w.add(1); w.beep(500, 0.08, 'triangle'); const cutS = t[s] - ov > 0 ? (axis === 0 ? t.sx : t.sz) : 0; const cm = new THREE.Mesh(new THREE.BoxGeometry(axis === 0 ? Math.abs(mv.geometry.parameters.width - ov) : mv.geometry.parameters.width, 1, axis === 1 ? Math.abs(mv.geometry.parameters.depth - ov) : mv.geometry.parameters.depth), mat(THREE, col(floors))); cm.position.copy(mv.position); cm.position[a] += (pos > t[a] ? 1 : -1) * (ov / 2 + Math.abs(mv.geometry.parameters[axis === 0 ? 'width' : 'depth'] - ov) / 2); sc.add(cm); falls.push({ m: cm, v: 0 }); }
          T.box(nb.sx, 1, nb.sz, col(floors), nb.x, floors, nb.z); st.push(nb); floors++; axis = 1 - axis; mkMv(); if (axis === 0) mv.position.z = nb.z; else mv.position.x = nb.x;
        }
        for (const f of falls) { f.v += 25 * dt; f.m.position.y -= f.v * dt; } falls = falls.filter(f => { if (f.m.position.y < -20) { sc.remove(f.m); return false; } return true; });
        camY += (floors + 6 - camY) * Math.min(1, dt * 3);
      },
      draw() { const a = w.t * 0.25; cam.position.set(Math.cos(a) * 15, camY + 4, Math.sin(a) * 15); cam.lookAt(0, camY - 3, 0); T.render(); const o = Object.entries(w.others).filter(([, v]) => typeof v.s === 'number'); o.slice(0, 5).forEach(([n, v], i) => w.tx(`${n}: ${v.s}`, 630, 70 + i * 16, 12, '#223', 'right')); w.tx('Perfekt: ' + perf, 10, 44, 13, '#223', 'left'); },
      pub() { return {}; }
    };
  });
})();
