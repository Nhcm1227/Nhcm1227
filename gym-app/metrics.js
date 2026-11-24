// Tính toán: mục tiêu dinh dưỡng, Tải tập (sRPE), Hồi phục, Giấc ngủ, xu hướng cân nặng
import { WORKOUTS, WAKE, BEDTIME } from './data.js';
import { state, peek, addDays, dowOf, todayKey, toMin, sum, avg, clamp, dateOf, keyOf } from './store.js';

/* ---------- dinh dưỡng & nước ---------- */
export function targets(dow = new Date().getDay()) {
  const s = state.settings;
  const w = Number(s.weight) || 65;
  const active = WORKOUTS[dow];
  const tdee = w * 33 + (active ? 150 : 0);
  const adj = s.goal === 'cut' ? -400 : s.goal === 'bulk' ? 300 : 0;
  const kcal = Number(s.kcal) || Math.round((tdee + adj) / 10) * 10;
  const protein = Number(s.protein) || Math.round(w * 2);
  const fat = Math.round(w * 0.9);
  const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const baseWater = Number(s.waterGoal) || Math.round((w * 35) / 50) * 50;
  const water = baseWater + (active ? 500 : 0);
  return { kcal, protein, fat, carb, water };
}

/* ---------- bài tập ---------- */
export const workoutFor = k => WORKOUTS[dowOf(k)];
export const isCardio = ex => /phút/.test(ex.reps);
export const repTop = ex => { const m = String(ex.reps).match(/\d+/g); return m ? +m[m.length - 1] : 0; };
export const repLow = ex => { const m = String(ex.reps).match(/\d+/g); return m ? +m[0] : 0; };
export const e1rm = (w, r) => w * (1 + r / 30);

export function shownSets(k, ex) {
  return isLight(k) ? Math.max(1, ex.sets - 1) : ex.sets;
}
export function isLight(k) {
  const d = peek(k);
  if (d && typeof d.light === 'boolean') return d.light;
  const r = recovery(k);
  return !!(r && r.score < 34);
}

export function sessionMinutes(k) {
  const d = peek(k), w = workoutFor(k);
  if (!w) return 0;
  if (d?.minutes) return d.minutes;
  if (d?.startedAt && d?.finishedAt) {
    const m = (d.finishedAt - d.startedAt) / 60000;
    if (m >= 15 && m <= 200) return Math.round(m);
  }
  return toMin(w.end) - toMin(w.start);
}

export function dayLoad(k) {
  const d = peek(k), w = workoutFor(k);
  const out = { load: 0, minutes: 0, rpe: 0, volume: 0, setsDone: 0, setsTotal: 0 };
  if (!d || !w) return out;
  w.exercises.forEach((ex, i) => {
    const arr = d.sets[i] || [];
    out.setsTotal += shownSets(k, ex);
    arr.forEach(s => {
      if (!s?.done) return;
      out.setsDone++;
      out.volume += (Number(s.w) || 0) * (Number(s.r) || 0);
    });
  });
  if (!d.done && !out.setsDone) return out;
  const frac = d.done ? 1 : out.setsDone / (out.setsTotal || 1);
  out.rpe = d.rpe || 7;
  out.minutes = Math.round(sessionMinutes(k) * frac);
  out.load = out.rpe * out.minutes;
  return out;
}
// Tải tập 0–100, bão hoà dần (buổi RPE 7 × 75′ ≈ 53)
export const strainOf = load => Math.round(100 * (1 - Math.exp(-load / 700)));
export const strain = k => strainOf(dayLoad(k).load);

/* ---------- giấc ngủ ---------- */
// Checkin của ngày k ghi giấc ngủ của đêm kết thúc vào sáng ngày k
export function sleepNeed(k) {
  let need = 7.5;
  need += (strain(addDays(k, -1)) / 100) * 0.75;
  let debt = 0;
  for (let i = 1; i <= 3; i++) {
    const h = peek(addDays(k, -i))?.checkin?.sleepH;
    if (h != null) debt += Math.max(0, 7.5 - h);
  }
  need += Math.min(1.5, debt * 0.33);
  return Math.round(need * 4) / 4;
}
export function bedtimeTonight() {
  const tomorrow = addDays(todayKey(), 1);
  const need = sleepNeed(tomorrow);
  const wake = toMin(WAKE[dowOf(tomorrow)]);
  // giờ dậy là của ngày mai → cộng 1440 để giờ ngủ nằm cuối ngày hôm nay (có thể > 24:00)
  // không gợi ý muộn hơn giờ ngủ trong lịch (BEDTIME); thiếu ngủ thì gợi ý sớm hơn
  return { need, wake, bed: Math.min(wake + 1440 - need * 60 - 15, toMin(BEDTIME)) };
}

/* ---------- hồi phục ---------- */
function baseline(k, field, days = 14) {
  const vals = [];
  for (let i = 1; i <= days; i++) {
    const v = Number(peek(addDays(k, -i))?.checkin?.[field]);
    if (v > 0) vals.push(v);
  }
  return vals.length >= 3 ? avg(vals) : null;
}
export function recovery(k) {
  const c = peek(k)?.checkin;
  if (!c) return null;
  const need = sleepNeed(k);
  const sleep = clamp((c.sleepH ?? 7) / need, 0, 1);
  const q = ((c.sleepQ ?? 3) - 1) / 4;
  const sore = (5 - (c.sore ?? 3)) / 4;
  const energy = ((c.energy ?? 3) - 1) / 4;
  const stress = (5 - (c.stress ?? 3)) / 4;
  const subjective = 0.45 * sleep + 0.1 * q + 0.2 * sore + 0.15 * energy + 0.1 * stress;
  const phys = [];
  const hb = baseline(k, 'hrv'), rb = baseline(k, 'rhr');
  if (c.hrv > 0 && hb) phys.push(clamp(0.5 + (c.hrv / hb - 1) * 2.5, 0, 1));
  if (c.rhr > 0 && rb) phys.push(clamp(0.5 - ((c.rhr - rb) / rb) * 5, 0, 1));
  const final = phys.length ? 0.6 * avg(phys) + 0.4 * subjective : subjective;
  return { score: Math.round(final * 100), need, sleepH: c.sleepH ?? 7, usedPhys: phys.length > 0, hrvBase: hb, rhrBase: rb };
}
export const recColor = s => (s >= 67 ? '#3ddc84' : s >= 34 ? '#ffd166' : '#ff5c5c');
export function advice(score) {
  if (score == null) return null;
  if (score >= 67) return { zone: 'Xanh', title: 'Sẵn sàng tập nặng', text: 'Cơ thể phục hồi tốt. Thử tăng tạ ở bài đã đạt đủ rep tối đa, RPE 8–9.', range: [55, 80] };
  if (score >= 34) return { zone: 'Vàng', title: 'Tập bình thường', text: 'Giữ đúng giáo án, RPE 7–8. Không cần cố phá kỷ lục hôm nay.', range: [40, 60] };
  return { zone: 'Đỏ', title: 'Ưu tiên phục hồi', text: 'Bớt 1 set mỗi bài, giữ RPE ≤ 7, hoặc chỉ đi bộ nhẹ. Ngủ sớm tối nay.', range: [15, 40] };
}

/* ---------- nhật ký ---------- */
export function journalImpact(tags) {
  const out = [];
  const keys = Object.keys(state.days).filter(k => state.days[k].checkin?.tags);
  for (const t of tags) {
    const yes = [], no = [];
    keys.forEach(k => { const r = recovery(k); if (!r) return; (state.days[k].checkin.tags[t.id] ? yes : no).push(r.score); });
    if (yes.length >= 3 && no.length >= 3) out.push({ ...t, diff: Math.round(avg(yes) - avg(no)), n: yes.length });
    else out.push({ ...t, diff: null, n: yes.length, need: Math.max(0, 3 - yes.length) + Math.max(0, 3 - no.length) });
  }
  return out;
}

/* ---------- lịch sử bài tập ---------- */
export function history(name, beforeKey = todayKey()) {
  const out = [];
  Object.keys(state.days).filter(k => k < beforeKey).sort().reverse().forEach(k => {
    const w = workoutFor(k);
    if (!w) return;
    w.exercises.forEach((ex, i) => {
      if (ex.name !== name) return;
      const sets = (state.days[k].sets[i] || []).filter(s => s?.done).map(s => ({ w: Number(s.w) || 0, r: Number(s.r) || 0 })).filter(s => s.w || s.r);
      if (sets.length) out.push({ k, sets, ex });
    });
  });
  return out;
}
export function suggestion(ex, hist) {
  const last = hist[0];
  if (!last || isCardio(ex)) return null;
  const top = repTop(ex);
  const ws = last.sets.map(s => s.w);
  const sameW = ws.every(w => w === ws[0]) && ws[0] > 0;
  const hitTop = last.sets.length >= ex.sets && last.sets.every(s => s.r >= top);
  if (sameW && hitTop) {
    const inc = ws[0] < 10 ? 1 : 2.5;
    return { up: true, w: ws[0] + inc, text: `Đã đạt ${ex.sets}×${top} — thử ${ws[0] + inc}kg` };
  }
  return { up: false, text: 'Lần trước: ' + last.sets.map(s => (s.w ? `${s.w}×${s.r}` : `${s.r}`)).join(', ') };
}
export function allExerciseNames() {
  const set = new Set();
  Object.values(WORKOUTS).forEach(w => w.type === 'gym' && w.exercises.forEach(ex => !isCardio(ex) && set.add(ex.name)));
  return [...set];
}

/* ---------- cân nặng ---------- */
export function weightSeries(days = 60) {
  const from = addDays(todayKey(), -days);
  return Object.keys(state.days).filter(k => k >= from && Number(state.days[k].checkin?.weight) > 0).sort()
    .map(k => ({ k, w: Number(state.days[k].checkin.weight) }));
}
export function movingAvg(series) {
  return series.map(p => {
    const from = addDays(p.k, -6);
    return { k: p.k, w: avg(series.filter(q => q.k >= from && q.k <= p.k).map(q => q.w)) };
  });
}
export function weightTrend() {
  const s = weightSeries(21);
  if (s.length < 4) return null;
  const t0 = dateOf(s[0].k).getTime();
  const xs = s.map(p => (dateOf(p.k).getTime() - t0) / 864e5), ys = s.map(p => p.w);
  if (xs[xs.length - 1] < 7) return null;
  const mx = avg(xs), my = avg(ys);
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const cur = avg(ys.slice(-3));
  return { perWeek: slope * 7, pct: (slope * 7 / cur) * 100, perDay: slope, current: cur };
}
export function tdeeEstimate() {
  const tr = weightTrend();
  if (!tr) return null;
  const today = todayKey();
  const intakes = [];
  for (let i = 1; i <= 14; i++) {
    const k = sum(peek(addDays(today, -i))?.food, 'kcal');
    if (k > 600) intakes.push(k);
  }
  if (intakes.length < 10) return null;
  return Math.round((avg(intakes) - tr.perDay * 7700) / 10) * 10;
}
export function kcalAdvice() {
  const tr = weightTrend();
  const goal = state.settings.goal;
  const cur = targets(-1).kcal; // -1: ngày không tập → mức nền
  if (!tr) return { text: 'Cần ít nhất 4 lần cân trong 7+ ngày để đánh giá xu hướng.', kcal: null };
  const tdee = tdeeEstimate();
  const rate = tr.pct;
  let wanted, ok;
  if (goal === 'cut') { wanted = 'giảm 0.4–1%/tuần'; ok = rate <= -0.4 && rate >= -1; }
  else if (goal === 'bulk') { wanted = 'tăng 0.25–0.5%/tuần'; ok = rate >= 0.25 && rate <= 0.5; }
  else { wanted = 'giữ trong ±0.25%/tuần'; ok = Math.abs(rate) <= 0.25; }
  if (ok) return { text: `Đúng mục tiêu (${wanted}). Giữ mức ${cur} kcal.`, kcal: null, tdee };
  let next;
  if (tdee) next = tdee + (goal === 'cut' ? -Math.round(tdee * 0.18 / 10) * 10 : goal === 'bulk' ? 250 : 0);
  else {
    const tooFastDown = rate < (goal === 'cut' ? -1 : goal === 'bulk' ? 0.25 : -0.25);
    next = cur + (tooFastDown ? 150 : -150);
  }
  next = Math.round(next / 10) * 10;
  return { text: `Mục tiêu là ${wanted}, hiện đang ${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%/tuần. Đề xuất đổi sang ${next} kcal/ngày.`, kcal: next, tdee };
}

/* ---------- báo cáo tuần ---------- */
export function weekKeys() {
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return keyOf(d); });
}
export function weekReport() {
  const today = todayKey();
  const ks = weekKeys().filter(k => k <= today);
  const planned = ks.filter(k => workoutFor(k)).length;
  const done = ks.filter(k => peek(k)?.done).length;
  const recs = ks.map(recovery).filter(Boolean);
  const sleeps = ks.map(k => peek(k)?.checkin?.sleepH).filter(h => h != null);
  const logged = ks.filter(k => sum(peek(k)?.food, 'kcal') > 0);
  const protHit = logged.filter(k => sum(peek(k).food, 'p') >= targets(dowOf(k)).protein * 0.9).length;
  const waterHit = ks.filter(k => sum(peek(k)?.water, 'ml') >= targets(dowOf(k)).water).length;
  const totalLoad = ks.reduce((a, k) => a + dayLoad(k).load, 0);
  return { days: ks.length, planned, done, avgRec: recs.length ? Math.round(avg(recs.map(r => r.score))) : null,
    avgSleep: sleeps.length ? avg(sleeps) : null, logged: logged.length, protHit, waterHit, totalLoad };
}
