// Kho dữ liệu dạng tài liệu JSON.
// Trên Vercel: Vercel Blob ở chế độ riêng tư (private), đọc không qua bộ nhớ đệm,
// ghi có điều kiện theo ETag để hai yêu cầu cùng lúc không ghi đè nhau.
// Khi chạy trên máy: lưu tệp trong thư mục DATA_DIR.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export class Conflict extends Error {}

export const usingBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
let blobMod;
const blob = async () => (blobMod ||= await import('@vercel/blob'));
const DIR = () => process.env.DATA_DIR || path.join(process.cwd(), '.data');
const etagOf = (s) => crypto.createHash('sha1').update(s).digest('hex');

function safe(p) {
  if (!/^[a-z0-9/_.-]+$/i.test(p) || p.includes('..')) throw new Error('Bad path ' + p);
  return p;
}

export async function getDoc(p) {
  safe(p);
  if (usingBlob()) {
    const { get } = await blob();
    const r = await get(p, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    const text = await new Response(r.stream).text();
    return { data: JSON.parse(text), etag: r.blob.etag };
  }
  try {
    const text = await fs.readFile(path.join(DIR(), p), 'utf8');
    return { data: JSON.parse(text), etag: etagOf(text) };
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

// create: chỉ ghi nếu chưa tồn tại. etag: chỉ ghi nếu chưa ai sửa từ lúc đọc.
export async function putDoc(p, data, { etag, create } = {}) {
  safe(p);
  const text = JSON.stringify(data);
  if (usingBlob()) {
    const { put, BlobPreconditionFailedError, BlobError } = await blob();
    const opts = { access: 'private', contentType: 'application/json', addRandomSuffix: false, cacheControlMaxAge: 60 };
    if (etag) opts.ifMatch = etag;
    else if (!create) opts.allowOverwrite = true;
    try {
      await put(p, text, opts);
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError) throw new Conflict(p);
      if (create && e instanceof BlobError && /exist/i.test(e.message)) throw new Conflict(p);
      throw e;
    }
    return;
  }
  const file = path.join(DIR(), p);
  await fs.mkdir(path.dirname(file), { recursive: true });
  if (create) {
    try { await fs.writeFile(file, text, { flag: 'wx' }); } catch (e) {
      if (e.code === 'EEXIST') throw new Conflict(p);
      throw e;
    }
    return;
  }
  if (etag) {
    const cur = await getDoc(p);
    if (!cur || cur.etag !== etag) throw new Conflict(p);
  }
  await fs.writeFile(file, text);
}

// Đọc, sửa, ghi lại; tự thử lại nếu có người khác ghi chen vào.
// fn trả về undefined nghĩa là không cần ghi.
export async function updateDoc(p, fn, { create = false } = {}) {
  for (let i = 0; i < 6; i++) {
    const cur = await getDoc(p);
    if (!cur && !create) return null;
    const next = await fn(cur ? structuredClone(cur.data) : null);
    if (next === undefined) return cur ? cur.data : null;
    try {
      await putDoc(p, next, cur ? { etag: cur.etag } : { create: true });
      return next;
    } catch (e) {
      if (!(e instanceof Conflict)) throw e;
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 120));
    }
  }
  throw new Error('Quá nhiều yêu cầu ghi cùng lúc vào ' + p);
}

export async function listPaths(prefix) {
  safe(prefix);
  if (usingBlob()) {
    const { list } = await blob();
    const out = [];
    let cursor;
    do {
      const r = await list({ prefix, cursor, limit: 1000 });
      r.blobs.forEach((b) => out.push(b.pathname));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    return out;
  }
  const dir = path.join(DIR(), prefix);
  try {
    return (await fs.readdir(dir)).filter((f) => f.endsWith('.json')).map((f) => prefix + f);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

export async function getMany(paths, concurrency = 8) {
  const out = new Array(paths.length);
  let i = 0;
  async function worker() {
    while (i < paths.length) {
      const k = i++;
      const d = await getDoc(paths[k]);
      out[k] = d ? d.data : null;
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, paths.length) }, worker));
  return out.filter(Boolean);
}
