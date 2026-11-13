/* BlockVerse Runtime – läuft im sandboxed iframe. Verbindet Spiele (reg(...)) mit Mehrspieler-Räumen.
   Spiel = Fabrik: reg(id, title, icon, cat, desc, help, {mode,dur}, w => ({ step(dt), draw(), pub(), net(ev,from), kv(k,v) })) */
(function (root) {
  'use strict';
  const W = 640, H = 400, REG = {};
  root.reg = (id, title, icon, cat, desc, help, opt, factory) => { REG[id] = { id, title, icon, opt: opt || {}, factory }; };

  function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const canvas = document.getElementById('c'), g = canvas.getContext('2d');
  const post = (t, d, extra) => parent.postMessage(Object.assign({ bv: 1, t, d }, extra), '*');
  let rid = 0; const pend = {};
  const req = (t, d) => new Promise(r => { const id = ++rid; pend[id] = r; parent.postMessage({ bv: 1, id, t, d }, '*'); });

  /* ---------- Eingabe ---------- */
  const inp = { k: {}, e: {}, x: W / 2, y: H / 2, lx: W / 2, ly: H / 2, down: false, tap: null, up: false, chars: [] };
  const ALIAS = { arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down', ' ': 'space' };
  const WASD = { a: 'left', d: 'right', w: 'up', s: 'down' };
  function setKey(name, v) {
    const names = [name]; if (WASD[name]) names.push(WASD[name]);
    for (const n of names) { if (v && !inp.k[n]) inp.e[n] = true; inp.k[n] = v; }
  }
  addEventListener('keydown', e => {
    const n = ALIAS[e.key.toLowerCase()] || e.key.toLowerCase();
    if (['left', 'right', 'up', 'down', 'space'].includes(n)) e.preventDefault();
    if (e.key.length === 1) inp.chars.push(e.key.toLowerCase());
    if (e.key === 'Backspace') inp.chars.push('\b');
    if (!e.repeat) setKey(n, true);
  });
  addEventListener('keyup', e => setKey(ALIAS[e.key.toLowerCase()] || e.key.toLowerCase(), false));
  addEventListener('blur', () => { inp.k = {}; });
  function pos(e) { const r = canvas.getBoundingClientRect(), t = e.touches ? (e.touches[0] || e.changedTouches[0]) : e; inp.x = (t.clientX - r.left) * W / r.width; inp.y = (t.clientY - r.top) * H / r.height; }
  canvas.addEventListener('mousemove', pos);
  canvas.addEventListener('mousedown', e => { pos(e); inp.down = true; inp.tap = { x: inp.x, y: inp.y }; setKey('click', true); });
  canvas.addEventListener('touchstart', e => { pos(e); inp.down = true; inp.tap = { x: inp.x, y: inp.y }; setKey('click', true); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchmove', e => { pos(e); e.preventDefault(); }, { passive: false });
  addEventListener('mouseup', () => { inp.down = false; inp.up = true; setKey('click', false); });
  addEventListener('touchend', () => { inp.down = false; inp.up = true; setKey('click', false); });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.tabIndex = 0; canvas.focus();

  /* ---------- Zeichen-Helfer ---------- */
  const H_ = {
    e(ch, x, y, s) { g.font = (s || 32) + 'px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(ch, x, y); },
    tx(t, x, y, s, c, a) { g.font = 'bold ' + (s || 16) + 'px system-ui,sans-serif'; g.textAlign = a || 'center'; g.textBaseline = 'middle'; g.fillStyle = c || '#fff'; g.fillText(t, x, y); },
    box(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); },
    circ(x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 7); g.fill(); },
    hit: (ax, ay, bx, by, d) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by) < d * d,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    fmt(n) { if (n < 1000) return Math.floor(n) + ''; const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi']; let i = 0; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i]; },
    bg(a, b) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, a || '#1b2a49'); gr.addColorStop(1, b || '#3a6ea5'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  };
  const FACES = ['😀', '😎', '🤠', '🥳', '😺', '🐸', '🦊', '🐼', '🐵', '🦄', '🐙', '🤖'];
  const faceOf = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; return FACES[h % FACES.length]; };

  /* ---------- Zustand ---------- */
  const S = { meta: null, id: null, name: '', roster: [], others: {}, kv: {}, mode: 'round', phase: 'wait', left: 0, round: 0, inst: null, w: null, data: {}, rank: [], err: null, fail: false, helpTxt: '' };

  function makeW(seed) {
    const rnd = rngOf(seed);
    const w = Object.assign({
      W, H, g, inp, rnd, name: S.name, others: S.others, kv: S.kv, data: S.data, roster: S.roster.slice(),
      r: (a, b) => a + rnd() * (b - a), ri: (a, b) => Math.floor(a + rnd() * (b - a)), pick: a => a[Math.floor(rnd() * a.length)],
      score: 0, alive: true, t: 0, left: S.left, free: S.mode === 'free', faceOf, round: S.round, live: () => S.roster.slice(),
      add(n) { w.score += n; },
      die() { if (w.alive) { w.alive = false; w.finish(); } },
      finish() { w.alive = false; if (!w.fin) { w.fin = true; if (S.mode === 'round') post('net', { t: 'fin', s: Math.floor(w.score) }); } },
      send: ev => post('net', { t: 'ev', d: ev }), sendTo: (to, ev) => post('net', { t: 'ev', d: ev, to }),
      set: (k, v) => post('net', { t: 'kv', k, v }),
      save(o) { Object.assign(S.data, o); req('save', S.data); }, report(n) { post('score', n); }
    }, H_);
    Object.defineProperty(w, 'solo', { get: () => S.roster.length <= 1 });
    Object.defineProperty(w, 'seat', { get: () => w.roster.indexOf(S.name) });
    return w;
  }
  function fail(e) { S.fail = true; S.err = String(e && e.message || e); post('error', S.err + (e && e.stack ? ' @ ' + String(e.stack).split('\n')[1] : '')); }
  function startInst(seed, left) {
    if (S.legacy || (S.fail && S.codeErr)) return; // Ein-Spieler-Code zeichnet selbst / Code-Fehler bleibt sichtbar
    const m = REG[S.id]; if (!m) return fail(new Error('Unbekanntes Spiel: ' + S.id));
    S.phase = 'play'; S.left = left; S.fail = false; S.err = null;
    S.w = makeW(seed); S.w.others = S.others;
    try { S.inst = m.factory(S.w); } catch (e) { fail(e); S.inst = null; }
    S.sendAcc = 0;
  }
  function endRound() {
    const w = S.w; if (!w) return;
    const sc = Math.floor(w.score);
    if (sc > 0 || w.fin) { post('score', sc); const best = Math.max(S.data.best || 0, sc); S.data.best = best; S.data.plays = (S.data.plays || 0) + 1; req('save', S.data); }
    w.finish();
  }

  /* ---------- Server-Nachrichten ---------- */
  function onSrv(m) {
    if (m.t === 'hello') {
      S.name = m.you; S.roster = m.players; S.kv = m.kv || {}; S.mode = m.mode; S.round = m.round; S.others = {};
      Object.entries(m.st || {}).forEach(([n, st]) => { if (n !== S.name) S.others[n] = st; });
      if (m.mode === 'free') startInst(m.seed, Infinity);
      else if (m.phase === 'play') startInst(m.seed, m.left);
      else { S.phase = 'break'; S.left = m.left; }
    } else if (m.t === 'round') { S.kv = {}; S.round = m.n; S.others = {}; startInst(m.seed, m.dur); }
    else if (m.t === 'tick') { S.left = m.left; if (m.phase !== S.phase && m.phase === 'break') { /* Ergebnis kommt separat */ } }
    else if (m.t === 'results') { endRound(); S.phase = 'break'; S.left = m.left; S.rank = m.rank; }
    else if (m.t === 'room') {
      S.roster = m.players;
      for (const n of Object.keys(S.others)) if (!m.players.includes(n)) delete S.others[n];
      if (S.w) S.w.roster = S.mode === 'free' ? S.roster.slice() : S.w.roster;
      if (S.inst && S.inst.room) try { S.inst.room(S.roster); } catch (e) { fail(e); }
    } else if (m.t === 'st') { for (const [n, st] of Object.entries(m.p)) if (n !== S.name) S.others[n] = st; }
    else if (m.t === 'ev') { if (S.inst && S.inst.net) try { S.inst.net(m.d, m.from); } catch (e) { fail(e); } }
    else if (m.t === 'kv') { S.kv[m.k] = m.v; if (S.inst && S.inst.kv) try { S.inst.kv(m.k, m.v, m.from); } catch (e) { fail(e); } }
  }
  addEventListener('message', e => {
    const m = e.data; if (!m || !m.bv) return;
    if (m.re && pend[m.id]) { pend[m.id](m.d); delete pend[m.id]; }
    else if (m.t === 'srv') onSrv(m.m);
    else if (m.t === 'flush') { endRoundIfFree(); }
  });
  function endRoundIfFree() { if (S.inst && S.inst.flush) try { S.inst.flush(); } catch (e) { /* */ } }

  /* ---------- Hauptschleife ---------- */
  let last = performance.now(), acc = 0;
  function overlay(lines, sub) {
    g.fillStyle = 'rgba(0,0,0,.62)'; g.fillRect(0, 0, W, H);
    lines.forEach((l, i) => H_.tx(l[0], W / 2, 70 + i * 34, l[1] || 22, l[2]));
    if (sub) H_.tx(sub, W / 2, H - 28, 14, '#bbb');
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    g.setTransform(1, 0, 0, 1, 0, 0);
    H_.bg('#10182f', '#1d2b53');
    const w = S.w, inst = S.inst;
    if (S.fail) { H_.tx('⚠ Fehler im Spiel', W / 2, 150, 24, '#ff8080'); H_.tx(S.err || '', W / 2, 190, 13, '#ffbbbb'); }
    else if (S.phase === 'play' && w && inst) {
      try {
        w.left = S.left; if (isFinite(S.left)) S.left = Math.max(0, S.left - dt);
        w.t += dt;
        if (w.alive) { inst.step(dt); }
        g.save(); inst.draw(); g.restore();
        if (!inst.noGhost) for (const [n, o] of Object.entries(S.others)) if (o && typeof o.x === 'number' && o.a !== false) {
          g.globalAlpha = 0.55; H_.e(o.e || faceOf(n), o.x, o.y, o.z || 26); g.globalAlpha = 1; H_.tx(n, o.x, o.y - (o.z || 26) * 0.75, 10, '#fff');
        }
        if (!w.free) {
          H_.tx('⏱ ' + Math.ceil(S.left) + 's', W - 10, 14, 15, '#fff', 'right');
          H_.tx('⭐ ' + Math.floor(w.score), 10, 14, 15, '#ffe9a8', 'left');
          if (!w.alive) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, H - 34, W, 34); H_.tx('Fertig – ' + Math.floor(w.score) + ' Punkte · warte auf die Runde…', W / 2, H - 17, 15, '#ffe9a8'); }
        }
        if (acc += dt, acc > 0.1) { acc = 0; let p = inst.pub ? inst.pub() : { x: w.x, y: w.y }; p = Object.assign({ s: Math.floor(w.score), a: w.alive }, p); post('net', { t: 'st', d: p }); }
      } catch (e) { fail(e); }
    } else if (S.phase === 'break') {
      const top = S.rank.slice(0, 5).map((r, i) => [`${i + 1}. ${r.name}  –  ${Math.floor(r.score)}`, i ? 18 : 22, i ? '#fff' : '#ffe9a8']);
      overlay([[S.rank.length ? '🏁 Ergebnis' : (REG[S.id] ? REG[S.id].icon + ' ' + REG[S.id].title : ''), 28, '#fff']].concat(top, [[`Nächste Runde in ${Math.ceil(S.left)}…`, 20, '#9fe39f']]), S.helpTxt);
    } else H_.tx('Verbinde…', W / 2, H / 2, 22);
    inp.e = {}; inp.tap = null; inp.up = false; inp.chars = []; inp.lx = inp.x; inp.ly = inp.y;
    requestAnimationFrame(frame);
  }
  addEventListener('error', e => fail(e.message + (e.lineno ? ' (Zeile ' + e.lineno + ')' : '')));
  addEventListener('unhandledrejection', e => fail(e.reason && e.reason.message || e.reason));

  /* ---------- Start ---------- */
  const P0 = window.__BV; // { id, user, code }
  S.id = P0.id; S.name = P0.user; S.helpTxt = P0.help || '';
  root.Platform = { canvas, ctx: g, user: P0.user, W, H, helpers: H_, rngOf, load: () => req('load'), save: d => req('save', d), score: n => post('score', n),
    game(opts, factory) { REG[S.id] = { id: S.id, opt: opts || {}, factory }; } };
  req('load').then(d => {
    S.data = (d && typeof d === 'object') ? d : {};
    if (P0.code != null) { try { (new Function('Platform', P0.code))(root.Platform); } catch (e) { S.codeErr = true; fail(e); } }
    else if (!REG[S.id]) return fail(new Error('Unbekanntes Spiel'));
    S.mode = P0.code != null ? 'free' : 'round';
    S.legacy = P0.code != null && !REG[S.id] && !S.codeErr; // altes Ein-Spieler-Spiel ohne Platform.game
    if (!S.legacy) requestAnimationFrame(frame);
    post('ready');
  });
})(window);
