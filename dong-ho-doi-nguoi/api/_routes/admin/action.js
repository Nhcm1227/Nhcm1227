import crypto from 'node:crypto';
import { handle, allow, sameOrigin, readJson, ok, HttpError } from '../../_lib/http.js';
import { updateDoc } from '../../_lib/store.js';
import { requireAdmin, userPath, hashPassword, publicUser } from '../../_lib/auth.js';
import { addMonths, DAY } from '../../_lib/plan.js';

export default handle(async (req, res) => {
  allow(req, 'POST');
  sameOrigin(req);
  const admin = await requireAdmin(req);
  const b = await readJson(req);
  const uid = String(b.uid || '');
  const action = String(b.action || '');
  const n = Math.round(Number(b.value) || 0);
  if (!/^[0-9a-f-]{36}$/.test(uid)) throw new HttpError(400, 'Mã người dùng không hợp lệ.');
  if (uid === admin.id && ['ban', 'unadmin'].includes(action)) throw new HttpError(400, 'Bạn không thể tự khóa hoặc tự bỏ quyền của mình.');

  let tempPassword = null;
  const user = await updateDoc(userPath(uid), (u) => {
    if (!u) return undefined;
    const now = Date.now();
    switch (action) {
      case 'grant':
        if (n < 1 || n > 36) throw new HttpError(400, 'Số tháng phải từ 1 đến 36.');
        addMonths(u, n, now); break;
      case 'revoke': u.paidUntil = 0; break;
      case 'trial':
        if (n < 1 || n > 60) throw new HttpError(400, 'Số ngày phải từ 1 đến 60.');
        u.trialEnds = Math.max(now, u.trialEnds || 0) + n * DAY; break;
      case 'ban': u.banned = true; u.sessionVersion = (u.sessionVersion || 0) + 1; break;
      case 'unban': u.banned = false; break;
      case 'admin': u.role = 'admin'; break;
      case 'unadmin': u.role = 'user'; break;
      case 'logout': u.sessionVersion = (u.sessionVersion || 0) + 1; break;
      case 'reset': {
        tempPassword = crypto.randomBytes(9).toString('base64url');
        Object.assign(u, hashPassword(tempPassword));
        u.sessionVersion = (u.sessionVersion || 0) + 1;
        u.failCount = 0; u.lockUntil = 0;
        break;
      }
      default: throw new HttpError(400, 'Thao tác không hợp lệ.');
    }
    u.audit = [...(u.audit || []), { at: now, by: admin.email, action, value: n || undefined }].slice(-30);
    return u;
  });
  if (!user) throw new HttpError(404, 'Không tìm thấy người dùng.');
  ok(res, { user: { ...publicUser(user), banned: !!user.banned }, tempPassword });
});
