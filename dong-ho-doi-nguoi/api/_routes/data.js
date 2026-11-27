import { handle, allow, sameOrigin, readJson, ok, HttpError } from '../_lib/http.js';
import { getDoc, putDoc } from '../_lib/store.js';
import { requireUser, dataPath } from '../_lib/auth.js';
import { BOARD_PATH, boardEntry } from '../_lib/board.js';
import { updateDoc } from '../_lib/store.js';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export default handle(async (req, res) => {
  allow(req, 'GET', 'PUT');
  const u = await requireUser(req);
  if (req.method === 'GET') {
    const d = await getDoc(dataPath(u.id));
    return ok(res, { data: d ? d.data : null });
  }
  sameOrigin(req);
  const b = await readJson(req);
  const data = {
    cfg: isObj(b.cfg) ? b.cfg : {},
    tasks: Array.isArray(b.tasks) ? b.tasks.slice(0, 1000) : [],
    bought: Array.isArray(b.bought) ? b.bought.slice(-5000) : [],
    updatedAt: Date.now(),
  };
  if (JSON.stringify(data).length > 400 * 1024) throw new HttpError(413, 'Dữ liệu quá lớn. Hãy xóa bớt việc đã xong.');
  await putDoc(dataPath(u.id), data);
  // Đang trên bảng xếp hạng thì cập nhật luôn con số của mình.
  if (b.life !== undefined) {
    await updateDoc(BOARD_PATH, (doc) => {
      const e = doc && doc.entries[u.id];
      if (!e) return undefined;
      doc.entries[u.id] = boardEntry(u.id, e.nick, b.life, data);
      return doc;
    });
  }
  ok(res, { ok: true, updatedAt: data.updatedAt });
});
