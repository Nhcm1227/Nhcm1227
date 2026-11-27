// Bảng xếp hạng: chỉ lưu tên hiển thị và các con số cuối cùng, không lưu bệnh hay thói quen.
export const BOARD_PATH = 'meta/board.json';
const VN = 7 * 3600e3;

// Tuần bắt đầu từ 0 giờ thứ Hai, giờ Việt Nam.
export function weekId(t = Date.now()) {
  const d = new Date(t + VN);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
export function weekStart(t = Date.now()) {
  return Date.parse(weekId(t) + 'T00:00:00Z') - VN;
}

export function cleanNick(s) {
  const n = String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim();
  return n.length >= 2 && n.length <= 24 ? n : '';
}

export function boardEntry(uid, nick, life, data, now = Date.now()) {
  const ws = weekStart(now);
  const bought = data && Array.isArray(data.bought) ? data.bought : [];
  const tasks = data && Array.isArray(data.tasks) ? data.tasks : [];
  const hours = bought
    .filter((e) => e && typeof e.h === 'number' && e.at >= ws && e.at <= now + 6e4)
    .reduce((s, e) => s + Math.max(-1, Math.min(7, e.h)), 0);
  const done = tasks.filter((t) => t && t.done && t.doneAt >= ws && t.doneAt <= now + 6e4).length;
  const l = Number(life);
  return {
    uid, nick,
    life: Number.isFinite(l) ? Math.round(Math.max(30, Math.min(105, l)) * 10) / 10 : 0,
    weekHours: Math.round(Math.max(-300, Math.min(300, hours)) * 10) / 10,
    weekDone: Math.min(done, 500),
    week: weekId(now),
    updatedAt: now,
  };
}

export function boards(doc, uid, now = Date.now()) {
  const wk = weekId(now);
  const rows = Object.values((doc && doc.entries) || {}).map((e) => ({
    uid: e.uid, nick: e.nick, life: e.life,
    hours: e.week === wk ? e.weekHours : 0,
    done: e.week === wk ? e.weekDone : 0,
  }));
  const out = { total: rows.length };
  for (const key of ['life', 'hours', 'done']) {
    const sorted = rows.slice().sort((a, b) => b[key] - a[key] || a.nick.localeCompare(b.nick, 'vi'));
    out[key] = sorted.slice(0, 100).map((r, i) => ({ rank: i + 1, nick: r.nick, value: r[key], me: !!uid && r.uid === uid }));
    const i = uid ? sorted.findIndex((r) => r.uid === uid) : -1;
    out[key + 'Me'] = i >= 0 ? { rank: i + 1, value: sorted[i][key] } : null;
  }
  return out;
}
