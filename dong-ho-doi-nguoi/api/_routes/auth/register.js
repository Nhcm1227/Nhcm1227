import crypto from 'node:crypto';
import { handle, allow, sameOrigin, readJson, ok, HttpError } from '../../_lib/http.js';
import { putDoc, Conflict } from '../../_lib/store.js';
import { normEmail, emailPath, userPath, hashPassword, setSession, publicUser } from '../../_lib/auth.js';
import { TRIAL_DAYS, DAY } from '../../_lib/plan.js';

export default handle(async (req, res) => {
  allow(req, 'POST');
  sameOrigin(req);
  const b = await readJson(req);
  const email = normEmail(b.email);
  const password = String(b.password || '');
  const name = String(b.name || '').trim().slice(0, 60);
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new HttpError(400, 'Email không hợp lệ.');
  if (password.length < 8 || password.length > 200) throw new HttpError(400, 'Mật khẩu cần ít nhất 8 ký tự.');

  const id = crypto.randomUUID();
  try {
    await putDoc(emailPath(email), { uid: id }, { create: true });
  } catch (e) {
    if (e instanceof Conflict) throw new HttpError(409, 'Email này đã có tài khoản. Hãy đăng nhập.');
    throw e;
  }
  const now = Date.now();
  const { salt, hash } = hashPassword(password);
  const user = {
    id, email, name, salt, hash,
    role: 'user', banned: false, sessionVersion: 0,
    createdAt: now, lastLoginAt: now,
    trialEnds: now + TRIAL_DAYS * DAY, paidUntil: 0,
    failCount: 0, lockUntil: 0, audit: [],
  };
  await putDoc(userPath(id), user, { create: true });
  setSession(req, res, user);
  ok(res, { user: publicUser(user) });
});
