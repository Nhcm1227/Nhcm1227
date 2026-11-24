// Tạo file .ics nhắc nhở (có báo thức) để thêm vào app Lịch trên iPhone.
// Chạy: node gym-app/tools/gen-ics.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WORKOUTS, MEALS, BEDTIME, WAKE } from '../data.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'ics');
const TZ = 'Asia/Ho_Chi_Minh';
const RRDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const START_MONDAY = new Date(Date.UTC(2026, 10, 23)); // Thứ 2, 23/11/2026
const pad = n => String(n).padStart(2, '0');
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const STAMP = '20261124T000000Z';

const VTIMEZONE = [
  'BEGIN:VTIMEZONE', `TZID:${TZ}`,
  'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0700', 'TZOFFSETTO:+0700', 'TZNAME:+07', 'END:STANDARD',
  'END:VTIMEZONE',
];
const escText = s => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function dateFor(dow) {
  const d = new Date(START_MONDAY);
  d.setUTCDate(d.getUTCDate() + ((dow + 6) % 7));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
function event({ uid, date, min, dur = 5, title, desc, rrule }) {
  const s = `${date}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`;
  const e = min + dur;
  const en = `${date}T${pad(Math.floor(e / 60))}${pad(e % 60)}00`;
  return [
    'BEGIN:VEVENT', `UID:${uid}@gymtrack`, `DTSTAMP:${STAMP}`,
    `DTSTART;TZID=${TZ}:${s}`, `DTEND;TZID=${TZ}:${en}`, `RRULE:${rrule}`,
    `SUMMARY:${escText(title)}`, `DESCRIPTION:${escText(desc)}`, 'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escText(title)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT',
  ];
}
function calendar(name, events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GymTrack//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${name}`, `X-WR-TIMEZONE:${TZ}`, ...VTIMEZONE, ...events.flat(), 'END:VCALENDAR'];
  return lines.map(fold).join('\r\n') + '\r\n';
}
// RFC 5545: gập dòng dài hơn 75 byte, không cắt giữa ký tự UTF-8
function fold(line) {
  const out = [];
  let cur = '', bytes = 0, limit = 75;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0; limit = 74; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

// 1) Nước: mỗi 2 giờ 7:00–21:00 (8 lần × ~375ml ≈ 3L)
const water = [];
for (let h = 7; h <= 21; h += 2) {
  water.push(event({
    uid: `water-${h}`, date: dateFor(2), min: h * 60, title: '💧 Uống nước',
    desc: `Uống 1 ly (~350ml). Mục tiêu ~3L/ngày, ngày tập +500ml.`, rrule: 'FREQ=DAILY',
  }));
}
writeFileSync(join(OUT, 'nhac-uong-nuoc.ics'), calendar('GymTrack · Uống nước', water));

// 2) Tập & ăn: theo thứ trong tuần
const ev = [];
for (const [dowStr, w] of Object.entries(WORKOUTS)) {
  const dow = +dowStr;
  const date = dateFor(dow);
  const rrule = `FREQ=WEEKLY;BYDAY=${RRDAY[dow]}`;
  const list = w.exercises.map(e => `• ${e.name}: ${e.sets}×${e.reps}`).join('\n');
  ev.push(event({
    uid: `pre-${dow}`, date, min: toMin(w.start) - 45, rrule,
    title: `🎒 45′ nữa: ${w.title}`,
    desc: `${w.subtitle} lúc ${w.start}${w.location ? ' tại ' + w.location : ''}.\nSoạn đồ, uống 500ml nước.\n\n${list}`,
  }));
  if (w.type === 'gym') {
    ev.push(event({
      uid: `post-${dow}`, date, min: toMin(w.end) + 15, rrule,
      title: '🥩 Nạp protein sau tập', desc: '25–40g protein (whey, ức gà, trứng…) + 500ml nước. Ghi lại vào GymTrack.',
    }));
  }
}
for (const [dowStr, meals] of Object.entries(MEALS)) {
  const dow = +dowStr;
  meals.forEach((m, i) => ev.push(event({
    uid: `meal-${dow}-${i}`, date: dateFor(dow), min: toMin(m.time), rrule: `FREQ=WEEKLY;BYDAY=${RRDAY[dow]}`,
    title: `🍽️ ${m.label}`, desc: 'Ăn đủ protein, ghi món vào GymTrack.',
  })));
}
for (const [dowStr, wake] of Object.entries(WAKE)) {
  const dow = +dowStr;
  ev.push(event({
    uid: `checkin-${dow}`, date: dateFor(dow), min: toMin(wake) + 10, rrule: `FREQ=WEEKLY;BYDAY=${RRDAY[dow]}`,
    title: '🌅 Check-in buổi sáng', desc: 'Mở GymTrack: ghi giờ ngủ, cảm giác cơ thể, cân nặng → xem điểm Hồi phục hôm nay.',
  }));
}
ev.push(event({
  uid: 'bed', date: dateFor(1), min: toMin(BEDTIME) - 30, rrule: 'FREQ=DAILY',
  title: '😴 30′ nữa đi ngủ', desc: 'Tắt màn hình, ngủ đủ 7–8 tiếng để cơ phục hồi.',
}));
writeFileSync(join(OUT, 'nhac-tap-va-an.ics'), calendar('GymTrack · Tập & Ăn', ev));
console.log('OK:', water.length, 'water events,', ev.length, 'workout/meal events');
