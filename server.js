'use strict';
// BlockVerse – Spielplattform-Server (keine externen Abhängigkeiten)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rooms = require('./rooms');
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC = path.join(__dirname, 'public');
fs.mkdirSync(DATA_DIR, { recursive: true });

let db = { users: {}, sessions: {}, saves: {}, community: [], scores: {}, nextId: 1 };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* neue DB */ }

let writeTimer = null;
function persist() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    const tmp = DB_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(db), err => { if (!err) fs.rename(tmp, DB_FILE, () => {}); });
  }, 200);
}
function flushSync() { fs.writeFileSync(DB_FILE, JSON.stringify(db)); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const GAME_ID = /^[a-z0-9_-]{1,60}$/;
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 15;
}

function send(res, code, obj, headers) {
  const body = JSON.stringify(obj);
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers));
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 300000) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
function getUser(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  if (!m) return null;
  const s = db.sessions[m[1]];
  return s && db.users[s.name] ? s.name : null;
}
function authReq(req) { return getUser(req); }
function startSession(res, name, extra) {
  const sid = crypto.randomBytes(32).toString('hex');
  db.sessions[sid] = { name, created: Date.now() };
  persist();
  send(res, 200, Object.assign({ name }, extra), { 'Set-Cookie': `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000` });
}

async function api(req, res, url) {
  const p = url.pathname;
  const ip = req.socket.remoteAddress;
  if (req.method !== 'GET' && !(req.headers['content-type'] || '').startsWith('application/json') && req.method !== 'DELETE')
    return send(res, 415, { error: 'JSON erwartet' });
  let body = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    try { body = await readBody(req); } catch (e) { return send(res, 400, { error: e.message }); }
  }

  if (p === '/api/register' && req.method === 'POST') {
    if (limited(ip)) return send(res, 429, { error: 'Zu viele Versuche, warte kurz.' });
    const name = String(body.name || ''), pw = String(body.password || '');
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return send(res, 400, { error: 'Name: 3–20 Zeichen, nur Buchstaben, Zahlen, _' });
    if (pw.length < 6 || pw.length > 100) return send(res, 400, { error: 'Passwort muss mindestens 6 Zeichen haben' });
    const key = name.toLowerCase();
    if (Object.values(db.users).some(u => u.key === key)) return send(res, 409, { error: 'Name ist schon vergeben' });
    const salt = crypto.randomBytes(16).toString('hex');
    db.users[name] = { key, salt, hash: hashPw(pw, salt), created: Date.now() };
    return startSession(res, name);
  }
  if (p === '/api/login' && req.method === 'POST') {
    if (limited(ip)) return send(res, 429, { error: 'Zu viele Versuche, warte kurz.' });
    const name = String(body.name || '').toLowerCase(), pw = String(body.password || '');
    const entry = Object.entries(db.users).find(([, u]) => u.key === name);
    if (!entry) return send(res, 401, { error: 'Name oder Passwort falsch' });
    const [real, u] = entry;
    const a = Buffer.from(hashPw(pw, u.salt), 'hex'), b = Buffer.from(u.hash, 'hex');
    if (!crypto.timingSafeEqual(a, b)) return send(res, 401, { error: 'Name oder Passwort falsch' });
    return startSession(res, real);
  }
  if (p === '/api/logout' && req.method === 'POST') {
    const m = /sid=([a-f0-9]{64})/.exec(req.headers.cookie || '');
    if (m) { delete db.sessions[m[1]]; persist(); }
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  const user = getUser(req);
  if (p === '/api/me') return user ? send(res, 200, { name: user }) : send(res, 401, { error: 'Nicht angemeldet' });
  if (!user) return send(res, 401, { error: 'Nicht angemeldet' });

  // ---- Fortschritt ----
  if (p === '/api/saves' && req.method === 'GET') return send(res, 200, db.saves[user] || {});
  let m = /^\/api\/save\/([^/]+)$/.exec(p);
  if (m) {
    if (!GAME_ID.test(m[1])) return send(res, 400, { error: 'Ungültige Spiel-ID' });
    const mine = db.saves[user] || (db.saves[user] = {});
    if (req.method === 'GET') return send(res, 200, { data: mine[m[1]] === undefined ? null : mine[m[1]] });
    if (req.method === 'PUT') {
      const raw = JSON.stringify(body.data === undefined ? null : body.data);
      if (raw.length > 100000) return send(res, 413, { error: 'Speicherstand zu groß' });
      if (!(m[1] in mine) && Object.keys(mine).length >= 400) return send(res, 400, { error: 'Zu viele Spielstände' });
      mine[m[1]] = JSON.parse(raw);
      persist();
      return send(res, 200, { ok: true });
    }
  }

  // ---- Bestenliste ----
  m = /^\/api\/score\/([^/]+)$/.exec(p);
  if (m && GAME_ID.test(m[1])) {
    const board = db.scores[m[1]] || (db.scores[m[1]] = {});
    if (req.method === 'GET') {
      const top = Object.entries(board).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, score]) => ({ name, score }));
      return send(res, 200, top);
    }
    if (req.method === 'POST') {
      const sc = Number(body.score);
      if (!Number.isFinite(sc) || Math.abs(sc) > 1e15) return send(res, 400, { error: 'Ungültiger Score' });
      if (!(user in board) || sc > board[user]) { board[user] = sc; persist(); }
      return send(res, 200, { ok: true });
    }
  }

  // ---- Community-Spiele ----
  if (p === '/api/community' && req.method === 'GET') {
    return send(res, 200, db.community.slice().reverse().map(g => ({ id: g.id, title: g.title, desc: g.desc, owner: g.owner, created: g.created })));
  }
  if (p === '/api/mygames' && req.method === 'GET') return send(res, 200, db.community.filter(g => g.owner === user));
  if (p === '/api/community' && req.method === 'POST') {
    const v = validateGame(body);
    if (v) return send(res, 400, { error: v });
    if (db.community.filter(g => g.owner === user).length >= 30) return send(res, 400, { error: 'Maximal 30 Spiele pro Account' });
    const g = { id: 'u' + db.nextId++, owner: user, title: body.title.trim(), desc: String(body.desc || '').slice(0, 200), code: body.code, created: Date.now() };
    db.community.push(g); persist();
    return send(res, 200, { id: g.id });
  }
  m = /^\/api\/community\/(u\d+)$/.exec(p);
  if (m) {
    const g = db.community.find(x => x.id === m[1]);
    if (!g) return send(res, 404, { error: 'Spiel nicht gefunden' });
    if (req.method === 'GET') return send(res, 200, g);
    if (g.owner !== user) return send(res, 403, { error: 'Nicht dein Spiel' });
    if (req.method === 'PUT') {
      const v = validateGame(body);
      if (v) return send(res, 400, { error: v });
      g.title = body.title.trim(); g.desc = String(body.desc || '').slice(0, 200); g.code = body.code; persist();
      return send(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') { db.community = db.community.filter(x => x !== g); persist(); return send(res, 200, { ok: true }); }
  }
  return send(res, 404, { error: 'Unbekannte Route' });
}

function validateGame(b) {
  if (typeof b.title !== 'string' || b.title.trim().length < 2 || b.title.length > 40) return 'Titel: 2–40 Zeichen';
  if (typeof b.code !== 'string' || b.code.length < 10) return 'Code fehlt';
  if (b.code.length > 100000) return 'Code ist zu lang (max. 100 KB)';
  return null;
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Nicht gefunden'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    api(req, res, url).catch(e => { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Serverfehler' }); });
  } else serveStatic(req, res, url);
});

rooms.loadCatalog();
const allowGame = id => typeof id === 'string' && (id in rooms.CATALOG || (/^u\d+$/.test(id) && db.community.some(g => g.id === id)));
rooms.attach(server, { auth: authReq, db, persist, allowGame });

if (require.main === module) {
  server.listen(PORT, () => console.log(`BlockVerse läuft auf http://localhost:${PORT}`));
  process.on('SIGINT', () => { flushSync(); process.exit(0); });
  process.on('SIGTERM', () => { flushSync(); process.exit(0); });
}
module.exports = { server, flushSync };
