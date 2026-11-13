/* Spiele 66–86: Echte Mehrspieler-Interaktion – Brettspiele (Zug um Zug) und Echtzeit-Duelle/Arenen. */
(function () {
  'use strict';
  const B = 'Brettspiel', V = 'Versus', K = (w, n) => w.inp.k[n] ? 1 : 0;
  const clone = o => JSON.parse(JSON.stringify(o));
  const hue = n => { let h = 0; for (const c of n) h = (h * 33 + c.charCodeAt(0)) % 360; return h; };

  /* ---------- Zug-um-Zug-Gerüst: Platz 0 und 1 spielen, alle anderen schauen zu; allein → Computer ---------- */
  function turn(w, o) {
    let done = false, bt = 0, lock = false, sent = false;
    const my = w.seat, names = w.roster, absent = s => !names[s] || !w.live().includes(names[s]);
    function apply(inp, seat) {
      const s = w.kv.st, ns = o.move(clone(s), seat, inp); if (!ns) return false;
      ns.turn = ns.extra ? seat : 1 - seat; delete ns.extra;
      const r = o.check(ns); if (r >= 0) { ns.over = true; ns.win = r; }
      lock = true; w.set('st', ns); return true;
    }
    return {
      noGhost: true,
      kv() { lock = false; },
      step(dt) {
        const s = w.kv.st;
        if (!s) { if (!sent && (my === 0 || (my === 1 && absent(0)))) { sent = true; w.set('st', Object.assign(o.init(w), { turn: 0, over: false, win: -1 })); } return; }
        if (s.over) { if (!done) { done = true; w.score = (my < 0 || my > 1) ? 0 : s.win === my ? 100 : s.win === 2 ? 50 : 10; w.finish(); } return; }
        if (lock) return;
        if (s.turn === my) { if (w.inp.tap) { const i = o.click(s, w.inp.tap, my); if (i != null) apply(i, my); } bt = 0; }
        else if ((my === 0 || my === 1) && absent(s.turn)) { bt += dt; if (bt > 0.7) { bt = 0; const m = o.moves(s, s.turn); if (m.length) apply(m[Math.floor(Math.random() * m.length)], s.turn); } }
      },
      draw() {
        w.bg('#10182f', '#1d2b53'); const s = w.kv.st;
        const opp = names[1 - my] && my >= 0 && my < 2 ? names[1 - my] : null;
        if (!s) { w.tx('Warte auf Spielstart…', 320, 200, 20); return; }
        o.draw(s, my);
        const t = s.over ? (s.win === 2 ? 'Unentschieden!' : s.win === my ? '🏆 Du hast gewonnen!' : my > 1 || my < 0 ? `${names[s.win]} hat gewonnen` : 'Verloren…') : (my > 1 || my < 0) ? `Zuschauer · ${names[s.turn] || 'Computer'} ist dran` : s.turn === my ? '👉 Du bist dran' : `${names[s.turn] || '🤖 Computer'} denkt nach…`;
        w.tx(t, 320, 18, 18, s.over ? '#ffe9a8' : '#fff'); w.tx(`${names[0] || '?'}  vs  ${names[1] || '🤖 Computer'}`, 320, 386, 12, '#9aa6c9');
      },
      pub() { return {}; }
    };
  }
  const lines = (n, k) => { const L = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const cells = []; for (let i = 0; i < k; i++) { const rr = r + dr * i, cc = c + dc * i; if (rr < 0 || cc < 0 || rr >= n || cc >= n) break; cells.push(rr * n + cc); } if (cells.length === k) L.push(cells); } return L; };

  reg('tic-tac-toe', 'Tic Tac Toe', '❌', B, 'Der Klassiker gegen einen echten Mitspieler (allein: gegen den Computer).', 'Klicke auf ein freies Feld', { dur: 90, max: 6 }, w => {
    const L = lines(3, 3);
    return turn(w, {
      init: () => ({ b: Array(9).fill(-1) }), moves: s => s.b.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0),
      click: (s, t) => { const c = Math.floor((t.x - 170) / 100), r = Math.floor((t.y - 70) / 100); const i = r * 3 + c; return c >= 0 && c < 3 && r >= 0 && r < 3 && s.b[i] < 0 ? i : null; },
      move: (s, seat, i) => { s.b[i] = seat; return s; },
      check: s => { for (const l of L) if (s.b[l[0]] >= 0 && l.every(i => s.b[i] === s.b[l[0]])) return s.b[l[0]]; return s.b.every(v => v >= 0) ? 2 : -1; },
      draw: s => { w.g.strokeStyle = '#fff'; w.g.lineWidth = 4; for (let i = 1; i < 3; i++) { w.g.beginPath(); w.g.moveTo(170 + i * 100, 70); w.g.lineTo(170 + i * 100, 370); w.g.moveTo(170, 70 + i * 100); w.g.lineTo(470, 70 + i * 100); w.g.stroke(); } s.b.forEach((v, i) => { if (v >= 0) w.e(v ? '⭕' : '❌', 170 + (i % 3) * 100 + 50, 70 + Math.floor(i / 3) * 100 + 50, 60); }); }
    });
  });

  reg('connect-four', 'Vier gewinnt', '🔴', B, 'Bringe vier Steine in eine Reihe, bevor dein Gegner es tut.', 'Klicke auf die Spalte', { dur: 120, max: 6 }, w => {
    const L2 = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const cells = []; for (let i = 0; i < 4; i++) { const rr = r + dr * i, cc = c + dc * i; if (rr < 0 || cc < 0 || rr >= 6 || cc >= 7) break; cells.push(rr * 7 + cc); } if (cells.length === 4) L2.push(cells); }
    return turn(w, {
      init: () => ({ b: Array(42).fill(-1) }), moves: s => [0, 1, 2, 3, 4, 5, 6].filter(c => s.b[c] < 0),
      click: (s, t) => { const c = Math.floor((t.x - 131) / 54); return c >= 0 && c < 7 && s.b[c] < 0 ? c : null; },
      move: (s, seat, c) => { for (let r = 5; r >= 0; r--) if (s.b[r * 7 + c] < 0) { s.b[r * 7 + c] = seat; return s; } return null; },
      check: s => { for (const l of L2) if (s.b[l[0]] >= 0 && l.every(i => s.b[i] === s.b[l[0]])) return s.b[l[0]]; return s.b.every(v => v >= 0) ? 2 : -1; },
      draw: s => { w.box(125, 34, 388, 330, '#1e4fd8'); s.b.forEach((v, i) => w.circ(158 + (i % 7) * 54, 62 + Math.floor(i / 7) * 54, 22, v < 0 ? '#10182f' : v ? '#fdd835' : '#e53935')); }
    });
  });

  reg('gomoku', 'Gomoku', '⚫', B, 'Fünf in einer Reihe gewinnt – das Strategiespiel auf dem Brett.', 'Klicke auf einen Kreuzungspunkt', { dur: 180, max: 6 }, w => {
    const N = 13, L = lines(N, 5);
    return turn(w, {
      init: () => ({ b: Array(N * N).fill(-1) }), moves: s => s.b.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0),
      click: (s, t) => { const c = Math.round((t.x - 152) / 28), r = Math.round((t.y - 32) / 28); const i = r * N + c; return c >= 0 && c < N && r >= 0 && r < N && s.b[i] < 0 ? i : null; },
      move: (s, seat, i) => { s.b[i] = seat; return s; },
      check: s => { for (const l of L) if (s.b[l[0]] >= 0 && l.every(i => s.b[i] === s.b[l[0]])) return s.b[l[0]]; return s.b.every(v => v >= 0) ? 2 : -1; },
      draw: s => { w.box(132, 12, 380, 372, '#d7b377'); w.g.strokeStyle = '#6b4a2b'; w.g.lineWidth = 1; for (let i = 0; i < N; i++) { w.g.beginPath(); w.g.moveTo(152 + i * 28, 32); w.g.lineTo(152 + i * 28, 32 + 12 * 28); w.g.moveTo(152, 32 + i * 28); w.g.lineTo(152 + 12 * 28, 32 + i * 28); w.g.stroke(); } s.b.forEach((v, i) => { if (v >= 0) w.circ(152 + (i % N) * 28, 32 + Math.floor(i / N) * 28, 12, v ? '#f5f5f5' : '#111'); }); }
    });
  });

  reg('nim-stones', 'Nim', '🪨', B, 'Nimm Steine von einem Haufen – wer den letzten Stein nimmt, gewinnt!', 'Klicke einen Stein: er und alle rechts davon werden genommen', { dur: 120, max: 6 }, w => turn(w, {
    init: () => ({ h: [3, 4, 5, 6] }), moves: s => { const m = []; s.h.forEach((n, h) => { for (let k = 0; k < n; k++) m.push({ h, k }); }); return m; },
    click: (s, t) => { const h = Math.floor((t.y - 60) / 70), k = Math.floor((t.x - 170) / 48); return h >= 0 && h < 4 && k >= 0 && k < s.h[h] ? { h, k } : null; },
    move: (s, seat, m) => { s.h[m.h] = m.k; return s; }, check: s => s.h.every(n => !n) ? 1 - s.turn : -1,
    draw: s => { s.h.forEach((n, h) => { for (let k = 0; k < n; k++) w.e('🪨', 170 + k * 48 + 24, 95 + h * 70, 38); }); }
  }));

  reg('mancala', 'Mancala', '🫘', B, 'Verteile Bohnen, sammle sie in deinem Speicher und schlage Bohnen deines Gegners.', 'Klicke eine deiner Mulden (unten: Spieler 1, oben: Spieler 2)', { dur: 180, max: 6 }, w => turn(w, {
    init: () => ({ p: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0] }),
    moves: (s, seat) => { const r = seat ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5]; return r.filter(i => s.p[i] > 0); },
    click: (s, t, seat) => { const col = Math.floor((t.x - 130) / 66); if (col < 0 || col > 5) return null; const p = seat === 0 ? (t.y > 215 ? col : -1) : (t.y < 175 ? 12 - col : -1); return p >= 0 && s.p[p] > 0 ? p : null; },
    move: (s, seat, p0) => {
      const own = seat ? 13 : 6, skip = seat ? 6 : 13; let n = s.p[p0], i = p0; s.p[p0] = 0;
      while (n > 0) { i = (i + 1) % 14; if (i === skip) continue; s.p[i]++; n--; }
      const mine = seat ? i >= 7 && i <= 12 : i <= 5;
      if (i === own) s.extra = true; else if (mine && s.p[i] === 1 && s.p[12 - i] > 0) { s.p[own] += s.p[12 - i] + 1; s.p[i] = 0; s.p[12 - i] = 0; }
      return s;
    },
    check: s => { const a = s.p.slice(0, 6).every(v => !v), b = s.p.slice(7, 13).every(v => !v); if (!a && !b) return -1; for (let i = 0; i < 6; i++) { s.p[6] += s.p[i]; s.p[i] = 0; s.p[13] += s.p[7 + i]; s.p[7 + i] = 0; } return s.p[6] > s.p[13] ? 0 : s.p[13] > s.p[6] ? 1 : 2; },
    draw: s => { w.box(30, 80, 580, 240, '#8d5a2b'); for (let i = 0; i < 6; i++) { w.circ(163 + i * 66, 250, 30, '#5d3a1a'); w.tx(s.p[i] + '', 163 + i * 66, 250, 22); w.circ(163 + i * 66, 140, 30, '#5d3a1a'); w.tx(s.p[12 - i] + '', 163 + i * 66, 140, 22); } w.box(560, 110, 44, 180, '#5d3a1a'); w.tx(s.p[6] + '', 582, 200, 22, '#ffe9a8'); w.box(36, 110, 44, 180, '#5d3a1a'); w.tx(s.p[13] + '', 58, 200, 22, '#ffe9a8'); }
  }));

  reg('rock-paper-scissors', 'Schere Stein Papier', '✂️', B, 'Wer gewinnt zuerst drei Runden? Beide wählen gleichzeitig.', 'Klick auf Stein · Papier · Schere (oder Tasten 1–3)', { dur: 90, max: 6 }, w => {
    const my = w.seat, E = ['🪨', '📄', '✂️']; let rd = 0, wins = [0, 0], show = 0, res = '', chosen = false, resolved = -1;
    const abs = s => !w.roster[s] || !w.live().includes(w.roster[s]);
    const key = (r, s) => `r${r}s${s}`;
    return {
      noGhost: true,
      step(dt) {
        if (my < 0 || my > 1) return;
        if (show > 0) { show -= dt; if (show <= 0) { rd++; chosen = false; if (wins[0] >= 3 || wins[1] >= 3 || rd >= 7) { w.score = wins[my] * 30 + (wins[my] > wins[1 - my] ? 40 : 0); w.finish(); } } return; }
        if (!chosen) { let c = -1; for (let k = 0; k < 3; k++) if (w.inp.e[String(k + 1)]) c = k; const t = w.inp.tap; if (t && t.y > 220 && t.y < 320) c = w.clamp(Math.floor((t.x - 140) / 120), 0, 2); if (c >= 0) { w.set(key(rd, my), c); chosen = true; } }
        if (abs(1 - my) && w.kv[key(rd, 1 - my)] == null && chosen) w.set(key(rd, 1 - my), Math.floor(Math.random() * 3));
        const a = w.kv[key(rd, 0)], b = w.kv[key(rd, 1)];
        if (a != null && b != null && resolved !== rd) { resolved = rd; const r = a === b ? 2 : (a - b + 3) % 3 === 1 ? 0 : 1; if (r < 2) wins[r]++; res = r === 2 ? 'Unentschieden' : r === my ? 'Punkt für dich!' : 'Punkt für den Gegner'; show = 1.6; }
      },
      draw() {
        w.bg('#10182f', '#1d2b53'); w.tx(`${wins[my < 0 ? 0 : my] || 0} : ${wins[my < 0 ? 1 : 1 - my] || 0}`, 320, 60, 44);
        const a = w.kv[key(rd, 0)], b = w.kv[key(rd, 1)];
        if (show > 0 && a != null) { w.e(E[my === 1 ? b : a], 220, 160, 70); w.e(E[my === 1 ? a : b], 420, 160, 70); w.tx(res, 320, 200, 22, '#ffe9a8'); }
        else { w.tx(chosen ? 'Warte auf den Gegner…' : `Runde ${rd + 1} – wähle!`, 320, 120, 20); E.forEach((e, k) => { w.box(140 + k * 120 + 5, 230, 100, 80, chosen ? '#333' : '#3b5bdb'); w.e(e, 140 + k * 120 + 55, 270, 50); }); }
        w.tx(`${w.roster[0] || '?'} vs ${w.roster[1] || '🤖 Computer'}`, 320, 380, 12, '#9aa6c9');
      },
      pub() { return {}; }
    };
  });

  reg('pong-duell', 'Pong Duell', '🏓', V, 'Zwei Spieler, ein Ball: wer zuerst 5 Punkte hat, gewinnt! (Allein: Computer.)', 'Maus oder ↑ ↓', { dur: 120, max: 6 }, w => {
    const my = w.seat, p = [200, 200], sc = [0, 0]; let ball = { x: 320, y: 200, vx: 260, vy: w.r(-140, 140) }, sd = 0, bd = 0, over = false, pause = 0.8;
    const side = n => w.roster.indexOf(n);
    return {
      noGhost: true,
      net(ev, from) { const s = side(from); if (ev.p != null && s >= 0 && s !== my) p[s] = ev.p; if (ev.b && s === 0 && my !== 0) { ball = ev.b; sc[0] = ev.s0; sc[1] = ev.s1; } },
      step(dt) {
        if (my === 0 || my === 1) { p[my] += K(w, 'down') * 420 * dt - K(w, 'up') * 420 * dt; if (!K(w, 'up') && !K(w, 'down')) p[my] += (w.inp.y - p[my]) * Math.min(1, dt * 14); p[my] = w.clamp(p[my], 40, 360); sd -= dt; if (sd <= 0) { sd = 0.033; w.send({ p: p[my] }); } }
        if (my === 0) {
          if (!w.live().includes(w.roster[1] || '')) p[1] += w.clamp(ball.y - p[1], -230 * dt, 230 * dt);
          pause -= dt; if (pause <= 0) { ball.x += ball.vx * dt; ball.y += ball.vy * dt; }
          if (ball.y < 10 || ball.y > 390) { ball.vy *= -1; ball.y = w.clamp(ball.y, 10, 390); }
          for (const s of [0, 1]) { const px = s ? 610 : 30; if (Math.abs(ball.x - px) < 14 && Math.abs(ball.y - p[s]) < 46 && (s ? ball.vx > 0 : ball.vx < 0)) { ball.vx = -ball.vx * 1.06; ball.vy = (ball.y - p[s]) * 5; } }
          if (ball.x < -10 || ball.x > 650) { sc[ball.x < 0 ? 1 : 0]++; ball = { x: 320, y: 200, vx: ball.x < 0 ? 260 : -260, vy: w.r(-140, 140) }; pause = 0.8; }
          bd -= dt; if (bd <= 0) { bd = 0.033; w.send({ b: ball, s0: sc[0], s1: sc[1] }); }
        }
        if (!over && (sc[0] >= 5 || sc[1] >= 5)) { over = true; const win = sc[0] >= 5 ? 0 : 1; w.score = my < 0 || my > 1 ? 0 : sc[my] * 10 + (win === my ? 50 : 0); w.finish(); }
      },
      draw() { w.bg('#0b1226', '#1d2b53'); for (let y = 10; y < 400; y += 30) w.box(318, y, 4, 16, '#ffffff44'); w.box(20, p[0] - 40, 12, 80, '#4f8cff'); w.box(608, p[1] - 40, 12, 80, '#ff5d6c'); w.e('🎾', ball.x, ball.y, 22); w.tx(sc[0] + '', 270, 40, 40); w.tx(sc[1] + '', 370, 40, 40); w.tx(`${w.roster[0] || '?'}`, 90, 385, 12, '#9aa6c9'); w.tx(`${w.roster[1] || '🤖'}`, 550, 385, 12, '#9aa6c9'); },
      pub() { return {}; }
    };
  });

  /* ---------- Echtzeit-Arenen ---------- */
  const bump = (w, me, R) => { for (const o of Object.values(w.others)) { if (o.a === false || typeof o.x !== 'number' || o.vx == null) continue; const dx = me.x - o.x, dy = me.y - o.y, d = Math.hypot(dx, dy) || 1; if (d < 2 * R) { const nx = dx / d, ny = dy / d, rel = (me.vx - o.vx) * nx + (me.vy - o.vy) * ny; me.x += nx * (2 * R - d) * 0.5; me.y += ny * (2 * R - d) * 0.5; if (rel < 0) { me.vx -= 1.9 * rel * nx; me.vy -= 1.9 * rel * ny; } else { me.vx += nx * 80; me.vy += ny * 80; } } } };

  reg('tag-arena', 'Tag Arena', '🏃', V, 'Fangen! Wer „es“ ist, jagt die anderen. Nicht-Fänger bekommen jede Sekunde Punkte.', 'Pfeiltasten/WASD oder Maus gedrückt halten', { dur: 60 }, w => {
    let x = w.r(60, 580), y = w.r(60, 340), cool = 0, bot = { x: 40, y: 40 };
    const itMe = () => w.kv.it === w.name;
    return {
      kv(k, v) { if (k === 'it' && v === w.name) cool = 1.6; },
      step(dt) {
        const solo = w.live().length < 2; if (!w.kv.it && !solo && w.seat === 0) w.set('it', w.roster[w.ri(0, w.roster.length)]);
        const sp = itMe() ? 215 : 200; x += K(w, 'right') * sp * dt - K(w, 'left') * sp * dt; y += K(w, 'down') * sp * dt - K(w, 'up') * sp * dt;
        if (w.inp.down) { const dx = w.inp.x - x, dy = w.inp.y - y, d = Math.hypot(dx, dy); if (d > 6) { x += dx / d * sp * dt; y += dy / d * sp * dt; } }
        x = w.clamp(x, 16, 624); y = w.clamp(y, 16, 384); cool -= dt;
        if (solo) { const dx = x - bot.x, dy = y - bot.y, d = Math.hypot(dx, dy) || 1, v = 120 + w.t * 2.5; bot.x += dx / d * v * dt; bot.y += dy / d * v * dt; if (d < 24) w.die(); w.score += dt; return; }
        if (itMe()) { if (cool <= 0) for (const [n, o] of Object.entries(w.others)) if (o.a !== false && typeof o.x === 'number' && w.hit(x, y, o.x, o.y, 28)) { w.set('it', n); w.add(5); cool = 99; break; } } else w.score += dt;
      },
      draw() { w.bg('#2b2b3a', '#454560'); if (w.live().length < 2) w.e('😈', bot.x, bot.y, 34); else { if (itMe()) w.circ(x, y, 22, '#ff5d6c88'); for (const [n, o] of Object.entries(w.others)) if (n === w.kv.it) w.circ(o.x, o.y, 22, '#ff5d6c88'); } w.e(itMe() ? '😈' : w.faceOf(w.name), x, y, 30); w.tx(w.live().length < 2 ? 'Allein: Entkomme dem Jäger!' : itMe() ? 'DU bist es – fang jemanden!' : `${w.kv.it || '…'} ist es!`, 320, 386, 14); },
      pub() { return { x, y, e: itMe() ? '😈' : w.faceOf(w.name), vx: 0, vy: 0 }; }
    };
  });

  reg('hot-potato', 'Hot Potato', '🥔', V, 'Die heiße Kartoffel! Gib sie durch Berührung weiter, bevor sie bei dir explodiert.', 'Pfeiltasten/WASD oder Maus – braucht mindestens 2 Spieler', { dur: 90 }, w => {
    let x = w.r(60, 580), y = w.r(60, 340), cool = 0, fuse = 0, wait = 0;
    const out = () => w.kv.out || [], holder = () => w.kv.pot && w.kv.pot.h, aliveNames = () => w.live().filter(n => !out().includes(n));
    return {
      kv(k, v) { if (k === 'pot' && v.h === w.name) { fuse = v.f; cool = 1.2; } },
      step(dt) {
        if (out().includes(w.name)) { w.die(); return; }
        const al = aliveNames();
        if (!w.kv.pot && w.seat === 0 && al.length >= 2) w.set('pot', { h: al[Math.floor(Math.random() * al.length)], f: 14 });
        x += K(w, 'right') * 200 * dt - K(w, 'left') * 200 * dt; y += K(w, 'down') * 200 * dt - K(w, 'up') * 200 * dt;
        if (w.inp.down) { const dx = w.inp.x - x, dy = w.inp.y - y, d = Math.hypot(dx, dy); if (d > 6) { x += dx / d * 200 * dt; y += dy / d * 200 * dt; } }
        x = w.clamp(x, 16, 624); y = w.clamp(y, 16, 384); cool -= dt; w.score += dt;
        if (holder() === w.name) {
          fuse -= dt;
          if (cool <= 0) for (const [n, o] of Object.entries(w.others)) if (!out().includes(n) && o.a !== false && w.hit(x, y, o.x, o.y, 28)) { w.set('pot', { h: n, f: fuse }); cool = 99; break; }
          if (fuse <= 0) { const rest = al.filter(n => n !== w.name); w.set('out', out().concat(w.name)); if (rest.length) w.set('pot', { h: rest[Math.floor(Math.random() * rest.length)], f: 12 }); w.die(); }
        }
        if (al.length === 1 && al[0] === w.name && w.live().length > 1) { w.add(100); w.finish(); }
        if (out().length) w.score = Math.max(w.score, 0);
      },
      draw() { w.bg('#3a2a1a', '#6b4a2b'); for (const [n, o] of Object.entries(w.others)) if (n === holder() && !out().includes(n)) w.e('🥔', o.x, o.y - 26, 24); if (holder() === w.name) w.e('🥔', x, y - 26, 28); w.e(w.faceOf(w.name), x, y, 30); w.tx(w.live().length < 2 ? 'Warte auf Mitspieler…' : holder() === w.name ? `🔥 Du hast die Kartoffel! ${Math.max(0, fuse).toFixed(1)}s – gib sie weiter!` : `${holder() || '…'} hat die Kartoffel`, 320, 386, 14); },
      pub() { return { x, y, e: w.faceOf(w.name) }; }
    };
  });

  reg('sumo-push', 'Sumo Push', '🤼', V, 'Schubse die anderen aus dem Ring! Wer zuletzt drin bleibt, gewinnt.', 'Pfeiltasten/WASD oder Maus – Zusammenstöße schubsen', { dur: 60 }, w => {
    const me = { x: 320 + Math.cos(w.seat * 1.3) * 90, y: 200 + Math.sin(w.seat * 1.3) * 90, vx: 0, vy: 0 };
    return {
      step(dt) {
        const ax = K(w, 'right') - K(w, 'left'), ay = K(w, 'down') - K(w, 'up'); me.vx += ax * 520 * dt; me.vy += ay * 520 * dt;
        if (w.inp.down) { const dx = w.inp.x - me.x, dy = w.inp.y - me.y, d = Math.hypot(dx, dy) || 1; me.vx += dx / d * 520 * dt; me.vy += dy / d * 520 * dt; }
        me.vx *= Math.pow(0.35, dt); me.vy *= Math.pow(0.35, dt); bump(w, me, 20); me.x += me.vx * dt; me.y += me.vy * dt; w.score = w.t;
        if (Math.hypot(me.x - 320, me.y - 200) > 175) w.die();
        const others = Object.values(w.others).filter(o => o.a !== false); if (w.live().length > 1 && w.t > 3 && !others.length) { w.add(100); w.finish(); }
      },
      draw() { w.bg('#3a2a1a', '#1a1410'); w.circ(320, 200, 180, '#d7b377'); w.circ(320, 200, 175, '#c49a5a'); for (const [n, o] of Object.entries(w.others)) if (o.a !== false) w.tx(n, o.x, o.y - 28, 10); w.e(w.faceOf(w.name), me.x, me.y, 36); },
      pub() { return { x: me.x, y: me.y, vx: me.vx, vy: me.vy, z: 36 }; }
    };
  });

  reg('king-of-the-hill', 'King of the Hill', '👑', V, 'Stehe in der wandernden Zone, um Punkte zu bekommen – und schubse die Rivalen hinaus!', 'Pfeiltasten/WASD oder Maus', { dur: 60 }, w => {
    const me = { x: 320 + Math.cos(w.seat * 1.3) * 130, y: 200 + Math.sin(w.seat * 1.3) * 100, vx: 0, vy: 0 };
    const zone = t => ({ x: 320 + Math.cos(t * 0.35) * 170, y: 200 + Math.sin(t * 0.5) * 110 });
    return {
      step(dt) {
        me.vx += (K(w, 'right') - K(w, 'left')) * 500 * dt; me.vy += (K(w, 'down') - K(w, 'up')) * 500 * dt;
        if (w.inp.down) { const dx = w.inp.x - me.x, dy = w.inp.y - me.y, d = Math.hypot(dx, dy) || 1; me.vx += dx / d * 500 * dt; me.vy += dy / d * 500 * dt; }
        me.vx *= Math.pow(0.3, dt); me.vy *= Math.pow(0.3, dt); bump(w, me, 18); me.x = w.clamp(me.x + me.vx * dt, 18, 622); me.y = w.clamp(me.y + me.vy * dt, 18, 382);
        const z = zone(w.t); if (w.hit(me.x, me.y, z.x, z.y, 60)) w.score += dt * 10;
      },
      draw() { w.bg('#10182f', '#1d2b53'); const z = zone(w.t); w.circ(z.x, z.y, 60, '#ffd16655'); w.g.strokeStyle = '#ffd166'; w.g.lineWidth = 3; w.g.beginPath(); w.g.arc(z.x, z.y, 60, 0, 7); w.g.stroke(); w.e('👑', z.x, z.y, 30); w.e(w.faceOf(w.name), me.x, me.y, 34); },
      pub() { return { x: me.x, y: me.y, vx: me.vx, vy: me.vy, z: 34 }; }
    };
  });

  reg('orb-eater', 'Orb Eater', '🫧', V, 'Friss Kugeln und wachse – größere Spieler können dich verschlingen!', 'Maus bewegen (Pfeiltasten gehen auch)', { dur: 90 }, w => {
    let x = w.r(60, 580), y = w.r(60, 340), r = 14, orbs = []; const eaten = new Set();
    for (let i = 0; i < 60; i++) orbs.push({ x: w.r(10, 630), y: w.r(10, 390), c: w.ri(0, 360) });
    return {
      noGhost: true,
      step(dt) {
        const sp = 190 / Math.sqrt(r / 14); if (K(w, 'left') || K(w, 'right') || K(w, 'up') || K(w, 'down')) { x += (K(w, 'right') - K(w, 'left')) * sp * dt; y += (K(w, 'down') - K(w, 'up')) * sp * dt; } else { const dx = w.inp.x - x, dy = w.inp.y - y, d = Math.hypot(dx, dy); if (d > 4) { x += dx / d * Math.min(sp, d * 4) * dt; y += dy / d * Math.min(sp, d * 4) * dt; } }
        x = w.clamp(x, r, 640 - r); y = w.clamp(y, r, 400 - r);
        for (let i = orbs.length - 1; i >= 0; i--) if (w.hit(x, y, orbs[i].x, orbs[i].y, r + 3)) { orbs[i] = { x: w.r(10, 630), y: w.r(10, 390), c: orbs[i].c }; r = Math.sqrt(r * r + 18); w.add(1); }
        for (const [n, o] of Object.entries(w.others)) { if (o.a === false || typeof o.r !== 'number') continue; const d = Math.hypot(x - o.x, y - o.y); if (o.r > r * 1.15 && d < o.r * 0.8) { w.die(); return; } if (r > o.r * 1.15 && d < r * 0.8 && !eaten.has(n + Math.floor(w.t / 3))) { eaten.add(n + Math.floor(w.t / 3)); r = Math.sqrt(r * r + o.r * o.r * 0.6); w.add(Math.floor(o.r)); } }
      },
      draw() { w.bg('#0b1226', '#0b1226'); orbs.forEach(o => w.circ(o.x, o.y, 4, `hsl(${o.c},80%,60%)`)); for (const [n, o] of Object.entries(w.others)) if (o.a !== false && typeof o.r === 'number') { w.circ(o.x, o.y, o.r, `hsl(${hue(n)},70%,50%)`); w.tx(n, o.x, o.y, 11); } w.circ(x, y, r, '#4f8cff'); w.tx(w.name, x, y, 11); },
      pub() { return { x, y, r }; }
    };
  });

  reg('laser-arena', 'Laser Arena', '🔫', V, 'Top-Down-Schießerei: Triff andere Spieler (oder Zielscheiben, wenn du allein bist).', 'WASD/Pfeile bewegen · Maus zielen · Klick/Leertaste schießen', { dur: 60 }, w => {
    let x = w.r(60, 580), y = w.r(60, 340), bl = [], cd = 0, inv = 1.5, dead = 0, bots = []; for (let i = 0; i < 3; i++) bots.push({ x: w.r(60, 580), y: w.r(60, 340), a: w.r(0, 6.28) });
    const spawnB = (sx, sy, a, own) => bl.push({ x: sx, y: sy, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, t: 1.3, own });
    return {
      net(ev, from) { if (ev.s) spawnB(ev.s[0], ev.s[1], ev.s[2], from); if (ev.hit === w.name) { w.add(10); } },
      step(dt) {
        if (dead > 0) { dead -= dt; if (dead <= 0) { x = w.r(60, 580); y = w.r(60, 340); inv = 2; } return; }
        x += (K(w, 'right') - K(w, 'left')) * 200 * dt; y += (K(w, 'down') - K(w, 'up')) * 200 * dt; x = w.clamp(x, 14, 626); y = w.clamp(y, 14, 386); inv -= dt; cd -= dt;
        if ((w.inp.down || w.inp.k.space) && cd <= 0) { const a = Math.atan2(w.inp.y - y, w.inp.x - x); spawnB(x, y, a, w.name); w.send({ s: [x, y, a] }); cd = 0.3; }
        for (const b of bl) { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; if (b.own !== w.name && inv <= 0 && w.hit(b.x, b.y, x, y, 16)) { b.t = 0; w.send({ hit: b.own }); dead = 1.5; w.score = Math.max(0, w.score - 3); } else if (b.own === w.name) for (const t of bots) if (b.t > 0 && w.hit(b.x, b.y, t.x, t.y, 18)) { b.t = 0; w.add(5); t.x = w.r(60, 580); t.y = w.r(60, 340); } }
        bl = bl.filter(b => b.t > 0 && b.x > 0 && b.x < 640 && b.y > 0 && b.y < 400); for (const t of bots) { t.a += dt * 0.7; t.x = w.clamp(t.x + Math.cos(t.a) * 50 * dt, 20, 620); t.y = w.clamp(t.y + Math.sin(t.a) * 50 * dt, 20, 380); }
      },
      draw() { w.bg('#1a1a2e', '#16213e'); for (const t of bots) w.e('🎯', t.x, t.y, 30); for (const b of bl) w.circ(b.x, b.y, 4, b.own === w.name ? '#4cd98a' : '#ff5d6c'); if (dead <= 0) { w.g.globalAlpha = inv > 0 ? 0.5 : 1; w.e(w.faceOf(w.name), x, y, 30); w.g.globalAlpha = 1; } else w.tx('Respawn…', 320, 200, 24); w.g.strokeStyle = '#ffffff55'; w.g.beginPath(); w.g.arc(w.inp.x, w.inp.y, 8, 0, 7); w.g.stroke(); },
      pub() { return { x, y, a: dead <= 0 || undefined, z: 30 }; }
    };
  });

  reg('coin-rush', 'Coin Rush', '🪙', V, 'Sammle Münzen – wer eine zuerst anfasst, bekommt sie! Goldmünzen sind 5× wert.', 'Pfeiltasten/WASD oder Maus', { dur: 45 }, w => {
    let x = w.r(60, 580), y = w.r(60, 340); const gen = Array(10).fill(0), R = (i, g) => Platform.rngOf(i * 7919 + g * 104729 + w.round * 31 + 17), cpos = (i, g) => { const r = R(i, g); return { x: 30 + r() * 580, y: 40 + r() * 320, gold: r() < 0.15 }; };
    return {
      net(ev) { if (ev.c) { const [i, g] = ev.c; if (gen[i] === g) gen[i]++; } },
      step(dt) {
        x += (K(w, 'right') - K(w, 'left')) * 230 * dt; y += (K(w, 'down') - K(w, 'up')) * 230 * dt;
        if (w.inp.down) { const dx = w.inp.x - x, dy = w.inp.y - y, d = Math.hypot(dx, dy); if (d > 6) { x += dx / d * 230 * dt; y += dy / d * 230 * dt; } }
        x = w.clamp(x, 16, 624); y = w.clamp(y, 16, 384);
        for (let i = 0; i < 10; i++) { const c = cpos(i, gen[i]); if (w.hit(x, y, c.x, c.y, 26)) { w.send({ c: [i, gen[i]] }); w.add(c.gold ? 5 : 1); gen[i]++; } }
      },
      draw() { w.bg('#2b2b3a', '#454560'); for (let i = 0; i < 10; i++) { const c = cpos(i, gen[i]); w.e(c.gold ? '💰' : '🪙', c.x, c.y, c.gold ? 34 : 26); } w.e(w.faceOf(w.name), x, y, 30); },
      pub() { return { x, y, e: w.faceOf(w.name) }; }
    };
  });

  reg('territory-paint', 'Territory Paint', '🎨', V, 'Laufe über Felder und male sie in deiner Farbe – die anderen übermalen dich!', 'Pfeiltasten/WASD oder Maus', { dur: 60 }, w => {
    const C = 32, R = 20; let x = w.r(60, 580), y = w.r(60, 340), acc = 0;
    const owner = i => w.kv['t' + i];
    return {
      step(dt) {
        x += (K(w, 'right') - K(w, 'left')) * 220 * dt; y += (K(w, 'down') - K(w, 'up')) * 220 * dt;
        if (w.inp.down) { const dx = w.inp.x - x, dy = w.inp.y - y, d = Math.hypot(dx, dy); if (d > 6) { x += dx / d * 220 * dt; y += dy / d * 220 * dt; } }
        x = w.clamp(x, 10, 630); y = w.clamp(y, 10, 390); const i = Math.floor(y / 20) * C + Math.floor(x / 20); if (owner(i) !== w.name) w.set('t' + i, w.name);
        acc -= dt; if (acc <= 0) { acc = 0.2; let n = 0; for (let k = 0; k < C * R; k++) if (owner(k) === w.name) n++; w.score = n; }
      },
      draw() { w.bg('#10182f', '#10182f'); for (let i = 0; i < C * R; i++) { const o = owner(i); if (o) w.box((i % C) * 20, Math.floor(i / C) * 20, 20, 20, `hsl(${hue(o)},65%,${o === w.name ? 55 : 42}%)`); } w.e(w.faceOf(w.name), x, y, 26); },
      pub() { return { x, y, e: w.faceOf(w.name) }; }
    };
  });

  reg('tile-drop', 'Tile Drop', '🧊', V, 'Der Boden bricht weg! Jede Kachel zerfällt kurz nach dem Betreten – überlebe am längsten.', 'Pfeiltasten/WASD oder Maus', { dur: 90 }, w => {
    const C = 16, R = 10, T = 40; const st = Array(C * R).fill(0); // 0 ok, >0 Zerfall-Timer, -1 weg
    let x = 320, y = 200, auto = 2;
    const crack = i => { if (st[i] === 0) st[i] = 0.9; };
    return {
      net(ev) { if (ev.k != null) crack(ev.k); },
      step(dt) {
        x += (K(w, 'right') - K(w, 'left')) * 190 * dt; y += (K(w, 'down') - K(w, 'up')) * 190 * dt;
        if (w.inp.down) { const dx = w.inp.x - x, dy = w.inp.y - y, d = Math.hypot(dx, dy); if (d > 6) { x += dx / d * 190 * dt; y += dy / d * 190 * dt; } }
        x = w.clamp(x, 8, 632); y = w.clamp(y, 8, 392); const i = Math.floor(y / T) * C + Math.floor(x / T);
        if (st[i] === 0) { crack(i); w.send({ k: i }); }
        auto -= dt; if (auto <= 0) { crack(w.ri(0, C * R)); auto = Math.max(0.25, 1.8 - w.t * 0.02); }
        for (let k = 0; k < st.length; k++) if (st[k] > 0) { st[k] -= dt; if (st[k] <= 0) st[k] = -1; }
        if (st[i] === -1) w.die(); w.score = w.t;
      },
      draw() { w.bg('#3a0d0d', '#c0392b'); st.forEach((s, k) => { if (s === -1) return; w.box((k % C) * T + 1, Math.floor(k / C) * T + 1, T - 2, T - 2, s > 0 ? '#ff9800' : '#8ecae6'); }); w.e(w.faceOf(w.name), x, y, 28); },
      pub() { return { x, y, e: w.faceOf(w.name) }; }
    };
  });

  reg('red-light-green-light', 'Red Light Green Light', '🚦', V, 'Renne zur Ziellinie, aber nur bei Grün! Wer sich bei Rot bewegt, ist raus.', 'Pfeiltasten/WASD oder Maus gedrückt halten (↑ = vorwärts)', { dur: 75 }, w => {
    const sched = []; let tt = 0; while (tt < 200) { const g = w.r(2, 4.2), r = w.r(1.2, 2.6); sched.push([tt, tt + g, true]); sched.push([tt + g, tt + g + r, false]); tt += g + r; }
    let x = 60 + (w.seat < 0 ? 0 : w.seat) * 70 % 520, y = 360, lastMove = 0;
    const green = () => { for (const s of sched) if (w.t >= s[0] && w.t < s[1]) return s[2]; return true; };
    return {
      step(dt) {
        const dy = K(w, 'up') - K(w, 'down'), dx = K(w, 'right') - K(w, 'left'); let mv = dx || dy; let mx = dx * 150 * dt, my = -dy * 150 * dt;
        if (w.inp.down) { const ddx = w.inp.x - x, ddy = w.inp.y - y, d = Math.hypot(ddx, ddy); if (d > 6) { mx = ddx / d * 150 * dt; my = ddy / d * 150 * dt; mv = 1; } }
        if (mv && !green()) { lastMove += dt; if (lastMove > 0.25) { w.die(); return; } } else lastMove = 0;
        if (green() || !mv) { x = w.clamp(x + mx, 12, 628); y = w.clamp(y + my, 40, 380); }
        if (y <= 56) { w.score = 100 + Math.max(0, Math.floor(w.left)); w.finish(); } else w.score = (360 - y) / 4;
      },
      draw() { const gr = green(); w.bg(gr ? '#1b5e20' : '#7f1d1d', gr ? '#43a047' : '#c62828'); w.box(0, 56, 640, 4, '#fff'); w.e('🤖', 320, 30, 36); w.e(gr ? '🟢' : '🔴', 600, 30, 30); w.e(w.faceOf(w.name), x, y, 28); w.tx(gr ? 'GRÜN – lauf!' : 'ROT – STEHEN BLEIBEN!', 320, 386, 16); },
      pub() { return { x, y, e: w.faceOf(w.name) }; }
    };
  });

  reg('tug-of-war', 'Tug of War', '🪢', V, 'Tauziehen im Team: klicke/tippe so schnell du kannst! (Gerade Plätze links, ungerade rechts)', 'Leertaste oder Klick – so schnell wie möglich', { dur: 30 }, w => {
    let rope = 0, mine = 0, over = false; const team = n => w.roster.indexOf(n) % 2, mt = Math.max(0, w.seat) % 2;
    return {
      noGhost: true,
      net(ev, from) { if (ev.p) rope += team(from) === 0 ? -1 : 1; },
      step(dt) {
        if (w.inp.e.space || w.inp.tap) { rope += mt === 0 ? -1 : 1; mine++; w.add(1); w.send({ p: 1 }); }
        if (w.solo) rope += (Math.random() < dt * 3.5 ? 1 : 0) * (mt === 0 ? 1 : -1);
        if (!over && Math.abs(rope) >= 40) { over = true; const won = (rope < 0) === (mt === 0); w.add(won ? 100 : 0); w.finish(); }
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); w.box(60, 196, 520, 8, '#8d6e63'); const cx = 320 + rope * 5; w.e('🚩', cx, 180, 40); w.e('🧑‍🤝‍🧑', 60, 200, 56); w.e('🧑‍🤝‍🧑', 580, 200, 56); w.tx('Team Links', 80, 120, 14, '#223'); w.tx('Team Rechts', 560, 120, 14, '#223'); w.tx(`Du: Team ${mt === 0 ? 'Links ⬅' : 'Rechts ➡'}  · Züge ${mine}`, 320, 340, 18, '#223'); },
      pub() { return {}; }
    };
  });

  reg('cops-and-robbers', 'Cops & Robbers', '🚓', V, 'Räuber sammeln Beute, Polizisten schnappen sie! (Gerade Plätze = Polizei, ungerade = Räuber; allein: Räuber gegen Computer-Cop)', 'Pfeiltasten/WASD oder Maus gedrückt halten', { dur: 60 }, w => {
    const cop = w.seat >= 0 && w.seat % 2 === 0 && !w.solo; let x = w.r(60, 580), y = w.r(60, 340), jailed = false, loot = Array.from({ length: 8 }, () => ({ x: w.r(30, 610), y: w.r(40, 360) })), bot = { x: 40, y: 40 };
    return {
      net(ev) { if (ev.jail === w.name && !jailed) { jailed = true; w.die(); } if (ev.catch === w.name) w.add(20); },
      step(dt) {
        const sp = cop ? 212 : 200; x += (K(w, 'right') - K(w, 'left')) * sp * dt; y += (K(w, 'down') - K(w, 'up')) * sp * dt;
        if (w.inp.down) { const dx = w.inp.x - x, dy = w.inp.y - y, d = Math.hypot(dx, dy); if (d > 6) { x += dx / d * sp * dt; y += dy / d * sp * dt; } }
        x = w.clamp(x, 14, 626); y = w.clamp(y, 14, 386);
        if (!cop) { w.score += dt * 2; loot.forEach((l, i) => { if (w.hit(x, y, l.x, l.y, 24)) { w.add(10); loot[i] = { x: w.r(30, 610), y: w.r(40, 360) }; } }); if (w.solo) { const dx = x - bot.x, dy = y - bot.y, d = Math.hypot(dx, dy) || 1, v = 120 + w.t * 2; bot.x += dx / d * v * dt; bot.y += dy / d * v * dt; if (d < 24) w.die(); } }
        else for (const [n, o] of Object.entries(w.others)) { const idx = w.roster.indexOf(n); if (idx % 2 === 1 && o.a !== false && w.hit(x, y, o.x, o.y, 26)) { w.send({ jail: n }); w.add(20); o.a = false; } }
      },
      draw() { w.bg('#222a3a', '#364156'); if (!cop) loot.forEach(l => w.e('💰', l.x, l.y, 26)); if (w.solo) w.e('🚓', bot.x, bot.y, 34); for (const [n, o] of Object.entries(w.others)) if (o.a !== false) w.tx(w.roster.indexOf(n) % 2 === 0 ? '👮' : '🦹', o.x, o.y - 22, 14); w.e(cop ? '👮' : '🦹', x, y, 34); w.tx(cop ? '👮 Du bist Polizist: fang die Räuber!' : '🦹 Du bist Räuber: sammle Beute, flieh!', 320, 386, 14); },
      pub() { return { x, y, e: cop ? '👮' : '🦹' }; }
    };
  });

  const DW = ['HAUS', 'KATZE', 'SONNE', 'BAUM', 'AUTO', 'FISCH', 'BLUME', 'HUND', 'HERZ', 'MOND', 'BOOT', 'APFEL', 'STERN', 'FLUGZEUG', 'ELEFANT', 'BURG', 'DRACHE', 'PIZZA', 'ROBOTER', 'REGENBOGEN'];
  reg('draw-and-guess', 'Draw & Guess', '✏️', V, 'Einer zeichnet, alle anderen raten! Jede Runde ist ein anderer Spieler dran.', 'Zeichner: mit der Maus malen · Rater: Wort tippen + Enter', { dur: 75 }, w => {
    const word = w.pick(DW), drawer = w.roster[(w.round - 1) % Math.max(1, w.roster.length)] || w.name, me = drawer === w.name; let lines = [], guess = '', done = false, msg = '', col = '#000';
    const COLS = ['#000', '#e53935', '#1e88e5', '#43a047', '#fdd835'];
    return {
      noGhost: true,
      net(ev, from) { if (ev.s && from === drawer) lines.push(ev.s); if (ev.clr && from === drawer) lines = []; if (ev.ok && me) { w.add(20); msg = from + ' hat es erraten!'; } },
      step() {
        if (me) { if (w.inp.down && w.inp.x > 80) { const a = [w.inp.lx, w.inp.ly, w.inp.x, w.inp.y, col]; if (w.inp.lx !== w.inp.x || w.inp.ly !== w.inp.y) { lines.push(a); w.send({ s: a }); } } const t = w.inp.tap; if (t && t.x < 70) { const k = Math.floor(t.y / 50); if (k < 5) col = COLS[k]; else { lines = []; w.send({ clr: 1 }); } } if (w.solo) w.score = 0; return; }
        if (done) return; for (const c of w.inp.chars) { if (c === '\b') guess = guess.slice(0, -1); else if (/[a-z]/.test(c) && guess.length < 14) guess += c.toUpperCase(); }
        if (w.inp.e.enter) { if (guess === word) { done = true; w.add(20 + Math.ceil(w.left)); w.send({ ok: 1 }); msg = '✅ Richtig!'; } else { msg = 'Nein: ' + guess; guess = ''; } }
      },
      draw() { w.bg('#f5f5f5', '#f5f5f5'); w.box(0, 0, 70, 400, '#ddd'); lines.forEach(l => { w.g.strokeStyle = l[4]; w.g.lineWidth = 4; w.g.lineCap = 'round'; w.g.beginPath(); w.g.moveTo(l[0], l[1]); w.g.lineTo(l[2], l[3]); w.g.stroke(); }); if (me) { COLS.forEach((c, k) => w.box(10, 8 + k * 50, 50, 42, c)); w.tx('🗑', 35, 275, 28); w.tx(`Zeichne: ${word}`, 360, 16, 20, '#222'); } else { const hint = w.left < 25 ? word[0] + ' _'.repeat(word.length - 1) : '_ '.repeat(word.length); w.tx(`${drawer} zeichnet: ${hint}`, 360, 16, 18, '#222'); w.tx(done ? msg : (guess || 'Tippe dein Wort…') + (msg && !done ? '   ' + msg : ''), 360, 384, 18, '#1565c0'); } if (w.solo) w.tx('Warte auf Mitspieler zum Raten…', 360, 380, 14, '#777'); },
      pub() { return {}; }
    };
  });

  reg('bomber-arena', 'Bomber Arena', '💣', V, 'Lege Bomben, sprenge Blöcke und deine Gegner in die Luft!', 'Pfeile/WASD laufen · Leertaste = Bombe', { dur: 90 }, w => {
    const C = 15, R = 11, S = 36, OX = 50, OY = 2; const wall = (c, r) => c % 2 === 1 && r % 2 === 1;
    const blocks = new Set(); for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (!wall(c, r) && w.rnd() < 0.4 && !((c < 3 || c > C - 4) && (r < 3 || r > R - 4))) blocks.add(r * C + c);
    const corners = [[0, 0], [C - 1, R - 1], [C - 1, 0], [0, R - 1], [6, 0], [8, R - 1], [0, 5], [C - 1, 5]]; const sp = corners[Math.max(0, w.seat) % 8];
    let cx = sp[0], cy = sp[1], mv = 0, bombs = [], boom = [];
    const bl = (c, r) => c < 0 || r < 0 || c >= C || r >= R || wall(c, r) || blocks.has(r * C + c) || bombs.some(b => b.c === c && b.r === r && !(c === cx && r === cy));
    const explode = b => { const cells = [[b.c, b.r]]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= 2; k++) { const c = b.c + dx * k, r = b.r + dy * k; if (c < 0 || r < 0 || c >= C || r >= R || wall(c, r)) break; cells.push([c, r]); if (blocks.has(r * C + c)) { blocks.delete(r * C + c); if (b.o === w.name) w.add(2); break; } } boom.push({ cells, t: 0.4, o: b.o }); if (cells.some(([c, r]) => c === cx && r === cy) && w.alive) { w.send({ kill: b.o }); w.die(); } };
    return {
      net(ev, from) { if (ev.bomb) bombs.push({ c: ev.bomb[0], r: ev.bomb[1], t: 2, o: from }); if (ev.kill === w.name) w.add(50); },
      step(dt) {
        mv -= dt; if (mv <= 0) { let dx = K(w, 'right') - K(w, 'left'), dy = dx ? 0 : K(w, 'down') - K(w, 'up'); if (dx || dy) { if (!bl(cx + dx, cy + dy)) { cx += dx; cy += dy; } mv = 0.14; } }
        if (w.inp.e.space && !bombs.some(b => b.o === w.name && b.t > 0)) { bombs.push({ c: cx, r: cy, t: 2, o: w.name }); w.send({ bomb: [cx, cy] }); }
        for (const b of bombs) { b.t -= dt; if (b.t <= 0) explode(b); } bombs = bombs.filter(b => b.t > 0); for (const e of boom) e.t -= dt; boom = boom.filter(e => e.t > 0);
        for (const e of boom) if (e.cells.some(([c, r]) => c === cx && r === cy) && w.alive) { w.send({ kill: e.o }); w.die(); }
      },
      draw() { w.bg('#2e7d32', '#388e3c'); for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const x = OX + c * S, y = OY + r * S; if (wall(c, r)) w.box(x, y, S, S, '#455a64'); else if (blocks.has(r * C + c)) w.box(x + 1, y + 1, S - 2, S - 2, '#a1887f'); } for (const b of bombs) w.e('💣', OX + b.c * S + S / 2, OY + b.r * S + S / 2, 28); for (const e of boom) for (const [c, r] of e.cells) w.e('💥', OX + c * S + S / 2, OY + r * S + S / 2, 32); if (w.alive) w.e(w.faceOf(w.name), OX + cx * S + S / 2, OY + cy * S + S / 2, 28); },
      pub() { return { x: OX + cx * S + S / 2, y: OY + cy * S + S / 2, e: w.faceOf(w.name), z: 28 }; }
    };
  });
})();
