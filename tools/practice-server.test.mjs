import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPracticeServer } from './practice-server.mjs';

test('practice server serves nested examples, lists directories and contains paths', async t => {
  const root = await mkdtemp(join(tmpdir(), 'angular-web-'));
  await mkdir(join(root, 'foundations'));
  await writeFile(join(root, 'foundations', 'index.html'), '<h1>Example</h1>');
  await writeFile(join(root, 'foundations', 'main.mjs'), 'export const value = 42;');
  const server = await createPracticeServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const index = await fetch(`${base}/foundations/`);
  assert.equal(index.status, 200);
  assert.match(await index.text(), /Example/);
  const script = await fetch(`${base}/foundations/main.mjs`);
  assert.match(script.headers.get('content-type'), /javascript/);
  assert.match(await script.text(), /42/);
  assert.match(await (await fetch(base)).text(), /foundations/);
  assert.equal((await fetch(`${base}/missing`)).status, 404);
  assert.equal((await fetch(`${base}/%2e%2e%5cpackage.json`)).status, 400);
  assert.equal((await fetch(`${base}/%ff`)).status, 400);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
