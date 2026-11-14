/* Lumora Games Frontend */
(function () {
  'use strict';
  const $app = document.getElementById('app'), $who = document.getElementById('who'), $nav = document.getElementById('nav');
  let me = null, libSrc = '';

  const el = (tag, props, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e[k] = v;
    }
    for (const k of kids.flat()) e.append(k instanceof Node ? k : document.createTextNode(k == null ? '' : k));
    return e;
  };
  async function api(method, url, body) {
    const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    let data = {}; try { data = await r.json(); } catch (e) { /* leer */ }
    if (!r.ok) { const err = new Error(data.error || 'Fehler ' + r.status); err.status = r.status; throw err; }
    return data;
  }
  function toast(t) { const d = el('div', { class: 'toast' }, t); document.body.append(d); setTimeout(() => d.remove(), 2500); }

  /* ---------- Auth ---------- */
  function authView() {
    $nav.hidden = true; $who.replaceChildren();
    let mode = 'login';
    const name = el('input', { placeholder: 'Benutzername', autocomplete: 'username', maxLength: 20 });
    const pw = el('input', { type: 'password', placeholder: 'Passwort (mind. 6 Zeichen)', autocomplete: 'current-password' });
    const err = el('div', { class: 'err' });
    const go = el('button', {}, 'Anmelden');
    const tl = el('button', { onclick: () => setMode('login') }, 'Anmelden'), tr = el('button', { class: 'sec', onclick: () => setMode('register') }, 'Registrieren');
    function setMode(m) { mode = m; go.textContent = m === 'login' ? 'Anmelden' : 'Account erstellen'; tl.className = m === 'login' ? '' : 'sec'; tr.className = m === 'register' ? '' : 'sec'; err.textContent = ''; }
    async function submit() {
      try { const r = await api('POST', '/api/' + mode, { name: name.value.trim(), password: pw.value }); me = r.name; start(); } catch (e) { err.textContent = e.message; }
    }
    go.addEventListener('click', submit);
    pw.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    $app.replaceChildren(el('div', { class: 'auth' }, el('h1', {}, '✨ Lumora Games'),
      el('p', { class: 'mut' }, 'Spiele 100 Spiele, baue eigene und speichere deinen Fortschritt. Dafür brauchst du einen Account.'),
      el('div', { class: 'tabs' }, tl, tr), name, pw, err, go));
    setMode('login');
  }

  /* ---------- Spiele-Sandbox + Mehrspieler-Brücke ---------- */
  let threeSrc = '';
  function buildDoc(id, code, help, three) {
    const payload = JSON.stringify({ id, code, user: me, help: help || '' }).replace(/</g, '\\u003c');
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000;height:100%;overflow:hidden}canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block}</style></head><body>' +
      '<canvas id="c3" width="1280" height="800"></canvas><canvas id="c" width="640" height="400"></canvas>' + (three ? '<script>' + threeSrc.replace(/<\/script/gi, '<\\/script') + '<\/script>' : '') + '<script>window.__BV=' + payload + '<\/script><script>' + libSrc.replace(/<\/script/gi, '<\\/script') + '<\/script></body></html>';
  }

  // opts: multi (WebSocket-Raum), persist (Server-Speicherung), onNet(msg), onScore(), onError(msg)
  function runGame(game, code, opts) {
    const frame = el('iframe', { class: 'frame', sandbox: 'allow-scripts', title: game.title, allow: '' });
    frame.srcdoc = buildDoc(game.id, code, game.help, game.three);
    let timer = null, latest = null, ws = null, ready = false, queue = [], closed = false;
    const toFrame = m => { try { frame.contentWindow.postMessage({ bv: 1, t: 'srv', m }, '*'); } catch (e) { /* */ } };
    function deliver(m) { if (opts.onNet) opts.onNet(m); if (ready) toFrame(m); else if (queue.length < 200) queue.push(m); }
    function connect() {
      if (!opts.multi) { // Testlauf ohne Server: lokaler Ein-Spieler-Raum
        deliver({ t: 'hello', room: 'lokal', you: me, mode: code != null ? 'free' : 'round', dur: game.dur || 60, phase: 'play', left: game.dur || 60, round: 1, seed: Math.floor(Math.random() * 1e9), players: [me], kv: {}, st: {} });
        return;
      }
      ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
      ws.onopen = () => ws.send(JSON.stringify({ t: 'join', game: game.id }));
      ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } deliver(m); };
      ws.onclose = () => { if (!closed && opts.onNet) opts.onNet({ t: 'closed' }); };
    }
    function flush() { timer = null; if (latest === null) return Promise.resolve(); const d = latest; latest = null; return api('PUT', '/api/save/' + game.id, { data: d }).catch(() => {}); }
    function onMsg(e) {
      if (e.source !== frame.contentWindow) return;
      const m = e.data; if (!m || !m.bv) return;
      const reply = d => frame.contentWindow.postMessage({ bv: 1, re: 1, id: m.id, d }, '*');
      if (m.t === 'load') {
        if (!opts.persist) return reply(null);
        api('GET', '/api/save/' + game.id).then(r => reply(r.data)).catch(() => reply(null));
      } else if (m.t === 'save') {
        reply(true); if (!opts.persist) return;
        latest = m.d === undefined ? null : m.d;
        if (!timer) timer = setTimeout(flush, 800);
      } else if (m.t === 'score') {
        if (!opts.persist || typeof m.d !== 'number') return;
        api('POST', '/api/score/' + game.id, { score: m.d }).then(() => opts.onScore && opts.onScore()).catch(() => {});
      } else if (m.t === 'ready') { ready = true; queue.splice(0).forEach(toFrame); }
      else if (m.t === 'net') { if (ws && ws.readyState === 1 && m.d && ['st', 'ev', 'kv', 'fin'].includes(m.d.t)) ws.send(JSON.stringify(m.d)); }
      else if (m.t === 'error' && opts.onError) opts.onError(m.d);
    }
    window.addEventListener('message', onMsg);
    frame.chat = text => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'chat', text })); };
    frame.cleanup = () => {
      closed = true;
      return new Promise(res => setTimeout(() => { window.removeEventListener('message', onMsg); if (ws) ws.close(); flush().then(res); }, 250));
    };
    connect();
    return frame;
  }

  let cleanup = null;
  function setView(node, clean) { cleanup = clean || null; $app.replaceChildren(node); window.scrollTo(0, 0); }

  /* ---------- Spiele-Übersicht ---------- */
  const MODES = { round: '🏁 Runden', free: '🌍 Offene Welt' };
  function card(g, href) {
    return el('a', { class: 'card', href }, el('div', { class: 'ic' }, g.icon), el('b', {}, g.title), el('small', {}, g.desc), el('span', { class: 'tag' }, g.cat + (g.max ? ' · bis ' + g.max + ' Spieler' : '')));
  }
  function gamesView() {
    const games = window.CATALOG, cats = ['Alle'].concat([...new Set(games.map(g => g.cat))]);
    let cat = 'Alle', q = '';
    const grid = el('div', { class: 'grid' }), count = el('span', { class: 'mut' });
    const chips = el('div', { class: 'chips' });
    function render() {
      const list = games.filter(g => (cat === 'Alle' || g.cat === cat) && (g.title + g.desc).toLowerCase().includes(q));
      grid.replaceChildren(...list.map(g => card(g, '#/play/' + g.id)));
      count.textContent = list.length + ' Spiele';
      chips.replaceChildren(...cats.map(c => el('button', { class: 'chip' + (c === cat ? ' on' : ''), onclick: () => { cat = c; render(); } }, c)));
    }
    const search = el('input', { placeholder: '🔍 Spiel suchen…', oninput: e => { q = e.target.value.toLowerCase(); render(); } });
    render();
    setView(el('div', {}, el('h1', {}, 'Spiele'), el('p', { class: 'mut' }, 'Alle Spiele sind Mehrspieler: Du kommst automatisch in einen Raum mit bis zu 8 anderen Spielern.'), el('div', { class: 'toolbar' }, search, count), chips, el('div', { style: 'height:14px' }), grid));
  }

  /* ---------- Spielen ---------- */
  async function playView(id) {
    let game = window.CATALOG.find(g => g.id === id), code = null, owner = null;
    if (!game && /^u\d+$/.test(id)) {
      try {
        const r = await api('GET', '/api/community/' + id);
        game = { id: r.id, title: r.title, icon: '🧩', desc: r.desc, cat: 'Community', mode: 'free', max: 8 }; code = r.code; owner = r.owner;
      } catch (e) { return setView(el('p', {}, 'Spiel nicht gefunden.')); }
    }
    if (!game) return setView(el('p', {}, 'Spiel nicht gefunden.'));
    if (game.three && !threeSrc) { try { threeSrc = await (await fetch('vendor/three.min.js')).text(); } catch (e) { return setView(el('p', {}, '3D-Bibliothek konnte nicht geladen werden.')); } }
    const lb = el('ol', { class: 'lb' }), errBox = el('div', { class: 'err' });
    const plist = el('ul', { class: 'players' }), status = el('div', { class: 'mut' }, 'Verbinde…'), chat = el('div', { class: 'chat' });
    const st = { room: '', players: [], scores: {}, phase: '', left: 0, mode: game.mode };
    async function refresh() {
      try {
        const top = await api('GET', '/api/score/' + game.id);
        lb.replaceChildren(...(top.length ? top.map((r, i) => el('li', {}, `${i + 1}. ${r.name}`, el('b', {}, String(Math.floor(r.score))))) : [el('li', { class: 'mut' }, 'Noch kein Eintrag – sei der Erste!')]));
      } catch (e) { /* offline */ }
    }
    function drawPlayers() {
      const list = st.players.slice().sort((a, b) => (st.scores[b] || 0) - (st.scores[a] || 0));
      plist.replaceChildren(...list.map(n => el('li', { class: n === me ? 'me' : '' }, el('span', {}, (n === me ? '⭐ ' : '👤 ') + n), el('b', {}, st.mode === 'free' && !st.scores[n] ? '' : String(st.scores[n] || 0)))));
      status.textContent = st.room ? `Raum ${st.room} · ${st.players.length}/${game.max || 8} Spieler` + (st.mode === 'round' && st.phase ? (st.phase === 'play' ? ' · Runde läuft ' : ' · Pause ') + Math.ceil(st.left) + 's' : '') : 'Verbinde…';
    }
    const iv2 = setInterval(() => { if (st.left > 0) st.left--; drawPlayers(); }, 1000);
    function onNet(m) {
      if (m.t === 'hello') { Object.assign(st, { room: m.room.split('#')[1] ? '#' + m.room.split('#')[1] : m.room, players: m.players, phase: m.phase, left: m.left, mode: m.mode }); Object.entries(m.st || {}).forEach(([n, s]) => st.scores[n] = s.s || 0); }
      else if (m.t === 'room') { st.players = m.players; }
      else if (m.t === 'st') { Object.entries(m.p).forEach(([n, s]) => st.scores[n] = s.s || 0); }
      else if (m.t === 'round') { st.phase = 'play'; st.left = m.dur; st.scores = {}; }
      else if (m.t === 'tick') { st.phase = m.phase; st.left = m.left; }
      else if (m.t === 'results') { st.phase = 'break'; st.left = m.left; m.rank.forEach(r => st.scores[r.name] = Math.floor(r.score)); setTimeout(refresh, 600); }
      else if (m.t === 'chat') { chat.append(el('div', {}, el('span', {}, m.from + ': '), m.text)); chat.scrollTop = 1e9; }
      else if (m.t === 'closed') { status.textContent = '⚠ Verbindung getrennt – Seite neu laden'; return; }
      drawPlayers();
    }
    const frame = runGame(game, code, { multi: true, persist: true, onScore: refresh, onNet, onError: m => { errBox.textContent = m; } });
    // Vollbild: echte Fullscreen-API, sonst (z. B. iPhone) Notlösung über die ganze Seite
    const stage = el('div', { class: 'stage' }); const fsBtn = el('button', { class: 'fsbtn', title: 'Vollbild (Esc zum Beenden)' }, '⛶ Vollbild'); stage.append(frame, fsBtn);
    const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
    const setFsLabel = () => { const on = fsEl() === stage || stage.classList.contains('pseudo'); fsBtn.textContent = on ? '✕ Beenden' : '⛶ Vollbild'; fsBtn.classList.toggle('on', on); };
    fsBtn.addEventListener('click', async () => {
      if (stage.classList.contains('pseudo')) { stage.classList.remove('pseudo'); document.body.classList.remove('nofs-scroll'); return setFsLabel(); }
      if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
      try { if (!req) throw new Error('kein Fullscreen'); await req.call(stage); try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { /* nicht überall erlaubt */ } }
      catch (e) { stage.classList.add('pseudo'); document.body.classList.add('nofs-scroll'); }
      setFsLabel(); setTimeout(() => frame.focus(), 50);
    });
    const onFs = () => { setFsLabel(); if (!fsEl()) try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) { /* */ } };
    document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
    const onEsc = e => { if (e.key === 'Escape' && stage.classList.contains('pseudo')) fsBtn.click(); }; document.addEventListener('keydown', onEsc);
    const msg = el('input', { placeholder: 'Nachricht…', maxLength: 120, onkeydown: e => { if (e.key === 'Enter' && msg.value.trim()) { frame.chat(msg.value); msg.value = ''; e.stopPropagation(); } } });
    refresh(); const iv = setInterval(refresh, 20000);
    setView(el('div', {}, el('p', {}, el('a', { href: '#/' + (code ? 'community' : 'games') }, '← Zurück')),
      el('h1', {}, game.icon + ' ' + game.title),
      el('div', { class: 'play' }, el('div', {}, stage, errBox, el('p', { class: 'mut' }, '🎮 ' + (game.help || ''))),
        el('div', { class: 'panel' }, el('p', { class: 'mut' }, game.desc || ''), owner ? el('p', { class: 'mut' }, 'von ' + owner) : '',
          el('span', { class: 'badge' }, MODES[game.mode] || ''), status, el('h3', {}, '👥 Spieler im Raum'), plist,
          chat, el('div', { class: 'chatrow' }, msg), el('h3', {}, '🏆 Bestenliste (gesamt)'), lb, el('p', { class: 'mut' }, '💾 Fortschritt wird automatisch gespeichert.')))),
      () => { clearInterval(iv); clearInterval(iv2); document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs); document.removeEventListener('keydown', onEsc); document.body.classList.remove('nofs-scroll'); if (fsEl()) try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* */ } return frame.cleanup(); });
  }

  /* ---------- Community ---------- */
  async function communityView() {
    const grid = el('div', { class: 'grid' }, 'Lade…');
    setView(el('div', {}, el('h1', {}, 'Community-Spiele'), el('p', { class: 'mut' }, 'Spiele, die andere Spieler programmiert haben. Du kannst auch eigene veröffentlichen!'), grid));
    try {
      const list = await api('GET', '/api/community');
      grid.replaceChildren(...(list.length ? list.map(g => card({ icon: '🧩', title: g.title, desc: g.desc || 'von ' + g.owner, cat: 'von ' + g.owner }, '#/play/' + g.id)) : [el('p', { class: 'mut' }, 'Noch keine Spiele. Erstelle das erste unter „Erstellen“!')]));
    } catch (e) { grid.textContent = e.message; }
  }

  /* ---------- Editor ---------- */
  const TEMPLATES = {
    'Mehrspieler: Klick-Duell (empfohlen)': `// Alle im Raum sehen sich live. Wer in der Zeit die meisten Ziele trifft, gewinnt.
// (Seed-gleiche Welt: rnd() liefert für alle Spieler dieselben Ziele.)
Platform.game({}, w => {
  let target = { x: 320, y: 200 }, hits = 0;
  const next = () => target = { x: w.r(40, 600), y: w.r(50, 360) };
  return {
    step(dt) {
      if (w.inp.tap && w.hit(w.inp.tap.x, w.inp.tap.y, target.x, target.y, 30)) { hits++; next(); }
      w.score = hits;
    },
    draw() {
      w.bg('#1b2a49', '#3a6ea5');
      w.e('🎯', target.x, target.y, 52);
      w.tx('Treffer: ' + hits, 10, 20, 18, '#fff', 'left');
      const o = Object.entries(w.others).map(([n, s]) => n + ': ' + (s.s || 0)).join('   ');
      w.tx(o, 10, 44, 13, '#ffe9a8', 'left');
    },
    pub() { return { x: w.inp.x, y: w.inp.y, e: '🖱️' }; }   // dein Mauszeiger ist für andere sichtbar
  };
});
`,
    'Mehrspieler: Gemeinsame Welt (frei)': `// Offene Welt ohne Runden: laufe herum, andere sehen dich. Mit w.set/w.kv teilst du Daten.
Platform.game({}, w => {
  let x = 320, y = 200;
  return {
    step(dt) {
      const k = w.inp.k;
      x += ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * 200 * dt;
      y += ((k.down ? 1 : 0) - (k.up ? 1 : 0)) * 200 * dt;
      x = w.clamp(x, 20, 620); y = w.clamp(y, 20, 380);
    },
    draw() {
      w.bg('#0f3d1f', '#3c8f4a');
      w.e(w.faceOf(w.name), x, y, 32); w.tx(w.name, x, y - 24, 11);
      w.tx('Pfeiltasten / WASD', 10, 18, 14, '#fff', 'left');
    },
    pub() { return { x, y }; }
  };
});
`,
    'Ein-Spieler: Klick-Spiel (Canvas pur)': `// Ganz ohne Mehrspieler-Funktionen: nur Canvas + Speichern.
const c = Platform.canvas, g = Platform.ctx;
let score = 0, best = 0;
Platform.load().then(d => { best = (d && d.best) || 0; });
c.addEventListener('mousedown', () => { score++; if (score > best) { best = score; Platform.save({ best }); Platform.score(best); } });
(function loop() {
  g.fillStyle = '#1b2a49'; g.fillRect(0, 0, 640, 400);
  g.fillStyle = '#fff'; g.font = '28px sans-serif'; g.textAlign = 'center';
  g.fillText('Klicks: ' + score + '   Best: ' + best, 320, 200);
  requestAnimationFrame(loop);
})();
`
  };
  const DOC = `Platform.game(optionen, w => ({ step(dt){}, draw(){}, pub(){}, net(ev,from){}, kv(k,v){} }))

w.inp.k / .e / .x .y / .tap     Eingabe (Tasten: left right up down space, Buchstaben, click)
w.rnd() w.r(a,b) w.ri(a,b) w.pick(arr)   Zufall – für ALLE Spieler gleich (gleicher Seed)
w.score / w.add(n) / w.die() / w.finish()
w.others  { name: {x,y,s,...} }      Zustand der anderen Spieler (kommt aus deren pub())
w.send(ev) / w.sendTo(name,ev)  →  net(ev,from)   Events an andere
w.set(k,v) / w.kv                    gemeinsamer Raum-Speicher (kv-Callback bei Änderung)
w.roster / w.seat / w.solo           Spielerliste, dein Platz, allein im Raum?
w.data / w.save(obj)                 dein persönlicher Spielstand
w.e(emoji,x,y,size) w.tx(text,x,y,size,color,align) w.box w.circ w.bg(c1,c2) w.hit w.fmt
Platform.canvas / Platform.ctx       (640×400) für Spiele ohne Mehrspieler-API`;

  async function createView() {
    let list = []; try { list = await api('GET', '/api/mygames'); } catch (e) { /* */ }
    let cur = null;
    const title = el('input', { placeholder: 'Titel deines Spiels', maxLength: 40 });
    const desc = el('input', { placeholder: 'Kurze Beschreibung', maxLength: 200 });
    const code = el('textarea', { class: 'code', spellcheck: false });
    const preview = el('div', {}), errBox = el('div', { class: 'err' }), listBox = el('div', { class: 'list' });
    const tpl = el('select', {}, el('option', { value: '' }, 'Vorlage laden…'), ...Object.keys(TEMPLATES).map(k => el('option', { value: k }, k)));
    tpl.addEventListener('change', () => { if (tpl.value && (!code.value.trim() || confirm('Aktuellen Code ersetzen?'))) code.value = TEMPLATES[tpl.value]; tpl.value = ''; });
    code.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); const s = code.selectionStart; code.setRangeText('  ', s, code.selectionEnd, 'end'); }
    });
    let pf = null;
    function test() {
      errBox.textContent = ''; if (pf) pf.cleanup();
      pf = runGame({ id: 'preview', title: 'Test', mode: 'free' }, code.value, { multi: false, persist: false, onError: m => { errBox.textContent = m; } });
      preview.replaceChildren(pf);
    }
    function select(g) {
      cur = g; title.value = g ? g.title : ''; desc.value = g ? g.desc : ''; code.value = g ? g.code : TEMPLATES['Mehrspieler: Klick-Duell (empfohlen)'];
      renderList(); preview.replaceChildren(); errBox.textContent = '';
    }
    function renderList() {
      listBox.replaceChildren(el('button', { class: !cur ? 'on' : '', onclick: () => select(null) }, '➕ Neues Spiel'),
        ...list.map(g => el('button', { class: cur && cur.id === g.id ? 'on' : '', onclick: () => select(g) }, '🧩 ' + g.title)));
    }
    async function save() {
      try {
        const body = { title: title.value, desc: desc.value, code: code.value };
        if (cur) { await api('PUT', '/api/community/' + cur.id, body); Object.assign(cur, body); toast('Gespeichert & veröffentlicht ✔'); }
        else { const r = await api('POST', '/api/community', body); cur = Object.assign({ id: r.id, owner: me }, body); list.push(cur); toast('Veröffentlicht ✔'); }
        renderList();
      } catch (e) { errBox.textContent = e.message; }
    }
    async function del() {
      if (!cur || !confirm('„' + cur.title + '“ wirklich löschen?')) return;
      try { await api('DELETE', '/api/community/' + cur.id); list = list.filter(g => g !== cur); select(null); toast('Gelöscht'); } catch (e) { errBox.textContent = e.message; }
    }
    select(null);
    setView(el('div', {}, el('h1', {}, 'Eigenes Spiel erstellen'),
      el('p', { class: 'mut' }, 'Programmiere in JavaScript – auch Mehrspieler-Spiele (Räume, Events, geteilter Speicher). Mit „Testen“ siehst du dein Spiel sofort, mit „Veröffentlichen“ können es alle in der Community spielen.'),
      el('div', { class: 'editor' }, el('div', {}, el('h3', {}, 'Meine Spiele'), listBox),
        el('div', {}, el('div', { class: 'row' }, title, desc), el('div', { class: 'row' }, tpl), code,
          el('div', { class: 'row' }, el('button', { onclick: test }, '▶ Testen'), el('button', { class: 'sec', onclick: save }, '🚀 Veröffentlichen / Speichern'), el('button', { class: 'bad', onclick: del }, 'Löschen')),
          errBox, preview, el('h3', {}, 'Hilfe: Platform-API'), el('pre', { class: 'doc' }, DOC)))),
      () => { if (pf) pf.cleanup(); });
  }

  const fmtN = n => { const u = ['', 'K', 'M', 'B', 'T']; let i = 0; while (n >= 1000 && i < 4) { n /= 1000; i++; } return (i ? n.toFixed(1) : Math.floor(n)) + u[i]; };
  /* ---------- Profil ---------- */
  async function profileView() {
    const box = el('div', {}, 'Lade…');
    setView(el('div', {}, el('h1', {}, '👤 ' + me), el('h2', {}, 'Dein Fortschritt'), box));
    try {
      const saves = await api('GET', '/api/saves');
      const names = {}; window.CATALOG.forEach(g => names[g.id] = g);
      const rows = Object.entries(saves).map(([id, d]) => {
        const g = names[id]; if (!g && !/^u\d+$/.test(id)) return null;
        const info = !d ? '' : d.best != null ? 'Highscore: ' + d.best + (d.plays ? ' · ' + d.plays + ' Runden' : '') : d.total != null ? 'Gesamt verdient: ' + fmtN(d.total) + (d.raids ? ' · Razzien: ' + d.raids : '') : d.coins != null ? 'Münzen: ' + fmtN(d.coins) : d.cash != null ? 'Bargeld: ' + fmtN(d.cash) : 'Spielstand gespeichert';
        return el('a', { class: 'pg', href: '#/play/' + id, style: 'color:inherit;text-decoration:none' }, el('span', {}, (g ? g.icon + ' ' + g.title : '🧩 Community-Spiel ' + id)), el('span', { class: 'mut' }, info));
      }).filter(Boolean);
      box.replaceChildren(...(rows.length ? rows : [el('p', { class: 'mut' }, 'Du hast noch nichts gespielt. Auf geht’s!')]));
    } catch (e) { box.textContent = e.message; }
  }

  /* ---------- Router ---------- */
  let routeSeq = 0;
  async function route() {
    const seq = ++routeSeq, old = cleanup; cleanup = null;
    if (old) await old(); // laufendes Spiel sichert zuerst seinen Spielstand
    if (seq !== routeSeq) return;
    if (!me) return authView();
    const h = location.hash.replace(/^#\/?/, '') || 'games', [r, arg] = h.split('/');
    $nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.r === r));
    ({ games: gamesView, community: communityView, create: createView, profile: profileView, play: () => playView(arg) }[r] || gamesView)();
  }
  function start() {
    $nav.hidden = false;
    $who.replaceChildren(el('span', {}, '👤 ' + me), el('button', { class: 'sec', onclick: async () => { if (cleanup) await cleanup(); cleanup = null; await api('POST', '/api/logout', {}); me = null; authView(); } }, 'Abmelden'));
    if (!location.hash) location.hash = '#/games'; route();
  }
  window.addEventListener('hashchange', route);
  (async function init() {
    const files = ['runtime.js', 'g1.js', 'g2.js', 'g3.js', 'g4.js', 'g5.js', 'g6.js'];
    libSrc = (await Promise.all(files.map(f => fetch(f).then(r => r.text())))).join('\n;\n');
    try { me = (await api('GET', '/api/me')).name; start(); } catch (e) { authView(); }
  })();
})();
