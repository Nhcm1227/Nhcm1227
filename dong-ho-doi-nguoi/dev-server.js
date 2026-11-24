// Máy chủ chạy thử trên máy: phục vụ thư mục public/ và các hàm trong api/ giống Vercel.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PORT = Number(process.env.PORT || 3000);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  try {
    if (url.pathname.startsWith('/api/')) {
      const rel = url.pathname.replace(/\/$/, '');
      if (rel.includes('..') || rel.includes('/_')) { res.statusCode = 404; return res.end(); }
      const file = path.join(ROOT, rel + '.js');
      await fs.access(file);
      const mod = await import(pathToFileURL(file).href);
      return await mod.default(req, res);
    }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = path.join(ROOT, 'public', p);
    if (!file.startsWith(path.join(ROOT, 'public'))) { res.statusCode = 403; return res.end(); }
    try { await fs.access(file); } catch { file += '.html'; }
    const body = await fs.readFile(file);
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch (e) {
    if (e.code === 'ENOENT') { res.statusCode = 404; return res.end('Not found'); }
    console.error(e);
    res.statusCode = 500; res.end('error');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
