/* Spiele 1–31: Arcade. Alle Spieler im Raum spielen dieselbe Strecke (gleicher Seed) und sehen sich live. */
(function () {
  'use strict';
  const A = 'Arcade', K = (w, n) => w.inp.k[n] ? 1 : 0;
  const dirX = w => K(w, 'right') - K(w, 'left'), dirY = w => K(w, 'down') - K(w, 'up');
  const flap = w => w.inp.e.space || w.inp.e.up || w.inp.tap;

  reg('flappy', 'Flappy Race', '🐦', A, 'Flattere durch die Röhren – alle fliegen dieselbe Strecke.', 'Leertaste / Klick = flattern', { dur: 60 }, w => {
    let y = 200, vy = 0, pipes = [], nx = 0.8;
    return {
      step(dt) {
        if (flap(w)) vy = -300; vy += 900 * dt; y += vy * dt; nx -= dt;
        if (nx <= 0) { pipes.push({ x: 680, gap: w.r(110, 290), p: false }); nx = 1.5; }
        for (const p of pipes) { p.x -= 150 * dt; if (Math.abs(p.x - 100) < 34 && Math.abs(y - p.gap) > 58) w.die(); if (!p.p && p.x < 100) { p.p = true; w.add(1); } }
        pipes = pipes.filter(p => p.x > -40); if (y < 0 || y > 400) w.die();
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); for (const p of pipes) { w.box(p.x - 28, 0, 56, p.gap - 70, '#3cb043'); w.box(p.x - 28, p.gap + 70, 56, 400, '#3cb043'); } w.e('🐦', 100, y, 38); },
      pub() { return { x: 100, y, e: '🐦' }; }
    };
  });

  reg('dino-run', 'Dino Run', '🦖', A, 'Spring über die Kakteen – wer am weitesten kommt, gewinnt.', 'Leertaste / Klick = springen', { dur: 60 }, w => {
    let y = 0, vy = 0, obs = [], nx = 1, sp = 260, dist = 0;
    return {
      step(dt) {
        if (flap(w) && y === 0) vy = 560; vy -= 1500 * dt; y = Math.max(0, y + vy * dt); if (y === 0 && vy < 0) vy = 0;
        sp += 5 * dt; nx -= dt; dist += sp * dt; w.score = dist / 20;
        if (nx <= 0) { obs.push({ x: 680 }); nx = w.r(0.8, 1.6) * 340 / sp; }
        for (const o of obs) { o.x -= sp * dt; if (Math.abs(o.x - 80) < 22 && y < 38) w.die(); }
        obs = obs.filter(o => o.x > -40);
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); w.box(0, 350, 640, 50, '#c9a227'); for (const o of obs) w.e('🌵', o.x, 330, 40); w.e('🦖', 80, 330 - y, 46); },
      pub() { return { x: 80, y: 330 - y, e: '🦖' }; }
    };
  });

  reg('meteor-dodge', 'Meteor Dodge', '☄️', A, 'Weiche den Meteoren aus.', 'Pfeiltasten/WASD oder Maus gedrückt halten', { dur: 60 }, w => {
    let x = 320, y = 340, hz = [], nx = 0.3, t = 0;
    return {
      step(dt) {
        x += dirX(w) * 320 * dt; y += dirY(w) * 320 * dt;
        if (w.inp.down) { x += (w.inp.x - x) * Math.min(1, dt * 10); y += (w.inp.y - y) * Math.min(1, dt * 10); }
        x = w.clamp(x, 18, 622); y = w.clamp(y, 18, 382); t += dt; nx -= dt;
        if (nx <= 0) { hz.push({ x: w.r(15, 625), y: -20, v: w.r(140, 260) + t * 4, e: w.pick(['☄️', '🪨', '🔥']) }); nx = Math.max(0.12, 0.45 - t * 0.005); }
        for (const h of hz) { h.y += h.v * dt; if (w.hit(h.x, h.y, x, y, 24)) w.die(); }
        hz = hz.filter(h => h.y < 420); w.score = t * 10;
      },
      draw() { w.bg('#050510', '#2a1a5e'); for (const h of hz) w.e(h.e, h.x, h.y, 34); w.e('🧑‍🚀', x, y, 36); },
      pub() { return { x, y, e: '🧑‍🚀' }; }
    };
  });

  reg('fruit-catcher', 'Fruit Catcher', '🍎', A, 'Fange das Obst, aber keine Bomben!', 'Pfeiltasten oder Maus', { dur: 60 }, w => {
    let x = 320, lives = 3, it = [], nx = 0.4, t = 0;
    return {
      step(dt) {
        x += dirX(w) * 420 * dt; if (w.inp.x !== 320 || w.inp.down) x += (w.inp.x - x) * Math.min(1, dt * 10) * (dirX(w) ? 0 : 1);
        x = w.clamp(x, 30, 610); t += dt; nx -= dt;
        if (nx <= 0) { const bad = w.rnd() < 0.28; it.push({ x: w.r(25, 615), y: -20, v: w.r(130, 220) + t * 3, bad, e: bad ? '💣' : w.pick(['🍎', '🍌', '🍇', '🍓']) }); nx = Math.max(0.25, 0.7 - t * 0.006); }
        for (const i of it) { i.y += i.v * dt; if (i.y > 330 && i.y < 375 && Math.abs(i.x - x) < 40) { i.d = 1; if (i.bad) { if (--lives <= 0) w.die(); } else w.add(1); } }
        it = it.filter(i => !i.d && i.y < 420);
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); for (const i of it) w.e(i.e, i.x, i.y, 30); w.e('🧺', x, 360, 56); w.tx('❤️'.repeat(Math.max(0, lives)), 320, 16, 16); },
      pub() { return { x, y: 360, e: '🧺' }; }
    };
  });

  reg('snake-arena', 'Snake Arena', '🐍', A, 'Snake mit Gegnern: Die Körper der anderen Spieler sind tödlich!', 'Pfeiltasten/WASD oder tippen', { dur: 90 }, w => {
    const C = 32, R = 20, G = 20; let b = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], d = { x: 1, y: 0 }, nd = d, acc = 0, food = { x: w.ri(0, C), y: w.ri(0, R) };
    const hitO = h => { for (const o of Object.values(w.others)) if (o.b && o.a !== false) for (let i = 0; i < o.b.length; i += 2) if (o.b[i] === h.x && o.b[i + 1] === h.y) return true; return false; };
    return {
      noGhost: true,
      step(dt) {
        const e = w.inp.e;
        if (e.left && d.x === 0) nd = { x: -1, y: 0 }; if (e.right && d.x === 0) nd = { x: 1, y: 0 }; if (e.up && d.y === 0) nd = { x: 0, y: -1 }; if (e.down && d.y === 0) nd = { x: 0, y: 1 };
        if (w.inp.tap) { const h = b[0], dx = w.inp.tap.x - (h.x * G + 10), dy = w.inp.tap.y - (h.y * G + 10); if (Math.abs(dx) > Math.abs(dy)) { if (d.x === 0) nd = { x: Math.sign(dx), y: 0 }; } else if (d.y === 0) nd = { x: 0, y: Math.sign(dy) }; }
        acc += dt; const st = Math.max(0.06, 0.13 - w.score * 0.002);
        while (acc > st) {
          acc -= st; d = nd; const h = { x: b[0].x + d.x, y: b[0].y + d.y };
          if (h.x < 0 || h.y < 0 || h.x >= C || h.y >= R || b.some(s => s.x === h.x && s.y === h.y) || hitO(h)) { w.die(); return; }
          b.unshift(h); if (h.x === food.x && h.y === food.y) { w.add(1); food = { x: w.ri(0, C), y: w.ri(0, R) }; } else b.pop();
        }
      },
      draw() {
        w.bg('#101820', '#1b2a3a');
        for (const [n, o] of Object.entries(w.others)) if (o.b) { w.g.globalAlpha = o.a === false ? 0.25 : 1; for (let i = 0; i < o.b.length; i += 2) w.box(o.b[i] * G + 1, o.b[i + 1] * G + 1, G - 2, G - 2, i ? '#ff7a59' : '#fff'); w.g.globalAlpha = 1; w.tx(n, o.b[0] * G + 10, o.b[1] * G - 6, 10); }
        b.forEach((s, i) => w.box(s.x * G + 1, s.y * G + 1, G - 2, G - 2, i ? '#4cd964' : '#fff')); w.e('🍎', food.x * G + 10, food.y * G + 11, 18);
      },
      pub() { const f = []; for (let i = 0; i < Math.min(b.length, 60); i++) f.push(b[i].x, b[i].y); return { b: f, x: b[0].x * G + 10, y: b[0].y * G + 10 }; }
    };
  });

  reg('brick-breaker', 'Brick Breaker', '🧱', A, 'Zerstöre alle Steine – mit dem Seed hat jeder dieselbe Ballrichtung.', 'Maus oder Pfeiltasten', { dur: 90 }, w => {
    const br = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) br.push({ x: 20 + c * 60, y: 50 + r * 24, r });
    let px = 320, bx = 320, by = 340, vx = w.r(-150, 150), vy = -260, lives = 3;
    return {
      step(dt) {
        if (dirX(w)) { px += dirX(w) * 480 * dt; w.inp.x = px; } else px += (w.inp.x - px) * Math.min(1, dt * 14); px = w.clamp(px, 45, 595);
        bx += vx * dt; by += vy * dt; if (bx < 8 || bx > 632) { vx *= -1; bx = w.clamp(bx, 8, 632); } if (by < 8) vy = Math.abs(vy);
        if (vy > 0 && by > 360 && by < 376 && Math.abs(bx - px) < 52) { vy = -Math.abs(vy); vx = (bx - px) * 5; }
        if (by > 410) { if (--lives <= 0) w.die(); else { bx = px; by = 340; vy = -260; vx = 100; } }
        for (const b of br) if (!b.d && bx > b.x && bx < b.x + 56 && by > b.y && by < b.y + 20) { b.d = 1; vy *= -1; w.add(10); break; }
        if (br.every(b => b.d)) { br.forEach(b => b.d = 0); vy = -Math.abs(vy) * 1.1; w.add(100); }
      },
      draw() { w.bg('#0f1b3d', '#2c4a8a'); const c = ['#ff5252', '#ffb142', '#ffd32a', '#32ff7e', '#18dcff']; for (const b of br) if (!b.d) w.box(b.x, b.y, 56, 20, c[b.r]); w.box(px - 45, 370, 90, 10, '#fff'); w.e('⚽', bx, by, 18); w.tx('❤️'.repeat(lives), 320, 16, 14); },
      pub() { return { x: px, y: 372, e: '➖' }; }
    };
  });

  reg('space-shooter', 'Space Shooter', '🚀', A, 'Schieße die Aliens ab, bevor sie landen.', 'Pfeile/Maus bewegen · Leertaste/Maustaste schießen', { dur: 60 }, w => {
    let x = 320, sh = [], en = [], nx = 0.5, cd = 0, t = 0;
    return {
      step(dt) {
        x += dirX(w) * 380 * dt; if (w.inp.down) x += (w.inp.x - x) * Math.min(1, dt * 10); x = w.clamp(x, 25, 615);
        cd -= dt; t += dt; if ((w.inp.k.space || w.inp.down) && cd <= 0) { sh.push({ x, y: 330 }); cd = 0.22; }
        nx -= dt; if (nx <= 0) { en.push({ x: w.r(25, 615), y: -20, v: w.r(60, 110) + t * 2, e: w.pick(['👾', '🛸', '👽']) }); nx = Math.max(0.3, 0.9 - t * 0.01); }
        for (const b of sh) b.y -= 520 * dt;
        for (const e of en) { e.y += e.v * dt; if (e.y > 360) w.die(); for (const b of sh) if (!b.d && !e.d && Math.abs(b.x - e.x) < 22 && Math.abs(b.y - e.y) < 22) { b.d = e.d = 1; w.add(10); } }
        sh = sh.filter(b => !b.d && b.y > -10); en = en.filter(e => !e.d);
      },
      draw() { w.bg('#050510', '#2a1a5e'); for (const b of sh) w.box(b.x - 2, b.y - 8, 4, 12, '#ffe66d'); for (const e of en) w.e(e.e, e.x, e.y, 32); w.e('🚀', x, 360, 42); },
      pub() { return { x, y: 360, e: '🚀' }; }
    };
  });

  reg('whack-a-mole', 'Whack a Mole', '🐹', A, 'Hau auf die Maulwürfe – Bomben nicht anfassen! (30 Sekunden)', 'Maus / Finger', { dur: 30 }, w => {
    const h = Array.from({ length: 9 }, () => ({ t: 0, bad: false })); let nx = 0.3;
    const pos = i => ({ x: 180 + (i % 3) * 140, y: 110 + Math.floor(i / 3) * 105 });
    return {
      step(dt) {
        nx -= dt; if (nx <= 0) { const o = h[w.ri(0, 9)]; if (o.t <= 0) { o.t = w.r(0.6, 1.2); o.bad = w.rnd() < 0.2; } nx = Math.max(0.22, 0.65 - w.t * 0.012); }
        for (const o of h) o.t -= dt;
        const t = w.inp.tap; if (t) h.forEach((o, i) => { const p = pos(i); if (o.t > 0 && w.hit(t.x, t.y, p.x, p.y, 46)) { o.t = 0; w.score = Math.max(0, w.score + (o.bad ? -5 : 1)); } });
      },
      draw() { w.bg('#0f3d1f', '#3c8f4a'); h.forEach((o, i) => { const p = pos(i); w.g.fillStyle = '#3b2a1a'; w.g.beginPath(); w.g.ellipse(p.x, p.y + 28, 52, 18, 0, 0, 7); w.g.fill(); if (o.t > 0) w.e(o.bad ? '💣' : '🐹', p.x, p.y, 52); }); },
      pub() { return { x: w.inp.x, y: w.inp.y, e: '🔨' }; }
    };
  });

  reg('sky-climber', 'Sky Climber', '☁️', A, 'Hüpfe von Plattform zu Plattform so hoch du kannst.', 'Pfeiltasten / Maus', { dur: 90 }, w => {
    let x = 320, y = 340, vy = -520, cam = 0, pl = [{ x: 280, y: 380, w: 80 }], top = 380;
    const gen = () => { while (top > -cam - 60) { top -= w.r(48, 66 + Math.min(40, cam / 80)); pl.push({ x: w.r(0, 560), y: top, w: Math.max(50, 80 - cam / 300) }); } };
    gen();
    return {
      step(dt) {
        x += dirX(w) * 320 * dt; if (w.inp.down) x += (w.inp.x - x) * Math.min(1, dt * 8); if (x < -10) x = 650; if (x > 650) x = -10;
        const oy = y; vy += 1000 * dt; y += vy * dt;
        if (vy > 0) for (const p of pl) if (oy + 20 <= p.y + 4 && y + 20 >= p.y && x > p.x - 10 && x < p.x + p.w + 10) vy = -520;
        if (y < 200 - cam) { cam = 200 - y; w.score = Math.max(w.score, cam / 10); gen(); }
        pl = pl.filter(p => p.y + cam < 440); if (y + cam > 440) w.die();
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); for (const p of pl) w.box(p.x, p.y + cam, p.w, 10, '#8bc34a'); w.e('🧗', x, y + cam, 38); },
      pub() { return { x, y: y + cam, e: '🧗' }; }
    };
  });

  reg('coin-chase', 'Coin Chase', '🪙', A, 'Sammle Münzen und lass dich nicht von den Geistern fangen.', 'Pfeile oder Maus gedrückt halten', { dur: 60 }, w => {
    let x = 320, y = 200, coin = { x: 100, y: 100 }, en = [{ x: 30, y: 30 }, { x: 610, y: 370 }];
    return {
      step(dt) {
        x += dirX(w) * 230 * dt; y += dirY(w) * 230 * dt;
        if (w.inp.down) { const dx = w.inp.x - x, dy = w.inp.y - y, d = Math.hypot(dx, dy) || 1; if (d > 6) { x += dx / d * 230 * dt; y += dy / d * 230 * dt; } }
        x = w.clamp(x, 18, 622); y = w.clamp(y, 18, 382);
        if (w.hit(x, y, coin.x, coin.y, 28)) { w.add(1); coin = { x: w.r(30, 610), y: w.r(40, 370) }; if (w.score % 3 === 0 && en.length < 7) en.push({ x: w.pick([30, 610]), y: w.pick([30, 370]) }); }
        for (const e of en) { const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy) || 1, v = 70 + w.score * 4; e.x += dx / d * v * dt; e.y += dy / d * v * dt; if (d < 26) w.die(); }
      },
      draw() { w.bg('#2b2b3a', '#5d5d7a'); w.e('🪙', coin.x, coin.y, 30); for (const e of en) w.e('👻', e.x, e.y, 34); w.e('🧍', x, y, 34); },
      pub() { return { x, y, e: '🏃' }; }
    };
  });

  reg('highway-racer', 'Highway Racer', '🏎️', A, 'Wechsle die Spur und überhole den Verkehr.', '← → oder links/rechts tippen', { dur: 60 }, w => {
    let lane = 1, cars = [], nx = 0.5, off = 0, sp = 300;
    return {
      step(dt) {
        const e = w.inp.e; if (e.left) lane = Math.max(0, lane - 1); if (e.right) lane = Math.min(2, lane + 1);
        if (w.inp.tap) lane = w.clamp(Math.floor((w.inp.tap.x - 170) / 100), 0, 2);
        sp += 8 * dt; off = (off + sp * dt) % 60; nx -= dt;
        if (nx <= 0) { cars.push({ l: w.ri(0, 3), y: -40, e: w.pick(['🚙', '🚕', '🚌']) }); nx = w.r(0.35, 0.8) * 420 / sp; }
        for (const c of cars) { c.y += (sp - 130) * dt; if (c.l === lane && Math.abs(c.y - 330) < 42) w.die(); }
        cars = cars.filter(c => c.y < 440); w.score += sp * dt / 30;
      },
      draw() { w.bg('#2b2b3a', '#2b2b3a'); w.box(170, 0, 300, 400, '#333'); for (let y = -60 + off; y < 400; y += 60) { w.box(268, y, 4, 30, '#fff'); w.box(368, y, 4, 30, '#fff'); } for (const c of cars) w.e(c.e, 220 + c.l * 100, c.y, 46); w.e('🏎️', 220 + lane * 100, 330, 48); },
      pub() { return { x: 220 + lane * 100, y: 330, e: '🏎️' }; }
    };
  });

  reg('wall-pong', 'Wall Pong', '🏓', A, 'Der Ball prallt von der Wand ab – wie oft schaffst du es?', 'Maus oder ↑ ↓', { dur: 60 }, w => {
    let py = 200, bx = 300, by = 200, vx = 260, vy = w.r(-160, 160);
    return {
      step(dt) {
        py += dirY(w) * 420 * dt; if (!dirY(w)) py += (w.inp.y - py) * Math.min(1, dt * 14); py = w.clamp(py, 40, 360);
        bx += vx * dt; by += vy * dt; if (by < 10 || by > 390) { vy *= -1; by = w.clamp(by, 10, 390); } if (bx > 630) { vx = -Math.abs(vx); }
        if (vx < 0 && bx < 40 && bx > 20 && Math.abs(by - py) < 42) { vx = Math.abs(vx) * 1.05; vy = (by - py) * 5; w.add(1); }
        if (bx < -10) w.die();
      },
      draw() { w.bg('#0b1226', '#1d2b53'); w.box(630, 0, 10, 400, '#4f8cff'); w.box(20, py - 40, 12, 80, '#fff'); w.e('🎾', bx, by, 22); },
      pub() { return { x: 26, y: py, e: '▮' }; }
    };
  });

  reg('asteroids', 'Asteroids', '🪨', A, 'Drehe dein Schiff, schieße Asteroiden ab.', '← → drehen · ↑ Schub · Leertaste schießen', { dur: 90 }, w => {
    let x = 320, y = 200, vx = 0, vy = 0, a = -Math.PI / 2, sh = [], rk = [], cd = 0, inv = 2;
    const mk = (n, s) => { for (let i = 0; i < n; i++) { const an = w.r(0, 6.28), d = w.r(160, 300); rk.push({ x: 320 + Math.cos(an) * d, y: 200 + Math.sin(an) * d * 0.7, vx: w.r(-50, 50), vy: w.r(-50, 50), r: s }); } };
    mk(4, 34); const wrap = o => { o.x = (o.x + 640) % 640; o.y = (o.y + 400) % 400; };
    return {
      step(dt) {
        a += dirX(w) * 3.5 * dt; if (K(w, 'up')) { vx += Math.cos(a) * 260 * dt; vy += Math.sin(a) * 260 * dt; } vx *= 0.995; vy *= 0.995; x += vx * dt; y += vy * dt; wrap({ get x() { return x; }, set x(v) { x = v; }, get y() { return y; }, set y(v) { y = v; } });
        cd -= dt; inv -= dt; if (w.inp.k.space && cd <= 0) { sh.push({ x, y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, t: 1.2 }); cd = 0.25; }
        for (const b of sh) { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; wrap(b); }
        for (const r of rk) { r.x += r.vx * dt; r.y += r.vy * dt; wrap(r); if (inv <= 0 && w.hit(r.x, r.y, x, y, r.r + 8)) w.die(); for (const b of sh) if (!b.d && w.hit(b.x, b.y, r.x, r.y, r.r)) { b.d = r.d = 1; w.add(r.r > 20 ? 20 : 50); if (r.r > 18) for (let i = 0; i < 2; i++) rk.push({ x: r.x, y: r.y, vx: w.r(-90, 90), vy: w.r(-90, 90), r: r.r / 2 }); } }
        sh = sh.filter(b => !b.d && b.t > 0); rk = rk.filter(r => !r.d); if (!rk.length) mk(4 + Math.floor(w.score / 200), 34);
      },
      draw() { w.bg('#050510', '#101030'); for (const r of rk) w.circ(r.x, r.y, r.r, '#8d8d9b'); for (const b of sh) w.circ(b.x, b.y, 3, '#ffe66d'); w.g.save(); w.g.translate(x, y); w.g.rotate(a); w.g.fillStyle = inv > 0 && Math.floor(inv * 8) % 2 ? '#888' : '#fff'; w.g.beginPath(); w.g.moveTo(14, 0); w.g.lineTo(-10, -9); w.g.lineTo(-10, 9); w.g.fill(); w.g.restore(); },
      pub() { return { x, y, e: '🛸' }; }
    };
  });

  reg('road-crosser', 'Road Crosser', '🐸', A, 'Überquere die Straßen ohne überfahren zu werden.', 'Pfeiltasten oder tippen (oben/unten/links/rechts)', { dur: 60 }, w => {
    const rows = []; for (let i = 0; i < 7; i++) rows.push({ v: (w.rnd() < 0.5 ? -1 : 1) * w.r(60, 140), off: w.r(0, 200), gap: w.r(200, 340) });
    let gx = 8, gy = 0, mv = 0;
    const cars = (i, t) => { const r = rows[i], o = []; for (let k = -2; k < 7; k++) o.push((((k * r.gap + r.off + r.v * t) % (7 * r.gap)) + 7 * r.gap) % (7 * r.gap) - 100); return o; };
    return {
      step(dt) {
        mv -= dt; const e = w.inp.e;
        if (e.up) { gy++; } if (e.down && gy > 0) gy--; if (e.left && gx > 0) gx--; if (e.right && gx < 15) gx++;
        if (w.inp.tap) { const dx = w.inp.tap.x - (gx * 40 + 20), dy = w.inp.tap.y - (360 - gy * 40); if (Math.abs(dx) > Math.abs(dy)) gx = w.clamp(gx + Math.sign(dx), 0, 15); else if (dy < 0) gy++; else if (gy > 0) gy--; }
        if (gy >= 8) { w.add(10); gy = 0; }
        if (gy >= 1 && gy <= 7) for (const cx of cars(gy - 1, w.t)) if (Math.abs(cx - (gx * 40 + 20)) < 30) { w.die(); }
      },
      draw() { w.bg('#3c8f4a', '#3c8f4a'); for (let i = 1; i <= 7; i++) { w.box(0, 360 - i * 40 - 20, 640, 40, '#333'); for (const cx of cars(i - 1, w.t)) w.e(rows[i - 1].v > 0 ? '🚗' : '🚙', cx, 360 - i * 40, 32); } w.e('🐸', gx * 40 + 20, 360 - gy * 40, 34); },
      pub() { return { x: gx * 40 + 20, y: 360 - gy * 40, e: '🐸' }; }
    };
  });

  reg('space-invaders', 'Space Invaders', '👾', A, 'Eine Alien-Armee marschiert herab – stoppe sie!', 'Pfeile bewegen · Leertaste schießen', { dur: 90 }, w => {
    let x = 320, sh = [], ab = [], cd = 0, dir = 1, ox = 60, oy = 50, wave = 0, al = [];
    const spawn = () => { al = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) al.push({ c, r, e: ['👾', '👽', '🛸', '🤖'][r] }); ox = 60; oy = 50; wave++; };
    spawn();
    return {
      step(dt) {
        x += dirX(w) * 360 * dt; if (w.inp.down) x += (w.inp.x - x) * Math.min(1, dt * 10); x = w.clamp(x, 25, 615);
        cd -= dt; if ((w.inp.k.space || w.inp.down) && cd <= 0) { sh.push({ x, y: 340 }); cd = 0.35; }
        ox += dir * (40 + wave * 8) * dt; const mx = Math.max(...al.map(a => a.c)), mn = Math.min(...al.map(a => a.c)); if (ox + mx * 56 > 590 || ox + mn * 56 < 10) { dir *= -1; oy += 18; }
        if (w.rnd() < dt * 1.2 && al.length) { const a = al[w.ri(0, al.length)]; ab.push({ x: ox + a.c * 56, y: oy + a.r * 40 }); }
        for (const b of sh) b.y -= 460 * dt; for (const b of ab) { b.y += 200 * dt; if (w.hit(b.x, b.y, x, 360, 18)) w.die(); }
        for (const a of al) { const ax = ox + a.c * 56, ay = oy + a.r * 40; if (ay > 330) w.die(); for (const b of sh) if (!b.d && !a.d && Math.abs(b.x - ax) < 20 && Math.abs(b.y - ay) < 18) { b.d = a.d = 1; w.add(10 * (4 - a.r)); } }
        sh = sh.filter(b => !b.d && b.y > 0); ab = ab.filter(b => b.y < 410); al = al.filter(a => !a.d); if (!al.length) { spawn(); w.add(100); }
      },
      draw() { w.bg('#050510', '#1a1a3e'); for (const a of al) w.e(a.e, ox + a.c * 56, oy + a.r * 40, 30); for (const b of sh) w.box(b.x - 2, b.y - 8, 4, 12, '#ffe66d'); for (const b of ab) w.box(b.x - 2, b.y - 6, 4, 12, '#ff5d6c'); w.e('🚀', x, 360, 40); },
      pub() { return { x, y: 360, e: '🚀' }; }
    };
  });

  reg('cave-copter', 'Cave Copter', '🚁', A, 'Halte die Taste zum Steigen und flieg durch die Höhle.', 'Leertaste / Maustaste gedrückt halten', { dur: 60 }, w => {
    let y = 200, vy = 0, seg = [], cx = 0, c = 200, wd = 220, t = 0;
    const gen = () => { while (seg.length < 60) { c = w.clamp(c + w.r(-26, 26), 90, 310); seg.push(c); } };
    gen(); let off = 0;
    return {
      step(dt) {
        const up = w.inp.k.space || w.inp.down || w.inp.k.up; vy += (up ? -900 : 800) * dt; vy = w.clamp(vy, -300, 320); y += vy * dt; t += dt;
        off += (200 + t * 3) * dt; while (off >= 20) { off -= 20; seg.shift(); gen(); } wd = Math.max(130, 220 - t * 1.5); w.score = t * 8;
        const cc = seg[5] + (seg[6] - seg[5]) * off / 20; if (y < cc - wd / 2 + 10 || y > cc + wd / 2 - 10) w.die();
      },
      draw() { w.bg('#1a1010', '#1a1010'); for (let i = 0; i < 40; i++) { const x = i * 20 - off - 100, cc = seg[i]; w.box(x, 0, 21, cc - wd / 2, '#6d4c41'); w.box(x, cc + wd / 2, 21, 400, '#6d4c41'); } w.e('🚁', 100, y, 38); },
      pub() { return { x: 100, y, e: '🚁' }; }
    };
  });

  reg('gravity-flip', 'Gravity Flip', '🔄', A, 'Drehe die Schwerkraft und weiche den Stacheln aus.', 'Leertaste / Klick = Schwerkraft drehen', { dur: 60 }, w => {
    let y = 340, vy = 0, gd = 1, obs = [], nx = 1, sp = 240;
    return {
      step(dt) {
        if (flap(w)) gd *= -1; vy += gd * 1100 * dt; y += vy * dt; if (y > 340) { y = 340; vy = 0; } if (y < 60) { y = 60; vy = 0; }
        sp += 4 * dt; nx -= dt; if (nx <= 0) { obs.push({ x: 680, top: w.rnd() < 0.5 }); nx = w.r(0.7, 1.3) * 300 / sp; }
        for (const o of obs) { o.x -= sp * dt; if (Math.abs(o.x - 100) < 20 && ((o.top && y < 100) || (!o.top && y > 300))) w.die(); }
        obs = obs.filter(o => o.x > -30); w.score += dt * 10;
      },
      draw() { w.bg('#101030', '#2a1a5e'); w.box(0, 360, 640, 40, '#4f8cff'); w.box(0, 0, 640, 40, '#4f8cff'); for (const o of obs) w.e('🔺', o.x, o.top ? 56 : 344, 36); w.e('🟡', 100, y, 34); },
      pub() { return { x: 100, y, e: '🟡' }; }
    };
  });

  reg('jetpack-run', 'Jetpack Run', '🎒', A, 'Flieg mit dem Jetpack, sammle Münzen, meide Blitze.', 'Leertaste / Maustaste halten', { dur: 60 }, w => {
    let y = 300, vy = 0, it = [], nx = 0.6, sp = 280;
    return {
      step(dt) {
        const up = w.inp.k.space || w.inp.down; vy += (up ? -1100 : 900) * dt; vy = w.clamp(vy, -320, 360); y += vy * dt; y = w.clamp(y, 30, 350); sp += 3 * dt; nx -= dt;
        if (nx <= 0) { if (w.rnd() < 0.4) it.push({ x: 680, y: w.r(40, 360), z: 1, a: w.r(0, 3) }); else for (let i = 0; i < 4; i++) it.push({ x: 680 + i * 34, y: w.r(60, 340), c: 1, yy: 0 }); nx = w.r(0.7, 1.3); }
        const cy = it.filter(o => o.c).length; for (const o of it) { o.x -= sp * dt; if (o.c && w.hit(o.x, o.y, 100, y, 24)) { o.d = 1; w.add(5); } if (o.z && Math.abs(o.x - 100) < 20 && Math.abs(o.y - y) < 55) w.die(); }
        it = it.filter(o => !o.d && o.x > -50); w.score += dt * 3;
      },
      draw() { w.bg('#2b2b3a', '#454560'); for (const o of it) { if (o.c) w.e('🪙', o.x, o.y, 22); else { w.box(o.x - 4, o.y - 50, 8, 100, '#ffe66d'); w.e('⚡', o.x, o.y - 50, 20); w.e('⚡', o.x, o.y + 50, 20); } } w.e('🎒', 100, y, 36); },
      pub() { return { x: 100, y, e: '🎒' }; }
    };
  });

  reg('slalom-ski', 'Slalom Ski', '⛷️', A, 'Fahre durch die Tore und weiche den Bäumen aus.', '← → steuern oder links/rechts halten', { dur: 60 }, w => {
    let x = 320, ob = [], nx = 0.2, sp = 260;
    return {
      step(dt) {
        x += (dirX(w) * 300 + (w.inp.down ? (w.inp.x < 320 ? -300 : 300) : 0)) * dt; x = w.clamp(x, 15, 625); sp += 4 * dt; nx -= dt;
        if (nx <= 0) { if (w.rnd() < 0.3) ob.push({ x: w.r(60, 580), y: 420, gate: true }); else ob.push({ x: w.r(20, 620), y: 420 }); nx = w.r(0.25, 0.55) * 300 / sp; }
        for (const o of ob) { o.y -= sp * dt; if (o.gate) { if (!o.p && o.y < 90) { o.p = 1; if (Math.abs(x - o.x) < 44) w.add(10); else w.die(); } } else if (w.hit(o.x, o.y, x, 90, 22)) w.die(); }
        ob = ob.filter(o => o.y > -30); w.score += dt;
      },
      draw() { w.bg('#9ecbff', '#ffffff'); for (const o of ob) { if (o.gate) { w.e('🚩', o.x - 44, o.y, 26); w.e('🚩', o.x + 44, o.y, 26); } else w.e('🌲', o.x, o.y, 36); } w.e('⛷️', x, 90, 40); },
      pub() { return { x, y: 90, e: '⛷️' }; }
    };
  });

  reg('balloon-pop', 'Balloon Pop', '🎈', A, 'Platze die aufsteigenden Ballons – Kaktus-Ballons nicht!', 'Maus / Finger', { dur: 30 }, w => {
    let b = [], nx = 0.2;
    return {
      step(dt) {
        nx -= dt; if (nx <= 0) { b.push({ x: w.r(30, 610), y: 420, v: w.r(70, 170), bad: w.rnd() < 0.15, e: w.pick(['🎈', '🟥', '🟦']) }); nx = Math.max(0.15, 0.5 - w.t * 0.01); }
        const t = w.inp.tap; for (const o of b) { o.y -= o.v * dt; if (t && !o.d && w.hit(t.x, t.y, o.x, o.y, 28)) { o.d = 1; w.score = Math.max(0, w.score + (o.bad ? -5 : 1)); } }
        b = b.filter(o => !o.d && o.y > -30);
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); for (const o of b) w.e(o.bad ? '🌵' : '🎈', o.x, o.y, 48); },
      pub() { return { x: w.inp.x, y: w.inp.y, e: '📍' }; }
    };
  });

  reg('aim-trainer', 'Aim Trainer', '🎯', A, 'Triff die schrumpfenden Ziele so schnell wie möglich.', 'Maus / Finger', { dur: 30 }, w => {
    let tg = [], nx = 0;
    return {
      step(dt) {
        nx -= dt; if (nx <= 0 && tg.length < 4) { tg.push({ x: w.r(40, 600), y: w.r(40, 360), r: 36 }); nx = 0.35; }
        for (const o of tg) { o.r -= 14 * dt; if (o.r <= 6) { o.d = 1; w.score = Math.max(0, w.score - 2); } }
        const t = w.inp.tap; if (t) { let hit = false; for (const o of tg) if (!o.d && w.hit(t.x, t.y, o.x, o.y, o.r + 4)) { o.d = 1; hit = true; w.add(Math.ceil(o.r / 6)); } if (!hit) w.score = Math.max(0, w.score - 1); }
        tg = tg.filter(o => !o.d);
      },
      draw() { w.bg('#101820', '#1b2a3a'); for (const o of tg) { w.circ(o.x, o.y, o.r, '#ff5d6c'); w.circ(o.x, o.y, o.r * 0.6, '#fff'); w.circ(o.x, o.y, o.r * 0.25, '#ff5d6c'); } },
      pub() { return { x: w.inp.x, y: w.inp.y, e: '🎯' }; }
    };
  });

  reg('orbit-dodge', 'Orbit Dodge', '🪐', A, 'Kreise um den Planeten und wechsle die Richtung, um Trümmern auszuweichen.', 'Leertaste / Klick = Richtung wechseln', { dur: 60 }, w => {
    let an = 0, dir = 1, ob = [], nx = 0.8, sp = 1.6;
    return {
      step(dt) {
        if (flap(w)) dir *= -1; an += dir * sp * dt; sp += 0.01 * dt; nx -= dt;
        if (nx <= 0) { ob.push({ a: an + w.r(1.5, 4.5) * (w.rnd() < 0.5 ? 1 : -1), r: w.pick([90, 120, 150]), t: 0 }); nx = Math.max(0.4, 1 - w.t * 0.01); }
        for (const o of ob) { o.t += dt; const x = 320 + Math.cos(an) * 120, y = 200 + Math.sin(an) * 120; if (o.t > 0.8) { if (w.hit(x, y, 320 + Math.cos(o.a) * 120, 200 + Math.sin(o.a) * 120, 22)) w.die(); } }
        ob = ob.filter(o => o.t < 3.5); w.score += dt * 10;
      },
      draw() { w.bg('#050510', '#1a0b3b'); w.g.strokeStyle = '#ffffff22'; w.g.beginPath(); w.g.arc(320, 200, 120, 0, 7); w.g.stroke(); w.e('🪐', 320, 200, 70); for (const o of ob) { w.g.globalAlpha = o.t < 0.8 ? 0.35 : 1; w.e('☄️', 320 + Math.cos(o.a) * 120, 200 + Math.sin(o.a) * 120, 36); w.g.globalAlpha = 1; } w.e('🛰️', 320 + Math.cos(an) * 120, 200 + Math.sin(an) * 120, 32); },
      pub() { return { x: 320 + Math.cos(an) * 120, y: 200 + Math.sin(an) * 120, e: '🛰️' }; }
    };
  });

  reg('bullet-hell', 'Bullet Hell', '💥', A, 'Weiche den Kugelmustern des Bosses aus.', 'Maus bewegen oder Pfeiltasten', { dur: 60 }, w => {
    let x = 320, y = 330, bl = [], nx = 0.5, pat = 0;
    return {
      step(dt) {
        if (dirX(w) || dirY(w)) { x += dirX(w) * 260 * dt; y += dirY(w) * 260 * dt; } else { x += (w.inp.x - x) * Math.min(1, dt * 8); y += (w.inp.y - y) * Math.min(1, dt * 8); } x = w.clamp(x, 10, 630); y = w.clamp(y, 120, 390);
        nx -= dt; if (nx <= 0) { pat++; const n = 10 + (pat % 4) * 4, o = w.r(0, 6.28); for (let i = 0; i < n; i++) { const a = o + i * 6.2832 / n + (pat % 2 ? Math.sin(i) * 0.1 : 0); bl.push({ x: 320, y: 60, vx: Math.cos(a) * (110 + (pat % 3) * 25), vy: Math.sin(a) * (110 + (pat % 3) * 25) }); } nx = Math.max(0.55, 1.2 - w.t * 0.01); }
        for (const b of bl) { b.x += b.vx * dt; b.y += b.vy * dt; if (w.hit(b.x, b.y, x, y, 8)) w.die(); } bl = bl.filter(b => b.x > -10 && b.x < 650 && b.y > -10 && b.y < 410); w.score += dt * 10;
      },
      draw() { w.bg('#1a0010', '#3b0030'); w.e('👹', 320, 50, 60); for (const b of bl) w.circ(b.x, b.y, 5, '#ff8fb0'); w.circ(x, y, 7, '#fff'); w.circ(x, y, 4, '#4f8cff'); },
      pub() { return { x, y, e: '💙', z: 18 }; }
    };
  });

  reg('moon-lander', 'Moon Lander', '🌙', A, 'Lande sanft auf dem Landeplatz – jede Landung gibt Punkte.', '↑ Schub · ← → neigen', { dur: 90 }, w => {
    let x = 320, y = 40, vx = 0, vy = 0, pad = w.r(80, 560), fuel = 100;
    const reset = () => { x = w.r(60, 580); y = 40; vx = w.r(-30, 30); vy = 0; pad = w.r(80, 560); fuel = 100; };
    return {
      step(dt) {
        vy += 60 * dt; if (fuel > 0) { if (K(w, 'up') || w.inp.down) { vy -= 160 * dt; fuel -= 25 * dt; } if (dirX(w)) { vx += dirX(w) * 90 * dt; fuel -= 8 * dt; } } x += vx * dt; y += vy * dt; if (x < 0 || x > 640) vx *= -1;
        if (y > 350) { if (Math.abs(x - pad) < 40 && vy < 55 && Math.abs(vx) < 40) { w.add(100 + Math.floor(fuel)); reset(); } else w.die(); }
      },
      draw() { w.bg('#050510', '#101030'); w.box(0, 370, 640, 30, '#9e9e9e'); w.box(pad - 40, 366, 80, 8, '#4cd98a'); w.e('🚀', x, y, 32); w.box(10, 380, fuel * 1.2, 8, '#ffd166'); w.tx('Tempo ' + Math.floor(vy), 560, 20, 12, vy < 55 ? '#9fe39f' : '#ff8080'); },
      pub() { return { x, y, e: '🚀' }; }
    };
  });

  reg('tower-stack', 'Tower Stack', '🏗️', A, 'Stapel die Blöcke exakt übereinander – der Turm wächst!', 'Leertaste / Klick = Block fallen lassen', { dur: 60 }, w => {
    let st = [{ x: 220, w: 200 }], cur = { x: 0, w: 200 }, dir = 1, sp = 180, h = 1;
    return {
      step(dt) {
        cur.x += dir * sp * dt; if (cur.x < 0 || cur.x + cur.w > 640) dir *= -1;
        if (flap(w)) {
          const l = st[st.length - 1], o = Math.min(cur.x + cur.w, l.x + l.w) - Math.max(cur.x, l.x);
          if (o <= 4) { w.die(); return; } const nx = Math.max(cur.x, l.x); const perfect = Math.abs(cur.x - l.x) < 5; st.push({ x: perfect ? l.x : nx, w: perfect ? l.w : o }); w.add(perfect ? 3 : 1); cur = { x: dir > 0 ? 0 : 640 - st[st.length - 1].w, w: st[st.length - 1].w }; sp += 6; h++;
        }
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); const off = Math.max(0, st.length - 8) * 28; st.forEach((b, i) => w.box(b.x, 360 - i * 28 + off, b.w, 26, `hsl(${i * 25},70%,55%)`)); w.box(cur.x, 360 - st.length * 28 + off, cur.w, 26, '#fff'); },
      pub() { return { x: cur.x + cur.w / 2, y: 360 - st.length * 28 + Math.max(0, st.length - 8) * 28, e: '🧱' }; }
    };
  });

  reg('fruit-slicer', 'Fruit Slicer', '🍉', A, 'Schneide Früchte mit der Maus durch – Bomben meiden!', 'Maustaste halten und wischen', { dur: 45 }, w => {
    let it = [], nx = 0.3, trail = [], lives = 3;
    return {
      step(dt) {
        nx -= dt; if (nx <= 0) { const bad = w.rnd() < 0.2; it.push({ x: w.r(80, 560), y: 420, vx: w.r(-90, 90), vy: w.r(-560, -430), bad, e: bad ? '💣' : w.pick(['🍉', '🍊', '🍎', '🍍', '🥝']) }); nx = Math.max(0.28, 0.7 - w.t * 0.01); }
        if (w.inp.down) { trail.push({ x: w.inp.x, y: w.inp.y, t: 0.25 }); for (const o of it) if (!o.d) { const d = Math.hypot(o.x - w.inp.x, o.y - w.inp.y), d2 = Math.hypot(o.x - w.inp.lx, o.y - w.inp.ly); if (d < 34 || d2 < 34) { o.d = 1; if (o.bad) { w.score = Math.max(0, w.score - 10); if (--lives <= 0) w.die(); } else w.add(1); } } }
        for (const t of trail) t.t -= dt; trail = trail.filter(t => t.t > 0);
        for (const o of it) { o.vy += 700 * dt; o.x += o.vx * dt; o.y += o.vy * dt; if (o.y > 430 && o.vy > 0 && !o.d && !o.bad) { o.d = 1; lives--; if (lives <= 0) w.die(); } } it = it.filter(o => !o.d && o.y < 440);
      },
      draw() { w.bg('#3a2a1a', '#6b4a2b'); for (const o of it) w.e(o.e, o.x, o.y, 46); w.g.strokeStyle = '#fff'; w.g.lineWidth = 4; w.g.beginPath(); trail.forEach((t, i) => i ? w.g.lineTo(t.x, t.y) : w.g.moveTo(t.x, t.y)); w.g.stroke(); w.tx('❤️'.repeat(Math.max(0, lives)), 320, 16, 14); },
      pub() { return { x: w.inp.x, y: w.inp.y, e: '🔪' }; }
    };
  });

  reg('piano-tiles', 'Piano Tiles', '🎹', A, 'Tippe nur die schwarzen Kacheln – es wird immer schneller!', 'Tasten D F J K oder tippe die Spalte', { dur: 45 }, w => {
    let rows = [], sp = 200, y0 = 0;
    const gen = () => { while (rows.length < 6) rows.push(w.ri(0, 4)); };
    gen();
    const hitLane = l => { if (l === rows[0]) { rows.shift(); y0 -= 100; w.add(1); gen(); } else w.die(); };
    return {
      step(dt) {
        y0 += sp * dt; sp += 5 * dt; const e = w.inp.e;
        if (e.d) hitLane(0); else if (e.f) hitLane(1); else if (e.j) hitLane(2); else if (e.k) hitLane(3);
        else if (w.inp.tap) hitLane(w.clamp(Math.floor((w.inp.tap.x - 120) / 100), 0, 3));
        if (y0 > 100) w.die();
      },
      draw() { w.bg('#222', '#222'); w.box(120, 0, 400, 400, '#f2f2f2'); for (let i = 1; i < 4; i++) w.box(120 + i * 100 - 1, 0, 2, 400, '#bbb'); rows.forEach((l, i) => w.box(120 + l * 100 + 2, 300 - i * 100 + y0 + 2, 96, 96, i === 0 ? '#111' : '#333')); w.tx('D   F   J   K', 320, 390, 12, '#888'); },
      pub() { return { x: 320, y: 360, e: '🎹' }; }
    };
  });

  reg('pop-the-lock', 'Pop the Lock', '🔒', A, 'Drücke genau dann, wenn der Zeiger den roten Punkt trifft.', 'Leertaste / Klick', { dur: 60 }, w => {
    let a = 0, dir = 1, sp = 3, tg = w.r(1, 6);
    const dist = () => Math.abs(Math.atan2(Math.sin(a - tg), Math.cos(a - tg)));
    return {
      step(dt) {
        a += dir * sp * dt;
        if (flap(w)) { if (dist() < 0.3) { w.add(1); dir *= -1; sp = Math.min(7, sp + 0.15); tg = a + dir * w.r(1.2, 3.5); } else w.die(); }
        else if ((a - tg) * dir > 0.4 && dist() > 0.4) w.die();
      },
      draw() { w.bg('#10182f', '#1d2b53'); w.g.strokeStyle = '#fff'; w.g.lineWidth = 6; w.g.beginPath(); w.g.arc(320, 200, 110, 0, 7); w.g.stroke(); w.circ(320 + Math.cos(tg) * 110, 200 + Math.sin(tg) * 110, 14, '#ff5d6c'); w.g.strokeStyle = '#ffd166'; w.g.lineWidth = 5; w.g.beginPath(); w.g.moveTo(320, 200); w.g.lineTo(320 + Math.cos(a) * 110, 200 + Math.sin(a) * 110); w.g.stroke(); w.tx(Math.floor(w.score) + '', 320, 200, 40); },
      pub() { return { x: 320 + Math.cos(a) * 110, y: 200 + Math.sin(a) * 110, e: '🔑' }; }
    };
  });

  reg('knife-hit', 'Knife Hit', '🔪', A, 'Wirf Messer in den drehenden Baumstamm – triff kein anderes Messer!', 'Leertaste / Klick = werfen', { dur: 60 }, w => {
    let rot = 0, sp = 2, ks = [], fly = null, lv = 1, left = 5;
    const reset = () => { ks = []; for (let i = 0; i < Math.min(4, lv); i++) ks.push(w.r(0, 6.28)); sp = (w.rnd() < 0.5 ? -1 : 1) * (1.8 + lv * 0.25); left = 5 + lv; };
    reset();
    return {
      step(dt) {
        rot += sp * dt; if (!fly && flap(w)) fly = { y: 360 };
        if (fly) {
          fly.y -= 900 * dt;
          if (fly.y <= 250) {
            const a = ((Math.PI / 2 - rot) % 6.2832 + 6.2832) % 6.2832;
            if (ks.some(k => { const d = Math.abs(k - a); return Math.min(d, 6.2832 - d) < 0.26; })) { w.die(); return; }
            ks.push(a); w.add(1); fly = null; if (--left <= 0) { lv++; w.add(10); reset(); }
          }
        }
      },
      draw() { w.bg('#3a2a1a', '#6b4a2b'); w.circ(320, 160, 80, '#8b5a2b'); w.circ(320, 160, 60, '#a06b34'); ks.forEach(k => { const a = k + rot; w.g.save(); w.g.translate(320 + Math.cos(a) * 80, 160 + Math.sin(a) * 80); w.g.rotate(a - Math.PI / 2); w.e('🔪', 0, 18, 30); w.g.restore(); }); w.e('🔪', 320, fly ? fly.y : 360, 34); w.tx('Noch ' + left, 580, 20, 14); },
      pub() { return { x: 320, y: 360, e: '🔪' }; }
    };
  });

  reg('balance-beam', 'Balance Beam', '⚖️', A, 'Halte die Wippe im Gleichgewicht – der Wind wird stärker!', '← → gegenlenken', { dur: 60 }, w => {
    let a = 0, va = 0, wind = 0, nx = 0;
    return {
      step(dt) {
        nx -= dt; if (nx <= 0) { wind = w.r(-1, 1) * (0.8 + w.t * 0.03); nx = w.r(0.6, 1.5); }
        va += (wind * 1.1 + a * 1.6 + dirX(w) * -3.2 + (w.inp.down ? (w.inp.x < 320 ? 3.2 : -3.2) * -1 : 0)) * dt; va *= 0.995; a += va * dt; w.score += dt * 10; if (Math.abs(a) > 1.0) w.die();
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); w.g.save(); w.g.translate(320, 250); w.g.rotate(a); w.box(-200, -6, 400, 12, '#8d6e63'); w.e('🧍', 0, -30, 44); w.g.restore(); w.tx('💨 ' + (wind > 0 ? '→' : '←').repeat(1 + Math.floor(Math.abs(wind))), 320, 40, 22); w.e('🔺', 320, 275, 40); },
      pub() { return { x: 320 + a * 160, y: 220, e: '🧍' }; }
    };
  });
})();
