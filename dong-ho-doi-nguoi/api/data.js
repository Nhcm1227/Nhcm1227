import { handle, allow, sameOrigin, readJson, ok, HttpError } from './_lib/http.js';
import { getDoc, putDoc } from './_lib/store.js';
import { requireUser, dataPath } from './_lib/auth.js';

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
  ok(res, { ok: true, updatedAt: data.updatedAt });
});
