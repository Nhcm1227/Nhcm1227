// Người đầu tiên nhập đúng mã ADMIN_CLAIM_CODE sẽ thành quản trị viên. Chỉ dùng được một lần.
import crypto from 'node:crypto';
import { handle, allow, sameOrigin, readJson, ok, HttpError } from '../../_lib/http.js';
import { putDoc, updateDoc, Conflict } from '../../_lib/store.js';
import { requireUser, userPath, publicUser } from '../../_lib/auth.js';

export default handle(async (req, res) => {
  allow(req, 'POST');
  sameOrigin(req);
  const u = await requireUser(req);
  const expected = String(process.env.ADMIN_CLAIM_CODE || '');
  const given = String((await readJson(req)).code || '').trim();
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  if (!expected || !crypto.timingSafeEqual(a, b)) throw new HttpError(403, 'Mã quản trị không đúng.');
  try {
    await putDoc('meta/admin-claimed.json', { uid: u.id, at: Date.now() }, { create: true });
  } catch (e) {
    if (e instanceof Conflict) throw new HttpError(409, 'Mã này đã được dùng. Nhờ quản trị viên hiện tại cấp quyền cho bạn.');
    throw e;
  }
  const fresh = await updateDoc(userPath(u.id), (x) => { x.role = 'admin'; return x; });
  ok(res, { user: publicUser(fresh) });
});
