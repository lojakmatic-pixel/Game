/* BlockVerse Frontend */
(function () {
  'use strict';
  const $app = document.getElementById('app'), $who = document.getElementById('who'), $nav = document.getElementById('nav');
  let me = null, enginesSrc = '';

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
    $app.replaceChildren(el('div', { class: 'auth' }, el('h1', {}, '🧊 BlockVerse'),
      el('p', { class: 'mut' }, 'Spiele 100 Spiele, baue eigene und speichere deinen Fortschritt. Dafür brauchst du einen Account.'),
      el('div', { class: 'tabs' }, tl, tr), name, pw, err, go));
    setMode('login');
  }

  /* ---------- Spiele-Sandbox ---------- */
  function buildDoc(game, code) {
    const payload = JSON.stringify({ engine: game.engine, cfg: game.cfg, code, user: me }).replace(/</g, '\\u003c');
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000;height:100%}canvas{width:100%;height:100%;display:block;object-fit:contain}</style></head><body>' +
      '<canvas id="c" width="640" height="400"></canvas><script>' + enginesSrc.replace(/<\/script/gi, '<\\/script') + '<\/script><script>' +
      '(function(){var P0=' + payload + ';var pend={},rid=0;' +
      'function req(t,d){return new Promise(function(r){var id=++rid;pend[id]=r;parent.postMessage({bv:1,id:id,t:t,d:d},"*");});}' +
      'addEventListener("message",function(e){var m=e.data;if(m&&m.bv&&m.flush){dispatchEvent(new Event("bv-flush"));}if(m&&m.bv&&m.re&&pend[m.id]){pend[m.id](m.d);delete pend[m.id];}});' +
      'var canvas=document.getElementById("c");' +
      'window.Platform={canvas:canvas,ctx:canvas.getContext("2d"),engines:BlockEngines,user:P0.user,load:function(){return req("load");},save:function(d){return req("save",d);},score:function(n){return req("score",n);}};' +
      'function fail(m){var g=Platform.ctx;g.fillStyle="#200";g.fillRect(0,0,640,400);g.fillStyle="#ff8080";g.font="14px monospace";String(m).match(/.{1,70}/g).slice(0,20).forEach(function(l,i){g.fillText(l,10,24+i*18);});parent.postMessage({bv:1,t:"error",d:String(m)},"*");}' +
      'addEventListener("error",function(e){fail("Fehler: "+e.message+(e.lineno?" (Zeile "+e.lineno+")":""));});' +
      'addEventListener("unhandledrejection",function(e){fail("Fehler: "+(e.reason&&e.reason.message||e.reason));});' +
      'try{if(P0.code!=null){(new Function("Platform",P0.code))(Platform);}else{BlockEngines[P0.engine](Platform,P0.cfg);}}catch(e){fail("Fehler: "+e.message);}' +
      '})();<\/script></body></html>';
  }

  // Verbindet einen iframe mit dem Server (Speichern/Laden/Score). opts.persist=false → Testlauf ohne Speichern
  function runGame(game, code, opts) {
    const frame = el('iframe', { class: 'frame', sandbox: 'allow-scripts', title: game.title, allow: '' });
    frame.srcdoc = buildDoc(game, code);
    let timer = null, latest = null, errLog = opts.onError;
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
        reply(true); if (!opts.persist || typeof m.d !== 'number') return;
        api('POST', '/api/score/' + game.id, { score: m.d }).then(() => opts.onScore && opts.onScore()).catch(() => {});
      } else if (m.t === 'error' && errLog) errLog(m.d);
    }
    window.addEventListener('message', onMsg);
    frame.cleanup = () => {
      try { frame.contentWindow.postMessage({ bv: 1, flush: 1 }, '*'); } catch (e) { /* */ }
      return new Promise(res => setTimeout(() => { window.removeEventListener('message', onMsg); flush().then(res); }, 250));
    };
    return frame;
  }

  let cleanup = null;
  function setView(node, clean) { cleanup = clean || null; $app.replaceChildren(node); window.scrollTo(0, 0); }

  /* ---------- Spiele-Übersicht ---------- */
  function card(g, href) {
    return el('a', { class: 'card', href }, el('div', { class: 'ic' }, g.icon), el('b', {}, g.title), el('small', {}, g.desc), el('span', { class: 'tag' }, g.cat));
  }
  function gamesView() {
    const games = window.BlockGames, cats = ['Alle'].concat([...new Set(games.map(g => g.cat))]);
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
    setView(el('div', {}, el('h1', {}, 'Spiele'), el('div', { class: 'toolbar' }, search, count), chips, el('div', { style: 'height:14px' }), grid));
  }

  /* ---------- Spielen ---------- */
  async function playView(id) {
    let game = window.BlockGames.find(g => g.id === id), code = null, owner = null;
    if (!game && /^u\d+$/.test(id)) {
      try {
        const r = await api('GET', '/api/community/' + id);
        game = { id: r.id, title: r.title, icon: '🧩', desc: r.desc, cat: 'Community', engine: null, cfg: {} }; code = r.code; owner = r.owner;
      } catch (e) { return setView(el('p', {}, 'Spiel nicht gefunden.')); }
    }
    if (!game) return setView(el('p', {}, 'Spiel nicht gefunden.'));
    const lb = el('ol', { class: 'lb' }), errBox = el('div', { class: 'err' });
    async function refresh() {
      try {
        const top = await api('GET', '/api/score/' + game.id);
        lb.replaceChildren(...(top.length ? top.map((r, i) => el('li', {}, `${i + 1}. ${r.name}`, el('b', {}, String(Math.floor(r.score)))) ) : [el('li', { class: 'mut' }, 'Noch kein Eintrag – sei der Erste!')]));
      } catch (e) { /* offline */ }
    }
    const frame = runGame(game, code, { persist: true, onScore: refresh, onError: m => { errBox.textContent = m; } });
    refresh(); const iv = setInterval(refresh, 15000);
    setView(el('div', {}, el('p', {}, el('a', { href: '#/' + (code ? 'community' : 'games') }, '← Zurück')),
      el('h1', {}, game.icon + ' ' + game.title),
      el('div', { class: 'play' }, el('div', {}, frame, errBox),
        el('div', { class: 'panel' }, el('p', { class: 'mut' }, game.desc || ''), owner ? el('p', { class: 'mut' }, 'von ' + owner) : '',
          el('p', { class: 'mut' }, '💾 Dein Fortschritt wird automatisch in deinem Account gespeichert.'), el('h3', {}, '🏆 Bestenliste'), lb))),
      () => { clearInterval(iv); return frame.cleanup(); });
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
    'Klick-Spiel (von Grund auf)': `// Klicke so viele Ziele wie möglich in 20 Sekunden!
const c = Platform.canvas, g = Platform.ctx;
let score = 0, best = 0, time = 0, playing = false;
let target = { x: 320, y: 200 };

Platform.load().then(d => { best = (d && d.best) || 0; });

c.addEventListener('mousedown', e => {
  const r = c.getBoundingClientRect();
  const x = (e.clientX - r.left) * c.width / r.width, y = (e.clientY - r.top) * c.height / r.height;
  if (!playing) { playing = true; score = 0; time = 20; return; }
  if (Math.hypot(x - target.x, y - target.y) < 30) {
    score++;
    target = { x: 40 + Math.random() * 560, y: 60 + Math.random() * 300 };
  }
});

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000; last = now;
  if (playing) {
    time -= dt;
    if (time <= 0) {
      playing = false;
      if (score > best) { best = score; Platform.save({ best }); }
      Platform.score(score);
    }
  }
  g.fillStyle = '#1b2a49'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.font = '20px sans-serif'; g.textAlign = 'left';
  g.fillText('Punkte: ' + score + '   Best: ' + best + '   Zeit: ' + Math.max(0, Math.ceil(time)), 12, 28);
  if (playing) { g.font = '48px serif'; g.textAlign = 'center'; g.fillText('🎯', target.x, target.y + 16); }
  else { g.textAlign = 'center'; g.fillText('Klicke zum Starten', c.width / 2, c.height / 2); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`,
    'Runner mit eigenen Emojis (einfach)': `// Nimm eine fertige Engine und ändere nur die Einstellungen!
// Engines: runner, flappy, dodge, catch, snake, breakout, shooter, memory, whack, climber, chase, racer, tycoon
Platform.engines.runner(Platform, {
  title: 'Mein Runner',
  icon: '🦊',
  player: '🦊',
  obstacle: '🪨',
  bg: ['#1b2a49', '#6a4c93'],
  ground: '#3a3a5a',
  speed: 300
});
`,
    'Eigenes Tycoon (einfach)': `// Ein eigenes Tycoon in 20 Zeilen. Dein Fortschritt wird automatisch gespeichert.
Platform.engines.tycoon(Platform, {
  title: 'Mein Tycoon',
  cur: '$', curName: 'Geld',
  clickEmoji: '🍋', clickName: 'Limonade pressen',
  bg: ['#0f3d1f', '#3c8f4a'],
  items: [
    { name: 'Limo-Stand', emoji: '🥤', cost: 15, income: 0.5 },
    { name: 'Zitronenbaum', emoji: '🌳', cost: 100, income: 4 },
    { name: 'Saftpresse', emoji: '🧃', cost: 1100, income: 32 },
    { name: 'Fabrik', emoji: '🏭', cost: 12000, income: 260 }
  ]
});
`
  };
  const DOC = `Platform.canvas          – das Zeichenfeld (640×400)
Platform.ctx             – 2D-Zeichenkontext
Platform.load()          – Promise: gespeicherte Daten (oder null)
Platform.save(obj)       – speichert Fortschritt (JSON, max. 100 KB)
Platform.score(zahl)     – trägt Punkte in die Bestenliste ein
Platform.user            – Name des Spielers
Platform.engines.NAME(Platform, config)
   NAME: runner flappy dodge catch snake breakout
         shooter memory whack climber chase racer tycoon`;

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
      pf = runGame({ id: 'preview', title: 'Test', engine: null, cfg: {} }, code.value, { persist: false, onError: m => { errBox.textContent = m; } });
      preview.replaceChildren(pf);
    }
    function select(g) {
      cur = g; title.value = g ? g.title : ''; desc.value = g ? g.desc : ''; code.value = g ? g.code : TEMPLATES['Klick-Spiel (von Grund auf)'];
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
      el('p', { class: 'mut' }, 'Programmiere in JavaScript. Mit „Testen“ siehst du dein Spiel sofort, mit „Veröffentlichen“ können es alle in der Community spielen.'),
      el('div', { class: 'editor' }, el('div', {}, el('h3', {}, 'Meine Spiele'), listBox),
        el('div', {}, el('div', { class: 'row' }, title, desc), el('div', { class: 'row' }, tpl), code,
          el('div', { class: 'row' }, el('button', { onclick: test }, '▶ Testen'), el('button', { class: 'sec', onclick: save }, '🚀 Veröffentlichen / Speichern'), el('button', { class: 'bad', onclick: del }, 'Löschen')),
          errBox, preview, el('h3', {}, 'Hilfe: Platform-API'), el('pre', { class: 'doc' }, DOC)))),
      () => { if (pf) pf.cleanup(); });
  }

  /* ---------- Profil ---------- */
  async function profileView() {
    const box = el('div', {}, 'Lade…');
    setView(el('div', {}, el('h1', {}, '👤 ' + me), el('h2', {}, 'Dein Fortschritt'), box));
    try {
      const saves = await api('GET', '/api/saves'), u = window.BlockEngines._util;
      const names = {}; window.BlockGames.forEach(g => names[g.id] = g);
      const rows = Object.entries(saves).map(([id, d]) => {
        const g = names[id]; if (!g && !/^u\d+$/.test(id)) return null;
        const info = d && d.total != null ? 'Gesamt verdient: ' + u.fmt(d.total) + (d.raids ? ' · Razzien: ' + d.raids : '') : d && d.best != null ? 'Highscore: ' + d.best : 'Spielstand gespeichert';
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
    enginesSrc = await (await fetch('engines.js')).text();
    try { me = (await api('GET', '/api/me')).name; start(); } catch (e) { authView(); }
  })();
})();
