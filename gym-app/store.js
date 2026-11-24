// Lưu trữ + tiện ích dùng chung
export const KEY = 'gymtrack-v1';
export const DEFAULT_SETTINGS = {
  weight: 65, goal: 'cut', kcal: '', protein: '', waterGoal: '',
  waterStart: 7, waterEnd: 22, waterEvery: 90, preGym: 45,
};

function migrate(s) {
  for (const d of Object.values(s.days || {})) {
    d.water ||= []; d.food ||= []; d.sets ||= {};
    for (const i of Object.keys(d.sets)) {
      d.sets[i] = (d.sets[i] || []).map(x => (typeof x === 'object' && x ? x : { done: !!x }));
    }
    for (const f of d.food) {
      if (!f.base) { const q = Number(f.qty) || 1; f.base = { kcal: f.kcal / q, p: f.p / q, c: f.c / q, f: f.f / q }; }
    }
  }
  return s;
}
function fresh() { return { settings: { ...DEFAULT_SETTINGS }, days: {}, weights: {}, customFoods: [], shown: {} }; }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.days) return migrate({ ...fresh(), ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings } });
  } catch (e) { /* ignore */ }
  return fresh();
}
export let state = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
export function replaceState(s) { state = migrate({ ...fresh(), ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) } }); save(); }
export function resetState() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } state = fresh(); }

export const pad = n => String(n).padStart(2, '0');
export const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => keyOf(new Date());
export const dateOf = k => new Date(k + 'T00:00:00');
export const dowOf = k => dateOf(k).getDay();
export const addDays = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
export function day(k = todayKey()) {
  if (!state.days[k]) state.days[k] = { water: [], food: [], sets: {}, done: false };
  return state.days[k];
}
export const peek = k => state.days[k];
export const sum = (arr, k) => (arr || []).reduce((a, x) => a + (Number(x[k]) || 0), 0);
export const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const fromMin = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const fmtL = ml => (ml >= 1000 ? (ml / 1000).toFixed(2).replace(/\.?0+$/, '') + ' L' : Math.round(ml) + ' ml');
export const fmtH = h => `${Math.floor(h)}h${pad(Math.round((h % 1) * 60))}`;
export const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
