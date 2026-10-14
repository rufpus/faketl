import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const assets = new Set(['probe.js', 'page.js', 'worker.js', 'shared-worker.js', 'service-worker.js']);
const records = [];
const early = `window.earlySnapshot = {language:navigator.language,languages:[...navigator.languages],zone:new Intl.DateTimeFormat().resolvedOptions().timeZone,hours:new Date('2026-01-15T12:34:56.789Z').getHours()};`;
export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const received = {path: req.url, acceptLanguage: req.headers['accept-language'] || null};
    records.push(received); if (records.length > 200) records.shift();
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/echo' || url.pathname === '/records') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(url.pathname === '/echo' ? received : records)); return;
    }
    if (assets.has(url.pathname.slice(1))) {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.end(await readFile(path.join(root, url.pathname.slice(1)))); return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (url.pathname === '/frame') {
      res.end(`<!doctype html><script>${early}parent.postMessage({type:'frame-snapshot',snapshot:earlySnapshot},'*');</script><p>HTTP iframe</p>`); return;
    }
    if (url.searchParams.has('csp')) res.setHeader('Content-Security-Policy', "script-src 'self' 'nonce-local-test'; object-src 'none'");
    // The first page script captures the API before external resources load.
    res.end(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><script nonce="local-test">${early}</script><title>Проверка расширения</title>
      <style>body{font:14px system-ui;margin:24px;color:#172b3b}pre{background:#eef2f8;padding:18px;white-space:pre-wrap}iframe{width:220px;height:45px;margin:4px}</style></head>
      <body><h1>Фактические значения HTTP и JavaScript</h1><p>Accept-Language ниже получен сервером. early — первый inline-скрипт страницы. Workers показаны отдельно.</p>
      <p>Заголовок навигации: <strong>${String(received.acceptLanguage).replace(/[&<>"']/g, '')}</strong></p><div id="frames"></div><pre id="output">Загрузка…</pre>
      <script src="/probe.js"></script><script src="/page.js"></script></body></html>`);
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8787);
  createServer().listen(port, '127.0.0.1', () => console.log(`Тестовая страница: http://127.0.0.1:${port}`));
}
