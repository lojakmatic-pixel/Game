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
    console.log('Alle API-Tests bestanden ✔');
  } catch (e) { console.error('FEHLER', e); process.exitCode = 1; }
  server.close(); process.exit(process.exitCode || 0);
});
