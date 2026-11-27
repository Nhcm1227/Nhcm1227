import { handle, allow, sameOrigin, readJson, ok, HttpError } from '../_lib/http.js';
import { getDoc, updateDoc } from '../_lib/store.js';
import { currentUser, requireUser, dataPath } from '../_lib/auth.js';
import { BOARD_PATH, boardEntry, boards, cleanNick } from '../_lib/board.js';

export default handle(async (req, res) => {
  allow(req, 'GET', 'POST');
  if (req.method === 'GET') {
    const u = await currentUser(req);
    const d = await getDoc(BOARD_PATH);
    const mine = u && d && d.data.entries[u.id];
    return ok(res, { ...boards(d && d.data, u && u.id), joined: !!mine, nick: mine ? mine.nick : (u && u.name) || '' });
  }
  sameOrigin(req);
  const u = await requireUser(req);
  const b = await readJson(req);
  if (b.leave) {
    await updateDoc(BOARD_PATH, (doc) => {
      if (!doc || !doc.entries[u.id]) return undefined;
      delete doc.entries[u.id];
      return doc;
    });
    return ok(res, { joined: false });
  }
  const nick = cleanNick(b.nick);
  if (!nick) throw new HttpError(400, 'Tên hiển thị cần từ 2 đến 24 ký tự.');
  const d = await getDoc(dataPath(u.id));
  const entry = boardEntry(u.id, nick, b.life, d ? d.data : null);
  await updateDoc(BOARD_PATH, (doc) => {
    doc = doc || { entries: {} };
    doc.entries[u.id] = entry;
    return doc;
  }, { create: true });
  ok(res, { joined: true });
});
