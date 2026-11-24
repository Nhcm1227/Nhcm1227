import { WORKOUTS, MEALS, DAY_NAMES, DAY_SHORT, FOODS, WAKE, JOURNAL } from './data.js';
import {
  state, save, replaceState, resetState, pad, keyOf, todayKey, addDays, dowOf, day, peek, sum, avg, esc,
  toMin, fromMin, nowMin, fmtL, fmtH, num, clamp,
} from './store.js';
import {
  targets, isCardio, repLow, shownSets, isLight, dayLoad, strain, strainOf, sleepNeed, bedtimeTonight, recovery,
  recColor, advice, journalImpact, history, suggestion, allExerciseNames, e1rm, weightSeries, movingAvg,
  weightTrend, kcalAdvice, weekReport, weekKeys, workoutFor,
} from './metrics.js';

/* ================= UI helpers ================= */
const $ = s => document.querySelector(s);
const view = $('#view');
let toastTimer;
function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
}
function ring(pct, color, size = 150, stroke = 14, center = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = clamp(pct || 0, 0, 1);
  return `<div class="ring-wrap ${size < 120 ? 'ring-sm' : ''}">
    <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--card-2)" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" style="transition:stroke-dashoffset .4s"/></svg>
    <div class="ring-center">${center}</div></div>`;
}
const bar = (pct, color) => `<div class="bar"><i style="width:${clamp(pct, 0, 1) * 100}%;background:${color}"></i></div>`;
const lastNKeys = n => Array.from({ length: n }, (_, i) => addDays(todayKey(), i - n + 1));
function weekChart(values, goal, color) {
  const ks = lastNKeys(7);
  const max = Math.max(goal, ...values) || 1;
  return `<div class="week">${ks.map((k, i) => `<div class="col"><div class="b" style="height:${(values[i] / max) * 100}%;background:${values[i] >= goal ? color : values[i] ? color + '88' : 'var(--card-2)'}"></div><div class="lbl">${DAY_SHORT[dowOf(k)]}</div></div>`).join('')}</div>`;
}
function lineChart(series, { avgSeries = null, color = 'var(--gym)', h = 140 } = {}) {
  if (series.length < 2) return '<div class="empty small">Cần ít nhất 2 điểm dữ liệu.</div>';
  const W = 340, pad_ = 10;
  const all = [...series, ...(avgSeries || [])].map(p => p.y);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
  const X = i => pad_ + (i / (series.length - 1)) * (W - 2 * pad_);
  const Y = v => h - pad_ - ((v - lo) / (hi - lo)) * (h - 2 * pad_);
  const path = s => s.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${h}" width="100%" style="display:block">
    ${avgSeries ? `<path d="${path(avgSeries)}" stroke="${color}" stroke-width="3" fill="none" stroke-linejoin="round"/>` : `<path d="${path(series)}" stroke="${color}" stroke-width="3" fill="none" stroke-linejoin="round"/>`}
    ${series.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.y)}" r="${avgSeries ? 3 : 4}" fill="${avgSeries ? '#8b93a1' : color}"/>`).join('')}
  </svg><div class="row between small muted"><span>${series[0].label}</span><span>${lo.toFixed(1)} – ${hi.toFixed(1)}</span><span>${series[series.length - 1].label}</span></div>`;
}
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
const shortDate = k => { const [, m, d] = k.split('-'); return `${+d}/${+m}`; };

function openSheet(html) {
  $('#sheet').innerHTML = `<div class="grabber"></div>${html}`;
  $('#sheet').hidden = false; $('#sheet-backdrop').hidden = false;
  $('#sheet').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeSheet() { $('#sheet').hidden = true; $('#sheet-backdrop').hidden = true; document.body.style.overflow = ''; }
$('#sheet-backdrop').addEventListener('click', closeSheet);

/* ================= reminders ================= */
function waterSlots() {
  const s = state.settings, out = [];
  for (let m = s.waterStart * 60; m <= s.waterEnd * 60; m += Number(s.waterEvery) || 90) out.push(m);
  return out;
}
function expectedWaterAt(min) {
  const s = state.settings;
  const a = s.waterStart * 60, b = s.waterEnd * 60;
  return Math.round(targets().water * clamp((min - a) / (b - a), 0, 1));
}
function todayPlan() {
  const dow = new Date().getDay(), items = [];
  const w = WORKOUTS[dow];
  if (!peek(todayKey())?.checkin) items.push({ id: 'checkin', min: toMin(WAKE[dow]) + 10, kind: 'sleep', title: 'Check-in buổi sáng', body: 'Ghi giấc ngủ & cảm giác cơ thể để tính điểm hồi phục.' });
  if (w) {
    const st = toMin(w.start);
    items.push({ id: 'pre', min: st - state.settings.preGym, kind: 'water', title: 'Chuẩn bị đi tập', body: `Soạn đồ, uống ~500ml nước. ${w.title} lúc ${w.start}.` });
    items.push({ id: 'gym', min: st, kind: 'gym', title: w.title, body: `${w.subtitle}${w.location ? ' · ' + w.location : ''} · ${w.start}–${w.end}` });
    if (w.type === 'gym') items.push({ id: 'post', min: toMin(w.end) + 15, kind: 'food', title: 'Nạp protein sau tập', body: '25–40g protein trong 1 giờ sau tập.' });
  }
  (MEALS[dow] || []).forEach((m, i) => items.push({ id: 'meal' + i, min: toMin(m.time), kind: 'food', title: m.label, body: 'Nhớ ghi lại món ăn vào app.' }));
  const bt = bedtimeTonight();
  items.push({ id: 'bed', min: bt.bed - 30, kind: 'sleep', title: 'Chuẩn bị đi ngủ', body: `Ngủ lúc ${fromMin(bt.bed)}, dậy ${fromMin(bt.wake)} (cơ thể cần ${fmtH(bt.need)}).` });
  return items.sort((a, b) => a.min - b.min);
}
function notify(title, body) {
  showToast(`${title} — ${body}`);
  if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, icon: 'icons/icon-192.png', tag: title })).catch(() => {});
  }
}
function checkReminders() {
  const k = todayKey();
  const shown = state.shown[k] || (state.shown[k] = []);
  const now = nowMin();
  const due = m => now >= m && now - m <= 20;
  for (const it of todayPlan()) if (due(it.min) && !shown.includes(it.id)) { shown.push(it.id); notify(it.title, it.body); }
  const drank = sum(day().water, 'ml');
  for (const m of waterSlots()) {
    const id = 'w' + m;
    if (due(m) && !shown.includes(id)) {
      shown.push(id);
      const exp = expectedWaterAt(m);
      if (drank < exp) notify('Uống nước 💧', `Đến ${fromMin(m)} nên đạt ${fmtL(exp)}, bạn mới uống ${fmtL(drank)}.`);
    }
  }
  Object.keys(state.shown).forEach(d => { if (d !== k) delete state.shown[d]; });
  save();
}

/* ================= tabs ================= */
let tab = 'today';
let workoutDow = new Date().getDay();
const TITLES = { today: 'Hôm nay', workout: 'Tập luyện', food: 'Ăn uống', water: 'Uống nước', trends: 'Xu hướng' };
function render() {
  const d = new Date();
  $('#today-label').textContent = `${DAY_NAMES[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
  $('#page-title').textContent = TITLES[tab];
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  ({ today: renderToday, workout: renderWorkout, food: renderFood, water: renderWater, trends: renderTrends })[tab]();
}
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  if (tab === 'workout') workoutDow = new Date().getDay();
  if (tab !== 'workout') releaseWake();
  render(); window.scrollTo(0, 0);
}));

/* ================= today ================= */
function nextWorkout() {
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const w = WORKOUTS[d.getDay()];
    if (!w) continue;
    const start = new Date(d); const [h, m] = w.start.split(':'); start.setHours(+h, +m, 0, 0);
    const end = new Date(d); const [eh, em] = w.end.split(':'); end.setHours(+eh, +em, 0, 0);
    if (end > now && !(i === 0 && peek(todayKey())?.done)) return { w, start, end, dow: d.getDay(), offset: i };
  }
  return null;
}
function countdownText(target) {
  const ms = target - new Date();
  if (ms <= 0) return 'Đang diễn ra';
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4);
  if (h >= 24) return `${Math.floor(h / 24)} ngày ${h % 24} giờ`;
  return h ? `${h} giờ ${m} phút` : `${m} phút`;
}
function renderToday() {
  const k = todayKey();
  const t = targets();
  const dd = day();
  const water = sum(dd.water, 'ml');
  const kcal = sum(dd.food, 'kcal'), prot = sum(dd.food, 'p');
  const rec = recovery(k);
  const adv = rec && advice(rec.score);
  const st = strain(k);
  const bt = bedtimeTonight();
  const nw = nextWorkout();
  const now = nowMin();
  const nextSlot = waterSlots().find(m => m > now);
  const plan = todayPlan();
  if (nextSlot) plan.push({ min: nextSlot, kind: 'water', title: 'Nhắc uống nước tiếp theo', body: `Mục tiêu lúc đó: ${fmtL(expectedWaterAt(nextSlot))}` });
  plan.sort((a, b) => a.min - b.min);
  const nextIdx = plan.findIndex(p => p.min >= now);
  const wr = weekReport();

  let html = '';
  if (isIOS && !standalone) html += `<div class="banner">📲 <b>Cài lên iPhone:</b> nhấn <b>Chia sẻ</b> trong Safari → <b>Thêm vào MH chính</b>. Mở từ biểu tượng để dùng như app và bật thông báo.</div>`;

  if (!rec) {
    html += `<section class="card checkin-cta">
      <div class="row" style="gap:14px"><div class="big-emoji">🌅</div><div style="flex:1"><h2 style="margin:0 0 2px">Check-in buổi sáng</h2>
      <div class="muted small">30 giây · tính điểm Hồi phục, nhu cầu ngủ và gợi ý cường độ tập hôm nay.</div></div></div>
      <button class="btn primary" id="do-checkin" style="margin-top:12px">Bắt đầu check-in</button></section>`;
  } else {
    const strainPct = st / 100;
    html += `<section class="card">
      <div class="trio">
        <div>${ring(rec.score / 100, recColor(rec.score), 100, 10, `<b>${rec.score}%</b>`)}<div class="trio-lbl">Hồi phục</div></div>
        <div>${ring(strainPct, 'var(--gym)', 100, 10, `<b>${st}</b>`)}<div class="trio-lbl">Tải tập<br><span class="muted">mục tiêu ${adv.range[0]}–${adv.range[1]}</span></div></div>
        <div>${ring(rec.sleepH / rec.need, 'var(--fat)', 100, 10, `<b>${fmtH(rec.sleepH)}</b>`)}<div class="trio-lbl">Giấc ngủ<br><span class="muted">cần ${fmtH(rec.need)}</span></div></div>
      </div>
      <div class="advice" style="border-color:${recColor(rec.score)}"><b style="color:${recColor(rec.score)}">● ${adv.zone} — ${adv.title}</b><div class="small">${adv.text}</div></div>
      <div class="row between small" style="margin-top:10px"><span class="muted">🌙 Tối nay ngủ trước <b style="color:var(--text)">${fromMin(bt.bed)}</b> (cần ${fmtH(bt.need)})</span>
      <button class="chip" id="do-checkin">Sửa</button></div>
    </section>`;
  }

  if (nw) {
    const label = nw.offset === 0 ? 'Hôm nay' : nw.offset === 1 ? 'Ngày mai' : DAY_NAMES[nw.dow];
    const live = nw.start <= new Date();
    html += `<section class="card hero">
      <span class="tag">${live ? 'ĐANG TẬP' : 'BUỔI TẬP TIẾP THEO'}</span>
      <h3>${esc(nw.w.title)}</h3>
      <div class="muted">${esc(nw.w.subtitle)}</div>
      <div class="muted small" style="margin-top:4px">${label} · ${nw.w.start}–${nw.w.end}${nw.w.location ? ' · ' + nw.w.location : ''}</div>
      <div class="countdown" data-countdown="${nw.start.getTime()}">${live ? 'Đang diễn ra' : countdownText(nw.start)}</div>
      <button class="btn primary" style="margin-top:12px" data-go-workout="${nw.dow}">${live ? 'Mở buổi tập' : 'Xem bài tập'}</button>
    </section>`;
  } else if (dd.done) {
    const L = dayLoad(k);
    html += `<section class="card hero"><span class="tag">ĐÃ XONG HÔM NAY</span><h3>🔥 ${esc(workoutFor(k)?.title || '')}</h3>
      <div class="muted small">${L.minutes} phút · RPE ${L.rpe} · Tải tập ${st}${L.volume ? ` · ${Math.round(L.volume).toLocaleString('vi')} kg khối lượng` : ''}</div></section>`;
  }

  html += `<div class="grid-2">
    <section class="card" data-go="water" style="display:grid;justify-items:center;gap:8px">
      ${ring(water / t.water, 'var(--water)', 110, 11, `<b>${fmtL(water)}</b><span class="muted small">/ ${fmtL(t.water)}</span>`)}
      <button class="btn water" data-add-water="250" style="min-height:38px">+250 ml</button>
    </section>
    <section class="card" data-go="food" style="display:grid;justify-items:center;gap:8px">
      ${ring(kcal / t.kcal, 'var(--food)', 110, 11, `<b>${Math.round(kcal)}</b><span class="muted small">/ ${t.kcal} kcal</span>`)}
      <div class="small muted" style="width:100%">Protein ${Math.round(prot)}/${t.protein}g</div>
      <div style="width:100%">${bar(prot / t.protein, 'var(--protein)')}</div>
    </section>
  </div>`;
  html += `<section class="card">
    <div class="card-head"><h2>Lịch hôm nay</h2><span class="muted small">Tuần này: ${wr.done}/${Object.keys(WORKOUTS).length} buổi</span></div>
    <ul class="timeline">${plan.map((p, i) => `<li class="${p.min < now && i !== nextIdx ? 'past' : ''} ${i === nextIdx ? 'next' : ''}">
      <span class="t">${fromMin(p.min)}</span><span class="dot ${p.kind}"></span>
      <div><div style="font-weight:600">${esc(p.title)}</div><div class="muted small">${esc(p.body)}</div></div></li>`).join('')}</ul>
  </section>`;
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    html += `<section class="card"><h2>🔔 Nhắc nhở</h2>
      <p class="muted small" style="margin-top:0">iPhone chỉ cho web app gửi thông báo khi app đang mở. Để luôn được nhắc, thêm lịch nhắc vào app Lịch của iPhone trong <b>Cài đặt</b>.</p>
      <button class="btn" id="open-settings-2">Mở cài đặt nhắc nhở</button></section>`;
  }
  view.innerHTML = html;
  view.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', e => { if (e.target.closest('button')) return; tab = el.dataset.go; render(); }));
  view.querySelectorAll('[data-go-workout]').forEach(el => el.addEventListener('click', () => { tab = 'workout'; workoutDow = +el.dataset.goWorkout; render(); }));
  view.querySelectorAll('[data-add-water]').forEach(el => el.addEventListener('click', () => addWater(+el.dataset.addWater)));
  $('#do-checkin')?.addEventListener('click', openCheckin);
  $('#open-settings-2')?.addEventListener('click', openSettings);
}

/* ================= check-in ================= */
const SCALES = [
  { id: 'sleepQ', label: 'Chất lượng giấc ngủ', lo: 'Tệ', hi: 'Rất sâu' },
  { id: 'sore', label: 'Đau mỏi cơ', lo: 'Không', hi: 'Rất đau' },
  { id: 'energy', label: 'Năng lượng', lo: 'Kiệt sức', hi: 'Sung' },
  { id: 'stress', label: 'Căng thẳng', lo: 'Thoải mái', hi: 'Rất stress' },
];
function openCheckin() {
  const k = todayKey();
  const prev = peek(k)?.checkin;
  const lastW = [...weightSeries(30)].pop()?.w;
  const c = prev ? JSON.parse(JSON.stringify(prev)) : { sleepH: 7, sleepQ: 3, sore: 2, energy: 3, stress: 2, tags: {} };
  c.tags ||= {};
  let showBody = !!(prev && (prev.weight || prev.hrv || prev.rhr || prev.waist));
  const draw = () => {
    openSheet(`<h2>Check-in buổi sáng</h2>
      <div class="field"><label>Đêm qua ngủ được</label>
        <div class="row between"><button class="chip lg" data-sl="-0.25">−</button><b class="big-num">${fmtH(c.sleepH)}</b><button class="chip lg" data-sl="0.25">＋</button></div></div>
      ${SCALES.map(s => `<div class="field"><label>${s.label}</label>
        <div class="scale">${[1, 2, 3, 4, 5].map(v => `<button data-scale="${s.id}" data-v="${v}" class="${c[s.id] === v ? 'active' : ''}">${v}</button>`).join('')}</div>
        <div class="row between small muted"><span>${s.lo}</span><span>${s.hi}</span></div></div>`).join('')}
      <div class="field"><label>Tối qua bạn có…</label>
        <div class="tags">${JOURNAL.map(t => `<button data-tag="${t.id}" class="chip ${c.tags[t.id] ? 'active' : ''}">${t.label}</button>`).join('')}</div></div>
      <button class="link-btn" id="toggle-body">${showBody ? '▾' : '▸'} Chỉ số cơ thể (không bắt buộc)</button>
      ${showBody ? `<div class="fields-4" style="grid-template-columns:1fr 1fr">
        <div class="field"><label>Cân nặng (kg)</label><input id="ci-weight" inputmode="decimal" value="${esc(c.weight ?? '')}" placeholder="${esc(lastW ?? '')}"></div>
        <div class="field"><label>Vòng eo (cm)</label><input id="ci-waist" inputmode="decimal" value="${esc(c.waist ?? '')}"></div>
        <div class="field"><label>HRV (ms)</label><input id="ci-hrv" inputmode="numeric" value="${esc(c.hrv ?? '')}"></div>
        <div class="field"><label>Nhịp tim nghỉ</label><input id="ci-rhr" inputmode="numeric" value="${esc(c.rhr ?? '')}"></div>
      </div><p class="small muted" style="margin-top:-4px">Có Apple Watch? Mở app <b>Sức khỏe</b> → Tim → lấy HRV và Nhịp tim nghỉ của sáng nay. Sau 3 ngày, điểm hồi phục sẽ dùng thêm 2 chỉ số này.</p>` : ''}
      <button class="btn primary" id="ci-save">Lưu check-in</button>`);
    const sh = $('#sheet');
    const keepBody = () => { if (!showBody) return; ['weight', 'waist', 'hrv', 'rhr'].forEach(f => { c[f] = num($('#ci-' + f).value); }); };
    sh.querySelectorAll('[data-sl]').forEach(b => b.addEventListener('click', () => { keepBody(); c.sleepH = clamp(c.sleepH + +b.dataset.sl, 0, 14); draw(); }));
    sh.querySelectorAll('[data-scale]').forEach(b => b.addEventListener('click', () => { keepBody(); c[b.dataset.scale] = +b.dataset.v; draw(); }));
    sh.querySelectorAll('[data-tag]').forEach(b => b.addEventListener('click', () => { keepBody(); c.tags[b.dataset.tag] = !c.tags[b.dataset.tag]; draw(); }));
    $('#toggle-body').addEventListener('click', () => { keepBody(); showBody = !showBody; draw(); });
    $('#ci-save').addEventListener('click', () => {
      keepBody();
      ['weight', 'waist', 'hrv', 'rhr'].forEach(f => { if (c[f] == null) delete c[f]; });
      day(k).checkin = c;
      if (c.weight) state.settings.weight = c.weight;
      save(); closeSheet(); render();
      const r = recovery(k);
      showToast(`Hồi phục ${r.score}% — ${advice(r.score).title}`);
    });
  };
  draw();
}

/* ================= workout ================= */
function dateKeyForDow(dow) { return weekKeys().find(k => dowOf(k) === dow); }
function renderWorkout() {
  const wks = weekKeys();
  const k = dateKeyForDow(workoutDow);
  const w = WORKOUTS[workoutDow];
  const dd = day(k);
  let html = `<div class="days">${wks.map(dk => {
    const dw = dowOf(dk), wk = WORKOUTS[dw];
    return `<button class="day ${dw === workoutDow ? 'active' : ''}" data-dow="${dw}">${DAY_SHORT[dw]}<b>${+dk.slice(8)}</b><span class="pip ${peek(dk)?.done ? 'done' : wk ? wk.type : ''}"></span></button>`;
  }).join('')}</div>`;
  if (!w) {
    html += `<section class="card"><div class="empty">😴<br><b style="color:var(--text)">Ngày nghỉ</b><br>Ngủ đủ giấc, uống đủ nước và ăn đủ protein để cơ phục hồi.</div></section>`;
    view.innerHTML = html; bindDays(); return;
  }
  const rec = recovery(k);
  const light = isLight(k);
  const L = dayLoad(k);
  html += `<section class="card">
    <div class="card-head"><div><h2 style="margin:0">${esc(w.title)}</h2><div class="muted small">${esc(w.subtitle)}</div></div>
    ${ring(L.setsDone / (L.setsTotal || 1), 'var(--gym)', 58, 6, `<b style="font-size:13px">${L.setsDone}/${L.setsTotal}</b>`)}</div>
    <div class="muted small">🕒 ${w.start}–${w.end}${w.location ? ' · 📍 ' + w.location : ''}${L.volume ? ` · 🏋️ ${Math.round(L.volume).toLocaleString('vi')} kg` : ''}</div>
    ${rec ? `<div class="advice" style="border-color:${recColor(rec.score)};margin-top:12px"><b style="color:${recColor(rec.score)}">● Hồi phục ${rec.score}% — ${advice(rec.score).title}</b><div class="small">${advice(rec.score).text}</div></div>` : ''}
    ${w.type === 'gym' ? `<label class="row between small" style="margin-top:12px"><span>Chế độ nhẹ <span class="muted">(bớt 1 set mỗi bài)</span></span><input type="checkbox" class="switch" id="light" ${light ? 'checked' : ''}></label>` : ''}
  </section>`;
  html += `<section class="card">${w.exercises.map((ex, i) => {
    const arr = dd.sets[i] || [];
    const n = shownSets(k, ex);
    const doneN = arr.slice(0, n).filter(s => s?.done).length;
    const hist = history(ex.name, k);
    const sug = suggestion(ex, hist);
    const last = hist[0];
    const cardio = isCardio(ex) || w.type !== 'gym';
    return `<div class="ex ${doneN >= n ? 'complete' : ''}">
      <div class="ex-name">${ex.superset ? `<span class="ss">SS ${ex.superset}</span>` : ''}${esc(ex.name)}</div>
      <div class="ex-meta">${n}${n !== ex.sets ? `<s class="muted">${ex.sets}</s>` : ''} set × ${ex.reps}${ex.rest ? ` · nghỉ ${ex.rest}s` : ''}${ex.note ? ` · ${esc(ex.note)}` : ''}</div>
      ${sug ? `<div class="sug ${sug.up ? 'up' : ''}">${sug.up ? '⬆ ' : ''}${esc(sug.text)}</div>` : ''}
      ${cardio ? `<div class="sets">${Array.from({ length: n }, (_, j) => `<button class="set ${arr[j]?.done ? 'done' : ''}" data-tick="${i}" data-j="${j}">${arr[j]?.done ? '✓' : j + 1}</button>`).join('')}</div>`
        : `<div class="setrows">${Array.from({ length: n }, (_, j) => {
          const s = arr[j] || {}, ls = last?.sets[j] || last?.sets[last.sets.length - 1];
          const phW = sug?.up ? sug.w : ls?.w || '', phR = ls?.r || repLow(ex);
          return `<div class="setrow ${s.done ? 'done' : ''}"><span class="sn">${j + 1}</span>
            <input inputmode="decimal" data-i="${i}" data-j="${j}" data-f="w" value="${esc(s.w ?? '')}" placeholder="${esc(phW)}"><span class="unit">kg ×</span>
            <input inputmode="numeric" data-i="${i}" data-j="${j}" data-f="r" value="${esc(s.r ?? '')}" placeholder="${esc(phR)}"><span class="unit">rep</span>
            <button class="tick" data-tick="${i}" data-j="${j}" aria-label="Xong set">✓</button></div>`;
        }).join('')}</div>`}
    </div>`;
  }).join('')}</section>
  <button class="btn ${dd.done ? '' : 'primary'}" id="finish">${dd.done ? `✓ Đã xong · RPE ${dd.rpe || '–'} · Tải tập ${strain(k)} — sửa` : 'Hoàn thành buổi tập'}</button>`;
  view.innerHTML = html;
  bindDays();
  $('#light')?.addEventListener('change', e => { dd.light = e.target.checked; save(); renderWorkout(); });
  view.querySelectorAll('.setrow input').forEach(inp => inp.addEventListener('change', () => {
    const i = +inp.dataset.i, j = +inp.dataset.j;
    const arr = dd.sets[i] || (dd.sets[i] = []);
    arr[j] = { ...(arr[j] || {}), [inp.dataset.f]: num(inp.value) };
    save();
  }));
  view.querySelectorAll('[data-tick]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.tick, j = +b.dataset.j;
    const ex = w.exercises[i];
    const arr = dd.sets[i] || (dd.sets[i] = []);
    const s = { ...(arr[j] || {}) };
    const row = b.closest('.setrow');
    if (row) {
      const [iw, ir] = row.querySelectorAll('input');
      s.w = num(iw.value) ?? num(iw.placeholder);
      s.r = num(ir.value) ?? num(ir.placeholder);
    }
    s.done = !s.done;
    arr[j] = s;
    if (s.done) {
      dd.startedAt ||= Date.now();
      if (ex.rest) startRest(ex.rest);
      holdWake();
    }
    const allDone = w.exercises.every((e, x) => (dd.sets[x] || []).slice(0, shownSets(k, e)).filter(q => q?.done).length >= shownSets(k, e));
    save(); renderWorkout();
    if (allDone && !dd.done) openFinish(k);
  }));
  $('#finish').addEventListener('click', () => openFinish(k));
}
function bindDays() {
  view.querySelectorAll('.day').forEach(b => b.addEventListener('click', () => { workoutDow = +b.dataset.dow; renderWorkout(); }));
}
const RPE_TXT = { 1: 'Rất nhẹ', 2: 'Nhẹ', 3: 'Nhẹ', 4: 'Vừa phải', 5: 'Vừa', 6: 'Hơi nặng', 7: 'Nặng', 8: 'Rất nặng', 9: 'Gần kiệt', 10: 'Tối đa' };
function openFinish(k) {
  const dd = day(k);
  const w = workoutFor(k);
  if (!dd.finishedAt && dd.startedAt) dd.finishedAt = Date.now();
  let rpe = dd.rpe || 7;
  let minutes = dayLoad(k).minutes || (dd.minutes ?? (toMin(w.end) - toMin(w.start)));
  if (!dd.done) minutes = (() => { const m = dd.startedAt ? Math.round((Date.now() - dd.startedAt) / 60000) : 0; return m >= 15 && m <= 200 ? m : toMin(w.end) - toMin(w.start); })();
  const draw = () => {
    const pv = strainOf(rpe * minutes);
    openSheet(`<h2>${dd.done ? 'Sửa buổi tập' : 'Hoàn thành buổi tập 🔥'}</h2>
      <div class="field"><label>Buổi tập nặng cỡ nào? (RPE)</label>
        <div class="rpe">${Array.from({ length: 10 }, (_, i) => i + 1).map(v => `<button data-rpe="${v}" class="${v === rpe ? 'active' : ''}">${v}</button>`).join('')}</div>
        <div class="small muted" style="text-align:center">${rpe} · ${RPE_TXT[rpe]}</div></div>
      <div class="field"><label>Thời gian tập (phút)</label>
        <div class="row between"><button class="chip lg" data-m="-5">−5</button><b class="big-num">${minutes}′</b><button class="chip lg" data-m="5">+5</button></div></div>
      <div class="card" style="background:var(--card-2);text-align:center;margin-bottom:12px"><div class="muted small">Tải tập dự kiến</div><b style="font-size:30px;color:var(--gym)">${pv}</b>
        <div class="small muted">= RPE × phút (${rpe * minutes}) · thang 0–100</div></div>
      <button class="btn primary" id="fin-save">${dd.done ? 'Lưu' : 'Xong buổi tập'}</button>
      ${dd.done ? '<div style="height:8px"></div><button class="btn danger" id="fin-undo">Bỏ đánh dấu hoàn thành</button>' : ''}`);
    $('#sheet').querySelectorAll('[data-rpe]').forEach(b => b.addEventListener('click', () => { rpe = +b.dataset.rpe; draw(); }));
    $('#sheet').querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { minutes = clamp(minutes + +b.dataset.m, 5, 240); draw(); }));
    $('#fin-save').addEventListener('click', () => {
      const first = !dd.done;
      Object.assign(dd, { done: true, rpe, minutes });
      save(); closeSheet(); releaseWake(); stopRest(); render();
      if (first) showToast(`🔥 Xong! Tải tập ${strain(k)}. Nạp 25–40g protein và 500ml nước nhé.`);
    });
    $('#fin-undo')?.addEventListener('click', () => { dd.done = false; delete dd.rpe; delete dd.minutes; save(); closeSheet(); render(); });
  };
  draw();
}

/* rest timer + giữ màn hình sáng */
let restEnd = 0, restTotal = 0, restInt = null, audioCtx = null, warned = false, wakeLock = null;
function tone(times, freq = 880) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    times.forEach(t => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.25, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.18);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch (e) { /* ignore */ }
}
function startRest(sec) {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) { /* ignore */ }
  restTotal = sec; restEnd = Date.now() + sec * 1000; warned = false;
  $('#rest-timer').hidden = false;
  clearInterval(restInt); tickRest(); restInt = setInterval(tickRest, 250);
}
function tickRest() {
  const left = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
  $('#rest-time').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
  $('#rest-progress').style.width = `${(left / restTotal) * 100}%`;
  if (left <= 10 && left > 0 && !warned && restTotal > 15) { warned = true; tone([0], 660); }
  if (left <= 0) { stopRest(); tone([0, 0.25, 0.5]); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); showToast('⏱️ Hết giờ nghỉ — vào set tiếp theo!'); }
}
function stopRest() { clearInterval(restInt); $('#rest-timer').hidden = true; }
$('#rest-skip').addEventListener('click', stopRest);
$('#rest-plus').addEventListener('click', () => { restEnd += 15000; restTotal += 15; tickRest(); });
async function holdWake() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { /* ignore */ }
}
function releaseWake() { try { wakeLock?.release(); } catch (e) { /* ignore */ } wakeLock = null; }

/* ================= food ================= */
const MEAL_TAGS = ['Sáng', 'Trưa', 'Tối', 'Phụ'];
function defaultMeal() { const h = new Date().getHours(); return h < 10 ? 'Sáng' : h < 15 ? 'Trưa' : h < 21 ? 'Tối' : 'Phụ'; }
function recentFoods(limit = 8) {
  const seen = new Map();
  Object.keys(state.days).sort().reverse().forEach(k => {
    [...state.days[k].food].reverse().forEach(f => { if (!seen.has(f.name) && f.base) seen.set(f.name, { name: f.name, ...f.base, recent: true }); });
  });
  return [...seen.values()].slice(0, limit);
}
function renderFood() {
  const t = targets();
  const dd = day();
  const yest = peek(addDays(todayKey(), -1));
  const k = sum(dd.food, 'kcal'), p = sum(dd.food, 'p'), c = sum(dd.food, 'c'), f = sum(dd.food, 'f');
  const left = t.kcal - k;
  const vals = lastNKeys(7).map(x => sum(peek(x)?.food, 'kcal'));
  const goalName = { cut: 'Giảm mỡ', maintain: 'Giữ cân', bulk: 'Tăng cơ' }[state.settings.goal];
  const copyable = MEAL_TAGS.filter(m => yest?.food.some(x => x.meal === m) && !dd.food.some(x => x.meal === m));
  view.innerHTML = `<section class="card">
    <div class="row" style="gap:16px">
      ${ring(k / t.kcal, left < 0 ? 'var(--danger)' : 'var(--food)', 130, 13, `<b>${Math.abs(Math.round(left))}</b><span class="muted small">${left < 0 ? 'vượt' : 'còn lại'}</span>`)}
      <div style="flex:1" class="stack">
        <div class="stat"><span class="muted small">Đã ăn · ${goalName}</span><b>${Math.round(k)} <span class="muted small">/ ${t.kcal} kcal</span></b></div>
        <div class="macro"><div class="row between"><span>Protein</span><span class="muted">${Math.round(p)}/${t.protein}g</span></div>${bar(p / t.protein, 'var(--protein)')}</div>
        <div class="macro"><div class="row between"><span>Carb</span><span class="muted">${Math.round(c)}/${t.carb}g</span></div>${bar(c / t.carb, 'var(--carb)')}</div>
        <div class="macro"><div class="row between"><span>Fat</span><span class="muted">${Math.round(f)}/${t.fat}g</span></div>${bar(f / t.fat, 'var(--fat)')}</div>
      </div>
    </div>
  </section>
  <button class="btn food" id="add-food">＋ Thêm món ăn</button>
  ${copyable.length ? `<div class="row" style="flex-wrap:wrap;gap:8px"><span class="muted small">Ăn giống hôm qua:</span>${copyable.map(m => `<button class="chip" data-copy="${m}">↺ Bữa ${m.toLowerCase()}</button>`).join('')}</div>` : ''}
  ${MEAL_TAGS.map(m => {
    const items = dd.food.map((x, i) => ({ ...x, i })).filter(x => x.meal === m);
    if (!items.length) return '';
    return `<section class="card"><div class="card-head"><h2>Bữa ${m.toLowerCase()}</h2><span class="muted small">${Math.round(sum(items, 'kcal'))} kcal · ${Math.round(sum(items, 'p'))}g P</span></div>
      <ul class="log">${items.map(x => `<li><div class="grow"><div class="name">${esc(x.name)}${x.qty && x.qty !== 1 ? ` ×${x.qty}` : ''}</div>
        <div class="muted small">${Math.round(x.kcal)} kcal · P ${Math.round(x.p)} · C ${Math.round(x.c)} · F ${Math.round(x.f)}</div></div>
        <button class="del" data-del-food="${x.i}" aria-label="Xóa">✕</button></li>`).join('')}</ul></section>`;
  }).join('')}
  ${dd.food.length ? '' : '<section class="card"><div class="empty">Chưa ghi món nào hôm nay.</div></section>'}
  <section class="card"><div class="card-head"><h2>7 ngày qua</h2><span class="muted small">kcal</span></div>${weekChart(vals, t.kcal, '#ff9f43')}</section>`;
  $('#add-food').addEventListener('click', openFoodSheet);
  view.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const m = b.dataset.copy;
    yest.food.filter(x => x.meal === m).forEach(x => dd.food.push({ ...x, t: Date.now() }));
    save(); renderFood(); showToast(`Đã chép bữa ${m.toLowerCase()} hôm qua`);
  }));
  view.querySelectorAll('[data-del-food]').forEach(b => b.addEventListener('click', () => { dd.food.splice(+b.dataset.delFood, 1); save(); renderFood(); }));
}
function openFoodSheet() {
  let mode = 'list', sel = null, qty = 1, meal = defaultMeal(), q = '';
  const all = () => {
    const rec = recentFoods();
    const names = new Set(rec.map(f => f.name));
    return [...rec, ...state.customFoods.filter(f => !names.has(f.name)).map(f => ({ ...f, custom: true })), ...FOODS.filter(f => !names.has(f.name))];
  };
  const draw = () => {
    const list = all().filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
    openSheet(`<h2>Thêm món ăn</h2>
      <div class="seg">${MEAL_TAGS.map(m => `<button data-meal="${m}" class="${m === meal ? 'active' : ''}">${m}</button>`).join('')}</div>
      <div class="seg"><button data-mode="list" class="${mode === 'list' ? 'active' : ''}">Danh sách</button><button data-mode="custom" class="${mode === 'custom' ? 'active' : ''}">Tự nhập</button></div>
      ${mode === 'list' ? `
        <div class="field"><input id="food-q" placeholder="Tìm món…" value="${esc(q)}" autocomplete="off"></div>
        <ul class="food-list">${list.map(f => `<li><button data-food="${esc(f.name)}" class="${sel && sel.name === f.name ? 'sel' : ''}"><span>${f.recent ? '🕘 ' : f.custom ? '⭐ ' : ''}${esc(f.name)}</span><span class="muted small">${Math.round(f.kcal)} kcal · ${Math.round(f.p)}g P</span></button></li>`).join('') || '<li class="empty">Không thấy — thử "Tự nhập"</li>'}</ul>
        <div class="row between" style="margin-bottom:12px"><span class="muted">Số phần</span>
          <div class="row"><button class="chip" id="q-minus">−</button><b style="min-width:36px;text-align:center">${qty}</b><button class="chip" id="q-plus">＋</button></div></div>
        <button class="btn food" id="food-add" ${sel ? '' : 'disabled style="opacity:.5"'}>${sel ? `Thêm · ${Math.round(sel.kcal * qty)} kcal` : 'Chọn một món'}</button>
      ` : `
        <div class="field"><label>Tên món</label><input id="c-name" placeholder="VD: Cơm gà xối mỡ"></div>
        <div class="fields-4">
          <div class="field"><label>Kcal</label><input id="c-kcal" inputmode="decimal"></div>
          <div class="field"><label>Protein</label><input id="c-p" inputmode="decimal"></div>
          <div class="field"><label>Carb</label><input id="c-c" inputmode="decimal"></div>
          <div class="field"><label>Fat</label><input id="c-f" inputmode="decimal"></div>
        </div>
        <label class="row small muted" style="margin-bottom:12px"><input type="checkbox" id="c-save" checked> Lưu vào danh sách món của tôi</label>
        <button class="btn food" id="custom-add">Thêm món</button>
      `}`);
    const sh = $('#sheet');
    sh.querySelectorAll('[data-meal]').forEach(b => b.addEventListener('click', () => { meal = b.dataset.meal; draw(); }));
    sh.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; draw(); }));
    const push = (item, n) => day().food.push({ name: item.name, qty: n, meal, kcal: item.kcal * n, p: item.p * n, c: item.c * n, f: item.f * n,
      base: { kcal: item.kcal, p: item.p, c: item.c, f: item.f }, t: Date.now() });
    if (mode === 'list') {
      const qi = $('#food-q');
      qi.addEventListener('input', () => { q = qi.value; const pos = qi.selectionStart; draw(); const nq = $('#food-q'); nq.focus(); nq.setSelectionRange(pos, pos); });
      sh.querySelectorAll('[data-food]').forEach(b => b.addEventListener('click', () => { sel = all().find(f => f.name === b.dataset.food); draw(); }));
      $('#q-minus').addEventListener('click', () => { qty = Math.max(0.5, qty - 0.5); draw(); });
      $('#q-plus').addEventListener('click', () => { qty += 0.5; draw(); });
      $('#food-add').addEventListener('click', () => {
        if (!sel) return;
        push(sel, qty); save(); closeSheet(); render(); showToast(`Đã thêm ${sel.name}`);
      });
    } else {
      $('#custom-add').addEventListener('click', () => {
        const name = $('#c-name').value.trim();
        const item = { name, kcal: num($('#c-kcal').value) || 0, p: num($('#c-p').value) || 0, c: num($('#c-c').value) || 0, f: num($('#c-f').value) || 0 };
        if (!name || !item.kcal) { showToast('Nhập tên món và kcal'); return; }
        if ($('#c-save').checked && !state.customFoods.some(f => f.name === name)) state.customFoods.unshift(item);
        push(item, 1); save(); closeSheet(); render(); showToast(`Đã thêm ${name}`);
      });
    }
  };
  draw();
}

/* ================= water ================= */
function addWater(ml) {
  day().water.push({ ml, t: Date.now() });
  save();
  const total = sum(day().water, 'ml'), goal = targets().water;
  showToast(total >= goal ? `🎉 Đạt mục tiêu ${fmtL(goal)} hôm nay!` : `💧 +${ml} ml · còn ${fmtL(goal - total)}`);
  render();
}
function renderWater() {
  const t = targets();
  const dd = day();
  const total = sum(dd.water, 'ml');
  const exp = expectedWaterAt(nowMin());
  const behind = exp - total;
  const vals = lastNKeys(7).map(x => sum(peek(x)?.water, 'ml'));
  const nextSlot = waterSlots().find(m => m > nowMin());
  view.innerHTML = `<section class="card" style="display:grid;justify-items:center;gap:12px">
    ${ring(total / t.water, 'var(--water)', 190, 16, `<b style="font-size:34px">${fmtL(total)}</b><span class="muted">/ ${fmtL(t.water)}</span>`)}
    <div class="small" style="text-align:center">${total >= t.water ? '🎉 Đã đạt mục tiêu hôm nay' : behind > 0 ? `⚠️ Đang chậm ${fmtL(behind)} so với tiến độ (nên đạt ${fmtL(exp)} lúc này)` : '✅ Đúng tiến độ'}${WORKOUTS[new Date().getDay()] ? '<br><span class="muted">Hôm nay có tập: +500ml vào mục tiêu</span>' : ''}</div>
    <div class="water-btns" style="width:100%">
      <button class="water-btn" data-add-water="150">150<span>ngụm</span></button>
      <button class="water-btn" data-add-water="250">250<span>1 ly</span></button>
      <button class="water-btn" data-add-water="500">500<span>1 chai</span></button>
    </div>
    ${nextSlot ? `<div class="muted small">Lần nhắc tiếp theo: <b style="color:var(--text)">${fromMin(nextSlot)}</b> · cứ ${state.settings.waterEvery} phút từ ${state.settings.waterStart}h–${state.settings.waterEnd}h</div>` : ''}
  </section>
  <section class="card"><div class="card-head"><h2>Hôm nay</h2><span class="muted small">${dd.water.length} lần</span></div>
    ${dd.water.length ? `<ul class="log">${dd.water.map((w, i) => ({ ...w, i })).reverse().map(w => {
      const d = new Date(w.t);
      return `<li><span>💧</span><div class="grow"><b>${w.ml} ml</b></div><span class="muted small">${pad(d.getHours())}:${pad(d.getMinutes())}</span><button class="del" data-del-water="${w.i}" aria-label="Xóa">✕</button></li>`;
    }).join('')}</ul>` : '<div class="empty">Chưa uống ngụm nào — bắt đầu với 1 ly nhé!</div>'}
  </section>
  <section class="card"><div class="card-head"><h2>7 ngày qua</h2><span class="muted small">mục tiêu ${fmtL(t.water)}</span></div>${weekChart(vals, t.water, '#4cc2ff')}</section>`;
  view.querySelectorAll('[data-add-water]').forEach(el => el.addEventListener('click', () => addWater(+el.dataset.addWater)));
  view.querySelectorAll('[data-del-water]').forEach(b => b.addEventListener('click', () => { dd.water.splice(+b.dataset.delWater, 1); save(); renderWater(); }));
}

/* ================= trends ================= */
let trendEx = null;
function renderTrends() {
  const wr = weekReport();
  const ks = lastNKeys(14);
  const recs = ks.map(recovery), strs = ks.map(strain);
  const W = 340, H = 120, slot = W / 14;
  const pair = `<svg viewBox="0 0 ${W} ${H + 16}" width="100%" style="display:block">
    ${ks.map((k, i) => {
      const x = i * slot + slot / 2;
      const rh = recs[i] ? (recs[i].score / 100) * H : 0, sh = (strs[i] / 100) * H;
      return `${rh ? `<rect x="${x - 8}" y="${H - rh}" width="7" height="${rh}" rx="2" fill="${recColor(recs[i].score)}"/>` : `<rect x="${x - 8}" y="${H - 2}" width="7" height="2" fill="#262b33"/>`}
        <rect x="${x + 1}" y="${H - Math.max(2, sh)}" width="7" height="${Math.max(2, sh)}" rx="2" fill="${sh ? 'var(--gym)' : '#262b33'}"/>
        <text x="${x}" y="${H + 13}" font-size="9" fill="#8b93a1" text-anchor="middle">${DAY_SHORT[dowOf(k)]}</text>`;
    }).join('')}</svg>`;

  const ws = weightSeries(60);
  const ma = movingAvg(ws);
  const tr = weightTrend();
  const ka = kcalAdvice();
  const names = allExerciseNames();
  trendEx ||= names[0];
  const hist = history(trendEx, addDays(todayKey(), 1)).reverse();
  const bodyweight = hist.length > 0 && hist.every(h => h.sets.every(s => !s.w));
  const best = h => (bodyweight ? Math.max(...h.sets.map(s => s.r)) : Math.max(...h.sets.map(s => e1rm(s.w, s.r))));
  const exSeries = hist.map(h => ({ y: best(h), label: shortDate(h.k) })).filter(p => p.y > 0);
  const impacts = journalImpact(JOURNAL);
  const lastW = ws[ws.length - 1];

  view.innerHTML = `<section class="card">
    <div class="card-head"><h2>Tuần này</h2><span class="muted small">${wr.days}/7 ngày</span></div>
    <div class="kpis">
      <div><b>${wr.done}<span class="muted">/${wr.planned}</span></b><span>Buổi tập</span></div>
      <div><b style="color:${wr.avgRec != null ? recColor(wr.avgRec) : 'inherit'}">${wr.avgRec ?? '–'}${wr.avgRec != null ? '%' : ''}</b><span>Hồi phục TB</span></div>
      <div><b>${wr.avgSleep != null ? fmtH(wr.avgSleep) : '–'}</b><span>Ngủ TB</span></div>
      <div><b>${wr.protHit}<span class="muted">/${wr.logged}</span></b><span>Ngày đủ protein</span></div>
      <div><b>${wr.waterHit}<span class="muted">/${wr.days}</span></b><span>Ngày đủ nước</span></div>
      <div><b>${strainOf(wr.totalLoad / Math.max(1, wr.done)) || '–'}</b><span>Tải tập TB/buổi</span></div>
    </div>
  </section>
  <section class="card">
    <div class="card-head"><h2>Hồi phục & Tải tập</h2><span class="muted small">14 ngày</span></div>
    ${pair}
    <div class="row small muted" style="gap:14px;margin-top:6px"><span><i class="lg-dot" style="background:#3ddc84"></i>Hồi phục</span><span><i class="lg-dot" style="background:var(--gym)"></i>Tải tập</span></div>
    <p class="small muted" style="margin-bottom:0">Ngày sau buổi tải cao mà hồi phục vẫn xanh → bạn có thể tăng khối lượng. Nhiều ngày đỏ liên tiếp → giảm tải hoặc ngủ thêm.</p>
  </section>
  <section class="card">
    <div class="card-head"><h2>Cân nặng</h2><button class="chip" id="log-weight">＋ Cân hôm nay</button></div>
    ${ws.length ? lineChart(ws.map(p => ({ y: p.w, label: shortDate(p.k) })), { avgSeries: ma.map(p => ({ y: p.w })), color: 'var(--water)' }) : '<div class="empty small">Chưa có số cân nào. Cân mỗi sáng sau khi đi vệ sinh, trước khi ăn.</div>'}
    ${tr ? `<div class="row between" style="margin-top:8px"><span class="muted small">Xu hướng 3 tuần</span><b>${tr.perWeek >= 0 ? '+' : ''}${tr.perWeek.toFixed(2)} kg/tuần <span class="muted small">(${tr.pct >= 0 ? '+' : ''}${tr.pct.toFixed(2)}%)</span></b></div>` : ''}
    ${lastW ? `<div class="small muted">Gần nhất: ${lastW.w} kg (${shortDate(lastW.k)}) · đường xanh = trung bình 7 ngày</div>` : ''}
    <div class="advice" style="border-color:var(--food);margin-top:12px"><b>🍽️ Calo tự điều chỉnh</b><div class="small">${esc(ka.text)}${ka.tdee ? `<br>TDEE thực tế ước tính: <b>${ka.tdee} kcal</b>` : ''}</div>
      ${ka.kcal ? `<button class="btn food" id="apply-kcal" style="margin-top:10px;min-height:40px">Áp dụng ${ka.kcal} kcal</button>` : ''}</div>
  </section>
  <section class="card">
    <div class="card-head"><h2>Tiến bộ sức mạnh</h2></div>
    <div class="field"><select id="ex-pick">${names.map(n => `<option ${n === trendEx ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    ${exSeries.length ? lineChart(exSeries, { color: 'var(--gym)' }) : '<div class="empty small">Chưa có dữ liệu. Ghi kg × rep khi tập để thấy biểu đồ.</div>'}
    ${hist.length ? `<ul class="log" style="margin-top:8px">${hist.slice(-5).reverse().map(h => `<li><span class="muted small" style="width:44px">${shortDate(h.k)}</span><div class="grow small">${h.sets.map(s => (s.w ? `${s.w}×${s.r}` : `${s.r} rep`)).join(' · ')}</div><span class="small muted">${bodyweight ? `max ${best(h)} rep` : `1RM≈${Math.round(best(h))}kg`}</span></li>`).join('')}</ul>` : ''}
    <p class="small muted" style="margin-bottom:0">${bodyweight ? 'Bài không tạ: biểu đồ theo số rep cao nhất mỗi buổi.' : 'Biểu đồ dùng 1RM ước tính (công thức Epley) của set tốt nhất mỗi buổi.'}</p>
  </section>
  <section class="card">
    <div class="card-head"><h2>Thói quen ảnh hưởng hồi phục</h2></div>
    <ul class="log">${impacts.map(t => `<li><div class="grow">${esc(t.label)}</div>${t.diff == null
      ? `<span class="muted small">cần thêm ${t.need} ngày</span>`
      : `<b style="color:${t.diff >= 0 ? '#3ddc84' : '#ff5c5c'}">${t.diff >= 0 ? '+' : ''}${t.diff}%</b>`}</li>`).join('')}</ul>
    <p class="small muted" style="margin-bottom:0">So sánh điểm hồi phục trung bình giữa những ngày có và không có thói quen đó (tick trong check-in).</p>
  </section>`;
  $('#ex-pick').addEventListener('change', e => { trendEx = e.target.value; renderTrends(); });
  $('#log-weight').addEventListener('click', () => {
    const cur = peek(todayKey())?.checkin?.weight ?? '';
    openSheet(`<h2>Cân nặng hôm nay</h2><div class="field"><input id="w-in" inputmode="decimal" value="${esc(cur)}" placeholder="${esc(lastW?.w ?? state.settings.weight)}"></div>
      <button class="btn primary" id="w-save">Lưu</button>`);
    $('#w-in').focus();
    $('#w-save').addEventListener('click', () => {
      const v = num($('#w-in').value); if (!v) return;
      const d = day(); d.checkin ||= { tags: {} }; d.checkin.weight = v; state.settings.weight = v;
      save(); closeSheet(); renderTrends();
    });
  });
  $('#apply-kcal')?.addEventListener('click', () => { state.settings.kcal = ka.kcal; save(); renderTrends(); showToast(`Đã đặt mục tiêu ${ka.kcal} kcal/ngày`); });
}

/* ================= settings ================= */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
  const name = `gymtrack-${todayKey()}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: 'GymTrack backup' }).catch(() => {});
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
}
function openSettings() {
  const s = state.settings;
  const t = targets();
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  openSheet(`<h2>Cài đặt</h2>
    <div class="card" style="background:var(--card-2);margin-bottom:14px">
      <h2 style="font-size:16px">🔔 Nhắc nhở trên iPhone</h2>
      <p class="small muted" style="margin-top:0">Web app trên iOS không tự chạy nền, nên hãy thêm lịch nhắc (có báo thức) vào app <b>Lịch</b>. Mở link bằng Safari → <b>Thêm tất cả</b>.</p>
      <a class="link-row" href="ics/nhac-uong-nuoc.ics" target="_blank" rel="noopener"><span>💧 Nhắc uống nước<small>Mỗi 2 giờ, 7:00–21:00, hằng ngày</small></span><span>›</span></a>
      <a class="link-row" href="ics/nhac-tap-va-an.ics" target="_blank" rel="noopener"><span>🏋️ Nhắc check-in, tập & bữa ăn<small>Check-in sáng, trước buổi tập 45′, protein sau tập, giờ ăn, giờ ngủ</small></span><span>›</span></a>
      <div style="margin-top:10px">${perm === 'granted' ? '<div class="small muted">✅ Đã bật thông báo trong app (khi app đang mở).</div>'
        : perm === 'unsupported' ? '<div class="small muted">Thông báo trong app cần mở từ Màn hình chính (iOS 16.4+).</div>'
        : '<button class="btn" id="enable-noti">Bật thông báo trong app</button>'}</div>
    </div>
    <div class="field"><label>Cân nặng (kg)</label><input id="s-weight" inputmode="decimal" value="${esc(s.weight)}"></div>
    <div class="field"><label>Mục tiêu</label><select id="s-goal">
      <option value="cut" ${s.goal === 'cut' ? 'selected' : ''}>Giảm mỡ (−400 kcal)</option>
      <option value="maintain" ${s.goal === 'maintain' ? 'selected' : ''}>Giữ cân</option>
      <option value="bulk" ${s.goal === 'bulk' ? 'selected' : ''}>Tăng cơ (+300 kcal)</option></select></div>
    <div class="fields-4" style="grid-template-columns:1fr 1fr 1fr">
      <div class="field"><label>Kcal/ngày</label><input id="s-kcal" inputmode="numeric" placeholder="${t.kcal}" value="${esc(s.kcal)}"></div>
      <div class="field"><label>Protein (g)</label><input id="s-protein" inputmode="numeric" placeholder="${t.protein}" value="${esc(s.protein)}"></div>
      <div class="field"><label>Nước (ml)</label><input id="s-water" inputmode="numeric" placeholder="${t.water - (WORKOUTS[new Date().getDay()] ? 500 : 0)}" value="${esc(s.waterGoal)}"></div>
    </div>
    <p class="small muted" style="margin-top:-4px">Để trống = tự tính theo cân nặng. Ngày có tập tự cộng thêm 500ml nước.</p>
    <div class="fields-4" style="grid-template-columns:1fr 1fr 1fr">
      <div class="field"><label>Nhắc nước từ</label><select id="s-ws">${Array.from({ length: 12 }, (_, i) => i + 5).map(h => `<option ${h === +s.waterStart ? 'selected' : ''} value="${h}">${h}:00</option>`).join('')}</select></div>
      <div class="field"><label>đến</label><select id="s-we">${Array.from({ length: 8 }, (_, i) => i + 17).map(h => `<option ${h === +s.waterEnd ? 'selected' : ''} value="${h}">${h}:00</option>`).join('')}</select></div>
      <div class="field"><label>Mỗi</label><select id="s-wv">${[45, 60, 90, 120].map(m => `<option ${m === +s.waterEvery ? 'selected' : ''} value="${m}">${m} phút</option>`).join('')}</select></div>
    </div>
    <button class="btn primary" id="s-save">Lưu</button>
    <div class="card" style="background:var(--card-2);margin-top:14px">
      <h2 style="font-size:16px">💾 Sao lưu dữ liệu</h2>
      <p class="small muted" style="margin-top:0">Dữ liệu chỉ nằm trên máy này. Xuất file định kỳ (lưu vào Tệp/iCloud Drive) để không mất khi đổi máy.</p>
      <div class="grid-2"><button class="btn" id="exp">Xuất file</button><button class="btn" id="imp">Nhập file</button></div>
      <input type="file" id="imp-file" accept="application/json,.json" hidden>
    </div>
    <div style="height:10px"></div>
    <button class="btn danger" id="s-reset">Xóa toàn bộ dữ liệu</button>
    <p class="small muted" style="text-align:center">Lịch tập lấy từ Google Calendar (24/11/2026).</p>`);
  $('#s-save').addEventListener('click', () => {
    Object.assign(state.settings, {
      weight: num($('#s-weight').value) || 65,
      goal: $('#s-goal').value,
      kcal: $('#s-kcal').value.trim(), protein: $('#s-protein').value.trim(), waterGoal: $('#s-water').value.trim(),
      waterStart: +$('#s-ws').value, waterEnd: +$('#s-we').value, waterEvery: +$('#s-wv').value,
    });
    save(); closeSheet(); render(); showToast('Đã lưu cài đặt');
  });
  $('#exp').addEventListener('click', exportData);
  $('#imp').addEventListener('click', () => $('#imp-file').click());
  $('#imp-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.days) throw new Error('bad');
      if (!confirm('Thay toàn bộ dữ liệu hiện tại bằng file này?')) return;
      replaceState(data); closeSheet(); render(); showToast('✅ Đã nhập dữ liệu');
    } catch (err) { showToast('File không hợp lệ'); }
  });
  $('#s-reset').addEventListener('click', () => {
    if (!confirm('Xóa toàn bộ lịch sử ăn uống, nước, check-in và buổi tập?')) return;
    resetState(); closeSheet(); render();
  });
  $('#enable-noti')?.addEventListener('click', async () => {
    const r = await Notification.requestPermission();
    showToast(r === 'granted' ? '✅ Đã bật thông báo' : 'Thông báo chưa được cho phép');
    closeSheet(); render();
  });
}
$('#open-settings').addEventListener('click', openSettings);

/* ================= boot ================= */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render();
checkReminders();
setInterval(() => {
  checkReminders();
  document.querySelectorAll('[data-countdown]').forEach(el => {
    const t = +el.dataset.countdown;
    el.textContent = t <= Date.now() ? 'Đang diễn ra' : countdownText(t);
  });
}, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  checkReminders();
  if ($('#sheet').hidden && !document.activeElement?.matches('input')) render();
  if (tab === 'workout' && peek(todayKey())?.startedAt && !peek(todayKey())?.done) holdWake();
});
