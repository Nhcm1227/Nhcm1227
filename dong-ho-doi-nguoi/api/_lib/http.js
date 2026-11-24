export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}
export const ok = (res, body) => send(res, 200, body);

export function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

export function allow(req, ...methods) {
  if (!methods.includes(req.method)) throw new HttpError(405, 'Phương thức không được hỗ trợ.');
}

// Chặn gửi chéo trang: yêu cầu thay đổi dữ liệu phải là JSON và cùng nguồn.
export function sameOrigin(req) {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.includes('application/json')) throw new HttpError(415, 'Yêu cầu phải gửi dạng JSON.');
  const origin = req.headers.origin;
  if (origin) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    let oh = '';
    try { oh = new URL(origin).host; } catch { /* bỏ qua */ }
    if (oh !== host) throw new HttpError(403, 'Yêu cầu đến từ trang khác.');
  }
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let raw = '';
  if (typeof req.body === 'string') raw = req.body;
  else if (Buffer.isBuffer(req.body)) raw = req.body.toString('utf8');
  else {
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 512 * 1024) throw new HttpError(413, 'Dữ liệu gửi lên quá lớn.');
    }
  }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new HttpError(400, 'Dữ liệu gửi lên không hợp lệ.'); }
}

export function query(req) {
  return Object.fromEntries(new URL(req.url, 'http://local').searchParams);
}

export function originOf(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket?.remoteAddress || '127.0.0.1';
}

export function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      send(res, 500, { error: 'Máy chủ gặp lỗi. Thử lại sau ít phút.' });
    }
  };
}
