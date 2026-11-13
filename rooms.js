'use strict';
// Mehrspieler: minimaler WebSocket-Server (RFC 6455) + Räume + Runden-Logik. Keine Abhängigkeiten.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---------- Katalog aus den Spieldateien (public/g*.js) laden ---------- */
const CATALOG = {};
function loadCatalog() {
  const dir = path.join(__dirname, 'public');
  global.reg = (id, title, icon, cat, desc, help, opt) => {
    CATALOG[id] = Object.assign({ id, title, icon, cat, desc, help, mode: 'round', dur: 60, max: 8 }, opt);
  };
  for (const f of fs.readdirSync(dir).filter(f => /^g\d+\.js$/.test(f)).sort()) vm.runInThisContext(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f });
  delete global.reg;
  return CATALOG;
}

/* ---------- WebSocket-Frames ---------- */
const LOBBY = Number(process.env.BV_LOBBY || 6), BREAK = Number(process.env.BV_BREAK || 8);
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
function frame(op, payload) {
  const len = payload.length; let h;
  if (len < 126) h = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(len, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([h, payload]);
}
function parse(c, onText) {
  for (;;) {
    const b = c.buf;
    if (b.length < 2) return;
    const op = b[0] & 15, masked = b[1] & 128; let len = b[1] & 127, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; const big = b.readBigUInt64BE(2); if (big > 65536n) return c.close(); len = Number(big); off = 10; }
    if (!masked || len > 65536 || !(b[0] & 128)) return c.close(); // Clients müssen maskieren; keine Fragmente
    if (b.length < off + 4 + len) return;
    const mask = b.subarray(off, off + 4), data = Buffer.from(b.subarray(off + 4, off + 4 + len));
    for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
    c.buf = b.subarray(off + 4 + len);
    if (op === 8) return c.close();
    if (op === 9) c.sock.write(frame(10, data));
    else if (op === 1) onText(data.toString('utf8'));
  }
}

/* ---------- Räume ---------- */
function attach(server, { auth, db, persist, allowGame }) {
  const rooms = new Map(); let seq = 0;
  const clean = (s, n) => String(s == null ? '' : s).slice(0, n);
  const send = (c, obj) => { if (!c.sock.destroyed) c.sock.write(frame(1, Buffer.from(JSON.stringify(obj)))); };
  const bcast = (room, obj, except) => { const f = frame(1, Buffer.from(JSON.stringify(obj))); for (const c of room.players.values()) if (c !== except && !c.sock.destroyed) c.sock.write(f); };
  const roster = room => Array.from(room.players.keys());

  function createRoom(game) {
    const meta = CATALOG[game] || { mode: 'free', max: 8, dur: 0 };
    const room = { id: game + '#' + (++seq), game, meta, players: new Map(), kv: {}, seed: crypto.randomInt(1, 2 ** 30), round: 0, phase: meta.mode === 'round' ? 'break' : 'free', left: LOBBY, fin: {}, dirty: {}, timer: null };
    if (meta.persist && db.shared && db.shared[game]) room.kv = JSON.parse(JSON.stringify(db.shared[game]));
    if (meta.mode === 'round') room.timer = setInterval(() => tick(room), 1000);
    rooms.set(room.id, room); return room;
  }
  function findRoom(game) {
    const max = (CATALOG[game] || {}).max || 8;
    for (const r of rooms.values()) if (r.game === game && r.players.size < max) return r;
    return createRoom(game);
  }
  const scoreOf = (room, n) => { const c = room.players.get(n); return room.fin[n] != null ? room.fin[n] : (c && c.state && Number(c.state.s)) || 0; };
  function startRound(room) {
    room.round++; room.seed = crypto.randomInt(1, 2 ** 30); room.kv = {}; room.fin = {}; room.phase = 'play'; room.left = room.meta.dur;
    for (const c of room.players.values()) c.state = null;
    bcast(room, { t: 'round', n: room.round, seed: room.seed, dur: room.left });
  }
  function endRound(room) {
    const rank = roster(room).map(n => ({ name: n, score: scoreOf(room, n) })).sort((a, b) => b.score - a.score);
    room.phase = 'break'; room.left = BREAK; bcast(room, { t: 'results', rank, left: BREAK });
  }
  function tick(room) {
    if (!room.players.size) { clearInterval(room.timer); rooms.delete(room.id); return; }
    room.left--;
    if (room.phase === 'play' && room.left > 2 && roster(room).every(n => room.fin[n] != null)) room.left = 2;
    if (room.left <= 0) { room.phase === 'play' ? endRound(room) : startRound(room); }
    else bcast(room, { t: 'tick', phase: room.phase, left: room.left });
  }
  setInterval(() => { // Zustände gebündelt (10 Hz) verteilen
    for (const room of rooms.values()) {
      const keys = Object.keys(room.dirty); if (!keys.length) continue;
      const p = {}; for (const n of keys) { const c = room.players.get(n); if (c && c.state) p[n] = c.state; }
      room.dirty = {}; bcast(room, { t: 'st', p });
    }
  }, 100);
  let saveT = null;
  function persistShared(room) { if (!room.meta.persist || saveT) return; saveT = setTimeout(() => { saveT = null; db.shared = db.shared || {}; db.shared[room.game] = room.kv; persist(); }, 1500); }

  function leave(c) {
    const room = c.room; if (!room) return; c.room = null;
    room.players.delete(c.name); delete room.dirty[c.name];
    bcast(room, { t: 'room', players: roster(room) });
    if (!room.players.size && room.meta.mode !== 'round') rooms.delete(room.id);
  }
  function onMsg(c, text) {
    const now = Date.now(); if (now - c.rt > 1000) { c.rt = now; c.rn = 0; } if (++c.rn > 150) return;
    let m; try { m = JSON.parse(text); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'join') {
      if (c.room || typeof m.game !== 'string' || !allowGame(m.game)) return;
      const room = findRoom(m.game); c.room = room; room.players.set(c.name, c);
      send(c, { t: 'hello', room: room.id, you: c.name, mode: room.meta.mode, dur: room.meta.dur, phase: room.phase, left: room.left, round: room.round, seed: room.seed, players: roster(room), kv: room.kv, st: Object.fromEntries(roster(room).filter(n => room.players.get(n).state).map(n => [n, room.players.get(n).state])) });
      bcast(room, { t: 'room', players: roster(room) }, c);
      return;
    }
    const room = c.room; if (!room) return;
    if (m.t === 'st') {
      const raw = JSON.stringify(m.d); if (!m.d || typeof m.d !== 'object' || raw.length > 6000) return;
      c.state = m.d; room.dirty[c.name] = 1;
    } else if (m.t === 'ev') {
      const raw = JSON.stringify(m.d); if (raw === undefined || raw.length > 6000) return;
      const out = { t: 'ev', from: c.name, d: m.d };
      if (m.to) { const o = room.players.get(String(m.to)); if (o) send(o, out); } else bcast(room, out, c);
    } else if (m.t === 'kv') {
      const k = clean(m.k, 40), raw = JSON.stringify(m.v === undefined ? null : m.v);
      if (!k || raw.length > 20000 || (!(k in room.kv) && Object.keys(room.kv).length > 5000)) return;
      room.kv[k] = JSON.parse(raw); bcast(room, { t: 'kv', k, v: room.kv[k], from: c.name }); persistShared(room);
    } else if (m.t === 'fin') {
      if (room.phase === 'play') { const s = Number(m.s); room.fin[c.name] = Number.isFinite(s) ? s : 0; }
    } else if (m.t === 'chat') {
      const text = clean(m.text, 120).trim(); if (text) bcast(room, { t: 'chat', from: c.name, text });
    }
  }
  server.on('upgrade', (req, sock) => {
    const url = new URL(req.url, 'http://x');
    const name = auth(req);
    const origin = req.headers.origin;
    if (url.pathname !== '/ws' || !name || (origin && new URL(origin).host !== req.headers.host) || !req.headers['sec-websocket-key']) { sock.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + GUID).digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    // Zweite Verbindung desselben Accounts ersetzt die erste
    for (const r of rooms.values()) { const old = r.players.get(name); if (old) old.close(); }
    const c = { sock, name, room: null, buf: Buffer.alloc(0), state: null, rt: 0, rn: 0, closed: false,
      close() { if (c.closed) return; c.closed = true; leave(c); try { sock.end(frame(8, Buffer.alloc(0))); } catch (e) { /* */ } sock.destroy(); } };
    sock.on('data', d => { c.buf = Buffer.concat([c.buf, d]); if (c.buf.length > 200000) return c.close(); parse(c, t => onMsg(c, t)); });
    sock.on('end', () => c.close()); sock.on('close', () => c.close()); sock.on('error', () => c.close()); // 'end': HTTP-Sockets sind halb-offen
  });
  return { rooms };
}
module.exports = { attach, loadCatalog, CATALOG };
