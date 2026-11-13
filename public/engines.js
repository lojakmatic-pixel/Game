/* BlockVerse Engines – laufen im sandboxed iframe.
   Jede Engine: function(P, cfg). P = Platform-SDK (canvas, ctx, save, load, score). */
(function (root) {
  'use strict';
  const E = {};
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function fmt(n) {
    if (n < 1000) return (Math.floor(n * 10) / 10 % 1 === 0 ? Math.floor(n) : n.toFixed(1)) + '';
    const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
    let i = 0; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i];
  }

  function bg(g, W, H, cfg) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, (cfg.bg || ['#1b2a49', '#3a6ea5'])[0]);
    gr.addColorStop(1, (cfg.bg || ['#1b2a49', '#3a6ea5'])[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  function emoji(g, ch, x, y, size) {
    g.font = size + 'px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, x, y);
  }
  function text(g, t, x, y, size, color, align) {
    g.font = 'bold ' + size + 'px system-ui, sans-serif'; g.textAlign = align || 'center'; g.textBaseline = 'middle';
    g.fillStyle = color || '#fff'; g.fillText(t, x, y);
  }

  /* ---------- Gemeinsamer Arcade-Kern ---------- */
  function core(P, cfg, d) {
    const c = P.canvas, g = P.ctx, W = c.width, H = c.height;
    const inp = { keys: {}, edge: {}, px: W / 2, py: H / 2, down: false, tap: null };
    const norm = k => ({ ' ': 'space', arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' }[k.toLowerCase()] || k.toLowerCase());
    addEventListener('keydown', e => {
      const k = norm(e.key);
      if (['space', 'left', 'right', 'up', 'down'].includes(k)) e.preventDefault();
      if (!inp.keys[k]) inp.edge[k] = true;
      inp.keys[k] = true;
    });
    addEventListener('keyup', e => { inp.keys[norm(e.key)] = false; });
    function pos(e) {
      const r = c.getBoundingClientRect(), t = e.touches ? e.touches[0] || e.changedTouches[0] : e;
      inp.px = (t.clientX - r.left) * W / r.width; inp.py = (t.clientY - r.top) * H / r.height;
    }
    c.addEventListener('mousemove', pos);
    c.addEventListener('touchmove', e => { pos(e); e.preventDefault(); }, { passive: false });
    function down(e) { pos(e); inp.down = true; inp.tap = { x: inp.px, y: inp.py }; inp.edge.space = true; if (inp.px < W / 2) inp.edge.left = true; else inp.edge.right = true; e.preventDefault(); }
    c.addEventListener('mousedown', down);
    c.addEventListener('touchstart', down, { passive: false });
    addEventListener('mouseup', () => { inp.down = false; });
    addEventListener('touchend', () => { inp.down = false; });
    c.tabIndex = 0; c.focus();

    let s = null, best = 0, mode = 'menu', last = 0;
    const api = { W, H, g, inp, rnd, pick, clamp, emoji: (ch, x, y, sz) => emoji(g, ch, x, y, sz), text: (t, x, y, sz, col, al) => text(g, t, x, y, sz, col, al) };
    function begin() { s = { score: 0, over: false, t: 0 }; d.reset(s, api); mode = 'play'; }
    function finish() {
      mode = 'over'; api.lock = performance.now() + 700;
      const sc = Math.floor(s.score);
      if (sc > best) { best = sc; P.save({ best }); }
      P.score(sc);
    }
    P.load().then(v => { best = (v && v.best) || 0; });
    function frame(ts) {
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
      bg(g, W, H, cfg);
      if (mode === 'play') {
        s.t += dt; d.update(s, dt, api);
        if (s.over) finish();
      } else if (!s) { /* Menü */ }
      if (s) d.draw(s, api);
      if (mode === 'play' || mode === 'over') {
        text(g, cfg.scoreLabel ? cfg.scoreLabel + ' ' + Math.floor(s.score) : Math.floor(s.score) + '', 12, 20, 22, '#fff', 'left');
        text(g, 'Best ' + best, W - 12, 20, 16, '#ffe9a8', 'right');
      }
      if (mode === 'menu' || mode === 'over') {
        g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H);
        emoji(g, cfg.icon || '🎮', W / 2, H / 2 - 90, 64);
        text(g, mode === 'over' ? 'Game Over – ' + Math.floor(s.score) : cfg.title || 'Spiel', W / 2, H / 2 - 30, 30);
        text(g, cfg.help || 'Klicken oder Leertaste', W / 2, H / 2 + 10, 16, '#ddd');
        text(g, mode === 'over' ? 'Nochmal: Klick / Leertaste' : 'Start: Klick / Leertaste', W / 2, H / 2 + 48, 18, '#ffe9a8');
        text(g, 'Best: ' + best, W / 2, H / 2 + 80, 14, '#aaa');
        if (inp.edge.space && performance.now() > (api.lock || 0)) begin();
      }
      inp.edge = {}; inp.tap = null;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Runner: über Hindernisse springen ---------- */
  E.runner = function (P, cfg) {
    core(P, cfg, {
      reset(s) { Object.assign(s, { y: 0, vy: 0, obs: [], next: 1, speed: cfg.speed || 260 }); },
      update(s, dt, a) {
        const ground = a.H - 70;
        if ((a.inp.edge.space || a.inp.edge.up) && s.y === 0) s.vy = 560;
        s.vy -= 1500 * dt; s.y = Math.max(0, s.y + s.vy * dt); if (s.y === 0 && s.vy < 0) s.vy = 0;
        s.speed += 6 * dt; s.next -= dt;
        if (s.next <= 0) { s.obs.push({ x: a.W + 30, w: 34 }); s.next = rnd(0.9, 1.7) * 260 / s.speed * 1.3; }
        for (const o of s.obs) { o.x -= s.speed * dt; if (Math.abs(o.x - 80) < 26 && s.y < 40) s.over = true; }
        s.obs = s.obs.filter(o => o.x > -50);
        s.score += dt * 10; s.ground = ground;
      },
      draw(s, a) {
        const g = a.g, gy = a.H - 70;
        g.fillStyle = cfg.ground || '#2d5a27'; g.fillRect(0, gy + 20, a.W, 60);
        a.emoji(cfg.player || '🏃', 80, gy - s.y, 44);
        for (const o of s.obs) a.emoji(cfg.obstacle || '🌵', o.x, gy + 2, 40);
      }
    });
  };

  /* ---------- Flappy ---------- */
  E.flappy = function (P, cfg) {
    core(P, cfg, {
      reset(s) { Object.assign(s, { y: 200, vy: 0, pipes: [], next: 0.5 }); },
      update(s, dt, a) {
        if (a.inp.edge.space || a.inp.edge.up) s.vy = -300;
        s.vy += 900 * dt; s.y += s.vy * dt; s.next -= dt;
        if (s.next <= 0) { s.pipes.push({ x: a.W + 30, gap: rnd(110, a.H - 110), pass: false }); s.next = 1.6; }
        for (const p of s.pipes) {
          p.x -= 160 * dt;
          if (Math.abs(p.x - 100) < 34 && Math.abs(s.y - p.gap) > 58) s.over = true;
          if (!p.pass && p.x < 100) { p.pass = true; s.score++; }
        }
        s.pipes = s.pipes.filter(p => p.x > -50);
        if (s.y < 0 || s.y > a.H) s.over = true;
      },
      draw(s, a) {
        const g = a.g; g.fillStyle = cfg.pipe || '#3cb043';
        for (const p of s.pipes) { g.fillRect(p.x - 28, 0, 56, p.gap - 70); g.fillRect(p.x - 28, p.gap + 70, 56, a.H); }
        a.emoji(cfg.player || '🐦', 100, s.y, 38);
      }
    });
  };

  /* ---------- Dodge: Hindernissen ausweichen ---------- */
  E.dodge = function (P, cfg) {
    core(P, cfg, {
      reset(s, a) { Object.assign(s, { x: a.W / 2, y: a.H - 60, hz: [], next: 0.3 }); },
      update(s, dt, a) {
        const k = a.inp.keys, sp = 340;
        if (k.left) s.x -= sp * dt; if (k.right) s.x += sp * dt; if (k.up) s.y -= sp * dt; if (k.down) s.y += sp * dt;
        if (a.inp.down) { s.x += (a.inp.px - s.x) * Math.min(1, dt * 12); s.y += (a.inp.py - s.y) * Math.min(1, dt * 12); }
        s.x = clamp(s.x, 20, a.W - 20); s.y = clamp(s.y, 20, a.H - 20);
        s.next -= dt; const rate = Math.max(0.12, 0.5 - s.t * 0.006);
        if (s.next <= 0) { s.hz.push({ x: rnd(20, a.W - 20), y: -20, v: rnd(140, 260) + s.t * 4, e: pick(cfg.hazards || ['☄️']) }); s.next = rate; }
        for (const h of s.hz) { h.y += h.v * dt; if (Math.hypot(h.x - s.x, h.y - s.y) < 26) s.over = true; }
        s.hz = s.hz.filter(h => h.y < a.H + 30); s.score += dt * 10;
      },
      draw(s, a) { for (const h of s.hz) a.emoji(h.e, h.x, h.y, 34); a.emoji(cfg.player || '🧍', s.x, s.y, 36); }
    });
  };

  /* ---------- Catch: Dinge auffangen ---------- */
  E.catch = function (P, cfg) {
    core(P, cfg, {
      reset(s, a) { Object.assign(s, { x: a.W / 2, lives: 3, it: [], next: 0.4 }); },
      update(s, dt, a) {
        const k = a.inp.keys;
        if (k.left) s.x -= 420 * dt; if (k.right) s.x += 420 * dt;
        if (a.inp.down) s.x += (a.inp.px - s.x) * Math.min(1, dt * 14);
        s.x = clamp(s.x, 30, a.W - 30); s.next -= dt;
        if (s.next <= 0) { const bad = Math.random() < 0.28; s.it.push({ x: rnd(25, a.W - 25), y: -20, v: rnd(130, 220) + s.t * 3, bad, e: bad ? cfg.bad || '💣' : pick(cfg.good || ['🍎']) }); s.next = Math.max(0.25, 0.8 - s.t * 0.008); }
        for (const i of s.it) {
          i.y += i.v * dt;
          if (i.y > a.H - 60 && i.y < a.H - 20 && Math.abs(i.x - s.x) < 40) { i.dead = true; if (i.bad) { if (--s.lives <= 0) s.over = true; } else s.score++; }
        }
        s.it = s.it.filter(i => !i.dead && i.y < a.H + 30);
      },
      draw(s, a) {
        for (const i of s.it) a.emoji(i.e, i.x, i.y, 32);
        a.emoji(cfg.player || '🧺', s.x, a.H - 40, 56);
        a.text('❤️'.repeat(Math.max(0, s.lives)), a.W / 2, 20, 18);
      }
    });
  };

  /* ---------- Snake ---------- */
  E.snake = function (P, cfg) {
    const G = 20, COLS = 32, ROWS = 20;
    core(P, cfg, {
      reset(s) { Object.assign(s, { body: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], dir: { x: 1, y: 0 }, nd: { x: 1, y: 0 }, food: { x: 20, y: 10 }, acc: 0 }); },
      update(s, dt, a) {
        const e = a.inp.edge;
        if (e.left && s.dir.x === 0) s.nd = { x: -1, y: 0 };
        if (e.right && s.dir.x === 0) s.nd = { x: 1, y: 0 };
        if (e.up && s.dir.y === 0) s.nd = { x: 0, y: -1 };
        if (e.down && s.dir.y === 0) s.nd = { x: 0, y: 1 };
        if (a.inp.tap) { // Touch: relativ zum Kopf
          const h = s.body[0], dx = a.inp.tap.x - (h.x * G + 10), dy = a.inp.tap.y - (h.y * G + 10);
          if (Math.abs(dx) > Math.abs(dy)) { if (s.dir.x === 0) s.nd = { x: Math.sign(dx), y: 0 }; } else if (s.dir.y === 0) s.nd = { x: 0, y: Math.sign(dy) };
        }
        s.acc += dt;
        const step = Math.max(0.055, 0.13 - s.score * 0.002);
        while (s.acc > step) {
          s.acc -= step; s.dir = s.nd;
          const h = { x: s.body[0].x + s.dir.x, y: s.body[0].y + s.dir.y };
          if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || s.body.some(b => b.x === h.x && b.y === h.y)) { s.over = true; return; }
          s.body.unshift(h);
          if (h.x === s.food.x && h.y === s.food.y) { s.score++; s.food = { x: Math.floor(rnd(0, COLS)), y: Math.floor(rnd(0, ROWS)) }; } else s.body.pop();
        }
      },
      draw(s, a) {
        const g = a.g;
        s.body.forEach((b, i) => { g.fillStyle = i ? (cfg.color || '#4cd964') : '#fff'; g.fillRect(b.x * G + 1, b.y * G + 1, G - 2, G - 2); });
        a.emoji(cfg.food || '🍎', s.food.x * G + 10, s.food.y * G + 11, 18);
      }
    });
  };

  /* ---------- Breakout ---------- */
  E.breakout = function (P, cfg) {
    core(P, cfg, {
      reset(s, a) {
        const br = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) br.push({ x: 20 + c * 60, y: 50 + r * 24, w: 56, h: 20, r });
        Object.assign(s, { px: a.W / 2, bx: a.W / 2, by: a.H - 60, vx: 180, vy: -260, br, lives: 3 });
      },
      update(s, dt, a) {
        const k = a.inp.keys;
        if (k.left || k.right) { s.px += (k.right ? 480 : -480) * dt; a.inp.px = s.px; } else s.px += (a.inp.px - s.px) * Math.min(1, dt * 16);
        s.px = clamp(s.px, 45, a.W - 45);
        s.bx += s.vx * dt; s.by += s.vy * dt;
        if (s.bx < 8 || s.bx > a.W - 8) { s.vx *= -1; s.bx = clamp(s.bx, 8, a.W - 8); }
        if (s.by < 8) s.vy = Math.abs(s.vy);
        if (s.vy > 0 && s.by > a.H - 40 && s.by < a.H - 24 && Math.abs(s.bx - s.px) < 52) { s.vy = -Math.abs(s.vy); s.vx = (s.bx - s.px) * 5; }
        if (s.by > a.H) { if (--s.lives <= 0) s.over = true; else { s.bx = s.px; s.by = a.H - 60; s.vy = -260; s.vx = 150; } }
        for (const b of s.br) if (!b.dead && s.bx > b.x && s.bx < b.x + b.w && s.by > b.y && s.by < b.y + b.h) { b.dead = true; s.vy *= -1; s.score += 10; break; }
        if (s.br.every(b => b.dead)) { s.br.forEach(b => b.dead = false); s.vy = -Math.abs(s.vy) * 1.1; s.score += 100; }
      },
      draw(s, a) {
        const g = a.g, cols = cfg.rows || ['#ff5252', '#ffb142', '#ffd32a', '#32ff7e', '#18dcff'];
        for (const b of s.br) if (!b.dead) { g.fillStyle = cols[b.r % cols.length]; g.fillRect(b.x, b.y, b.w, b.h); }
        g.fillStyle = '#fff'; g.fillRect(s.px - 45, a.H - 30, 90, 10);
        a.emoji(cfg.ball || '⚽', s.bx, s.by, 18);
        a.text('❤️'.repeat(s.lives), a.W / 2, 20, 16);
      }
    });
  };

  /* ---------- Shooter ---------- */
  E.shooter = function (P, cfg) {
    core(P, cfg, {
      reset(s, a) { Object.assign(s, { x: a.W / 2, sh: [], en: [], next: 0.5, cd: 0 }); },
      update(s, dt, a) {
        const k = a.inp.keys;
        if (k.left) s.x -= 380 * dt; if (k.right) s.x += 380 * dt;
        if (a.inp.down) s.x += (a.inp.px - s.x) * Math.min(1, dt * 12);
        s.x = clamp(s.x, 25, a.W - 25);
        s.cd -= dt;
        if ((k.space || a.inp.down) && s.cd <= 0) { s.sh.push({ x: s.x, y: a.H - 70 }); s.cd = 0.22; }
        s.next -= dt;
        if (s.next <= 0) { s.en.push({ x: rnd(25, a.W - 25), y: -20, v: rnd(60, 110) + s.t * 2, e: pick(cfg.enemies || ['👾']) }); s.next = Math.max(0.3, 1 - s.t * 0.01); }
        for (const b of s.sh) b.y -= 520 * dt;
        for (const e of s.en) {
          e.y += e.v * dt;
          if (e.y > a.H - 40) s.over = true;
          for (const b of s.sh) if (!b.dead && !e.dead && Math.abs(b.x - e.x) < 22 && Math.abs(b.y - e.y) < 22) { b.dead = e.dead = true; s.score += 10; }
        }
        s.sh = s.sh.filter(b => !b.dead && b.y > -10); s.en = s.en.filter(e => !e.dead);
      },
      draw(s, a) {
        const g = a.g; g.fillStyle = '#ffe66d';
        for (const b of s.sh) g.fillRect(b.x - 2, b.y - 8, 4, 12);
        for (const e of s.en) a.emoji(e.e, e.x, e.y, 34);
        a.emoji(cfg.player || '🚀', s.x, a.H - 40, 44);
      }
    });
  };

  /* ---------- Memory ---------- */
  E.memory = function (P, cfg) {
    core(P, cfg, {
      reset(s, a) {
        const set = (cfg.cards || ['🍎', '🍌', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍']).slice(0, 8);
        const deck = set.concat(set).sort(() => Math.random() - 0.5).map((e, i) => ({ e, i, open: false, done: false }));
        Object.assign(s, { deck, sel: [], wait: 0, moves: 0, score: 1000 });
      },
      update(s, dt, a) {
        if (s.wait > 0) { s.wait -= dt; if (s.wait <= 0) { s.sel.forEach(c => c.open = false); s.sel = []; } return; }
        const t = a.inp.tap; if (!t) return;
        const col = Math.floor((t.x - 120) / 100), row = Math.floor((t.y - 20) / 90);
        if (col < 0 || col > 3 || row < 0 || row > 3) return;
        const c = s.deck[row * 4 + col];
        if (c.open || c.done) return;
        c.open = true; s.sel.push(c);
        if (s.sel.length === 2) {
          s.moves++; s.score = Math.max(100, 1000 - s.moves * 35);
          if (s.sel[0].e === s.sel[1].e) { s.sel.forEach(x => x.done = true); s.sel = []; if (s.deck.every(x => x.done)) s.over = true; } else s.wait = 0.8;
        }
      },
      draw(s, a) {
        const g = a.g;
        s.deck.forEach((c, i) => {
          const x = 120 + (i % 4) * 100 + 4, y = 20 + Math.floor(i / 4) * 90 + 4;
          g.fillStyle = c.done ? 'rgba(80,200,120,.5)' : c.open ? '#fff' : cfg.back || '#3b5bdb'; g.fillRect(x, y, 92, 82);
          if (c.open || c.done) a.emoji(c.e, x + 46, y + 42, 44); else a.text('?', x + 46, y + 42, 34, '#ffffff88');
        });
      }
    });
  };

  /* ---------- Whack-a-Mole ---------- */
  E.whack = function (P, cfg) {
    core(P, cfg, {
      reset(s) { Object.assign(s, { h: Array.from({ length: 9 }, () => ({ t: 0, bad: false })), next: 0.3, left: 30 }); },
      update(s, dt, a) {
        s.left -= dt; if (s.left <= 0) { s.over = true; return; }
        s.next -= dt;
        if (s.next <= 0) { const h = pick(s.h); if (h.t <= 0) { h.t = rnd(0.6, 1.2); h.bad = Math.random() < 0.2; } s.next = Math.max(0.25, 0.7 - s.t * 0.012); }
        for (const h of s.h) h.t -= dt;
        const t = a.inp.tap;
        if (t) s.h.forEach((h, i) => {
          const x = 180 + (i % 3) * 140, y = 100 + Math.floor(i / 3) * 110;
          if (h.t > 0 && Math.hypot(t.x - x, t.y - y) < 48) { h.t = 0; s.score = Math.max(0, s.score + (h.bad ? -5 : 1)); }
        });
      },
      draw(s, a) {
        const g = a.g;
        s.h.forEach((h, i) => {
          const x = 180 + (i % 3) * 140, y = 100 + Math.floor(i / 3) * 110;
          g.fillStyle = '#3b2a1a'; g.beginPath(); g.ellipse(x, y + 28, 52, 18, 0, 0, 7); g.fill();
          if (h.t > 0) a.emoji(h.bad ? cfg.bad || '💣' : cfg.target || '🐹', x, y, 52);
        });
        a.text('⏱ ' + Math.ceil(s.left), a.W / 2, 20, 18);
      }
    });
  };

  /* ---------- Climber (Obby/Doodle) ---------- */
  E.climber = function (P, cfg) {
    core(P, cfg, {
      reset(s, a) {
        const pl = []; for (let i = 0; i < 9; i++) pl.push({ x: rnd(0, a.W - 80), y: a.H - i * 55, w: 80 });
        Object.assign(s, { x: a.W / 2, y: a.H - 80, vy: -450, pl, cam: 0, high: 0 });
        pl[0].x = a.W / 2 - 40;
      },
      update(s, dt, a) {
        const k = a.inp.keys;
        if (k.left) s.x -= 320 * dt; if (k.right) s.x += 320 * dt;
        if (a.inp.down) s.x += (a.inp.px - s.x) * Math.min(1, dt * 10);
        if (s.x < -10) s.x = a.W + 10; if (s.x > a.W + 10) s.x = -10;
        const oy = s.y; s.vy += 1000 * dt; s.y += s.vy * dt;
        if (s.vy > 0) for (const p of s.pl) if (oy + 20 <= p.y + 4 && s.y + 20 >= p.y && s.x > p.x - 10 && s.x < p.x + p.w + 10) { s.vy = -520; }
        if (s.y < a.H / 2 - s.cam) { const d = a.H / 2 - s.cam - s.y; s.cam += d; s.score = Math.max(s.score, s.cam / 10); }
        const top = Math.min(...s.pl.map(p => p.y));
        s.pl = s.pl.filter(p => p.y < a.H - s.cam + 60);
        for (let y = top; y > -s.cam - 60; y -= rnd(48, 66 + Math.min(40, s.cam / 80))) s.pl.push({ x: rnd(0, a.W - 80), y: y - 55, w: Math.max(50, 80 - s.cam / 300) });
        if (s.y + s.cam > a.H + 40) s.over = true;
      },
      draw(s, a) {
        const g = a.g; g.fillStyle = cfg.plat || '#8bc34a';
        for (const p of s.pl) g.fillRect(p.x, p.y + s.cam, p.w, 10);
        a.emoji(cfg.player || '🧗', s.x, s.y + s.cam, 38);
      }
    });
  };

  /* ---------- Maze/Chase: Münzen sammeln, Jägern entkommen ---------- */
  E.chase = function (P, cfg) {
    core(P, cfg, {
      reset(s, a) {
        Object.assign(s, { x: a.W / 2, y: a.H / 2, coin: { x: 100, y: 100 }, en: [{ x: 40, y: 40 }, { x: a.W - 40, y: a.H - 40 }] });
      },
      update(s, dt, a) {
        const k = a.inp.keys, sp = 230;
        if (k.left) s.x -= sp * dt; if (k.right) s.x += sp * dt; if (k.up) s.y -= sp * dt; if (k.down) s.y += sp * dt;
        if (a.inp.down) { const dx = a.inp.px - s.x, dy = a.inp.py - s.y, d = Math.hypot(dx, dy) || 1; if (d > 6) { s.x += dx / d * sp * dt; s.y += dy / d * sp * dt; } }
        s.x = clamp(s.x, 18, a.W - 18); s.y = clamp(s.y, 18, a.H - 18);
        if (Math.hypot(s.x - s.coin.x, s.y - s.coin.y) < 28) {
          s.score++; s.coin = { x: rnd(30, a.W - 30), y: rnd(40, a.H - 30) };
          if (s.score % 3 === 0 && s.en.length < 7) s.en.push({ x: pick([30, a.W - 30]), y: pick([30, a.H - 30]) });
        }
        for (const e of s.en) {
          const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy) || 1, v = 70 + s.score * 4 + Math.min(40, s.t);
          e.x += dx / d * v * dt; e.y += dy / d * v * dt;
          if (d < 26) s.over = true;
        }
      },
      draw(s, a) {
        a.emoji(cfg.coin || '🪙', s.coin.x, s.coin.y, 30);
        for (const e of s.en) a.emoji(cfg.enemy || '👻', e.x, e.y, 36);
        a.emoji(cfg.player || '🧍', s.x, s.y, 36);
      }
    });
  };

  /* ---------- Racer: 3 Spuren ---------- */
  E.racer = function (P, cfg) {
    core(P, cfg, {
      reset(s) { Object.assign(s, { lane: 1, cars: [], next: 0.5, off: 0, speed: 300 }); },
      update(s, dt, a) {
        const e = a.inp.edge;
        if (e.left) s.lane = Math.max(0, s.lane - 1);
        if (e.right) s.lane = Math.min(2, s.lane + 1);
        s.speed += 8 * dt; s.off = (s.off + s.speed * dt) % 60; s.next -= dt;
        if (s.next <= 0) { s.cars.push({ lane: Math.floor(rnd(0, 3)), y: -40, e: pick(cfg.cars || ['🚙', '🚕', '🚌']) }); s.next = rnd(0.35, 0.8) * 300 / s.speed * 1.4; }
        for (const c of s.cars) { c.y += (s.speed - 130) * dt; if (c.lane === s.lane && Math.abs(c.y - (a.H - 70)) < 44) s.over = true; }
        s.cars = s.cars.filter(c => c.y < a.H + 40); s.score += s.speed * dt / 30;
      },
      draw(s, a) {
        const g = a.g, L = a.W / 2 - 150;
        g.fillStyle = '#333'; g.fillRect(L, 0, 300, a.H);
        g.fillStyle = '#fff';
        for (let y = -60 + s.off; y < a.H; y += 60) { g.fillRect(L + 98, y, 4, 30); g.fillRect(L + 198, y, 4, 30); }
        for (const c of s.cars) a.emoji(c.e, L + 50 + c.lane * 100, c.y, 48);
        a.emoji(cfg.player || '🏎️', L + 50 + s.lane * 100, a.H - 70, 50);
      }
    });
  };

  /* ---------- Tycoon / Idle ---------- */
  E.tycoon = function (P, cfg) {
    const c = P.canvas, g = P.ctx, W = c.width, H = c.height;
    const heatOn = !!cfg.heat;
    let st = { money: 0, total: 0, owned: cfg.items.map(() => 0), clicks: 0, power: 1, heat: 0, raids: 0, t: Date.now() };
    let ready = false, floaties = [], msg = '', msgT = 0, bounce = 0, dirty = false, lastSave = 0;
    const cost = (it, n) => Math.ceil(it.cost * Math.pow(1.15, n));
    const powerCost = () => Math.ceil(50 * Math.pow(2.6, st.power - 1));
    const income = () => cfg.items.reduce((s, it, i) => s + it.income * st.owned[i], 0) * (heatOn ? 1 : 1);
    const BRIBE = () => Math.max(100, Math.ceil(income() * 25));
    function say(t) { msg = t; msgT = 3; }

    P.load().then(v => {
      if (v && v.owned) {
        st = Object.assign(st, v); while (st.owned.length < cfg.items.length) st.owned.push(0);
        const away = Math.min(8 * 3600, (Date.now() - (v.t || Date.now())) / 1000);
        if (away > 30 && income() > 0) { const e = income() * away * 0.5; st.money += e; st.total += e; say('Willkommen zurück! Offline verdient: ' + cfg.cur + fmt(e)); }
      }
      st.t = Date.now(); ready = true;
    });
    function save() { st.t = Date.now(); P.save(st); P.score(Math.floor(st.total)); dirty = false; lastSave = performance.now(); }

    const ITEM_Y = 62, ROW = 40, X0 = 300;
    function click(x, y) {
      if (!ready) return;
      const bx = 150, by = H / 2 - 20;
      if (Math.hypot(x - bx, y - by) < 85) {
        const gain = st.power; st.money += gain; st.total += gain; st.clicks++; bounce = 1; dirty = true;
        floaties.push({ x: bx + rnd(-30, 30), y: by - 60, t: 1, s: '+' + cfg.cur + fmt(gain) });
        if (heatOn) st.heat = Math.min(100, st.heat + 0.15);
        return;
      }
      if (x > 20 && x < 280 && y > H - 90 && y < H - 56) { // Klick-Upgrade
        const pc = powerCost(); if (st.money >= pc) { st.money -= pc; st.power++; dirty = true; } else say('Zu wenig ' + cfg.curName); return;
      }
      if (heatOn && x > 20 && x < 280 && y > H - 50 && y < H - 16) {
        const b = BRIBE(); if (st.money >= b && st.heat > 0) { st.money -= b; st.heat = Math.max(0, st.heat - 40); dirty = true; say(cfg.bribeMsg || 'Bestochen! Hitze sinkt.'); } else say(st.heat <= 0 ? 'Keine Hitze – nicht nötig' : 'Zu wenig ' + cfg.curName); return;
      }
      cfg.items.forEach((it, i) => {
        const iy = ITEM_Y + i * ROW;
        if (x > X0 && x < W - 10 && y > iy && y < iy + ROW - 4) {
          const cc = cost(it, st.owned[i]);
          if (st.money >= cc) { st.money -= cc; st.owned[i]++; dirty = true; } else say('Zu wenig ' + cfg.curName + ' für ' + it.name);
        }
      });
    }
    c.addEventListener('mousedown', e => { const r = c.getBoundingClientRect(); click((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height); });
    c.addEventListener('touchstart', e => { const r = c.getBoundingClientRect(), t = e.touches[0]; click((t.clientX - r.left) * W / r.width, (t.clientY - r.top) * H / r.height); e.preventDefault(); }, { passive: false });
    addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); click(150, H / 2 - 20); } });
    const flushSave = () => { if (ready && dirty) save(); };
    addEventListener('beforeunload', flushSave); addEventListener('pagehide', flushSave); addEventListener('bv-flush', flushSave);

    let last = performance.now(), heatAcc = 0;
    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const inc = income();
      if (ready) {
        st.money += inc * dt; st.total += inc * dt;
        if (inc > 0) dirty = true;
        if (heatOn) {
          st.heat = Math.min(100, st.heat + (inc > 0 ? Math.log10(inc + 10) * 0.35 * dt : 0));
          if (st.heat >= 100) {
            const lost = st.money * 0.4; st.money -= lost; st.heat = 30; st.raids++; dirty = true;
            say((cfg.raidMsg || '🚨 RAZZIA!') + ' -' + cfg.cur + fmt(lost));
          }
        }
        if (dirty && now - lastSave > 3000) save();
      }
      bg(g, W, H, cfg);
      // Klick-Objekt
      bounce = Math.max(0, bounce - dt * 6);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(150, H / 2 - 20, 85, 0, 7); g.fill();
      emoji(g, cfg.clickEmoji, 150, H / 2 - 20, 90 + bounce * 18);
      text(g, cfg.clickName, 150, H / 2 + 60, 14, '#ddd');
      // Kopf
      text(g, cfg.cur + fmt(st.money), 150, 24, 28, '#ffe9a8');
      text(g, '+' + cfg.cur + fmt(inc) + '/s', 150, 50, 14, '#9fe39f');
      // Klick-Upgrade
      btn(20, H - 90, 260, 34, `⬆ Klickkraft ${st.power} → ${st.power + 1}  (${cfg.cur}${fmt(powerCost())})`, st.money >= powerCost());
      if (heatOn) {
        btn(20, H - 50, 260, 34, `${cfg.bribeName || '🤝 Polizei bestechen'} (${cfg.cur}${fmt(BRIBE())})`, st.money >= BRIBE());
        // Hitzebalken
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(20, 72, 260, 16);
        g.fillStyle = st.heat > 75 ? '#ff3b30' : st.heat > 45 ? '#ff9500' : '#ffd60a'; g.fillRect(20, 72, 260 * st.heat / 100, 16);
        text(g, `🔥 ${cfg.heatName || 'Fahndung'} ${Math.floor(st.heat)}%  (Razzien: ${st.raids})`, 150, 80, 11, '#fff');
      }
      // Items
      cfg.items.forEach((it, i) => {
        const y = ITEM_Y + i * ROW, cc = cost(it, st.owned[i]), can = st.money >= cc;
        g.fillStyle = can ? 'rgba(80,200,120,.35)' : 'rgba(0,0,0,.35)'; g.fillRect(X0, y, W - X0 - 10, ROW - 4);
        emoji(g, it.emoji, X0 + 22, y + 18, 24);
        text(g, `${it.name}  x${st.owned[i]}`, X0 + 44, y + 11, 13, '#fff', 'left');
        text(g, `+${cfg.cur}${fmt(it.income)}/s`, X0 + 44, y + 27, 11, '#9fe39f', 'left');
        text(g, cfg.cur + fmt(cc), W - 18, y + 17, 14, can ? '#ffe9a8' : '#999', 'right');
      });
      text(g, cfg.title, X0 + 150, 20, 18, '#fff');
      for (const f of floaties) { f.y -= 40 * dt; f.t -= dt; g.globalAlpha = Math.max(0, f.t); text(g, f.s, f.x, f.y, 16, '#fff'); g.globalAlpha = 1; }
      floaties = floaties.filter(f => f.t > 0);
      if (msgT > 0) { msgT -= dt; g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(40, H - 130, 440, 30); text(g, msg, 260, H - 115, 14, '#fff'); }
      if (!ready) text(g, 'Lade Spielstand…', W / 2, H / 2, 20);
      requestAnimationFrame(frame);
    }
    function btn(x, y, w, h, t, can) {
      g.fillStyle = can ? 'rgba(80,140,255,.6)' : 'rgba(0,0,0,.4)'; g.fillRect(x, y, w, h);
      text(g, t, x + w / 2, y + h / 2, 12, can ? '#fff' : '#aaa');
    }
    requestAnimationFrame(frame);
  };

  E._util = { fmt, rnd, pick, clamp };
  root.BlockEngines = E;
})(typeof window !== 'undefined' ? window : globalThis);
