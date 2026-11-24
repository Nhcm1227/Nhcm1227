import { WORKOUTS, MEALS, BEDTIME, DAY_NAMES, DAY_SHORT, FOODS } from './data.js';

/* ---------------- state ---------------- */
const KEY = 'gymtrack-v1';
const DEFAULT_SETTINGS = {
  weight: 65, goal: 'cut', kcal: '', protein: '', waterGoal: '',
  waterStart: 7, waterEnd: 22, waterEvery: 90, preGym: 45,
};

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.days) return { ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings } };
  } catch (e) { /* ignore */ }
  return { settings: { ...DEFAULT_SETTINGS }, days: {}, weights: {}, customFoods: [], shown: {} };
}
let state = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => keyOf(new Date());
function day(k = todayKey()) {
  if (!state.days[k]) state.days[k] = { water: [], food: [], sets: {}, done: false };
  return state.days[k];
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fromMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const fmtL = ml => (ml >= 1000 ? (ml / 1000).toFixed(ml % 1000 ? 2 : 1).replace(/0$/, '') + ' L' : ml + ' ml');
const r0 = n => Math.round(n);

/* ---------------- targets ---------------- */
function targets(dow = new Date().getDay()) {
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
const sum = (arr, k) => arr.reduce((a, x) => a + (Number(x[k]) || 0), 0);

/* ---------------- reminders ---------------- */
function waterSlots() {
  const s = state.settings;
  const out = [];
  for (let m = s.waterStart * 60; m <= s.waterEnd * 60; m += Number(s.waterEvery) || 90) out.push(m);
  return out;
}
function expectedWaterAt(min) {
  const s = state.settings;
  const a = s.waterStart * 60, b = s.waterEnd * 60;
  const f = Math.min(1, Math.max(0, (min - a) / (b - a)));
  return Math.round(targets().water * f);
}
function todayPlan(dow = new Date().getDay()) {
  const items = [];
  const w = WORKOUTS[dow];
  if (w) {
    const st = toMin(w.start);
    items.push({ id: 'pre', min: st - state.settings.preGym, kind: 'water', title: 'Chuẩn bị đi tập', body: `Soạn đồ, uống ~500ml nước. ${w.title} lúc ${w.start}.` });
    items.push({ id: 'gym', min: st, kind: 'gym', title: w.title, body: `${w.subtitle}${w.location ? ' · ' + w.location : ''} · ${w.start}–${w.end}` });
    if (w.type === 'gym') items.push({ id: 'post', min: toMin(w.end) + 15, kind: 'food', title: 'Nạp protein sau tập', body: '25–40g protein trong 1 giờ sau tập.' });
  }
  (MEALS[dow] || []).forEach((m, i) => items.push({ id: 'meal' + i, min: toMin(m.time), kind: 'food', title: m.label, body: 'Nhớ ghi lại món ăn vào app.' }));
  items.push({ id: 'bed', min: toMin(BEDTIME) - 30, kind: 'sleep', title: 'Chuẩn bị đi ngủ', body: `Ngủ lúc ${BEDTIME} để cơ phục hồi.` });
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
  for (const it of todayPlan()) {
    if (due(it.min) && !shown.includes(it.id)) { shown.push(it.id); notify(it.title, it.body); }
  }
  const drank = sum(day().water, 'ml');
  for (const m of waterSlots()) {
    const id = 'w' + m;
    if (due(m) && !shown.includes(id)) {
      shown.push(id);
      const exp = expectedWaterAt(m);
      if (drank < exp) notify('Uống nước 💧', `Đến ${fromMin(m)} nên đạt ${fmtL(exp)}, bạn mới uống ${fmtL(drank)}.`);
    }
  }
  // dọn lịch sử thông báo cũ
  Object.keys(state.shown).forEach(d => { if (d !== k) delete state.shown[d]; });
  save();
}

/* ---------------- ui helpers ---------------- */
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
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.min(1, Math.max(0, pct));
  return `<div class="ring-wrap ${size < 100 ? 'ring-sm' : ''}">
    <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--card-2)" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" style="transition:stroke-dashoffset .4s"/></svg>
    <div class="ring-center">${center}</div></div>`;
}
const bar = (pct, color) => `<div class="bar"><i style="width:${Math.min(100, pct * 100)}%;background:${color}"></i></div>`;
function weekDates() {
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
}
function last7() {
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
}
function weekChart(values, goal, color) {
  const days = last7();
  const max = Math.max(goal, ...values) || 1;
  return `<div class="week">${days.map((d, i) => `<div class="col"><div class="b" style="height:${(values[i] / max) * 100}%;background:${values[i] >= goal ? color : values[i] ? color + '88' : 'var(--card-2)'}"></div><div class="lbl">${DAY_SHORT[d.getDay()]}</div></div>`).join('')}</div>`;
}
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;

/* ---------------- tabs ---------------- */
let tab = 'today';
let workoutDow = new Date().getDay();
const TITLES = { today: 'Hôm nay', workout: 'Tập luyện', food: 'Ăn uống', water: 'Uống nước' };
function render() {
  const d = new Date();
  $('#today-label').textContent = `${DAY_NAMES[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
  $('#page-title').textContent = TITLES[tab];
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  ({ today: renderToday, workout: renderWorkout, food: renderFood, water: renderWater })[tab]();
}
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  if (tab === 'workout') workoutDow = new Date().getDay();
  render(); window.scrollTo(0, 0);
}));

/* ---------------- today ---------------- */
function nextWorkout() {
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const w = WORKOUTS[d.getDay()];
    if (!w) continue;
    const start = new Date(d); const [h, m] = w.start.split(':'); start.setHours(+h, +m, 0, 0);
    const end = new Date(d); const [eh, em] = w.end.split(':'); end.setHours(+eh, +em, 0, 0);
    if (end > now) return { w, start, end, dow: d.getDay(), offset: i };
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
  const t = targets();
  const dd = day();
  const water = sum(dd.water, 'ml');
  const kcal = sum(dd.food, 'kcal'), prot = sum(dd.food, 'p');
  const nw = nextWorkout();
  const now = nowMin();
  const nextSlot = waterSlots().find(m => m > now);
  const plan = todayPlan();
  if (nextSlot) plan.push({ min: nextSlot, kind: 'water', title: 'Nhắc uống nước tiếp theo', body: `Mục tiêu lúc đó: ${fmtL(expectedWaterAt(nextSlot))}` });
  plan.sort((a, b) => a.min - b.min);
  const nextIdx = plan.findIndex(p => p.min >= now);
  const doneThisWeek = weekDates().filter(d => state.days[keyOf(d)]?.done).length;
  const planned = Object.keys(WORKOUTS).length;

  let html = '';
  if (isIOS && !standalone) {
    html += `<div class="banner">📲 <b>Cài lên iPhone:</b> nhấn nút <b>Chia sẻ</b> trong Safari → <b>Thêm vào MH chính</b>. Mở từ biểu tượng để dùng như app và bật thông báo.</div>`;
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
      <div class="row" style="margin-top:12px"><button class="btn primary" data-go-workout="${nw.dow}">${live ? 'Mở buổi tập' : 'Xem bài tập'}</button></div>
    </section>`;
  }
  html += `<div class="grid-2">
    <section class="card" data-go="water" style="display:grid;justify-items:center;gap:8px">
      ${ring(water / t.water, 'var(--water)', 110, 11, `<b>${fmtL(water)}</b><span class="muted small">/ ${fmtL(t.water)}</span>`)}
      <button class="btn water" data-add-water="250" style="min-height:38px">+250 ml</button>
    </section>
    <section class="card" data-go="food" style="display:grid;justify-items:center;gap:8px">
      ${ring(kcal / t.kcal, 'var(--food)', 110, 11, `<b>${r0(kcal)}</b><span class="muted small">/ ${t.kcal} kcal</span>`)}
      <div class="small muted" style="width:100%">Protein ${r0(prot)}/${t.protein}g</div>
      ${bar(prot / t.protein, 'var(--protein)').replace('class="bar"', 'class="bar" style="width:100%"')}
    </section>
  </div>`;
  html += `<section class="card">
    <div class="card-head"><h2>Lịch hôm nay</h2><span class="muted small">Tuần này: ${doneThisWeek}/${planned} buổi</span></div>
    <ul class="timeline">${plan.map((p, i) => `<li class="${p.min < now && i !== nextIdx ? 'past' : ''} ${i === nextIdx ? 'next' : ''}">
      <span class="t">${fromMin(p.min)}</span><span class="dot ${p.kind}"></span>
      <div><div style="font-weight:600">${esc(p.title)}</div><div class="muted small">${esc(p.body)}</div></div></li>`).join('')}
    </ul>
  </section>`;
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    html += `<section class="card"><h2>🔔 Nhắc nhở</h2>
      <p class="muted small" style="margin-top:0">iPhone chỉ cho web app gửi thông báo khi app đang mở. Để luôn được nhắc (kể cả khi tắt app), thêm lịch nhắc vào ứng dụng Lịch của iPhone trong <b>Cài đặt</b>.</p>
      <button class="btn" id="open-settings-2">Mở cài đặt nhắc nhở</button></section>`;
  }
  view.innerHTML = html;
  view.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', e => { if (e.target.closest('button')) return; tab = el.dataset.go; render(); }));
  view.querySelectorAll('[data-go-workout]').forEach(el => el.addEventListener('click', () => { tab = 'workout'; workoutDow = +el.dataset.goWorkout; render(); }));
  view.querySelectorAll('[data-add-water]').forEach(el => el.addEventListener('click', () => addWater(+el.dataset.addWater)));
  $('#open-settings-2')?.addEventListener('click', openSettings);
}

/* ---------------- workout ---------------- */
function dateForDow(dow) { return weekDates().find(d => d.getDay() === dow); }
function renderWorkout() {
  const wd = weekDates();
  const w = WORKOUTS[workoutDow];
  const dk = keyOf(dateForDow(workoutDow));
  const dd = day(dk);
  let html = `<div class="days">${wd.map(d => {
    const dw = d.getDay(), wk = WORKOUTS[dw];
    const done = state.days[keyOf(d)]?.done;
    return `<button class="day ${dw === workoutDow ? 'active' : ''}" data-dow="${dw}">${DAY_SHORT[dw]}<b>${d.getDate()}</b><span class="pip ${done ? 'done' : wk ? wk.type : ''}"></span></button>`;
  }).join('')}</div>`;
  if (!w) {
    html += `<section class="card"><div class="empty">😴<br><b style="color:var(--text)">Ngày nghỉ</b><br>Ngủ đủ giấc, uống đủ nước và ăn đủ protein để cơ phục hồi.</div></section>`;
    view.innerHTML = html; bindDays(); return;
  }
  const total = w.exercises.reduce((a, e) => a + e.sets, 0);
  const doneSets = w.exercises.reduce((a, e, i) => a + (dd.sets[i] || []).filter(Boolean).length, 0);
  html += `<section class="card">
    <div class="card-head"><div><h2 style="margin:0">${esc(w.title)}</h2><div class="muted small">${esc(w.subtitle)}</div></div>
    ${ring(doneSets / total, 'var(--gym)', 58, 6, `<b style="font-size:13px">${doneSets}/${total}</b>`)}</div>
    <div class="muted small">🕒 ${w.start}–${w.end}${w.location ? ' · 📍 ' + w.location : ''}</div>
  </section>
  <section class="card">${w.exercises.map((e, i) => {
    const s = dd.sets[i] || [];
    const complete = s.filter(Boolean).length === e.sets;
    return `<div class="ex ${complete ? 'complete' : ''}">
      <div class="ex-name">${e.superset ? `<span class="ss">SS ${e.superset}</span>` : ''}${esc(e.name)}</div>
      <div class="ex-meta">${e.sets} set × ${e.reps}${e.rest ? ` · nghỉ ${e.rest}s` : ''}${e.note ? ` · ${esc(e.note)}` : ''}</div>
      <div class="sets">${Array.from({ length: e.sets }, (_, j) => `<button class="set ${s[j] ? 'done' : ''}" data-ex="${i}" data-set="${j}">${j + 1}</button>`).join('')}
        ${w.type === 'gym' && !/Walk/.test(e.name) ? `<label class="weight"><input inputmode="decimal" data-weight="${esc(e.name)}" value="${esc(state.weights[e.name] || '')}" placeholder="—">kg</label>` : ''}
      </div></div>`;
  }).join('')}</section>
  <button class="btn ${dd.done ? '' : 'primary'}" id="finish">${dd.done ? '✓ Đã hoàn thành — bấm để bỏ đánh dấu' : 'Hoàn thành buổi tập'}</button>`;
  view.innerHTML = html;
  bindDays();
  view.querySelectorAll('.set').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.ex, j = +b.dataset.set;
    const arr = dd.sets[i] || (dd.sets[i] = Array(w.exercises[i].sets).fill(false));
    arr[j] = !arr[j];
    if (arr[j] && w.exercises[i].rest) startRest(w.exercises[i].rest);
    if (w.exercises.every((e, k) => (dd.sets[k] || []).filter(Boolean).length === e.sets)) {
      if (!dd.done) { dd.done = true; showToast('🔥 Hoàn thành buổi tập! Nhớ nạp protein và uống nước.'); }
    }
    save(); renderWorkout();
  }));
  view.querySelectorAll('[data-weight]').forEach(inp => inp.addEventListener('change', () => {
    state.weights[inp.dataset.weight] = inp.value.trim(); save();
  }));
  $('#finish').addEventListener('click', () => {
    dd.done = !dd.done; save();
    if (dd.done) showToast('🔥 Tuyệt! Đã ghi nhận buổi tập.');
    renderWorkout();
  });
}
function bindDays() {
  view.querySelectorAll('.day').forEach(b => b.addEventListener('click', () => { workoutDow = +b.dataset.dow; renderWorkout(); }));
}

/* rest timer */
let restEnd = 0, restTotal = 0, restInt = null, audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(t => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.25, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.2);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch (e) { /* ignore */ }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
function startRest(sec) {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) { /* ignore */ }
  restTotal = sec; restEnd = Date.now() + sec * 1000;
  $('#rest-timer').hidden = false;
  clearInterval(restInt); tickRest(); restInt = setInterval(tickRest, 250);
}
function tickRest() {
  const left = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
  $('#rest-time').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
  $('#rest-progress').style.width = `${(left / restTotal) * 100}%`;
  if (left <= 0) { stopRest(); beep(); showToast('⏱️ Hết giờ nghỉ — vào set tiếp theo!'); }
}
function stopRest() { clearInterval(restInt); $('#rest-timer').hidden = true; }
$('#rest-skip').addEventListener('click', stopRest);
$('#rest-plus').addEventListener('click', () => { restEnd += 15000; restTotal += 15; tickRest(); });

/* ---------------- food ---------------- */
const MEAL_TAGS = ['Sáng', 'Trưa', 'Tối', 'Phụ'];
function defaultMeal() { const h = new Date().getHours(); return h < 10 ? 'Sáng' : h < 15 ? 'Trưa' : h < 21 ? 'Tối' : 'Phụ'; }
function renderFood() {
  const t = targets();
  const dd = day();
  const k = sum(dd.food, 'kcal'), p = sum(dd.food, 'p'), c = sum(dd.food, 'c'), f = sum(dd.food, 'f');
  const left = t.kcal - k;
  const vals = last7().map(d => sum(state.days[keyOf(d)]?.food || [], 'kcal'));
  const goalName = { cut: 'Giảm mỡ', maintain: 'Giữ cân', bulk: 'Tăng cơ' }[state.settings.goal];
  view.innerHTML = `<section class="card">
    <div class="row" style="gap:16px">
      ${ring(k / t.kcal, left < 0 ? 'var(--danger)' : 'var(--food)', 130, 13, `<b>${Math.abs(r0(left))}</b><span class="muted small">${left < 0 ? 'vượt' : 'còn lại'}</span>`)}
      <div style="flex:1" class="stack">
        <div class="stat"><span class="muted small">Đã ăn · ${goalName}</span><b>${r0(k)} <span class="muted small">/ ${t.kcal} kcal</span></b></div>
        <div class="macro"><div class="row between"><span>Protein</span><span class="muted">${r0(p)}/${t.protein}g</span></div>${bar(p / t.protein, 'var(--protein)')}</div>
        <div class="macro"><div class="row between"><span>Carb</span><span class="muted">${r0(c)}/${t.carb}g</span></div>${bar(c / t.carb, 'var(--carb)')}</div>
        <div class="macro"><div class="row between"><span>Fat</span><span class="muted">${r0(f)}/${t.fat}g</span></div>${bar(f / t.fat, 'var(--fat)')}</div>
      </div>
    </div>
  </section>
  <button class="btn food" id="add-food">＋ Thêm món ăn</button>
  ${MEAL_TAGS.map(m => {
    const items = dd.food.map((x, i) => ({ ...x, i })).filter(x => x.meal === m);
    if (!items.length) return '';
    return `<section class="card"><div class="card-head"><h2>Bữa ${m.toLowerCase()}</h2><span class="muted small">${r0(sum(items, 'kcal'))} kcal · ${r0(sum(items, 'p'))}g P</span></div>
      <ul class="log">${items.map(x => `<li><div class="grow"><div class="name">${esc(x.name)}${x.qty && x.qty !== 1 ? ` ×${x.qty}` : ''}</div>
        <div class="muted small">${r0(x.kcal)} kcal · P ${r0(x.p)} · C ${r0(x.c)} · F ${r0(x.f)}</div></div>
        <button class="del" data-del-food="${x.i}" aria-label="Xóa">✕</button></li>`).join('')}</ul></section>`;
  }).join('')}
  ${dd.food.length ? '' : '<section class="card"><div class="empty">Chưa ghi món nào hôm nay.</div></section>'}
  <section class="card"><div class="card-head"><h2>7 ngày qua</h2><span class="muted small">kcal</span></div>${weekChart(vals, t.kcal, '#ff9f43')}</section>`;
  $('#add-food').addEventListener('click', openFoodSheet);
  view.querySelectorAll('[data-del-food]').forEach(b => b.addEventListener('click', () => { dd.food.splice(+b.dataset.delFood, 1); save(); renderFood(); }));
}

function openSheet(html) {
  $('#sheet').innerHTML = `<div class="grabber"></div>${html}`;
  $('#sheet').hidden = false; $('#sheet-backdrop').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeSheet() { $('#sheet').hidden = true; $('#sheet-backdrop').hidden = true; document.body.style.overflow = ''; }
$('#sheet-backdrop').addEventListener('click', closeSheet);

function openFoodSheet() {
  let mode = 'list', sel = null, qty = 1, meal = defaultMeal(), q = '';
  const all = () => [...state.customFoods.map(f => ({ ...f, custom: true })), ...FOODS];
  const draw = () => {
    const list = all().filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
    openSheet(`<h2>Thêm món ăn</h2>
      <div class="seg">${MEAL_TAGS.map(m => `<button data-meal="${m}" class="${m === meal ? 'active' : ''}">${m}</button>`).join('')}</div>
      <div class="seg"><button data-mode="list" class="${mode === 'list' ? 'active' : ''}">Danh sách</button><button data-mode="custom" class="${mode === 'custom' ? 'active' : ''}">Tự nhập</button></div>
      ${mode === 'list' ? `
        <div class="field"><input id="food-q" placeholder="Tìm món…" value="${esc(q)}" autocomplete="off"></div>
        <ul class="food-list">${list.map(f => `<li><button data-food="${esc(f.name)}" class="${sel && sel.name === f.name ? 'sel' : ''}"><span>${f.custom ? '⭐ ' : ''}${esc(f.name)}</span><span class="muted small">${f.kcal} kcal · ${f.p}g P</span></button></li>`).join('') || '<li class="empty">Không thấy — thử "Tự nhập"</li>'}</ul>
        <div class="row between" style="margin-bottom:12px"><span class="muted">Số phần</span>
          <div class="row"><button class="chip" id="q-minus">−</button><b id="qty" style="min-width:36px;text-align:center">${qty}</b><button class="chip" id="q-plus">＋</button></div></div>
        <button class="btn food" id="food-add" ${sel ? '' : 'disabled style="opacity:.5"'}>${sel ? `Thêm · ${r0(sel.kcal * qty)} kcal` : 'Chọn một món'}</button>
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
    $('#sheet').querySelectorAll('[data-meal]').forEach(b => b.addEventListener('click', () => { meal = b.dataset.meal; draw(); }));
    $('#sheet').querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; draw(); }));
    if (mode === 'list') {
      const qi = $('#food-q');
      qi.addEventListener('input', () => { q = qi.value; const pos = qi.selectionStart; draw(); const n = $('#food-q'); n.focus(); n.setSelectionRange(pos, pos); });
      $('#sheet').querySelectorAll('[data-food]').forEach(b => b.addEventListener('click', () => { sel = all().find(f => f.name === b.dataset.food); draw(); }));
      $('#q-minus').addEventListener('click', () => { qty = Math.max(0.5, qty - 0.5); draw(); });
      $('#q-plus').addEventListener('click', () => { qty += 0.5; draw(); });
      $('#food-add').addEventListener('click', () => {
        if (!sel) return;
        day().food.push({ name: sel.name, qty, meal, kcal: sel.kcal * qty, p: sel.p * qty, c: sel.c * qty, f: sel.f * qty, t: Date.now() });
        save(); closeSheet(); renderFood(); showToast(`Đã thêm ${sel.name}`);
      });
    } else {
      $('#custom-add').addEventListener('click', () => {
        const name = $('#c-name').value.trim();
        const n = id => parseFloat($(id).value.replace(',', '.')) || 0;
        const item = { name, kcal: n('#c-kcal'), p: n('#c-p'), c: n('#c-c'), f: n('#c-f') };
        if (!name || !item.kcal) { showToast('Nhập tên món và kcal'); return; }
        if ($('#c-save').checked && !state.customFoods.some(f => f.name === name)) state.customFoods.unshift(item);
        day().food.push({ ...item, qty: 1, meal, t: Date.now() });
        save(); closeSheet(); renderFood(); showToast(`Đã thêm ${name}`);
      });
    }
  };
  draw();
}

/* ---------------- water ---------------- */
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
  const vals = last7().map(d => sum(state.days[keyOf(d)]?.water || [], 'ml'));
  const nextSlot = waterSlots().find(m => m > nowMin());
  view.innerHTML = `<section class="card" style="display:grid;justify-items:center;gap:12px">
    ${ring(total / t.water, 'var(--water)', 190, 16, `<b style="font-size:34px">${fmtL(total)}</b><span class="muted">/ ${fmtL(t.water)}</span>`)}
    <div class="small ${behind > 0 ? '' : 'muted'}" style="text-align:center">${total >= t.water ? '🎉 Đã đạt mục tiêu hôm nay' : behind > 0 ? `⚠️ Đang chậm ${fmtL(behind)} so với tiến độ (nên đạt ${fmtL(exp)} lúc này)` : '✅ Đúng tiến độ'}${WORKOUTS[new Date().getDay()] ? '<br><span class="muted">Hôm nay có tập: +500ml vào mục tiêu</span>' : ''}</div>
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

/* ---------------- settings ---------------- */
function openSettings() {
  const s = state.settings;
  const t = targets();
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  openSheet(`<h2>Cài đặt</h2>
    <div class="card" style="background:var(--card-2);margin-bottom:14px">
      <h2 style="font-size:16px">🔔 Nhắc nhở trên iPhone</h2>
      <p class="small muted" style="margin-top:0">Web app trên iOS không tự chạy nền, nên cách chắc chắn nhất là thêm lịch nhắc vào app <b>Lịch</b> của iPhone (có báo thức). Mở link bằng Safari → <b>Thêm tất cả</b>.</p>
      <a class="link-row" href="ics/nhac-uong-nuoc.ics" target="_blank" rel="noopener"><span>💧 Nhắc uống nước<small>Mỗi 2 giờ, 7:00–21:00, hằng ngày</small></span><span>›</span></a>
      <a class="link-row" href="ics/nhac-tap-va-an.ics" target="_blank" rel="noopener"><span>🏋️ Nhắc chuẩn bị tập & bữa ăn<small>Trước buổi tập 45′, protein sau tập, giờ ăn</small></span><span>›</span></a>
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
    <div style="height:10px"></div>
    <button class="btn danger" id="s-reset">Xóa toàn bộ dữ liệu</button>
    <p class="small muted" style="text-align:center">Dữ liệu lưu trên máy này. Lịch tập lấy từ Google Calendar (24/11/2026).</p>`);
  $('#s-save').addEventListener('click', () => {
    Object.assign(state.settings, {
      weight: parseFloat($('#s-weight').value.replace(',', '.')) || 65,
      goal: $('#s-goal').value,
      kcal: $('#s-kcal').value.trim(), protein: $('#s-protein').value.trim(), waterGoal: $('#s-water').value.trim(),
      waterStart: +$('#s-ws').value, waterEnd: +$('#s-we').value, waterEvery: +$('#s-wv').value,
    });
    save(); closeSheet(); render(); showToast('Đã lưu cài đặt');
  });
  $('#s-reset').addEventListener('click', () => {
    if (!confirm('Xóa toàn bộ lịch sử ăn uống, nước và buổi tập?')) return;
    localStorage.removeItem(KEY); state = load(); closeSheet(); render();
  });
  $('#enable-noti')?.addEventListener('click', async () => {
    const r = await Notification.requestPermission();
    showToast(r === 'granted' ? '✅ Đã bật thông báo' : 'Thông báo chưa được cho phép');
    closeSheet(); render();
  });
}
$('#open-settings').addEventListener('click', openSettings);

/* ---------------- boot ---------------- */
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
let lastDay = todayKey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (todayKey() !== lastDay) { lastDay = todayKey(); }
  checkReminders(); render();
});
