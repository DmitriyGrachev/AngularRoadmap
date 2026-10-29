import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const jarName = 'gson-2.13.2.jar';
const checksum = 'dd0ce1b55a3ed2080cb70f9c655850cda86c206862310009dcb5e5c95265a5e0';
export function verifyJar(bytes) {
  if (createHash('sha256').update(bytes).digest('hex') !== checksum) throw new Error('Gson: проверка SHA-256 не пройдена. Удалите .cache/issue-api и повторите запуск.');
}
async function dependency() {
  const cache = join(root, '.cache/issue-api'), jar = join(cache, jarName); await mkdir(cache, { recursive: true });
  try { const bytes = await readFile(jar); verifyJar(bytes); return jar; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const response = await fetch(`https://repo.maven.apache.org/maven2/com/google/code/gson/gson/2.13.2/${jarName}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Gson: не удалось загрузить зависимость (${response.status}).`);
  const bytes = Buffer.from(await response.arrayBuffer()); verifyJar(bytes);
  const temporary = `${jar}.${randomUUID()}.tmp`; await writeFile(temporary, bytes); await rename(temporary, jar); return jar;
}
export async function startJavaApi({ port = Number(process.env.PORT ?? 8080), quiet = false } = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT должен быть целым числом от 1024 до 65535.');
  const jar = await dependency();
  const child = spawn('java', ['--class-path', jar, join(root, 'practice/issue-api/IssueApi.java')], { cwd: root, env: { ...process.env, PORT: String(port) }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolveReady, rejectReady) => {
    let output = '', errors = '', done = false;
    const timer = setTimeout(() => { child.kill(); rejectReady(new Error(`Java API: запуск занял слишком долго. ${errors}`)); }, 15000);
    child.stdout.on('data', bytes => { const value = bytes.toString(); output += value; if (!quiet) process.stdout.write(value); if (!done && output.includes('API_READY')) { done = true; clearTimeout(timer); resolveReady(); } });
    child.stderr.on('data', bytes => { errors += bytes.toString(); if (!quiet) process.stderr.write(bytes); });
    child.on('error', error => { clearTimeout(timer); rejectReady(new Error(`Нужен JDK 21 в PATH: ${error.message}`)); });
    child.on('close', code => { clearTimeout(timer); if (!done) rejectReady(new Error(`Java API завершился (${code}). ${errors}`)); });
  });
  return { child, url: `http://127.0.0.1:${port}`, stop: () => new Promise(resolveStop => { if (child.exitCode !== null) return resolveStop(); child.once('close', resolveStop); child.kill(); }) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const api = await startJavaApi(); for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await api.stop(); process.exit(0); }); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
