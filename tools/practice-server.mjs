import { createServer } from 'node:http';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const escape = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.ts': 'text/plain', '.md': 'text/plain' };
const inside = (root, path) => { const rel = relative(root, path); return rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.includes(':'); };

export async function createPracticeServer(directory) {
  const root = await realpath(directory);
  return createServer(async (request, response) => {
    const send = (status, body, type = 'text/plain') => {
      response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (!['GET', 'HEAD'].includes(request.method)) { send(405, 'Поддерживаются только GET и HEAD.'); return; }
    let urlPath;
    try { urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { send(400, 'Некорректный адрес.'); return; }
    if (/[\\:\0]/.test(urlPath)) { send(400, 'Некорректный путь.'); return; }
    let path = resolve(root, `.${urlPath}`);
    if (!inside(root, path)) { send(403, 'Путь вне практики.'); return; }
    try {
      path = await realpath(path);
      if (!inside(root, path)) { send(403, 'Путь вне практики.'); return; }
      if ((await stat(path)).isDirectory()) {
        if (!urlPath.endsWith('/')) {
          response.writeHead(302, { Location: `${urlPath}/` }); response.end(); return;
        }
        const entries = await readdir(path, { withFileTypes: true });
        if (entries.some(entry => entry.name === 'index.html' && entry.isFile())) {
          path = resolve(path, 'index.html');
        } else {
          const links = entries.sort((a, b) => a.name.localeCompare(b.name)).map(entry =>
            `<li><a href="${escape(urlPath)}${encodeURIComponent(entry.name)}${entry.isDirectory() ? '/' : ''}">${escape(entry.name)}${entry.isDirectory() ? '/' : ''}</a></li>`
          ).join('');
          send(200, `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Практика Angular</title><style>body{max-width:800px;margin:48px auto;padding:0 24px;font:18px/1.7 system-ui;color:#18243b}a{color:#3058db}li{margin:8px 0}</style><h1>Практика в браузере</h1><p>${escape(urlPath)}</p><ul>${links}</ul><p>Открой путь из своего урока. Редактируй исходники в IDE и обновляй страницу.</p></html>`, 'text/html');
          return;
        }
      }
      send(200, await readFile(path), types[extname(path)] ?? 'application/octet-stream');
    } catch (error) {
      send(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500, error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 'Файл не найден. Проверь путь в уроке.' : 'Не удалось прочитать учебный файл.');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../practice');
  const server = await createPracticeServer(root);
  server.on('error', error => { console.error(`Не удалось запустить практику: ${error.message}`); process.exitCode = 1; });
  server.listen(4301, '127.0.0.1', () => console.log('Практика: http://127.0.0.1:4301/foundations/'));
}
