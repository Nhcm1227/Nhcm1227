import { handle, allow, sameOrigin, readJson, ok, HttpError } from '../_lib/http.js';
import { getDoc, updateDoc } from '../_lib/store.js';
import { normEmail, emailPath, userPath, checkPassword, hashPassword, setSession, publicUser } from '../_lib/auth.js';

const BAD = 'Email hoặc mật khẩu không đúng.';

export default handle(async (req, res) => {
  allow(req, 'POST');
  sameOrigin(req);
  const b = await readJson(req);
  const email = normEmail(b.email);
  const password = String(b.password || '');
  const idx = email ? await getDoc(emailPath(email)) : null;
  const doc = idx ? await getDoc(userPath(idx.data.uid)) : null;
  if (!doc) { hashPassword(password || 'x'); throw new HttpError(401, BAD); }
  const u = doc.data;
  const now = Date.now();
  if (u.banned) throw new HttpError(403, 'Tài khoản này đã bị khóa. Liên hệ quản trị viên.');
  if ((u.lockUntil || 0) > now) {
    throw new HttpError(429, `Sai mật khẩu quá nhiều lần. Thử lại sau ${Math.ceil((u.lockUntil - now) / 60000)} phút.`);
  }
  if (!checkPassword(password, u.salt, u.hash)) {
    await updateDoc(userPath(u.id), (x) => {
      x.failCount = (x.failCount || 0) + 1;
      if (x.failCount >= 5) { x.lockUntil = Date.now() + 15 * 60000; x.failCount = 0; }
      return x;
    });
    throw new HttpError(401, BAD);
  }
  const fresh = await updateDoc(userPath(u.id), (x) => {
    x.failCount = 0; x.lockUntil = 0; x.lastLoginAt = now;
    return x;
  });
  setSession(req, res, fresh);
  ok(res, { user: publicUser(fresh) });
});
