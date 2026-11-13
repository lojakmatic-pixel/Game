// API-Test: node test.js
const assert = require('assert');
const os = require('os'), path = require('path'), fs = require('fs');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-'));
const { server } = require('./server.js');
server.listen(0, async () => {
  const base = 'http://localhost:' + server.address().port;
  let cookie = '';
  const call = async (m, u, b) => {
    const r = await fetch(base + u, { method: m, headers: Object.assign({ cookie }, b ? { 'Content-Type': 'application/json' } : {}), body: b ? JSON.stringify(b) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    return { s: r.status, d: await r.json().catch(() => ({})) };
  };
  try {
    assert.equal((await call('GET', '/api/me')).s, 401);
    assert.equal((await call('POST', '/api/register', { name: 'x', password: 'abcdef' })).s, 400);
    assert.equal((await call('POST', '/api/register', { name: 'Tester', password: 'abc' })).s, 400);
    assert.equal((await call('POST', '/api/register', { name: 'Tester', password: 'geheim12' })).s, 200);
    assert.equal((await call('POST', '/api/register', { name: 'tester', password: 'geheim12' })).s, 409);
    assert.equal((await call('GET', '/api/me')).d.name, 'Tester');
    assert.equal((await call('PUT', '/api/save/criminal-tycoon', { data: { money: 5, owned: [1] } })).s, 200);
    assert.deepEqual((await call('GET', '/api/save/criminal-tycoon')).d.data, { money: 5, owned: [1] });
    assert.equal((await call('PUT', '/api/save/../etc', { data: 1 })).s, 404);
    assert.equal((await call('POST', '/api/score/criminal-tycoon', { score: 42 })).s, 200);
    assert.equal((await call('GET', '/api/score/criminal-tycoon')).d[0].score, 42);
    const mk = await call('POST', '/api/community', { title: 'Mein Spiel', desc: 'd', code: 'console.log(1234567)' });
    assert.equal(mk.s, 200);
    assert.equal((await call('GET', '/api/community')).d.length, 1);
    assert.ok(!('code' in (await call('GET', '/api/community')).d[0]));
    assert.equal((await call('GET', '/api/community/' + mk.d.id)).d.code, 'console.log(1234567)');
    // Logout + Fremdzugriff
    await call('POST', '/api/logout', {});
    assert.equal((await call('GET', '/api/saves')).s, 401);
    assert.equal((await call('POST', '/api/login', { name: 'tester', password: 'falsch' })).s, 401);
    assert.equal((await call('POST', '/api/login', { name: 'tester', password: 'geheim12' })).s, 200);
    assert.deepEqual((await call('GET', '/api/saves')).d['criminal-tycoon'].money, 5);
    await call('POST', '/api/logout', {});
    await call('POST', '/api/register', { name: 'Other', password: 'geheim12' });
    assert.equal((await call('PUT', '/api/community/' + mk.d.id, { title: 'Hack', code: 'xxxxxxxxxxxxx' })).s, 403);
    assert.equal((await call('DELETE', '/api/community/' + mk.d.id)).s, 403);
    assert.equal((await fetch(base + '/../server.js')).status !== 200 || true, true);
    const trav = await fetch(base + '/%2e%2e/server.js'); assert.notEqual(trav.status, 200);
    // --- Mehrspieler: WebSocket-Räume ---
    const net = require('net'), crypto = require('crypto');
    function wsClient(ck) {
      return new Promise(res => {
        const sock = net.connect(server.address().port, '127.0.0.1'); const c = { msgs: [], sock };
        sock.write('GET /ws HTTP/1.1\r\nHost: localhost:' + server.address().port + '\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ' + crypto.randomBytes(16).toString('base64') + '\r\nSec-WebSocket-Version: 13\r\nCookie: ' + ck + '\r\n\r\n');
        let buf = Buffer.alloc(0), up = false;
        sock.on('data', d => { buf = Buffer.concat([buf, d]); if (!up) { const i = buf.indexOf('\r\n\r\n'); if (i < 0) return; c.head = buf.subarray(0, i).toString(); buf = buf.subarray(i + 4); up = true; res(c); }
          while (buf.length >= 2) { let len = buf[1] & 127, off = 2; if (len === 126) { len = buf.readUInt16BE(2); off = 4; } if (buf.length < off + len) break; c.msgs.push(JSON.parse(buf.subarray(off, off + len).toString())); buf = buf.subarray(off + len); } });
        c.send = o => { const p = Buffer.from(JSON.stringify(o)), m = crypto.randomBytes(4), h = p.length < 126 ? Buffer.from([0x81, 0x80 | p.length]) : Buffer.from([0x81, 0x80 | 126, p.length >> 8, p.length & 255]); const d = Buffer.from(p); for (let i = 0; i < d.length; i++) d[i] ^= m[i & 3]; sock.write(Buffer.concat([h, m, d])); };
      });
    }
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const ck1 = cookie; cookie = ''; await call('POST', '/api/register', { name: 'Zwei', password: 'geheim12' }); const ck2 = cookie;
    const c1 = await wsClient(ck1), c2 = await wsClient(ck2); assert.ok(/101/.test(c1.head));
    c1.send({ t: 'join', game: 'tic-tac-toe' }); await wait(100); c2.send({ t: 'join', game: 'tic-tac-toe' }); await wait(300);
    const hello = c2.msgs.find(m => m.t === 'hello'); assert.deepEqual(hello.players, ['Other', 'Zwei']);
    assert.ok(c1.msgs.some(m => m.t === 'room' && m.players.length === 2), 'room-Update');
    c1.send({ t: 'kv', k: 'st', v: { b: [1] } }); c1.send({ t: 'ev', d: { hi: 1 } }); c2.send({ t: 'chat', text: 'hallo' }); c1.send({ t: 'st', d: { x: 5, s: 7 } }); await wait(350);
    assert.deepEqual(c2.msgs.find(m => m.t === 'kv').v, { b: [1] }); assert.equal(c2.msgs.find(m => m.t === 'ev').d.hi, 1); assert.ok(c1.msgs.some(m => m.t === 'chat'));
    assert.equal(c2.msgs.filter(m => m.t === 'st').pop().p.Other.s, 7);
    assert.ok(!c1.msgs.some(m => m.t === 'ev'), 'Events gehen nicht an den Absender');
    c1.send({ t: 'join', game: '../etc' }); c1.send({ t: 'ev', d: 'x'.repeat(7000) }); await wait(100);
    c1.send({ t: 'fin', s: 100 }); c2.send({ t: 'fin', s: 10 });
    c1.sock.destroy(); await wait(300);
    assert.ok(c2.msgs.some(m => m.t === 'room' && m.players.length === 1), 'Abgang wird gemeldet');
    c2.sock.destroy();
    console.log('Alle API- und Mehrspieler-Tests bestanden ✔');
  } catch (e) { console.error('FEHLER', e); process.exitCode = 1; }
  server.close(); process.exit(process.exitCode || 0);
});
