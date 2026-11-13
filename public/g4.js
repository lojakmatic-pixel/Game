/* Spiele 87–91: Abenteuer – Obby, Naturkatastrophen, Plattformer, Pac-Labyrinth, Raketenabwehr. */
(function () {
  'use strict';
  const AB = 'Abenteuer', K = (w, n) => w.inp.k[n] ? 1 : 0;

  // Gemeinsame Seiten-Physik: gibt {x,y,vx,vy,ground} zurück und löst Landungen auf Plattformen auf
  function body(w, plats, o) {
    const b = { x: o.x, y: o.y, vy: 0, ground: false };
    b.move = dt => {
      const ox = b.x, oy = b.y; b.x += (K(w, 'right') - K(w, 'left')) * (o.speed || 220) * dt;
      if (w.inp.down && Math.abs(w.inp.x - 320) > 40 && !w.inp.k.up) b.x += Math.sign(w.inp.x - 320) * (o.speed || 220) * dt;
      b.vy += 1400 * dt; b.y += b.vy * dt; b.ground = false;
      if (b.vy >= 0) for (const p of plats(b.x)) { const py = p.cy ? p.cy() : p.y; if (b.x > p.x - 8 && b.x < p.x + p.w + 8 && oy <= py + 2 && b.y >= py) { b.y = py; b.vy = 0; b.ground = true; b.on = p; break; } }
      if ((w.inp.e.space || w.inp.e.up) && b.ground) { b.vy = -o.jump || -520; }
    };
    return b;
  }

  reg('obby-runner', 'Obby Runner', '🧱', AB, 'Das Hindernisparcours-Spiel: spring über Lücken und wandernde Plattformen. Fällst du, startest du am Checkpoint!', '← → laufen · Leertaste/↑ springen', { dur: 90 }, w => {
    const P = []; let x = 0, y = 320; P.push({ x: -100, y: 320, w: 400 }); x = 300;
    for (let i = 0; i < 90; i++) { x += w.r(55, 115); y = w.clamp(y + w.r(-70, 70), 180, 340); const pw = w.r(70, 150), mv = i > 4 && w.rnd() < 0.3; const p = { x, y, w: pw, i }; if (mv) { const ph = w.r(0, 6), am = w.r(30, 70), sp = w.r(1, 2); p.base = y; p.cy = () => p.base + Math.sin(w.t * sp + ph) * am; } P.push(p); x += pw; }
    let cp = P[0], me = body(w, () => P, { x: 20, y: 320, jump: 560 }), best = 0;
    return {
      noGhost: true,
      step(dt) {
        for (const p of P) if (p.cy) p.y = p.cy();
        me.move(dt); if (me.ground && me.on && me.on.i % 6 === 0 && me.on.i > 0) cp = me.on;
        if (me.y > 480) { me.x = cp.x + cp.w / 2; me.y = (cp.cy ? cp.cy() : cp.y) - 4; me.vy = 0; w.score = Math.max(0, w.score - 2); }
        best = Math.max(best, me.x); w.score = Math.max(w.score, best / 20);
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); const cam = me.x - 200; w.box(0, 440 - 100, 640, 60, '#ff5722'); for (const p of P) { if (p.x + p.w < cam - 20 || p.x > cam + 660) continue; w.box(p.x - cam, p.cy ? p.cy() : p.y, p.w, 14, p.cy ? '#ab47bc' : p.i % 6 === 0 ? '#ffd54f' : '#66bb6a'); } for (const [n, o] of Object.entries(w.others)) if (typeof o.wx === 'number') { w.g.globalAlpha = 0.55; w.e(o.e || '🙂', o.wx - cam, o.wy - 16, 26); w.g.globalAlpha = 1; w.tx(n, o.wx - cam, o.wy - 36, 10); } w.e('🧍', me.x - cam, me.y - 16, 30); w.tx('Checkpoints = gelbe Plattformen', 320, 388, 12, '#334'); },
      pub() { return { wx: me.x, wy: me.y, e: '🧍' }; }
    };
  });

  reg('natural-disaster', 'Natural Disaster Survival', '🌪️', AB, 'Überlebe Meteore, Flut, Tornados und Erdbeben auf deiner Insel – Warnung beachten!', '← → laufen · Leertaste/↑ springen', { dur: 90 }, w => {
    const PL = [{ x: 60, y: 320, w: 520 }, { x: 120, y: 230, w: 120 }, { x: 400, y: 230, w: 120 }, { x: 260, y: 150, w: 120 }]; const me = body(w, () => PL, { x: 320, y: 320, jump: 560 });
    const sched = []; let tt = 4; while (tt < 300) { sched.push({ t: tt, kind: w.pick(['meteor', 'flood', 'tornado', 'quake']), dur: 7 }); tt += 10; }
    let rocks = [], tor = null, rn = 0;
    const cur = () => sched.find(s => w.t >= s.t - 2 && w.t < s.t + s.dur);
    return {
      step(dt) {
        me.move(dt); me.x = w.clamp(me.x, 20, 620); w.score = w.t; const c = cur(), act = c && w.t >= c.t;
        if (c && c.kind === 'meteor' && act) { rn -= dt; if (rn <= 0) { rocks.push({ x: w.r(40, 600), y: -20, v: w.r(220, 340) }); rn = 0.22; } }
        for (const r of rocks) { r.y += r.v * dt; if (w.hit(r.x, r.y, me.x, me.y - 16, 24)) w.die(); } rocks = rocks.filter(r => r.y < 420);
        if (c && c.kind === 'tornado' && act) { if (!tor) tor = { x: w.rnd() < 0.5 ? 0 : 640, d: 0 }; tor.d = tor.d || (tor.x ? -1 : 1); tor.x += tor.d * 130 * dt; if (Math.abs(me.x - tor.x) < 26 && me.y > 190) w.die(); } else tor = null;
        if (c && c.kind === 'flood' && act && me.y > 300 - Math.min(1, (w.t - c.t) / 2) * 110 + 80) w.die();
        if (c && c.kind === 'quake' && act && me.ground && me.on === PL[0] && w.rnd() < dt * 1.2) me.vy = -260;
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); const c = cur(), act = c && w.t >= c.t; const sh = c && c.kind === 'quake' && act ? Math.sin(w.t * 60) * 4 : 0; w.g.save(); w.g.translate(sh, 0); w.box(0, 330, 640, 70, '#1e88e5'); PL.forEach(p => w.box(p.x, p.y, p.w, 12, '#8d6e63')); if (c && c.kind === 'flood' && act) { const h = Math.min(1, (w.t - c.t) / 2) * 110; w.box(0, 330 - h, 640, h + 70, '#1e88e5aa'); } rocks.forEach(r => w.e('☄️', r.x, r.y, 34)); if (tor) w.e('🌪️', tor.x, 270, 120); w.e('🧍', me.x, me.y - 16, 30); w.g.restore(); w.tx(c ? (act ? `⚠ ${({ meteor: 'METEORE', flood: 'FLUT', tornado: 'TORNADO', quake: 'ERDBEBEN' })[c.kind]}!` : `Achtung: ${({ meteor: 'Meteore', flood: 'Flut', tornado: 'Tornado', quake: 'Erdbeben' })[c.kind]} in ${Math.ceil(c.t - w.t)}…`) : 'Ruhe vor dem Sturm…', 320, 24, 20, act ? '#c62828' : '#334'); for (const [n, o] of Object.entries(w.others)) if (typeof o.x === 'number' && o.a !== false) { w.g.globalAlpha = 0.5; w.e('🧍', o.x, o.y - 16, 26); w.g.globalAlpha = 1; } },
      pub() { return { x: me.x, y: me.y, e: '🧍' }; }, noGhost: true
    };
  });

  reg('coin-platformer', 'Coin Platformer', '🍄', AB, 'Sammle Münzen, hüpfe auf Gegner und erreiche die Zielflagge!', '← → laufen · Leertaste/↑ springen · auf Gegner springen', { dur: 120 }, w => {
    const P = [{ x: -100, y: 330, w: 500 }], coins = [], en = []; let x = 400;
    for (let i = 0; i < 40; i++) { x += w.r(50, 110); const y = w.r(200, 340), pw = w.r(90, 200); P.push({ x, y, w: pw }); for (let k = 0; k < 3; k++) if (w.rnd() < 0.7) coins.push({ x: x + 20 + k * 30, y: y - 40 - w.r(0, 20) }); if (w.rnd() < 0.4) en.push({ x: x + pw / 2, y, a: x + 8, b: x + pw - 8, d: 1, dead: false }); x += pw; }
    const goal = x + 120; P.push({ x, y: 330, w: 300 }); let me = body(w, () => P, { x: 40, y: 330, jump: 560 });
    return {
      noGhost: true,
      step(dt) {
        const oy = me.y; me.move(dt); me.x = Math.max(10, me.x);
        for (const c of coins) if (!c.g && w.hit(me.x, me.y - 16, c.x, c.y, 22)) { c.g = 1; w.add(10); }
        for (const e of en) { if (e.dead) continue; e.x += e.d * 50 * dt; if (e.x < e.a || e.x > e.b) e.d *= -1; if (Math.abs(me.x - e.x) < 20 && me.y > e.y - 30 && me.y < e.y + 12) { if (me.vy > 0 && oy < e.y - 14) { e.dead = true; me.vy = -380; w.add(20); } else w.die(); } }
        if (me.y > 480) w.die(); if (me.x > goal) { w.add(100 + Math.floor(w.left)); w.finish(); }
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); const cam = me.x - 200; for (const p of P) if (p.x + p.w > cam - 20 && p.x < cam + 660) { w.box(p.x - cam, p.y, p.w, 14, '#66bb6a'); w.box(p.x - cam, p.y + 14, p.w, 8, '#6d4c41'); } coins.forEach(c => { if (!c.g) w.e('🪙', c.x - cam, c.y, 20); }); en.forEach(e => { if (!e.dead) w.e('🐢', e.x - cam, e.y - 14, 28); }); w.e('🚩', goal - cam, 300, 44); for (const [n, o] of Object.entries(w.others)) if (typeof o.wx === 'number' && o.a !== false) { w.g.globalAlpha = 0.55; w.e('🍄', o.wx - cam, o.wy - 16, 26); w.g.globalAlpha = 1; w.tx(n, o.wx - cam, o.wy - 36, 10); } w.e('🧑', me.x - cam, me.y - 16, 30); },
      pub() { return { wx: me.x, wy: me.y }; }
    };
  });

  const MAZE = ['###################', '#........#........#', '#.##.###.#.###.##.#', '#.................#', '#.##.#.#####.#.##.#', '#....#...#...#....#', '#.##.#.#####.#.##.#', '#.................#', '#.##.###.#.###.##.#', '#........#........#', '###################'];
  reg('pac-maze', 'Pac Maze', '🟡', AB, 'Futtere alle Punkte im Labyrinth und lass dich nicht von den Geistern erwischen.', 'Pfeiltasten/WASD', { dur: 90 }, w => {
    const m = MAZE.map(r => r.split('')); let px = 9, py = 3, dx = 0, dy = 0, nd = [0, 0], mt = 0, gh = [{ x: 1, y: 1, t: 0 }, { x: 17, y: 9, t: 0 }], total = m.flat().filter(c => c === '.').length, eaten = 0;
    const ok = (x, y) => m[y] && m[y][x] !== '#' && m[y][x] !== undefined;
    return {
      step(dt) {
        const e = w.inp.e; if (e.left) nd = [-1, 0]; if (e.right) nd = [1, 0]; if (e.up) nd = [0, -1]; if (e.down) nd = [0, 1]; if (w.inp.tap) { const t = w.inp.tap, cx = 16 + px * 32 + 16 - 0, cy = 24 + py * 32 + 16; Math.abs(t.x - cx) > Math.abs(t.y - cy) ? nd = [Math.sign(t.x - cx), 0] : nd = [0, Math.sign(t.y - cy)]; }
        mt -= dt; if (mt <= 0) { mt = 0.16; if (ok(px + nd[0], py + nd[1])) { dx = nd[0]; dy = nd[1]; } if (ok(px + dx, py + dy)) { px += dx; py += dy; } if (m[py][px] === '.') { m[py][px] = ' '; w.add(10); eaten++; if (eaten >= total) { w.add(200); w.finish(); } } }
        for (const g of gh) { g.t -= dt; if (g.t <= 0) { g.t = 0.26 - Math.min(0.08, w.t * 0.001); const o = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => ok(g.x + a, g.y + b)); o.sort((A, B) => (Math.abs(g.x + A[0] - px) + Math.abs(g.y + A[1] - py)) - (Math.abs(g.x + B[0] - px) + Math.abs(g.y + B[1] - py))); const c = w.rnd() < 0.2 ? o[Math.floor(Math.random() * o.length)] : o[0]; g.x += c[0]; g.y += c[1]; } if (g.x === px && g.y === py) w.die(); }
      },
      draw() { w.bg('#000', '#000'); m.forEach((r, y) => r.forEach((c, x) => { if (c === '#') w.box(16 + x * 32 + 2, 24 + y * 32 + 2, 28, 28, '#1e4fd8'); else if (c === '.') w.circ(16 + x * 32 + 16, 24 + y * 32 + 16, 3, '#ffe9a8'); })); gh.forEach(g => w.e('👻', 16 + g.x * 32 + 16, 24 + g.y * 32 + 16, 26)); w.e('😮', 16 + px * 32 + 16, 24 + py * 32 + 16, 26); for (const [n, o] of Object.entries(w.others)) if (typeof o.x === 'number' && o.a !== false) { w.g.globalAlpha = 0.5; w.e('😮', o.x, o.y, 24); w.g.globalAlpha = 1; } },
      pub() { return { x: 16 + px * 32 + 16, y: 24 + py * 32 + 16 }; }, noGhost: true
    };
  });

  reg('missile-command', 'Missile Command', '🚀', AB, 'Verteidige deine Städte: Klicke, um Abfangraketen zu zünden und Raketen zu stoppen.', 'Klick = Abfangrakete (Explosion fängt Raketen ab)', { dur: 90 }, w => {
    const cities = [60, 160, 260, 380, 480, 580].map(x => ({ x, ok: true })); let en = [], ex = [], sh = [], nx = 1;
    return {
      step(dt) {
        const alive = cities.filter(c => c.ok); if (!alive.length) { w.die(); return; } nx -= dt;
        if (nx <= 0) { const t = alive[w.ri(0, alive.length)]; en.push({ x: w.r(20, 620), y: -10, tx: t.x, ty: 360, v: 55 + w.t * 0.8 }); nx = Math.max(0.5, 1.6 - w.t * 0.012); }
        if (w.inp.tap) { const t = w.inp.tap; if (t.y < 340) sh.push({ x: 320, y: 380, tx: t.x, ty: t.y }); }
        for (const s of sh) { const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy); if (d < 8) { s.done = true; ex.push({ x: s.tx, y: s.ty, r: 4, grow: true }); } else { s.x += dx / d * 420 * dt; s.y += dy / d * 420 * dt; } } sh = sh.filter(s => !s.done);
        for (const e of ex) { e.r += (e.grow ? 70 : -70) * dt; if (e.r > 42) e.grow = false; } ex = ex.filter(e => e.r > 2);
        for (const m of en) { const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy); m.x += dx / d * m.v * dt; m.y += dy / d * m.v * dt; for (const e of ex) if (w.hit(m.x, m.y, e.x, e.y, e.r)) { m.d = 1; w.add(10); } if (d < 8) { m.d = 1; const c = cities.find(c => c.x === m.tx); if (c) c.ok = false; } } en = en.filter(m => !m.d);
      },
      draw() { w.bg('#050510', '#1a0b3b'); w.box(0, 370, 640, 30, '#6d4c41'); cities.forEach(c => w.e(c.ok ? '🏙️' : '💥', c.x, 356, 34)); w.e('🛡️', 320, 380, 30); for (const m of en) { w.g.strokeStyle = '#ff5d6c88'; w.g.beginPath(); w.g.moveTo(m.x, m.y); w.g.lineTo(m.x - (m.tx - m.x) * 0.2, m.y - (m.ty - m.y) * 0.2); w.g.stroke(); w.circ(m.x, m.y, 3, '#ff5d6c'); } for (const s of sh) w.circ(s.x, s.y, 3, '#4cd98a'); for (const e of ex) { w.circ(e.x, e.y, e.r, '#ffd16688'); } },
      pub() { return { x: w.inp.x, y: w.inp.y, e: '🎯', z: 22 }; }
    };
  });
})();
