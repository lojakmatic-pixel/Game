/* Spiele 31–65: Denken, Geschick, Sport. Gleicher Seed = gleiche Aufgaben für alle Spieler im Raum. */
(function () {
  'use strict';
  const P = 'Puzzle', Q = 'Wissen', S = 'Sport', K = (w, n) => w.inp.k[n] ? 1 : 0;
  const WORDS = ['BANANE', 'FENSTER', 'ROBOTER', 'DRACHE', 'PIRAT', 'SCHATZ', 'WOLKE', 'RAKETE', 'KATZE', 'GITARRE', 'VULKAN', 'ZAUBERER', 'TRAKTOR', 'PINGUIN', 'DSCHUNGEL', 'MONSTER', 'SCHLOSS', 'KAKTUS', 'PLANET', 'EISBAER', 'FEUERWEHR', 'KOMET', 'LABYRINTH', 'TASCHE', 'BRUECKE', 'GESPENST', 'SCHOKOLADE', 'HUBSCHRAUBER', 'ELEFANT', 'KARUSSELL'];
  const grid = (w, n, cell, ox, oy) => { const t = w.inp.tap; return t ? { c: Math.floor((t.x - ox) / cell), r: Math.floor((t.y - oy) / cell), ok: t.x >= ox && t.y >= oy && Math.floor((t.x - ox) / cell) < n && Math.floor((t.y - oy) / cell) < n } : null; };

  reg('2048-blox', '2048 Blox', '🔢', P, 'Schiebe die Zahlen und verschmelze sie – gleiche Startkacheln für alle.', 'Pfeiltasten oder wischen', { dur: 120 }, w => {
    const g = Array(16).fill(0); let sx = 0, sy = 0;
    const add = () => { const e = []; g.forEach((v, i) => !v && e.push(i)); if (e.length) g[e[w.ri(0, e.length)]] = w.rnd() < 0.9 ? 2 : 4; };
    const can = () => g.some((v, i) => !v || (i % 4 < 3 && v === g[i + 1]) || (i < 12 && v === g[i + 4]));
    const slide = d => {
      let moved = false, pts = 0;
      for (let r = 0; r < 4; r++) {
        const idx = [0, 1, 2, 3].map(c => d < 2 ? r * 4 + c : c * 4 + r); if (d === 1 || d === 3) idx.reverse();
        const line = idx.map(i => g[i]).filter(v => v);
        for (let i = 0; i < line.length - 1; i++) if (line[i] === line[i + 1]) { line[i] *= 2; pts += line[i]; line.splice(i + 1, 1); }
        while (line.length < 4) line.push(0);
        idx.forEach((gi, k) => { if (g[gi] !== line[k]) moved = true; g[gi] = line[k]; });
      }
      if (moved) { w.add(pts); add(); if (!can()) w.die(); }
    };
    add(); add();
    return {
      step() {
        const e = w.inp.e; if (e.left) slide(0); else if (e.right) slide(1); else if (e.up) slide(2); else if (e.down) slide(3);
        if (w.inp.tap) { sx = w.inp.tap.x; sy = w.inp.tap.y; }
        if (w.inp.up) { const dx = w.inp.x - sx, dy = w.inp.y - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) > 30) { if (Math.abs(dx) > Math.abs(dy)) slide(dx < 0 ? 0 : 1); else slide(dy < 0 ? 2 : 3); } }
      },
      draw() { w.bg('#faf8ef', '#faf8ef'); w.box(120, 20, 360, 360, '#bbada0'); g.forEach((v, i) => { const x = 128 + (i % 4) * 88, y = 28 + Math.floor(i / 4) * 88; w.box(x, y, 80, 80, v ? `hsl(${40 - Math.log2(v) * 6},${50 + Math.log2(v) * 4}%,${80 - Math.log2(v) * 4}%)` : '#cdc1b4'); if (v) w.tx(v + '', x + 40, y + 40, v > 999 ? 24 : 32, v > 4 ? '#fff' : '#776e65'); }); },
      pub() { return {}; }
    };
  });

  reg('block-fall', 'Block Fall', '🟦', P, 'Das Klötzchen-Klassiker: Reihen füllen, Reihen löschen. Alle bekommen dieselben Steine.', '← → bewegen · ↑ drehen · ↓ schneller · Leertaste = fallen lassen', { dur: 120 }, w => {
    const SH = [[[0, 1], [1, 1], [2, 1], [3, 1]], [[0, 0], [0, 1], [1, 1], [2, 1]], [[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]]];
    const COL = ['#00e5ff', '#2962ff', '#ff9100', '#ffd600', '#00e676', '#d500f9', '#ff1744'];
    const b = Array.from({ length: 20 }, () => Array(10).fill(0)); let cur, px, py, ty = 0, lines = 0;
    const rot = c => { const my = Math.max(...c.map(p => p[1])); return c.map(p => [my - p[1], p[0]]); };
    const fits = (c, x, y) => c.every(p => { const xx = p[0] + x, yy = p[1] + y; return xx >= 0 && xx < 10 && yy < 20 && (yy < 0 || !b[yy][xx]); });
    const spawn = () => { const i = w.ri(0, 7); cur = { c: SH[i], k: i + 1 }; px = 3; py = -1; if (!fits(cur.c, px, py)) w.die(); };
    const lock = () => { cur.c.forEach(p => { if (p[1] + py >= 0) b[p[1] + py][p[0] + px] = cur.k; }); let n = 0; for (let r = 19; r >= 0; r--) if (b[r].every(v => v)) { b.splice(r, 1); b.unshift(Array(10).fill(0)); n++; r++; } lines += n; w.add([0, 100, 300, 500, 800][n]); spawn(); };
    spawn();
    return {
      step(dt) {
        const e = w.inp.e;
        if (e.left && fits(cur.c, px - 1, py)) px--; if (e.right && fits(cur.c, px + 1, py)) px++;
        if (e.up) { const r = rot(cur.c); if (fits(r, px, py)) cur.c = r; else if (fits(r, px - 1, py)) { cur.c = r; px--; } else if (fits(r, px + 1, py)) { cur.c = r; px++; } }
        if (e.space) { while (fits(cur.c, px, py + 1)) py++; lock(); ty = 0; return; }
        ty += dt * (w.inp.k.down ? 12 : Math.min(9, 1.8 + lines * 0.15)); while (ty >= 1) { ty--; if (fits(cur.c, px, py + 1)) py++; else { lock(); break; } }
      },
      draw() { w.bg('#0b1226', '#0b1226'); w.box(220, 0, 200, 400, '#111a33'); for (let r = 0; r < 20; r++) for (let c = 0; c < 10; c++) if (b[r][c]) w.box(220 + c * 20 + 1, r * 20 + 1, 18, 18, COL[b[r][c] - 1]); if (cur) cur.c.forEach(p => w.box(220 + (p[0] + px) * 20 + 1, (p[1] + py) * 20 + 1, 18, 18, COL[cur.k - 1])); w.tx('Reihen ' + lines, 540, 60, 16, '#fff'); },
      pub() { return {}; }
    };
  });

  reg('minesweeper', 'Minesweeper', '💣', P, 'Decke alle sicheren Felder auf – gleiches Minenfeld für alle.', 'Klick = aufdecken · F = Flaggen-Modus an/aus', { dur: 150 }, w => {
    const N = 9, M = 10, mine = Array(81).fill(0), st = Array(81).fill(0); // st: 0 zu, 1 offen, 2 Flagge
    const nb = i => { const r = [], x = i % N, y = Math.floor(i / N); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if ((dx || dy) && a >= 0 && b >= 0 && a < N && b < N) r.push(b * N + a); } return r; };
    const start = w.ri(0, 81), safe = new Set([start, ...nb(start)]); let n = 0; while (n < M) { const i = w.ri(0, 81); if (!mine[i] && !safe.has(i)) { mine[i] = 1; n++; } }
    const cnt = i => nb(i).filter(j => mine[j]).length; let flag = false, opened = 0;
    const open = i => { const q = [i]; while (q.length) { const j = q.pop(); if (st[j] === 1) continue; st[j] = 1; opened++; w.add(1); if (!cnt(j)) nb(j).forEach(k => { if (st[k] === 0) q.push(k); }); } };
    open(start);
    return {
      step() {
        if (w.inp.e.f) flag = !flag; const t = grid(w, 9, 40, 140, 20);
        if (t && t.ok) { const i = t.r * N + t.c; if (flag) { if (st[i] !== 1) st[i] = st[i] ? 0 : 2; } else if (st[i] === 0) { if (mine[i]) { w.die(); st[i] = 3; } else open(i); } }
        if (opened >= 81 - M) { w.add(100 + Math.floor(w.left)); w.finish(); }
      },
      draw() { w.bg('#2b2b3a', '#2b2b3a'); for (let i = 0; i < 81; i++) { const x = 140 + (i % N) * 40, y = 20 + Math.floor(i / N) * 40; w.box(x + 1, y + 1, 38, 38, st[i] === 1 ? '#ddd' : '#6b7bb8'); if (st[i] === 1 && cnt(i)) w.tx(cnt(i) + '', x + 20, y + 20, 22, ['', '#1976d2', '#388e3c', '#d32f2f', '#512da8', '#6d4c41', '#00838f', '#000', '#555'][cnt(i)]); if (st[i] === 2) w.e('🚩', x + 20, y + 20, 22); if (st[i] === 3 || (!w.alive && mine[i])) w.e('💣', x + 20, y + 20, 22); } w.tx(flag ? '🚩 Flaggen-Modus' : '⛏ Aufdecken (F)', 70, 40, 13); },
      pub() { return {}; }
    };
  });

  reg('simon-says', 'Simon Says', '🔴', P, 'Merke dir die Farbfolge – für alle dieselbe!', 'Klick auf die Farben oder Tasten 1-4', { dur: 90 }, w => {
    const seq = []; let phase = 'show', i = 0, tm = 0.8, lit = -1, inpI = 0;
    const C = ['#e53935', '#43a047', '#1e88e5', '#fdd835'], pos = k => ({ x: 220 + (k % 2) * 110, y: 90 + Math.floor(k / 2) * 110 });
    const extend = () => { seq.push(w.ri(0, 4)); phase = 'show'; i = 0; tm = 0.8; inpI = 0; };
    extend();
    const press = k => { lit = k; setTimeout(() => { if (lit === k) lit = -1; }, 180); if (seq[inpI] === k) { inpI++; if (inpI === seq.length) { w.add(seq.length * 10); extend(); } } else w.die(); };
    return {
      step(dt) {
        if (phase === 'show') { tm -= dt; if (tm <= 0) { if (lit >= 0) { lit = -1; tm = 0.25; i++; if (i >= seq.length) phase = 'input'; } else { lit = seq[i]; tm = 0.5; } } return; }
        const e = w.inp.e; for (let k = 0; k < 4; k++) if (e[String(k + 1)]) press(k);
        const t = w.inp.tap; if (t) for (let k = 0; k < 4; k++) { const p = pos(k); if (t.x > p.x && t.x < p.x + 100 && t.y > p.y && t.y < p.y + 100) press(k); }
      },
      draw() { w.bg('#10182f', '#10182f'); for (let k = 0; k < 4; k++) { const p = pos(k); w.g.globalAlpha = lit === k ? 1 : 0.4; w.box(p.x, p.y, 100, 100, C[k]); w.g.globalAlpha = 1; w.tx(k + 1 + '', p.x + 50, p.y + 50, 28, '#fff'); } w.tx(phase === 'show' ? 'Merken…' : 'Du bist dran!', 320, 50, 20); },
      pub() { return {}; }
    };
  });

  reg('reaction-test', 'Reaction Test', '⚡', P, 'Klicke, sobald der Bildschirm grün wird – wer ist am schnellsten?', 'Klick / Leertaste', { dur: 60 }, w => {
    let ph = 'wait', tm = w.r(1.5, 4), t0 = 0, msg = '', n = 0;
    return {
      step(dt) {
        const hit = w.inp.tap || w.inp.e.space;
        if (ph === 'wait') { tm -= dt; if (hit) { msg = 'Zu früh!'; ph = 'res'; tm = 1; n++; } else if (tm <= 0) { ph = 'go'; t0 = performance.now(); } }
        else if (ph === 'go') { if (hit) { const ms = Math.round(performance.now() - t0); w.add(Math.max(0, 500 - ms)); msg = ms + ' ms'; ph = 'res'; tm = 1; n++; } }
        else { tm -= dt; if (tm <= 0) { if (n >= 5) w.finish(); else { ph = 'wait'; tm = w.r(1.5, 4); } } }
      },
      draw() { w.bg(ph === 'go' ? '#2e7d32' : ph === 'res' ? '#1565c0' : '#c62828', ph === 'go' ? '#43a047' : ph === 'res' ? '#1e88e5' : '#e53935'); w.tx(ph === 'go' ? 'JETZT!' : ph === 'wait' ? 'Warte auf Grün…' : msg, 320, 190, 44); w.tx(`Runde ${Math.min(5, n + (ph === 'res' ? 0 : 1))}/5`, 320, 250, 18); },
      pub() { return {}; }
    };
  });

  reg('type-racer', 'Type Racer', '⌨️', P, 'Tippe die Wörter so schnell du kannst – alle bekommen dieselben.', 'Einfach lostippen (ohne Umlaute)', { dur: 60 }, w => {
    let word = w.pick(WORDS), pos = 0;
    return {
      step() { for (const c of w.inp.chars) { if (c.toUpperCase() === word[pos]) { pos++; w.add(1); if (pos >= word.length) { w.add(word.length); word = w.pick(WORDS); pos = 0; } } else if (c !== '\b' && c.length === 1) w.score = Math.max(0, w.score - 0.5); } },
      draw() { w.bg('#10182f', '#1d2b53'); w.tx(word.slice(0, pos), 320 - (word.length - pos) * 11, 170, 44, '#4cd98a', 'right'); w.tx(word.slice(pos), 320 - (word.length - pos) * 11, 170, 44, '#fff', 'left'); const o = Object.entries(w.others).sort((a, b) => (b[1].s || 0) - (a[1].s || 0)); o.slice(0, 6).forEach(([n, s], i) => w.tx(`${n}: ${s.s || 0}`, 20, 260 + i * 20, 14, '#ffe9a8', 'left')); },
      pub() { return {}; }
    };
  });

  reg('math-sprint', 'Math Sprint', '➕', Q, 'Löse so viele Rechenaufgaben wie möglich – alle rechnen dasselbe.', 'Zahlen tippen · Enter bestätigen · Backspace löschen', { dur: 45 }, w => {
    let a, b, op, ans = '', solved = 0, flash = 0;
    const next = () => { const lv = Math.min(3, Math.floor(solved / 5)); op = w.pick(lv ? ['+', '-', '*'] : ['+', '-']); a = w.ri(2, 12 + lv * 12); b = w.ri(2, 10 + lv * 8); if (op === '-' && b > a) [a, b] = [b, a]; if (op === '*') { a = w.ri(2, 10 + lv); b = w.ri(2, 10); } ans = ''; };
    const val = () => op === '+' ? a + b : op === '-' ? a - b : a * b;
    next();
    return {
      step(dt) {
        flash -= dt; for (const c of w.inp.chars) { if (c === '\b') ans = ans.slice(0, -1); else if (/\d/.test(c) && ans.length < 4) ans += c; }
        if (w.inp.e.enter && ans !== '') { if (+ans === val()) { w.add(10); solved++; flash = 0.3; } else { w.score = Math.max(0, w.score - 5); flash = -0.3; } next(); }
      },
      draw() { w.bg(flash > 0 ? '#1b5e20' : flash < -0.0 && flash > -0.3 ? '#7f1d1d' : '#10182f', '#10182f'); w.tx(`${a} ${op === '*' ? '×' : op} ${b} = ?`, 320, 150, 54); w.tx(ans || '…', 320, 240, 44, '#ffe9a8'); w.tx('Enter = bestätigen', 320, 300, 14, '#aaa'); },
      pub() { return {}; }
    };
  });

  reg('color-clash', 'Color Clash', '🎨', P, 'Klicke die FARBE des Wortes – nicht, was es sagt!', 'Klick auf den Farbknopf oder Tasten 1–4', { dur: 30 }, w => {
    const N = ['ROT', 'GRÜN', 'BLAU', 'GELB'], C = ['#e53935', '#43a047', '#1e88e5', '#fdd835']; let word, ink;
    const next = () => { word = w.ri(0, 4); ink = w.rnd() < 0.7 ? (word + w.ri(1, 4)) % 4 : word; }; next();
    const pick = k => { if (k === ink) w.add(1); else w.score = Math.max(0, w.score - 1); next(); };
    return {
      step() { for (let k = 0; k < 4; k++) if (w.inp.e[String(k + 1)]) pick(k); const t = w.inp.tap; if (t && t.y > 280) pick(w.clamp(Math.floor((t.x - 80) / 120), 0, 3)); },
      draw() { w.bg('#111', '#111'); w.tx(N[word], 320, 150, 72, C[ink]); for (let k = 0; k < 4; k++) { w.box(80 + k * 120 + 5, 290, 110, 70, C[k]); w.tx(k + 1 + '', 80 + k * 120 + 60, 325, 26, '#000'); } },
      pub() { return {}; }
    };
  });

  reg('lights-out', 'Lights Out', '💡', P, 'Schalte alle Lichter aus – ein Klick dreht auch die Nachbarn um.', 'Klick auf ein Feld', { dur: 120 }, w => {
    const N = 5; let b, moves, lv = 0;
    const press = (r, c) => { for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < N && cc < N) b[rr * N + cc] ^= 1; } };
    const make = () => { b = Array(25).fill(0); moves = 0; for (let i = 0; i < 4 + lv; i++) press(w.ri(0, N), w.ri(0, N)); if (b.every(v => !v)) press(2, 2); };
    make();
    return {
      step() { const t = grid(w, N, 64, 160, 40); if (t && t.ok) { press(t.r, t.c); moves++; if (b.every(v => !v)) { w.add(Math.max(10, 70 - moves * 5) + lv * 10); lv++; make(); } } },
      draw() { w.bg('#0b1226', '#1d2b53'); b.forEach((v, i) => { const x = 160 + (i % N) * 64, y = 40 + Math.floor(i / N) * 64; w.box(x + 2, y + 2, 60, 60, v ? '#ffd166' : '#2a3a63'); if (v) w.e('💡', x + 32, y + 32, 30); }); w.tx('Level ' + (lv + 1), 320, 18, 15); },
      pub() { return {}; }
    };
  });

  reg('sliding-puzzle', 'Sliding Puzzle', '🧩', P, 'Schiebe die Kacheln in die richtige Reihenfolge.', 'Klick auf eine Kachel neben der Lücke', { dur: 120 }, w => {
    const N = 3; let t, moves, lv = 0;
    const mv = i => { const z = t.indexOf(0), zx = z % N, zy = Math.floor(z / N), x = i % N, y = Math.floor(i / N); if (Math.abs(zx - x) + Math.abs(zy - y) === 1) { t[z] = t[i]; t[i] = 0; return true; } return false; };
    const make = () => { t = [1, 2, 3, 4, 5, 6, 7, 8, 0]; moves = 0; let last = -1; for (let k = 0; k < 20 + lv * 10; k++) { const z = t.indexOf(0), opts = [z - 1, z + 1, z - N, z + N].filter(i => i >= 0 && i < 9 && i !== last && ((i === z - 1 || i === z + 1) ? Math.floor(i / N) === Math.floor(z / N) : true)); const i = opts[w.ri(0, opts.length)]; last = z; mv(i); } };
    make();
    return {
      step() { const g = grid(w, N, 110, 155, 35); if (g && g.ok && mv(g.r * N + g.c)) { moves++; if (t.every((v, i) => v === (i + 1) % 9)) { w.add(Math.max(20, 120 - moves * 2)); lv++; make(); } } },
      draw() { w.bg('#10182f', '#1d2b53'); t.forEach((v, i) => { if (!v) return; const x = 155 + (i % N) * 110, y = 35 + Math.floor(i / N) * 110; w.box(x + 3, y + 3, 104, 104, `hsl(${v * 40},65%,52%)`); w.tx(v + '', x + 55, y + 55, 44); }); w.tx('Züge ' + moves, 70, 30, 15); },
      pub() { return {}; }
    };
  });

  reg('maze-race', 'Maze Race', '🌀', P, 'Finde als Erster den Ausgang – alle haben dasselbe Labyrinth.', 'Pfeiltasten / WASD', { dur: 90 }, w => {
    const MW = 21, MH = 13; let m, px, py;
    const make = () => {
      m = Array.from({ length: MH }, () => Array(MW).fill(1)); const st = [[1, 1]]; m[1][1] = 0;
      while (st.length) { const [x, y] = st[st.length - 1], o = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => x + dx > 0 && y + dy > 0 && x + dx < MW - 1 && y + dy < MH - 1 && m[y + dy][x + dx]); if (!o.length) { st.pop(); continue; } const [dx, dy] = o[w.ri(0, o.length)]; m[y + dy / 2][x + dx / 2] = 0; m[y + dy][x + dx] = 0; st.push([x + dx, y + dy]); }
      px = 1; py = 1;
    };
    make();
    return {
      step() { const e = w.inp.e; const mv = (dx, dy) => { if (!m[py + dy][px + dx]) { px += dx; py += dy; } }; if (e.left) mv(-1, 0); if (e.right) mv(1, 0); if (e.up) mv(0, -1); if (e.down) mv(0, 1); if (px === MW - 2 && py === MH - 2) { w.add(100); make(); } },
      draw() { w.bg('#10182f', '#10182f'); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) w.box(26 + x * 28, 18 + y * 28, 28, 28, m[y][x] ? '#3d4a7a' : '#1a2240'); w.e('🏁', 26 + (MW - 2) * 28 + 14, 18 + (MH - 2) * 28 + 14, 20); w.e('🧍', 26 + px * 28 + 14, 18 + py * 28 + 14, 22); },
      pub() { return { x: 26 + px * 28 + 14, y: 18 + py * 28 + 14, e: '🏃', z: 18 }; }
    };
  });

  reg('candy-match', 'Candy Match', '🍬', P, 'Tausche Nachbarn und bilde 3er-Reihen – für alle dasselbe Spielfeld.', 'Zwei benachbarte Süßigkeiten nacheinander anklicken', { dur: 60 }, w => {
    const N = 7, E = ['🍬', '🍭', '🍫', '🍩', '🍒', '🍋']; const b = Array(49).fill(0).map(() => w.ri(0, 6)); let sel = -1;
    const find = () => { const s = new Set(); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = b[r * N + c]; if (c < N - 2 && v === b[r * N + c + 1] && v === b[r * N + c + 2]) [0, 1, 2].forEach(k => s.add(r * N + c + k)); if (r < N - 2 && v === b[(r + 1) * N + c] && v === b[(r + 2) * N + c]) [0, 1, 2].forEach(k => s.add((r + k) * N + c)); } return s; };
    const settle = () => { let n = 0, chain = 0; for (let s = find(); s.size; s = find()) { chain++; n += s.size; s.forEach(i => b[i] = -1); for (let c = 0; c < N; c++) { const col = []; for (let r = N - 1; r >= 0; r--) if (b[r * N + c] >= 0) col.push(b[r * N + c]); while (col.length < N) col.push(w.ri(0, 6)); for (let r = N - 1; r >= 0; r--) b[r * N + c] = col[N - 1 - r]; } } w.add(n * 10 * Math.max(1, chain)); return n; };
    settle(); w.score = 0;
    return {
      step() { const t = grid(w, N, 50, 145, 25); if (!t || !t.ok) return; const i = t.r * N + t.c; if (sel < 0) { sel = i; return; } const dx = Math.abs(i % N - sel % N), dy = Math.abs(Math.floor(i / N) - Math.floor(sel / N)); if (dx + dy === 1) { [b[i], b[sel]] = [b[sel], b[i]]; if (!settle()) [b[i], b[sel]] = [b[sel], b[i]]; } sel = -1; },
      draw() { w.bg('#ff9ad5', '#ffe0f3'); b.forEach((v, i) => { const x = 145 + (i % N) * 50, y = 25 + Math.floor(i / N) * 50; w.box(x + 1, y + 1, 48, 48, i === sel ? '#fff8' : '#ffffff44'); w.e(E[v], x + 25, y + 25, 34); }); },
      pub() { return {}; }
    };
  });

  reg('water-sort', 'Water Sort', '🧪', P, 'Sortiere die Farben, bis jedes Glas nur eine Farbe hat.', 'Erst Glas wählen, dann Ziel-Glas', { dur: 120 }, w => {
    const COL = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00acc1']; let tubes, sel = -1, lv = 0, moves;
    const make = () => { const n = 4 + Math.min(3, lv), a = []; for (let c = 0; c < n; c++) for (let k = 0; k < 4; k++) a.push(c); for (let i = a.length - 1; i > 0; i--) { const j = w.ri(0, i + 1); [a[i], a[j]] = [a[j], a[i]]; } tubes = []; for (let i = 0; i < n; i++) tubes.push(a.slice(i * 4, i * 4 + 4)); tubes.push([], []); sel = -1; moves = 0; };
    make();
    const solved = () => tubes.every(t => !t.length || (t.length === 4 && t.every(v => v === t[0])));
    return {
      step() { const t = w.inp.tap; if (!t) return; const n = tubes.length, x0 = 320 - n * 35, i = Math.floor((t.x - x0) / 70); if (i < 0 || i >= n) return; if (sel < 0) { if (tubes[i].length) sel = i; return; } if (i !== sel) { const f = tubes[sel], to = tubes[i], c = f[f.length - 1]; if (to.length < 4 && (!to.length || to[to.length - 1] === c)) { while (f.length && f[f.length - 1] === c && to.length < 4) to.push(f.pop()); moves++; } } sel = -1; if (solved()) { w.add(Math.max(30, 120 - moves * 2)); lv++; make(); } },
      draw() { w.bg('#10182f', '#1d2b53'); const n = tubes.length, x0 = 320 - n * 35; tubes.forEach((t, i) => { const x = x0 + i * 70 + 10, y = i === sel ? 90 : 110; w.g.strokeStyle = '#fff'; w.g.lineWidth = 3; w.g.strokeRect(x, y, 50, 190); t.forEach((c, k) => w.box(x + 3, y + 187 - (k + 1) * 46, 44, 44, COL[c])); }); w.tx('Level ' + (lv + 1), 320, 30, 16); },
      pub() { return {}; }
    };
  });

  reg('odd-one-out', 'Odd One Out', '🔍', P, 'Finde das Emoji, das anders ist!', 'Klick auf das andere Emoji', { dur: 30 }, w => {
    const PAIRS = [['😀', '😃'], ['🐶', '🐕'], ['🍎', '🍏'], ['🌕', '🌝'], ['🔴', '🟠'], ['😡', '😠'], ['👻', '🎃'], ['⭐', '🌟'], ['🚗', '🚙'], ['🐱', '🐈']]; let n = 3, odd, pr, lv = 0;
    const make = () => { n = Math.min(8, 3 + Math.floor(lv / 3)); odd = w.ri(0, n * n); pr = w.pick(PAIRS); };
    make();
    return {
      step() { const cell = 360 / n, t = grid(w, n, cell, 140, 20); if (t && t.ok) { if (t.r * n + t.c === odd) { w.add(n); lv++; make(); } else w.score = Math.max(0, w.score - 2); } },
      draw() { w.bg('#10182f', '#1d2b53'); const cell = 360 / n; for (let i = 0; i < n * n; i++) w.e(i === odd ? pr[1] : pr[0], 140 + (i % n) * cell + cell / 2, 20 + Math.floor(i / n) * cell + cell / 2, cell * 0.7); },
      pub() { return {}; }
    };
  });

  reg('count-rush', 'Count Rush', '🔢', Q, 'Zähle blitzschnell, wie viele Äpfel auftauchen.', 'Klicke die richtige Zahl (oder Taste 1–4)', { dur: 60 }, w => {
    let ph = 'show', tm = 2, items = [], target = '🍎', n = 0, opts = [];
    const make = () => { n = w.ri(3, 10 + Math.floor(w.score / 50)); const o = ['🍌', '🍇', '🍓', '🍎']; items = []; for (let i = 0; i < n + w.ri(5, 12); i++) items.push({ x: w.r(40, 600), y: w.r(60, 300), e: i < n ? '🍎' : w.pick(o.slice(0, 3)) }); items.sort(() => w.rnd() - 0.5); const s = new Set([n]); while (s.size < 4) s.add(Math.max(1, n + w.ri(-3, 4))); opts = [...s].sort((a, b) => a - b); ph = 'show'; tm = Math.max(1.2, 2.6 - w.score / 200); };
    make();
    const ans = k => { if (opts[k] === n) w.add(10); else w.score = Math.max(0, w.score - 5); make(); };
    return {
      step(dt) { if (ph === 'show') { tm -= dt; if (tm <= 0) ph = 'ask'; return; } for (let k = 0; k < 4; k++) if (w.inp.e[String(k + 1)]) ans(k); const t = w.inp.tap; if (t && t.y > 250) ans(w.clamp(Math.floor((t.x - 120) / 100), 0, 3)); },
      draw() { w.bg('#10182f', '#1d2b53'); if (ph === 'show') { items.forEach(i => w.e(i.e, i.x, i.y, 30)); w.tx('Zähle die 🍎!', 320, 24, 18); } else { w.tx('Wie viele 🍎 waren es?', 320, 120, 28); opts.forEach((o, k) => { w.box(120 + k * 100 + 5, 260, 90, 80, '#3b5bdb'); w.tx(o + '', 120 + k * 100 + 50, 300, 34); }); } },
      pub() { return {}; }
    };
  });

  reg('word-scramble', 'Word Scramble', '🔤', Q, 'Bringe die Buchstaben in die richtige Reihenfolge.', 'Wort tippen · Enter prüfen · Tab überspringen', { dur: 90 }, w => {
    let word, sc, ans = '';
    const next = () => { word = w.pick(WORDS); let a = word.split(''); for (let i = a.length - 1; i > 0; i--) { const j = w.ri(0, i + 1); [a[i], a[j]] = [a[j], a[i]]; } sc = a.join(''); if (sc === word) sc = word.split('').reverse().join(''); ans = ''; };
    next();
    return {
      step() { for (const c of w.inp.chars) { if (c === '\b') ans = ans.slice(0, -1); else if (/[a-z]/.test(c) && ans.length < 14) ans += c.toUpperCase(); } if (w.inp.e.tab) { next(); } if (w.inp.e.enter || ans.length === word.length) { if (ans === word) { w.add(word.length * 2); next(); } else if (w.inp.e.enter) ans = ''; } },
      draw() { w.bg('#10182f', '#1d2b53'); w.tx(sc.split('').join(' '), 320, 140, 44); w.tx(ans || '…', 320, 230, 36, '#ffe9a8'); w.tx('Enter = löschen · Tab = überspringen', 320, 330, 13, '#aaa'); },
      pub() { return {}; }
    };
  });

  reg('code-breaker', 'Code Breaker', '🔐', P, 'Knacke den 4-farbigen Geheimcode in möglichst wenigen Versuchen.', 'Farben anklicken, dann „OK“', { dur: 150 }, w => {
    const C = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00']; const code = [0, 0, 0, 0].map(() => w.ri(0, 6)); const hist = []; let cur = [];
    return {
      step() { const t = w.inp.tap; if (!t) return; if (t.y > 330) { const k = Math.floor((t.x - 80) / 70); if (k >= 0 && k < 6 && cur.length < 4) cur.push(k); else if (k === 6 && cur.length) cur.pop(); else if (k === 7 && cur.length === 4) { let b = 0, wh = 0; const cc = code.slice(), gg = cur.slice(); for (let i = 0; i < 4; i++) if (gg[i] === cc[i]) { b++; gg[i] = cc[i] = -1; } for (let i = 0; i < 4; i++) { const j = cc.indexOf(gg[i]); if (gg[i] >= 0 && j >= 0) { wh++; cc[j] = -2; } } hist.push({ g: cur, b, wh }); cur = []; if (b === 4) { w.add(Math.max(20, 200 - hist.length * 20)); w.finish(); } else if (hist.length >= 10) w.die(); } } },
      draw() { w.bg('#10182f', '#1d2b53'); hist.slice(-8).forEach((h, i) => { h.g.forEach((c, k) => w.circ(200 + k * 36, 30 + i * 36, 14, C[c])); w.tx('⚫'.repeat(h.b) + '⚪'.repeat(h.wh), 400, 30 + i * 36, 16, '#fff', 'left'); }); for (let k = 0; k < 4; k++) w.circ(200 + k * 36, 318, 14, cur[k] !== undefined ? C[cur[k]] : '#333'); C.forEach((c, k) => w.circ(115 + k * 70, 365, 22, c)); w.box(80 + 6 * 70, 345, 60, 40, '#555'); w.tx('⌫', 80 + 6 * 70 + 30, 365, 20); w.box(80 + 7 * 70, 345, 60, 40, '#2e7d32'); w.tx('OK', 80 + 7 * 70 + 30, 365, 18); },
      pub() { return {}; }
    };
  });

  reg('bomb-defusal', 'Bomb Defusal', '🧨', P, 'Schneide den richtigen Draht durch, bevor die Bombe explodiert!', 'Klick auf einen Draht', { dur: 60 }, w => {
    const CN = ['ROTEN', 'BLAUEN', 'GRÜNEN', 'GELBEN', 'WEISSEN'], CC = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#eee']; let wires, rule, target, tm;
    const make = () => { wires = [0, 1, 2, 3, 4].sort(() => w.rnd() - 0.5); const r = w.ri(0, 3); if (r === 0) { target = w.ri(0, 5); rule = `Schneide den ${CN[wires[target]]} Draht.`; } else if (r === 1) { target = w.ri(0, 5); rule = `Schneide den ${target + 1}. Draht von links.`; } else { const k = w.ri(0, 4); target = k + 1; rule = `Schneide den Draht RECHTS neben dem ${CN[wires[k]]}.`; } tm = Math.max(3, 7 - w.score / 80); };
    make();
    return {
      step(dt) { tm -= dt; if (tm <= 0) w.die(); const t = w.inp.tap; if (t) { const i = Math.floor((t.x - 120) / 80); if (t.y > 120 && t.y < 340 && i >= 0 && i < 5) { if (i === target) { w.add(10); make(); } else w.die(); } } },
      draw() { w.bg('#222', '#222'); w.tx(rule, 320, 60, 22, '#ffe9a8'); w.box(120, 30 + 0, 400, 4, '#0000'); wires.forEach((c, i) => { w.box(120 + i * 80 + 30, 120, 16, 220, CC[c]); }); w.box(120, 360, 400 * Math.max(0, tm / 7), 10, tm < 2 ? '#e53935' : '#4cd98a'); },
      pub() { return {}; }
    };
  });

  reg('color-flood', 'Color Flood', '🌊', P, 'Flute das Spielfeld mit einer Farbe – in möglichst wenigen Zügen.', 'Klicke eine Farbe unten', { dur: 90 }, w => {
    const N = 12, COL = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00']; const b = Array(N * N).fill(0).map(() => w.ri(0, 6)); let moves = 0; const MAX = 24;
    const fill = c => { const o = b[0]; if (o === c) return; const q = [0], seen = new Set([0]); while (q.length) { const i = q.pop(); b[i] = c; const x = i % N, y = Math.floor(i / N); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, bb = y + dy; if (a >= 0 && bb >= 0 && a < N && bb < N) { const j = bb * N + a; if (!seen.has(j) && b[j] === o) { seen.add(j); q.push(j); } } } } };
    const area = () => { const o = b[0], seen = new Set([0]), q = [0]; while (q.length) { const i = q.pop(), x = i % N, y = Math.floor(i / N); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, bb = y + dy; if (a >= 0 && bb >= 0 && a < N && bb < N) { const j = bb * N + a; if (!seen.has(j) && b[j] === o) { seen.add(j); q.push(j); } } } } return seen.size; };
    return {
      step() { const t = w.inp.tap; if (t && t.y > 340) { const k = Math.floor((t.x - 110) / 70); if (k >= 0 && k < 6) { fill(k); moves++; const a = area(); w.score = a / 144 * 100; if (a === 144) { w.score = 100 + (MAX - moves) * 10; w.finish(); } else if (moves >= MAX) w.finish(); } } },
      draw() { w.bg('#10182f', '#10182f'); b.forEach((c, i) => w.box(220 + (i % N) * 17, 20 + Math.floor(i / N) * 17, 17, 17, COL[c])); COL.forEach((c, k) => w.box(110 + k * 70 + 5, 350, 60, 40, c)); w.tx(`Züge ${moves}/${MAX}`, 90, 40, 15); },
      pub() { return {}; }
    };
  });

  const QB = [['Hauptstadt von Frankreich?', 'Paris', 'Lyon', 'Nizza', 'Rom'], ['Wie viele Beine hat eine Spinne?', '8', '6', '10', '4'], ['Welcher Planet ist der Sonne am nächsten?', 'Merkur', 'Venus', 'Mars', 'Erde'], ['5 × 7 = ?', '35', '32', '42', '30'], ['Welches Tier ist das größte der Welt?', 'Blauwal', 'Elefant', 'Giraffe', 'Hai'], ['Farbe, die man aus Blau + Gelb mischt?', 'Grün', 'Orange', 'Lila', 'Braun'], ['Wie viele Minuten hat eine Stunde?', '60', '100', '30', '90'], ['Welcher Ozean ist der größte?', 'Pazifik', 'Atlantik', 'Indischer', 'Arktis'], ['Hauptstadt von Deutschland?', 'Berlin', 'München', 'Hamburg', 'Bonn'], ['Was trinken Babys?', 'Milch', 'Cola', 'Kaffee', 'Saft'], ['Wie viele Kontinente gibt es?', '7', '5', '6', '8'], ['Welches Gas atmen wir ein?', 'Sauerstoff', 'Helium', 'Stickstoff pur', 'Methan'], ['Hauptstadt von Italien?', 'Rom', 'Mailand', 'Venedig', 'Neapel'], ['Wie heißt der höchste Berg der Erde?', 'Mount Everest', 'K2', 'Zugspitze', 'Mont Blanc'], ['Wie viele Seiten hat ein Würfel?', '6', '4', '8', '12'], ['12 + 15 = ?', '27', '26', '28', '25'], ['Welches Tier macht „Muh“?', 'Kuh', 'Schaf', 'Pferd', 'Ziege'], ['Aus welchem Land kommt Pizza?', 'Italien', 'Spanien', 'Griechenland', 'Türkei'], ['Wie nennt man ein Baby der Katze?', 'Kitten', 'Welpe', 'Küken', 'Fohlen'], ['Welches ist das größte Landtier?', 'Elefant', 'Nashorn', 'Bär', 'Flusspferd'], ['Hauptstadt von Spanien?', 'Madrid', 'Barcelona', 'Lissabon', 'Sevilla'], ['Wie viele Monate hat ein Jahr?', '12', '10', '11', '13'], ['Welcher Planet hat Ringe?', 'Saturn', 'Mars', 'Venus', 'Merkur'], ['Wie heißt der Gasriese mit dem roten Fleck?', 'Jupiter', 'Neptun', 'Uranus', 'Saturn'], ['100 ÷ 4 = ?', '25', '20', '40', '50'], ['Welches Metall ist flüssig bei Zimmertemperatur?', 'Quecksilber', 'Eisen', 'Kupfer', 'Zinn'], ['Wie viele Spieler hat ein Fußballteam auf dem Feld?', '11', '9', '10', '12'], ['Welches Organ pumpt das Blut?', 'Herz', 'Lunge', 'Leber', 'Niere'], ['Hauptstadt von Österreich?', 'Wien', 'Salzburg', 'Graz', 'Linz'], ['Welche Farbe hat eine reife Banane?', 'Gelb', 'Blau', 'Rot', 'Schwarz']];
  reg('quiz-duell', 'Quiz Duell', '❓', Q, 'Allgemeinwissen: Wer antwortet richtig UND schnell? Alle bekommen dieselben Fragen.', 'Klick oder Tasten 1–4', { dur: 90 }, w => {
    const order = QB.map((_, i) => i).sort(() => w.rnd() - 0.5); let qi = 0, q, opts, tm, res = 0;
    const next = () => { const d = QB[order[qi++ % order.length]]; q = d[0]; opts = d.slice(1).map((t, i) => ({ t, ok: i === 0 })).sort(() => w.rnd() - 0.5); tm = 10; res = 0; };
    next();
    const ans = k => { if (res) return; if (opts[k].ok) { w.add(10 + Math.ceil(tm) * 2); res = 1; } else res = -1; opts.forEach(o => o.show = o.ok); setTimeout(next, 700); };
    return {
      step(dt) { if (res) return; tm -= dt; if (tm <= 0) { res = -1; opts.forEach(o => o.show = o.ok); setTimeout(next, 700); } for (let k = 0; k < 4; k++) if (w.inp.e[String(k + 1)]) ans(k); const t = w.inp.tap; if (t && t.y > 150) { const k = Math.floor((t.y - 150) / 56); if (k >= 0 && k < 4 && t.x > 100 && t.x < 540) ans(k); } },
      draw() { w.bg('#10182f', '#1d2b53'); w.tx(q, 320, 80, 22); w.box(100, 120, 440 * Math.max(0, tm / 10), 8, '#ffd166'); opts.forEach((o, k) => { w.box(100, 150 + k * 56, 440, 48, o.show ? (o.ok ? '#2e7d32' : '#555') : '#3b5bdb'); w.tx(`${k + 1}. ${o.t}`, 120, 174 + k * 56, 20, '#fff', 'left'); }); },
      pub() { return {}; }
    };
  });

  reg('treasure-dig', 'Treasure Dig', '💎', P, 'Grabe nach dem Schatz – Hinweise sagen „heiß“ oder „kalt“.', 'Klicke auf ein Feld, um zu graben', { dur: 90 }, w => {
    const N = 8; let tx, ty, dug = {}, digs = 0, hint = '';
    const make = () => { tx = w.ri(0, N); ty = w.ri(0, N); dug = {}; digs = 0; hint = 'Wo ist der Schatz?'; }; make();
    return {
      step() { const t = grid(w, N, 44, 144, 24); if (!t || !t.ok || dug[t.r * N + t.c] != null) return; digs++; const d = Math.abs(t.c - tx) + Math.abs(t.r - ty); if (!d) { w.add(Math.max(10, 70 - digs * 6)); hint = '💎 Gefunden!'; make(); return; } dug[t.r * N + t.c] = d; hint = d <= 1 ? '🔥 Kochend heiß' : d <= 3 ? '♨️ Warm' : d <= 5 ? '🙂 Lauwarm' : '🧊 Eiskalt'; },
      draw() { w.bg('#6b4a2b', '#3a2a1a'); for (let i = 0; i < 64; i++) { const x = 144 + (i % N) * 44, y = 24 + Math.floor(i / N) * 44, d = dug[i]; w.box(x + 1, y + 1, 42, 42, d != null ? '#2b1d10' : '#8d6e63'); if (d != null) w.tx(d + '', x + 22, y + 22, 18, d <= 1 ? '#ff7043' : d <= 3 ? '#ffd166' : '#90caf9'); } w.tx(hint, 320, 385, 18, '#ffe9a8'); },
      pub() { return {}; }
    };
  });

  reg('gold-miner', 'Gold Miner', '⛏️', S, 'Wirf den Haken und hole Gold und Diamanten hoch – Steine sind schwer!', 'Leertaste / Klick = Haken werfen', { dur: 60 }, w => {
    const it = []; for (let i = 0; i < 12; i++) { const k = w.rnd(); it.push({ x: w.r(40, 600), y: w.r(150, 370), t: k < 0.15 ? 'dia' : k < 0.55 ? 'gold' : 'rock', got: false }); }
    const V = { dia: ['💎', 500, 22, 260], gold: ['🪙', 150, 30, 160], rock: ['🪨', 20, 36, 70] }; let ang = 0, st = 'swing', len = 30, held = null;
    return {
      step(dt) {
        const hx = () => 320 + Math.sin(ang) * len, hy = () => 70 + Math.cos(ang) * len;
        if (st === 'swing') { ang = Math.sin(w.t * 1.8) * 1.2; if (flap(w)) st = 'out'; }
        else if (st === 'out') { len += 360 * dt; for (const o of it) if (!o.got && w.hit(hx(), hy(), o.x, o.y, V[o.t][2] * 0.75)) { o.got = true; held = o; st = 'in'; } if (hx() < 0 || hx() > 640 || hy() > 400) st = 'in'; }
        else { len -= (held ? V[held.t][3] : 360) * dt; if (held) { held.x = hx(); held.y = hy(); } if (len <= 30) { len = 30; if (held) { w.add(V[held.t][1]); held.gone = true; held = null; } st = 'swing'; } }
      },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); w.box(0, 100, 640, 300, '#8d6e63'); for (const o of it) if (!o.gone) w.e(V[o.t][0], o.x, o.y, V[o.t][2] * 1.3); w.g.strokeStyle = '#222'; w.g.lineWidth = 3; w.g.beginPath(); w.g.moveTo(320, 70); w.g.lineTo(320 + Math.sin(ang) * len, 70 + Math.cos(ang) * len); w.g.stroke(); w.e('⚓', 320 + Math.sin(ang) * len, 70 + Math.cos(ang) * len, 24); w.e('🧔', 320, 60, 42); },
      pub() { return {}; }
    };
    function flap(w) { return w.inp.e.space || w.inp.tap; }
  });

  reg('fishing', 'Fishing', '🎣', S, 'Halte den Haken auf dem Fisch, bis der Balken voll ist.', 'Leertaste / Maustaste halten', { dur: 60 }, w => {
    let hook = 150, hv = 0, fish = 150, fv = 0, ft = 0, prog = 30, sp = 1;
    return {
      step(dt) {
        const up = w.inp.k.space || w.inp.down; hv += (up ? -700 : 600) * dt; hv = w.clamp(hv, -250, 250); hook += hv * dt; if (hook < 0 || hook > 300) { hook = w.clamp(hook, 0, 300); hv = 0; }
        ft -= dt; if (ft <= 0) { fv = w.r(-120, 120) * sp; ft = w.r(0.4, 1.1); } fish = w.clamp(fish + fv * dt, 15, 285);
        prog += (Math.abs(hook + 30 - fish) < 40 ? 22 : -16) * dt;
        if (prog >= 100) { w.add(10); sp += 0.2; prog = 30; } if (prog <= 0) w.die();
      },
      draw() { w.bg('#043a6b', '#1ea5c9'); w.box(300, 50, 40, 300, '#06284a'); w.box(300, 50 + hook, 40, 60, '#4cd98a88'); w.e('🐟', 320, 50 + fish, 30); w.box(380, 50, 18, 300, '#222'); w.box(380, 350 - prog * 3, 18, prog * 3, '#ffd166'); w.e('🎣', 250, 80, 40); },
      pub() { return {}; }
    };
  });

  reg('kitchen-rush', 'Kitchen Rush', '🍳', S, 'Stelle die bestellten Gerichte aus den richtigen Zutaten zusammen!', 'Zutaten anklicken, dann „Servieren“', { dur: 75 }, w => {
    const ING = ['🍞', '🥬', '🍅', '🧀', '🥓', '🥚']; let order, cur = [], tm;
    const make = () => { order = []; for (let i = 0; i < w.ri(2, 5); i++) order.push(w.ri(0, 6)); cur = []; tm = 14; }; make();
    return {
      step(dt) { tm -= dt; if (tm <= 0) { w.score = Math.max(0, w.score - 5); make(); } const t = w.inp.tap; if (!t || t.y < 300) return; const k = Math.floor((t.x - 50) / 76); if (k >= 0 && k < 6) cur.push(k); else if (k === 6 && cur.length) cur.pop(); else if (k === 7 || k === 8) { const ok = order.length === cur.length && order.every((v, i) => v === cur[i]); if (ok) { w.add(10 + order.length * 5 + Math.ceil(tm)); make(); } else { w.score = Math.max(0, w.score - 3); cur = []; } } },
      draw() { w.bg('#6b4a2b', '#3a2a1a'); w.box(120, 20, 400, 100, '#fff'); w.tx('Bestellung (in dieser Reihenfolge):', 320, 36, 13, '#333'); order.forEach((o, i) => w.e(ING[o], 190 + i * 56, 80, 38)); w.box(120, 120, 400 * Math.max(0, tm / 14), 6, tm < 4 ? '#e53935' : '#4cd98a'); w.box(120, 160, 400, 100, '#ddd8'); cur.forEach((o, i) => w.e(ING[o], 190 + i * 56, 210, 38)); ING.forEach((e, k) => { w.box(50 + k * 76 + 4, 305, 68, 60, '#ffffff33'); w.e(e, 50 + k * 76 + 38, 335, 38); }); w.box(50 + 6 * 76 + 4, 305, 68, 60, '#555'); w.tx('⌫', 50 + 6 * 76 + 38, 335, 22); w.box(50 + 7 * 76 + 4, 305, 68, 60, '#2e7d32'); w.tx('Servieren', 50 + 7 * 76 + 38, 335, 12); },
      pub() { return {}; }
    };
  });

  reg('bowling', 'Bowling', '🎳', S, 'Wähle Position und Winkel – wirf einen Strike!', 'Klick 1: Position · Klick 2: Winkel (10 Würfe)', { dur: 120 }, w => {
    let st = 'pos', bx = 320, an = 0, pins, throws = 0, msg = '', ball = null;
    const reset = () => { pins = []; for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) pins.push({ x: 320 + (c - r / 2) * 30, y: 70 + r * 26, d: false }); }; reset();
    return {
      step(dt) {
        if (st === 'pos') { bx = 320 + Math.sin(w.t * 2.2) * 100; if (flap(w)) st = 'ang'; }
        else if (st === 'ang') { an = Math.sin(w.t * 3) * 0.25; if (flap(w)) { st = 'roll'; ball = { x: bx, y: 360, vx: Math.sin(an) * 420, vy: -420 }; } }
        else if (st === 'roll') { ball.x += ball.vx * dt; ball.y += ball.vy * dt; for (const p of pins) if (!p.d && w.hit(ball.x, ball.y, p.x, p.y, 20)) { p.d = true; ball.vx += (p.x - ball.x) * 2; } if (ball.y < 40) { const n = pins.filter(p => p.d).length; w.add(n * 10 + (n === 10 ? 20 : 0)); msg = n === 10 ? 'STRIKE!' : n + ' Pins'; throws++; reset(); st = 'pos'; ball = null; if (throws >= 10) w.finish(); } }
      },
      draw() { w.bg('#3a2a1a', '#6b4a2b'); w.box(220, 0, 200, 400, '#d7b377'); pins.forEach(p => { if (!p.d) w.e('🎳', p.x, p.y, 24); }); w.e('🟣', ball ? ball.x : bx, ball ? ball.y : 360, 30); if (st === 'ang') { w.g.strokeStyle = '#fff'; w.g.beginPath(); w.g.moveTo(bx, 360); w.g.lineTo(bx + Math.sin(an) * 280, 80); w.g.stroke(); } w.tx(msg, 320, 20, 20, '#ffe9a8'); w.tx(`Wurf ${Math.min(10, throws + 1)}/10`, 540, 20, 14); },
      pub() { return { x: ball ? ball.x : bx, y: ball ? ball.y : 360, e: '🟣', z: 16 }; }
    };
    function flap(w) { return w.inp.e.space || w.inp.tap; }
  });

  reg('basketball', 'Basketball', '🏀', S, 'Stoppe den Kraftbalken im grünen Bereich für den perfekten Wurf!', 'Leertaste / Klick = werfen', { dur: 40 }, w => {
    let pw = 0, dir = 1, zone = w.r(0.5, 0.85), ball = null, msg = '', sp = 1.1;
    return {
      step(dt) {
        if (!ball) { pw += dir * sp * dt; if (pw > 1 || pw < 0) { dir *= -1; pw = w.clamp(pw, 0, 1); } if (w.inp.e.space || w.inp.tap) { const d = Math.abs(pw - zone), pts = d < 0.04 ? 3 : d < 0.09 ? 2 : 0; ball = { t: 0, ok: pts }; msg = pts === 3 ? 'SWISH! +3' : pts === 2 ? 'Treffer +2' : 'Daneben!'; if (pts) w.add(pts + Math.floor((w.score) / 12)); } }
        else { ball.t += dt; if (ball.t > 1) { ball = null; zone = w.r(0.45, 0.9); sp = Math.min(2, sp + 0.04); } }
      },
      draw() { w.bg('#2b2b3a', '#454560'); w.box(0, 340, 640, 60, '#c8863a'); w.box(500, 100, 8, 150, '#ccc'); w.box(440, 140, 60, 6, '#ff7043'); w.e('🧍', 140, 310, 70); const t = ball ? ball.t : 0; const bx = 160 + t * 300, by = 280 - Math.sin(t * Math.PI) * 140 - (ball && ball.ok ? t * 60 : -t * 60); w.e('🏀', bx, by, 28); w.box(150, 372, 340, 14, '#333'); w.box(150 + zone * 340 - 14, 372, 28, 14, '#4cd98a'); w.box(150 + pw * 340 - 3, 366, 6, 26, '#fff'); w.tx(msg, 320, 40, 22, '#ffe9a8'); },
      pub() { return {}; }
    };
  });

  reg('mini-golf', 'Mini Golf', '⛳', S, 'Ziehe zurück und lass los – bringe den Ball mit wenig Schlägen ins Loch.', 'Maustaste gedrückt halten, nach hinten ziehen, loslassen', { dur: 120 }, w => {
    const holes = []; for (let i = 0; i < 3; i++) { const hole = { x: w.r(380, 600), y: w.r(60, 340) }; const wall = { x: w.r(250, 330), y: w.r(80, 220), w: 16, h: 140 }; holes.push({ hole, wall }); }
    let hi = 0, bx = 60, by = 200, vx = 0, vy = 0, strokes = 0, aim = null;
    return {
      step(dt) {
        const H = holes[hi], moving = Math.hypot(vx, vy) > 6;
        if (!moving) { if (w.inp.tap) aim = { x: w.inp.tap.x, y: w.inp.tap.y }; if (w.inp.up && aim) { const dx = aim.x - w.inp.x, dy = aim.y - w.inp.y, d = Math.min(150, Math.hypot(dx, dy)); if (d > 8) { const a = Math.atan2(dy, dx); vx = Math.cos(a) * d * 4.2; vy = Math.sin(a) * d * 4.2; strokes++; } aim = null; } }
        else { bx += vx * dt; by += vy * dt; vx *= Math.pow(0.45, dt); vy *= Math.pow(0.45, dt); if (bx < 10 || bx > 630) { vx *= -0.8; bx = w.clamp(bx, 10, 630); } if (by < 10 || by > 390) { vy *= -0.8; by = w.clamp(by, 10, 390); } const k = H.wall; if (bx > k.x - 8 && bx < k.x + k.w + 8 && by > k.y - 8 && by < k.y + k.h + 8) { if (Math.abs(bx - (k.x + k.w / 2)) / (k.w / 2 + 8) > Math.abs(by - (k.y + k.h / 2)) / (k.h / 2 + 8)) { vx *= -0.8; bx += Math.sign(vx) * 4; } else { vy *= -0.8; by += Math.sign(vy) * 4; } } if (Math.hypot(vx, vy) < 120 && w.hit(bx, by, H.hole.x, H.hole.y, 14)) { w.add(Math.max(10, 60 - strokes * 8)); hi++; strokes = 0; bx = 60; by = 200; vx = vy = 0; if (hi >= 3) w.finish(); } }
        if (moving && Math.hypot(vx, vy) <= 6) { vx = vy = 0; }
      },
      draw() { const H = holes[Math.min(hi, 2)]; w.bg('#2e7d32', '#43a047'); w.circ(H.hole.x, H.hole.y, 13, '#111'); w.box(H.wall.x, H.wall.y, H.wall.w, H.wall.h, '#6d4c41'); w.e('🚩', H.hole.x, H.hole.y - 14, 22); if (aim) { w.g.strokeStyle = '#fff'; w.g.beginPath(); w.g.moveTo(bx, by); w.g.lineTo(bx + (aim.x - w.inp.x), by + (aim.y - w.inp.y)); w.g.stroke(); } w.circ(bx, by, 8, '#fff'); w.tx(`Loch ${Math.min(3, hi + 1)}/3 · Schläge ${strokes}`, 10, 390, 13, '#fff', 'left'); },
      pub() { return { x: bx, y: by, e: '⚪', z: 18 }; }
    };
  });

  reg('archery', 'Archery', '🏹', S, 'Ziele auf die Scheibe – der Wind weht und deine Hand wackelt!', 'Maus bewegen · Klick = schießen (10 Pfeile)', { dur: 90 }, w => {
    let shots = [], n = 0, wind = w.r(-1, 1);
    return {
      step() { if (w.inp.tap && n < 10) { const sx = Math.sin(w.t * 3.1) * 14 + wind * 18, sy = Math.cos(w.t * 2.3) * 14; const x = w.inp.x + sx, y = w.inp.y + sy, d = Math.hypot(x - 320, y - 200), pts = d < 12 ? 10 : Math.max(0, 10 - Math.floor(d / 14)); w.add(pts); shots.push({ x, y }); n++; wind = w.r(-1, 1); if (n >= 10) w.finish(); } },
      draw() { w.bg('#5ec8ff', '#d8f3ff'); [100, 85, 70, 55, 40, 25, 12].forEach((r, i) => w.circ(320, 200, r, ['#fff', '#222', '#1e88e5', '#e53935', '#fdd835'][Math.min(4, Math.floor(i / 1.6))] === '#fff' ? '#eee' : ['#eee', '#222', '#222', '#1e88e5', '#1e88e5', '#e53935', '#fdd835'][i])); shots.forEach(s => w.circ(s.x, s.y, 4, '#8b0000')); if (n < 10) { const sx = Math.sin(w.t * 3.1) * 14 + wind * 18, sy = Math.cos(w.t * 2.3) * 14; w.g.strokeStyle = '#000'; w.g.lineWidth = 2; w.g.beginPath(); w.g.arc(w.inp.x + sx, w.inp.y + sy, 12, 0, 7); w.g.moveTo(w.inp.x + sx - 18, w.inp.y + sy); w.g.lineTo(w.inp.x + sx + 18, w.inp.y + sy); w.g.moveTo(w.inp.x + sx, w.inp.y + sy - 18); w.g.lineTo(w.inp.x + sx, w.inp.y + sy + 18); w.g.stroke(); } w.tx('💨 ' + (wind > 0 ? '→' : '←').repeat(1 + Math.floor(Math.abs(wind) * 3)), 60, 20, 18); w.tx(`Pfeil ${Math.min(10, n + 1)}/10`, 580, 20, 14); },
      pub() { return { x: w.inp.x, y: w.inp.y, e: '🎯', z: 22 }; }
    };
  });

  reg('penalty-kick', 'Penalty Kick', '⚽', S, 'Schieße Elfmeter – der Torwart springt (für alle gleich) in eine Ecke!', 'Klicke in die Torecke, in die du schießen willst', { dur: 60 }, w => {
    let n = 0, msg = '', keeper = w.ri(0, 6), shot = -1, ft = 0;
    return {
      step(dt) { if (shot >= 0) { ft -= dt; if (ft <= 0) { shot = -1; keeper = w.ri(0, 6); if (n >= 8) w.finish(); } return; } const t = w.inp.tap; if (t && t.x > 160 && t.x < 480 && t.y > 80 && t.y < 260) { const z = Math.floor((t.x - 160) / 107) + 3 * Math.floor((t.y - 80) / 90); shot = z; ft = 1; n++; if (z !== keeper) { w.add(10); msg = 'TOOOR!'; } else msg = 'Gehalten!'; } },
      draw() { w.bg('#2e7d32', '#43a047'); w.box(160, 80, 320, 180, '#ffffff22'); w.g.strokeStyle = '#fff'; w.g.lineWidth = 5; w.g.strokeRect(160, 80, 320, 180); for (let z = 0; z < 6; z++) { w.g.strokeStyle = '#ffffff22'; w.g.strokeRect(160 + (z % 3) * 107, 80 + Math.floor(z / 3) * 90, 107, 90); } const kz = shot >= 0 ? keeper : 1; w.e('🧤', 160 + (kz % 3) * 107 + 53, 80 + Math.floor(kz / 3) * 90 + 45, 56); w.e('⚽', shot >= 0 ? 160 + (shot % 3) * 107 + 53 : 320, shot >= 0 ? 80 + Math.floor(shot / 3) * 90 + 45 : 340, 32); w.tx(msg, 320, 300, 28, '#ffe9a8'); w.tx(`Schuss ${Math.min(8, n + (shot >= 0 ? 0 : 1))}/8`, 580, 20, 14); },
      pub() { return {}; }
    };
  });

  reg('darts', 'Darts', '🎯', S, 'Das Fadenkreuz wandert – drücke im richtigen Moment ab!', 'Leertaste / Klick = werfen (9 Darts)', { dur: 90 }, w => {
    let n = 0, hits = [], msg = '';
    const cx = () => 320 + Math.sin(w.t * 2.1 + 1) * (60 + n * 6) + Math.sin(w.t * 5.3) * 20, cy = () => 200 + Math.cos(w.t * 1.7) * (60 + n * 6) + Math.cos(w.t * 4.1) * 20;
    return {
      step() { if (flap(w) && n < 9) { const x = cx(), y = cy(), d = Math.hypot(x - 320, y - 200), pts = d < 10 ? 50 : d < 24 ? 25 : d < 70 ? 10 : d < 110 ? 5 : 0; w.add(pts); hits.push({ x, y }); msg = pts ? '+' + pts : 'Daneben'; n++; if (n >= 9) w.finish(); } },
      draw() { w.bg('#222', '#222'); [140, 110, 70, 24, 10].forEach((r, i) => w.circ(320, 200, r, ['#333', '#1e88e5', '#43a047', '#e53935', '#fdd835'][i])); hits.forEach(h => w.circ(h.x, h.y, 4, '#fff')); if (n < 9) { w.g.strokeStyle = '#fff'; w.g.lineWidth = 2; const x = cx(), y = cy(); w.g.beginPath(); w.g.arc(x, y, 12, 0, 7); w.g.moveTo(x - 20, y); w.g.lineTo(x + 20, y); w.g.moveTo(x, y - 20); w.g.lineTo(x, y + 20); w.g.stroke(); } w.tx(msg, 320, 30, 24, '#ffe9a8'); w.tx(`Dart ${Math.min(9, n + 1)}/9`, 580, 20, 14); },
      pub() { return {}; }
    };
    function flap(w) { return w.inp.e.space || w.inp.tap; }
  });

  reg('hangman', 'Hangman', '🪢', Q, 'Rate das Wort Buchstabe für Buchstabe – 7 Fehler sind erlaubt.', 'Buchstaben tippen', { dur: 90 }, w => {
    let word, used, wrong;
    const next = () => { word = w.pick(WORDS); used = new Set(); wrong = 0; }; next();
    return {
      step() { for (const c of w.inp.chars) { const L = c.toUpperCase(); if (!/^[A-Z]$/.test(L) || used.has(L)) continue; used.add(L); if (word.includes(L)) { w.add(2); if (word.split('').every(x => used.has(x))) { w.add(word.length * 3); next(); break; } } else if (++wrong >= 7) { w.score = Math.max(0, w.score - 5); next(); break; } } },
      draw() { w.bg('#10182f', '#1d2b53'); w.tx(word.split('').map(x => used.has(x) ? x : '_').join(' '), 320, 150, 44); w.tx('Falsch: ' + [...used].filter(x => !word.includes(x)).join(' '), 320, 230, 22, '#ff8080'); w.tx('❤️'.repeat(7 - wrong) + '🖤'.repeat(wrong), 320, 290, 24); },
      pub() { return {}; }
    };
  });

  reg('number-memory', 'Number Memory', '🧠', Q, 'Merke dir die Zahl, bevor sie verschwindet!', 'Zahl tippen · Enter bestätigen', { dur: 90 }, w => {
    let n = 3, num = '', ph = 'show', tm, ans = '';
    const make = () => { num = ''; for (let i = 0; i < n; i++) num += w.ri(0, 10); ph = 'show'; tm = 1 + n * 0.55; ans = ''; }; make();
    return {
      step(dt) { if (ph === 'show') { tm -= dt; if (tm <= 0) ph = 'ask'; return; } for (const c of w.inp.chars) { if (c === '\b') ans = ans.slice(0, -1); else if (/\d/.test(c) && ans.length < 20) ans += c; } if (w.inp.e.enter) { if (ans === num) { w.add(n * 10); n++; make(); } else w.die(); } },
      draw() { w.bg('#10182f', '#1d2b53'); if (ph === 'show') { w.tx(num, 320, 170, 56); w.box(120, 240, 400 * Math.max(0, tm / (1 + n * 0.55)), 6, '#ffd166'); } else { w.tx('Welche Zahl war es?', 320, 110, 24); w.tx(ans || '…', 320, 200, 48, '#ffe9a8'); } w.tx('Länge: ' + n, 70, 20, 14); },
      pub() { return {}; }
    };
  });

  reg('high-low', 'Higher or Lower', '🃏', Q, 'Ist die nächste Karte höher oder niedriger? Alle ziehen dieselben Karten!', '↑ höher · ↓ niedriger', { dur: 60 }, w => {
    let cur = w.ri(1, 14), nxt = null, streak = 0, reveal = 0;
    const lab = v => ({ 1: 'A', 11: 'B', 12: 'D', 13: 'K' }[v] || v);
    return {
      step(dt) { if (reveal > 0) { reveal -= dt; if (reveal <= 0) { cur = nxt; nxt = null; } return; } const e = w.inp.e; let g = e.up ? 1 : e.down ? -1 : 0; const t = w.inp.tap; if (t) g = t.y < 200 ? 1 : -1; if (!g) return; nxt = w.ri(1, 14); if (nxt === cur || (g > 0 && nxt > cur) || (g < 0 && nxt < cur)) { streak++; w.add(10 * streak); reveal = 0.6; } else { reveal = 0.9; w.die(); } },
      draw() { w.bg('#0b5d1e', '#157a2d'); w.box(190, 100, 110, 160, '#fff'); w.tx(lab(cur) + '', 245, 180, 56, '#222'); w.box(340, 100, 110, 160, nxt ? '#fff' : '#3b5bdb'); w.tx(nxt ? lab(nxt) + '' : '?', 395, 180, 56, nxt ? '#222' : '#fff'); w.tx('⬆ Höher (oben klicken)', 320, 60, 15, '#cfc'); w.tx('⬇ Niedriger (unten klicken)', 320, 320, 15, '#cfc'); w.tx('Serie: ' + streak, 70, 20, 15); },
      pub() { return {}; }
    };
  });

  reg('dice-duel', 'Dice Duel', '🎲', Q, 'Würfle 5 Würfel (3 Versuche, Würfel festhalten) – wer die beste Kombi hat, gewinnt.', 'Würfel anklicken = festhalten · Leertaste = würfeln · Enter = werten', { dur: 120 }, w => {
    let d = [0, 0, 0, 0, 0], hold = [false, false, false, false, false], rolls = 0, turn = 0, msg = '';
    const roll = () => { for (let i = 0; i < 5; i++) if (!hold[i]) d[i] = w.ri(1, 7); rolls++; };
    const val = () => { const c = {}; d.forEach(v => c[v] = (c[v] || 0) + 1); const m = Math.max(...Object.values(c)), s = [...d].sort().join(''), sum = d.reduce((a, b) => a + b, 0); if (m === 5) return [sum + 50, 'FÜNFLING!']; if (m === 4) return [sum + 25, 'Vierling']; if (m === 3 && Object.values(c).includes(2)) return [sum + 20, 'Full House']; if (s === '12345' || s === '23456') return [sum + 30, 'Straße']; if (m === 3) return [sum + 10, 'Drilling']; return [sum, 'Summe']; };
    const score = () => { const [p, n] = val(); w.add(p); msg = n + ' +' + p; turn++; rolls = 0; hold = hold.map(() => false); d = d.map(() => 0); if (turn >= 5) w.finish(); };
    return {
      step() { if (w.inp.e.space && rolls < 3 && turn < 5) roll(); if (w.inp.e.enter && rolls > 0) score(); const t = w.inp.tap; if (t && rolls > 0 && rolls < 3 && t.y > 150 && t.y < 250) { const i = Math.floor((t.x - 120) / 80); if (i >= 0 && i < 5) hold[i] = !hold[i]; } },
      draw() { w.bg('#0b5d1e', '#157a2d'); d.forEach((v, i) => { w.box(120 + i * 80 + 4, 160, 72, 72, hold[i] ? '#ffd166' : '#fff'); w.tx(v ? '⚀⚁⚂⚃⚄⚅'[v - 1] : '?', 120 + i * 80 + 40, 196, 56, '#222'); }); w.tx(`Runde ${Math.min(5, turn + 1)}/5 · Würfe ${rolls}/3`, 320, 60, 18); w.tx(msg, 320, 300, 22, '#ffe9a8'); w.tx(rolls ? (rolls < 3 ? 'Leertaste = nochmal · Enter = werten' : 'Enter = werten') : 'Leertaste = würfeln', 320, 350, 14, '#cfc'); },
      pub() { return {}; }
    };
  });

  reg('sprint-100m', 'Sprint 100m', '🏃', S, 'Hämmere abwechselnd ← und → (oder links/rechts tippen) und renne 100 Meter!', '← → abwechselnd drücken', { dur: 30 }, w => {
    let d = 0, last = '', t0 = 0, done = false;
    return {
      noGhost: true,
      step(dt) { const e = w.inp.e; let k = e.left ? 'l' : e.right ? 'r' : ''; if (w.inp.tap) k = w.inp.tap.x < 320 ? 'l' : 'r'; if (k && k !== last) { last = k; d += 1.3; } d = Math.max(0, d - 4 * dt); if (d >= 100) { w.score = Math.max(10, 1000 - Math.floor(w.t * 60)); w.finish(); } },
      draw() { w.bg('#2e7d32', '#43a047'); const lanes = [['Du', d]].concat(Object.entries(w.others).map(([n, o]) => [n, o.d || 0])).slice(0, 8); lanes.forEach(([n, v], i) => { const y = 40 + i * 42; w.box(30, y, 580, 34, i ? '#ffffff22' : '#ffffff55'); w.e(i ? '🏃' : '🏃‍♂️', 40 + v * 5.6, y + 17, 26); w.tx(n, 600, y + 17, 12, '#fff', 'right'); }); w.box(610, 30, 4, 360, '#fff'); w.tx(Math.floor(d) + ' m', 320, 385, 14); },
      pub() { return { d }; }
    };
  });
})();
