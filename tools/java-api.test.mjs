import test from 'node:test';
import assert from 'node:assert/strict';
import { startJavaApi, verifyJar } from './java-api.mjs';

test('Java fixture serves filtering, pages, writes, validation and deterministic failures', { timeout: 30000 }, async () => {
  const api = await startJavaApi({ port: 8081, quiet: true });
  const request = async (path = '', options) => { const response = await fetch(`${api.url}/api/issues${path}`, options); return { status: response.status, body: await response.json() }; };
  const json = body => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const first = await request(); assert.equal(first.status, 200); assert.equal(first.body.items.length, 10); assert.equal(first.body.total, 32); assert.equal(first.body.page, 0);
    const next = await request('?page=1&size=10'); assert.equal(next.body.items[0].id, 'ISS-011');
    const filtered = await request('?status=OPEN&priority=HIGH'); assert.ok(filtered.body.items.length > 0); assert.ok(filtered.body.items.every(item => item.status === 'OPEN' && item.priority === 'HIGH'));
    assert.equal((await request('?q=zz-no-match')).body.total, 0);
    for (const query of ['?page=-1', '?size=0', '?status=UNKNOWN', '?priority=WRONG', '?page=word']) assert.equal((await request(query)).status, 400);
    const invalid = await request('', { method: 'POST', ...json({ title: ' x ', description: '', priority: 'HIGH' }) }); assert.equal(invalid.status, 400); assert.ok(invalid.body.fieldErrors.title.length);
    assert.equal((await request('', { method: 'POST', ...json({ title: 'Valid title', description: 'x'.repeat(2001), priority: 'HIGH' }) })).status, 400);
    assert.equal((await request('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'null' })).status, 400);
    const created = await request('', { method: 'POST', ...json({ title: '  Новая заявка  ', description: 'Описание', priority: 'HIGH' }) }); assert.equal(created.status, 201); assert.equal(created.body.title, 'Новая заявка'); assert.equal(created.body.status, 'OPEN'); assert.ok(created.body.createdAt.endsWith('Z'));
    const changed = await request(`/${created.body.id}`, { method: 'PATCH', ...json({ title: 'Обновлённая заявка', status: 'DONE', priority: 'LOW' }) }); assert.equal(changed.status, 200); assert.equal(changed.body.status, 'DONE');
    assert.equal((await request(`/${created.body.id}`)).body.title, 'Обновлённая заявка');
    assert.equal((await request('/missing')).status, 404);
    assert.equal((await request('?scenario=error')).status, 500);
    assert.equal((await request('?scenario=empty')).body.total, 0);
    assert.equal((await request('?scenario=validation', { method: 'POST', ...json({ title: 'Valid title', description: '', priority: 'MEDIUM' }) })).status, 400);
  } finally { await api.stop(); }
});

test('downloaded dependency integrity rejects altered bytes', () => {
  assert.throws(() => verifyJar(Buffer.from('not the pinned library')), /SHA-256/);
});
