import crypto from 'node:crypto';
import { getDoc } from './store.js';
import { HttpError } from './http.js';
import { planOf } from './plan.js';

const COOKIE = 'dh_s';
const MAX_AGE = 30 * 86400;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.VERCEL) throw new Error('SESSION_SECRET chưa được cấu hình');
  return 'dev-only-secret-dev-only-secret-0000';
}

export const normEmail = (e) => String(e || '').trim().toLowerCase();
export const userPath = (id) => `users/${id}.json`;
export const dataPath = (id) => `data/${id}.json`;
export const emailPath = (email) =>
  `emails/${crypto.createHash('sha256').update(normEmail(email)).digest('hex')}.json`;

const SCRYPT = { N: 16384, r: 8, p: 1 };
export function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(pw, salt, 64, SCRYPT).toString('hex') };
}
export function checkPassword(pw, salt, hash) {
  const h = crypto.scryptSync(pw, salt, 64, SCRYPT);
  const b = Buffer.from(hash, 'hex');
  return b.length === h.length && crypto.timingSafeEqual(h, b);
}

function mac(body) {
  return crypto.createHmac('sha256', secret()).update(body).digest('base64url');
}
export function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + mac(body);
}
export function unsign(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(mac(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

function isHttps(req) {
  return !!process.env.VERCEL || String(req.headers['x-forwarded-proto'] || '').startsWith('https');
}
export function setSession(req, res, user) {
  const token = sign({ uid: user.id, v: user.sessionVersion || 0, exp: Date.now() + MAX_AGE * 1000 });
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${isHttps(req) ? '; Secure' : ''}`);
}
export function clearSession(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isHttps(req) ? '; Secure' : ''}`);
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export async function currentUser(req) {
  const p = unsign(readCookie(req, COOKIE));
  if (!p) return null;
  const d = await getDoc(userPath(p.uid));
  if (!d) return null;
  const u = d.data;
  if (u.banned || (u.sessionVersion || 0) !== p.v) return null;
  return u;
}
export async function requireUser(req) {
  const u = await currentUser(req);
  if (!u) throw new HttpError(401, 'Bạn cần đăng nhập.');
  return u;
}
export async function requireAdmin(req) {
  const u = await requireUser(req);
  if (u.role !== 'admin') throw new HttpError(403, 'Chỉ quản trị viên mới làm được việc này.');
  return u;
}

export function publicUser(u) {
  return {
    id: u.id, email: u.email, name: u.name || '', role: u.role || 'user',
    createdAt: u.createdAt, trialEnds: u.trialEnds || 0, paidUntil: u.paidUntil || 0,
    plan: planOf(u),
  };
}
