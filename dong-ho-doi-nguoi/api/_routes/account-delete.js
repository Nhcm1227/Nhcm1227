// Xóa tài khoản và toàn bộ dữ liệu cá nhân (Apple và Google đều yêu cầu có trong app).
// Đơn thanh toán được giữ lại để đối soát, nhưng bỏ email.
import { handle, allow, sameOrigin, readJson, ok, HttpError } from '../_lib/http.js';
import { getDoc, delDoc, updateDoc, listPaths, getMany } from '../_lib/store.js';
import { requireUser, userPath, dataPath, emailPath, checkPassword, clearSession } from '../_lib/auth.js';
import { BOARD_PATH } from '../_lib/board.js';
import { orderPath } from '../_lib/pay.js';

export default handle(async (req, res) => {
  allow(req, 'POST');
  sameOrigin(req);
  const u = await requireUser(req);
  const b = await readJson(req);
  if (!checkPassword(String(b.password || ''), u.salt, u.hash)) throw new HttpError(403, 'Mật khẩu không đúng.');
  if (u.role === 'admin') throw new HttpError(400, 'Tài khoản quản trị không tự xóa được. Hãy bỏ quyền quản trị trước.');

  await updateDoc(BOARD_PATH, (doc) => {
    if (!doc || !doc.entries[u.id]) return undefined;
    delete doc.entries[u.id];
    return doc;
  });
  const orders = (await getMany(await listPaths('orders/'))).filter((o) => o.uid === u.id);
  for (const o of orders) {
    await updateDoc(orderPath(o.orderCode), (x) => { x.email = '(đã xóa)'; return x; });
  }
  await delDoc(dataPath(u.id));
  await delDoc(emailPath(u.email));
  await delDoc(userPath(u.id));
  clearSession(req, res);
  ok(res, { deleted: true });
});
