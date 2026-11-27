/* Study With Me — tự quay camera để nhìn mình mà học.
 * Thuần JavaScript, không cần build. Mọi dữ liệu lưu ở localStorage của trình duyệt.
 */
(() => {
  'use strict';

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (sec) => {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const uid = () => Math.random().toString(36).slice(2, 9);

  let toastTimer;
  function toast(msg, ms = 2600) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), ms);
  }

  // ---------- storage ----------
  const KEY = 'studywithme.v1';
  const DEFAULTS = {
    settings: {
      focus: 25, short: 5, long: 15, longEvery: 4, goal: 120, chime: 'bell',
      autoBreak: true, autoFocus: false, notify: false,
      away: false, awaySec: 15, awayPause: true,
      ovTimer: true, ovClock: true, ovTask: true, ovQuote: true, ovPosture: true,
      mirror: true, filter: 'none', overlay: true, theme: null,
      tlInterval: 5, tlAuto: true, soundsOnlyFocus: false,
    },
    tasks: [],
    currentTask: null,
    history: {}, // { 'YYYY-MM-DD': { sec, sessions, away } }
    cycle: 0,
  };
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { ...DEFAULTS, ...raw, settings: { ...DEFAULTS.settings, ...(raw.settings || {}) } };
    } catch { return structuredClone(DEFAULTS); }
  }
  const db = load();
  let saveTimer;
  function save(now = false) {
    clearTimeout(saveTimer);
    const run = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
    now ? run() : (saveTimer = setTimeout(run, 400));
  }
  const S = db.settings;
  const today = () => (db.history[dayKey()] ||= { sec: 0, sessions: 0, away: 0 });

  // ---------- theme ----------
  function applyTheme() {
    const t = S.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = t;
  }
  applyTheme();
  $('#btnTheme').onclick = () => {
    S.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(); save();
  };

  // ---------- audio (chime + ambient) ----------
  let actx;
  const ac = () => (actx ||= new (window.AudioContext || window.webkitAudioContext)());

  function chime(kind = S.chime) {
    if (kind === 'off') return;
    const a = ac(); const t = a.currentTime;
    const notes = kind === 'soft' ? [660, 880] : [880, 1320, 1760];
    notes.forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = kind === 'soft' ? 'sine' : 'triangle';
      o.frequency.value = f;
      const st = t + i * 0.18;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.25, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 1.4);
      o.connect(g).connect(a.destination);
      o.start(st); o.stop(st + 1.5);
    });
  }

  function noiseBuffer(type, seconds = 6) {
    const a = ac(); const len = a.sampleRate * seconds;
    const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w * 0.5;
      else if (type === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else if (type === 'brown') {
        last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5;
      } else if (type === 'crackle') {
        d[i] = 0;
      }
    }
    if (type === 'crackle') {
      // tiếng lách tách của lửa: các xung ngắn ngẫu nhiên
      for (let k = 0; k < seconds * 14; k++) {
        const pos = Math.floor(Math.random() * (len - 2000));
        const amp = 0.2 + Math.random() * 0.6, dur = 200 + Math.random() * 900;
        for (let j = 0; j < dur; j++) d[pos + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / (dur / 5));
      }
    }
    return buf;
  }

  const SOUNDS = [
    { id: 'rain', icon: '🌧️', name: 'Mưa', build: (a, out) => {
      const src = loopSrc(a, 'pink'); const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      src.connect(hp).connect(lp).connect(out); return [src];
    } },
    { id: 'waves', icon: '🌊', name: 'Sóng biển', build: (a, out) => {
      const src = loopSrc(a, 'brown'); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = a.createGain(); g.gain.value = 0.55;
      const lfo = a.createOscillator(); lfo.frequency.value = 0.09; const lg = a.createGain(); lg.gain.value = 0.45;
      lfo.connect(lg).connect(g.gain); src.connect(lp).connect(g).connect(out); lfo.start(); return [src, lfo];
    } },
    { id: 'fire', icon: '🔥', name: 'Lửa trại', build: (a, out) => {
      const base = loopSrc(a, 'brown'); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
      const g = a.createGain(); g.gain.value = 0.6; base.connect(lp).connect(g).connect(out);
      const cr = loopSrc(a, 'crackle'); const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
      cr.connect(hp).connect(out); return [base, cr];
    } },
    { id: 'brown', icon: '🟤', name: 'Ồn nâu', build: (a, out) => { const s = loopSrc(a, 'brown'); s.connect(out); return [s]; } },
    { id: 'white', icon: '⚪', name: 'Ồn trắng', build: (a, out) => {
      const s = loopSrc(a, 'white'); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
      s.connect(lp).connect(out); return [s];
    } },
  ];
  const bufCache = {};
  function loopSrc(a, type) {
    const s = a.createBufferSource(); s.buffer = (bufCache[type] ||= noiseBuffer(type)); s.loop = true; s.start(); return s;
  }
  const soundState = {}; // id -> {on, vol, gain, nodes}
  function renderSounds() {
    const wrap = $('#soundList'); wrap.innerHTML = '';
    for (const snd of SOUNDS) {
      const st = (soundState[snd.id] ||= { on: false, vol: 0.5 });
      const row = document.createElement('div'); row.className = 'sound' + (st.on ? ' on' : '');
      row.innerHTML = `<span class="s-name">${snd.name}</span>
        <input type="range" min="0" max="1" step="0.01" value="${st.vol}" aria-label="Âm lượng ${snd.name}">
        <input type="checkbox" class="switch" ${st.on ? 'checked' : ''} aria-label="Bật ${snd.name}">`;
      row.querySelector('.switch').onchange = () => { st.on = !st.on; syncSound(snd); renderSounds(); };
      row.querySelector('input').oninput = (e) => { st.vol = +e.target.value; if (st.gain) st.gain.gain.value = st.vol; };
      wrap.appendChild(row);
    }
  }
  function syncSound(snd) {
    const st = soundState[snd.id];
    const shouldPlay = st.on && (!S.soundsOnlyFocus || (timer.running && timer.mode !== 'short' && timer.mode !== 'long'));
    if (shouldPlay && !st.gain) {
      const a = ac(); a.resume();
      st.gain = a.createGain(); st.gain.gain.value = 0; st.gain.connect(a.destination);
      st.gain.gain.linearRampToValueAtTime(st.vol, a.currentTime + 1);
      st.nodes = snd.build(a, st.gain);
    } else if (!shouldPlay && st.gain) {
      const g = st.gain, nodes = st.nodes, a = ac();
      g.gain.cancelScheduledValues(a.currentTime);
      g.gain.setValueAtTime(g.gain.value, a.currentTime);
      g.gain.linearRampToValueAtTime(0, a.currentTime + 0.6);
      setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch {} }); g.disconnect(); }, 700);
      st.gain = null; st.nodes = null;
    }
  }
  const syncAllSounds = () => SOUNDS.forEach(syncSound);
  $('#soundsOnlyFocus').checked = S.soundsOnlyFocus;
  $('#soundsOnlyFocus').onchange = (e) => { S.soundsOnlyFocus = e.target.checked; save(); syncAllSounds(); };
  renderSounds();

  // ---------- timer ----------
  const MODE_LABEL = { focus: 'Tập trung', short: 'Nghỉ ngắn', long: 'Nghỉ dài', free: 'Bấm giờ tự do' };
  const timer = { mode: 'focus', running: false, total: S.focus * 60, remaining: S.focus * 60, elapsed: 0, endAt: 0, lastTick: 0, pausedByAway: false };

  function durationOf(mode) { return mode === 'free' ? 0 : S[mode] * 60; }
  function setMode(mode, autostart = false) {
    timer.mode = mode; timer.running = false; timer.pausedByAway = false;
    timer.total = durationOf(mode); timer.remaining = timer.total; timer.elapsed = 0;
    document.body.className = document.body.className.replace(/\bmode-\w+/g, '').trim() + ` mode-${mode}`;
    $$('#modeTabs button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    if (autostart) start(); else updateTimerUI();
    syncAllSounds();
  }
  function start() {
    ac().resume();
    timer.running = true; timer.pausedByAway = false;
    timer.lastTick = performance.now();
    timer.endAt = Date.now() + timer.remaining * 1000;
    if (timer.mode === 'focus' && S.tlAuto && !tl.recording && cam.stream) tlStart();
    updateTimerUI(); syncAllSounds();
  }
  function pause() {
    timer.running = false; updateTimerUI(); syncAllSounds(); save();
  }
  function toggle() { timer.running ? pause() : start(); }
  function reset() { setMode(timer.mode); }

  function tickTimer() {
    if (!timer.running) return;
    const now = performance.now();
    const dt = Math.min((now - timer.lastTick) / 1000, 5);
    timer.lastTick = now;
    if (timer.mode === 'focus' || timer.mode === 'free') {
      today().sec += dt;
      postureTick(dt);
    }
    if (timer.mode === 'free') timer.elapsed += dt;
    else {
      timer.remaining = Math.max(0, (timer.endAt - Date.now()) / 1000);
      if (timer.remaining <= 0) return complete();
    }
    updateTimerUI();
  }

  function complete() {
    const finished = timer.mode;
    timer.running = false;
    chime();
    if (finished === 'focus') {
      const d = today(); d.sessions++;
      db.cycle++;
      const t = db.tasks.find((x) => x.id === db.currentTask);
      if (t) { t.done_p = (t.done_p || 0) + 1; renderTasks(); }
      save(true);
      showDone();
      notify('Xong phiên tập trung', `Nghỉ ngơi ${db.cycle % S.longEvery === 0 ? S.long : S.short} phút nhé.`);
      if (tl.recording) tlCapture(true);
      const next = db.cycle % S.longEvery === 0 ? 'long' : 'short';
      setMode(next, S.autoBreak);
    } else {
      notify('Hết giờ nghỉ', 'Quay lại học thôi.');
      toast('Hết giờ nghỉ. Quay lại học thôi.');
      setMode('focus', S.autoFocus);
    }
    renderStats();
  }

  function updateTimerUI() {
    const shown = timer.mode === 'free' ? timer.elapsed : timer.remaining;
    $('#timerDisplay').textContent = fmt(shown);
    const pct = timer.mode === 'free' ? ((timer.elapsed % 3600) / 3600) * 100 : (1 - timer.remaining / timer.total) * 100;
    $('#progressBar').style.width = pct + '%';
    const sb = $('#btnStart');
    sb.querySelector('use').setAttribute('href', timer.running ? '#i-pause' : '#i-play');
    sb.setAttribute('aria-label', timer.running ? 'Tạm dừng' : 'Bắt đầu');
    const n = (db.cycle % S.longEvery) + 1;
    let sub = timer.mode === 'focus' ? `Phiên ${today().sessions + 1} · ${n} trên ${S.longEvery} trước nghỉ dài` : MODE_LABEL[timer.mode];
    if (timer.pausedByAway) sub = 'Tạm dừng vì bạn rời bàn';
    $('#timerSub').textContent = sub;
    document.title = timer.running ? `${fmt(shown)} · ${MODE_LABEL[timer.mode]}` : 'Study With Me';
    $('#stage').classList.toggle('running', timer.running);
    $('#todaySummary').textContent = `Hôm nay ${Math.floor(today().sec / 60)} phút · ${today().sessions} phiên`;
  }

  $$('#modeTabs button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  $('#btnStart').onclick = toggle;
  $('#btnReset').onclick = reset;
  // Bỏ qua: không tính là hoàn thành phiên
  $('#btnSkip').onclick = () => {
    if (timer.mode === 'free') return reset();
    setMode(timer.mode === 'focus' ? ((db.cycle + 1) % S.longEvery === 0 ? 'long' : 'short') : 'focus');
  };
  $$('.chip[data-preset]').forEach((b) => (b.onclick = () => {
    const [f, s, l] = b.dataset.preset.split(',').map(Number);
    Object.assign(S, { focus: f, short: s, long: l }); save(); fillSettings(); markPreset();
    if (!timer.running) setMode(timer.mode === 'free' ? 'focus' : timer.mode);
    toast(`${f} phút học, ${s} phút nghỉ`);
  }));
  $('#btnCustom').onclick = () => { showPanel('settings'); $('#setFocus').focus(); };
  function markPreset() {
    $$('.chip[data-preset]').forEach((b) => b.classList.toggle('active', b.dataset.preset === `${S.focus},${S.short},${S.long}`));
  }

  async function notify(title, body) {
    if (!S.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📚</text></svg>' }); } catch {}
  }

  // nhắc ngồi thẳng / quy tắc 20-20-20 cho mắt
  let postureAcc = 0, postureMsgUntil = 0;
  const POSTURE_MSGS = ['Ngồi thẳng lưng', 'Uống một ngụm nước', 'Nhìn xa 6 mét trong 20 giây', 'Thả lỏng vai, hít thở sâu'];
  let postureIdx = 0, postureText = '';
  function postureTick(dt) {
    if (!S.ovPosture) return;
    postureAcc += dt;
    if (postureAcc >= 20 * 60) {
      postureAcc = 0; postureText = POSTURE_MSGS[postureIdx++ % POSTURE_MSGS.length];
      postureMsgUntil = Date.now() + 20000; toast(postureText, 6000);
    }
  }

  // ---------- tasks ----------
  function renderTasks() {
    const ul = $('#taskList'); ul.innerHTML = '';
    if (!db.tasks.length) { ul.innerHTML = '<li class="empty">Chưa có việc nào. Bắt đầu với một việc nhỏ và cụ thể.</li>'; }
    for (const t of db.tasks) {
      const li = document.createElement('li');
      li.className = (t.done ? 'done ' : '') + (db.currentTask === t.id ? 'current' : '');
      li.innerHTML = `<input type="checkbox" ${t.done ? 'checked' : ''} aria-label="Hoàn thành">
        <span class="t-name"></span><span class="t-count">${t.done_p || 0}/${t.est || 1}</span>
        <button class="t-del" title="Xoá" aria-label="Xoá"><svg><use href="#i-x"/></svg></button>`;
      li.querySelector('.t-name').textContent = t.name;
      li.querySelector('input').onclick = (e) => {
        e.stopPropagation(); t.done = e.target.checked;
        if (t.done) { chime('soft'); if (db.currentTask === t.id) db.currentTask = db.tasks.find((x) => !x.done)?.id || null; }
        save(); renderTasks();
      };
      li.querySelector('.t-del').onclick = (e) => {
        e.stopPropagation(); db.tasks = db.tasks.filter((x) => x !== t);
        if (db.currentTask === t.id) db.currentTask = null; save(); renderTasks();
      };
      li.onclick = () => { db.currentTask = db.currentTask === t.id ? null : t.id; save(); renderTasks(); };
      ul.appendChild(li);
    }
  }
  $('#taskForm').onsubmit = (e) => {
    e.preventDefault();
    const name = $('#taskInput').value.trim(); if (!name) return;
    const t = { id: uid(), name, est: +$('#taskEst').value || 1, done: false, done_p: 0 };
    db.tasks.push(t); if (!db.currentTask) db.currentTask = t.id;
    $('#taskInput').value = ''; $('#taskEst').value = 1; save(); renderTasks();
  };
  $('#btnClearDone').onclick = () => { db.tasks = db.tasks.filter((t) => !t.done); save(); renderTasks(); };
  const currentTaskName = () => db.tasks.find((t) => t.id === db.currentTask)?.name || '';

  // ---------- camera ----------
  const cam = { stream: null, video: $('#cam'), deviceId: localStorage.getItem(KEY + '.cam') || '' };
  let camBusy = null;
  function camStart() { return (camBusy ||= camOpen().finally(() => (camBusy = null))); }
  async function camOpen() {
    $('#camErr').textContent = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      $('#camErr').textContent = 'Trình duyệt không hỗ trợ camera. Hãy mở trang qua https:// hoặc localhost.';
      return;
    }
    try {
      camStop(false);
      cam.stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: cam.deviceId ? { exact: cam.deviceId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      cam.video.srcObject = cam.stream; await cam.video.play();
      $('#stageEmpty').hidden = true;
      $('#btnCamToggle').classList.add('on');
      await listCams();
      if (S.away) awayStart();
    } catch (err) {
      if (cam.deviceId && err.name === 'OverconstrainedError') { cam.deviceId = ''; return camOpen(); }
      $('#camErr').textContent = err.name === 'NotAllowedError'
        ? 'Bạn chưa cho phép dùng camera. Bấm biểu tượng 🔒 trên thanh địa chỉ để cấp quyền rồi thử lại.'
        : 'Không mở được camera: ' + err.message;
    }
  }
  function camStop(showEmpty = true) {
    cam.stream?.getTracks().forEach((t) => t.stop());
    cam.stream = null; cam.video.srcObject = null;
    if (showEmpty) { $('#stageEmpty').hidden = false; $('#btnCamToggle').classList.remove('on'); }
  }
  async function listCams() {
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    const sel = $('#camSelect'); sel.innerHTML = '';
    devs.forEach((d, i) => sel.add(new Option(d.label || `Camera ${i + 1}`, d.deviceId)));
    const cur = cam.stream?.getVideoTracks()[0]?.getSettings().deviceId;
    if (cur) sel.value = cur;
    sel.hidden = devs.length < 2;
  }
  $('#btnCamStart').onclick = camStart;
  $('#btnCamToggle').onclick = () => (cam.stream ? camStop() : camStart());
  $('#camSelect').onchange = (e) => { cam.deviceId = e.target.value; localStorage.setItem(KEY + '.cam', cam.deviceId); camStart(); };
  $('#camSelect').hidden = true;

  $('#btnMirror').onclick = () => { S.mirror = !S.mirror; save(); syncToolbar(); };
  $('#filterSelect').onchange = (e) => { S.filter = e.target.value; save(); };
  $('#btnOverlay').onclick = () => { S.overlay = !S.overlay; save(); syncToolbar(); };
  function syncToolbar() {
    $('#btnMirror').classList.toggle('on', S.mirror);
    $('#btnOverlay').classList.toggle('on', S.overlay);
    $('#filterSelect').value = S.filter;
  }

  // ---------- render (canvas compositor) ----------
  const canvas = $('#stageCanvas'); const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const FILTERS = {
    none: 'none', warm: 'sepia(.25) saturate(1.2) brightness(1.03)', cool: 'saturate(.9) hue-rotate(-12deg) brightness(1.02)',
    bw: 'grayscale(1) contrast(1.1)', bright: 'brightness(1.25) contrast(1.05)', soft: 'blur(.6px) brightness(1.08) saturate(1.1)',
  };
  const QUOTES = [
    'Không cần hoàn hảo, chỉ cần bắt đầu.', 'Mỗi phiên nhỏ là một bước lớn.', 'Kỷ luật là cầu nối giữa mục tiêu và thành tựu.',
    'Hôm nay cố gắng, ngày mai nhẹ nhàng.', 'Tập trung vào quá trình, kết quả sẽ tới.', 'Bạn của tương lai sẽ cảm ơn bạn hôm nay.',
    'Đừng đếm thời gian, hãy làm cho thời gian đáng giá.', 'Chậm mà chắc vẫn hơn đứng yên.', 'Học thêm một chút nữa thôi.',
    'Thành công là tổng của những nỗ lực nhỏ lặp lại mỗi ngày.',
  ];
  let quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  setInterval(() => (quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]), 5 * 60 * 1000);

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  function draw() {
    const v = cam.video;
    ctx.save();
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
    if (cam.stream && v.videoWidth) {
      const scale = Math.max(W / v.videoWidth, H / v.videoHeight);
      const dw = v.videoWidth * scale, dh = v.videoHeight * scale;
      ctx.filter = FILTERS[S.filter] || 'none';
      if (S.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
    ctx.restore();

    if (away.isAway) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H); }
    if (!S.overlay) return;

    const F = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, "Segoe UI", Roboto, sans-serif';
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#0a84ff';
    ctx.textBaseline = 'alphabetic';

    // lớp tối mờ ở trên và dưới để chữ luôn dễ đọc
    let g = ctx.createLinearGradient(0, H - 300, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = g; ctx.fillRect(0, H - 300, W, 300);
    g = ctx.createLinearGradient(0, 0, 0, 160);
    g.addColorStop(0, 'rgba(0,0,0,.4)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 160);

    // trên trái: giờ hiện tại
    if (S.ovClock) {
      const d = new Date();
      ctx.fillStyle = '#fff'; ctx.font = `500 26px ${F}`;
      const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      ctx.fillText(t, 48, 66);
      const tw = ctx.measureText(t).width;
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = `400 22px ${F}`;
      ctx.fillText(d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' }), 48 + tw + 14, 66);
    }

    // trên phải: câu động lực / lời nhắc
    const reminding = Date.now() < postureMsgUntil;
    const msg = reminding ? postureText : S.ovQuote ? quote : '';
    if (msg) {
      ctx.font = `${reminding ? 500 : 400} 22px ${F}`;
      ctx.fillStyle = reminding ? '#fff' : 'rgba(255,255,255,.75)'; ctx.textAlign = 'right';
      ctx.fillText(msg, W - 48, tl.recording ? 108 : 66);
      ctx.textAlign = 'left';
    }

    // dưới trái: đồng hồ đếm ngược
    if (S.ovTimer) {
      const shown = timer.mode === 'free' ? timer.elapsed : timer.remaining;
      const task = S.ovTask ? currentTaskName() : '';
      const x = 48, base = H - (task ? 86 : 52);
      ctx.fillStyle = timer.running ? accent : 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.arc(x + 6, base - 128, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `500 20px ${F}`;
      ctx.fillText(MODE_LABEL[timer.mode] + (timer.running ? '' : ' · tạm dừng'), x + 22, base - 121);
      ctx.fillStyle = '#fff'; ctx.font = `200 120px ${F}`;
      ctx.fillText(fmt(shown), x - 6, base);
      if (timer.mode !== 'free') {
        const bw = 360, pct = 1 - timer.remaining / timer.total;
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, base + 20, bw, 3);
        ctx.fillStyle = '#fff'; ctx.fillRect(x, base + 20, bw * pct, 3);
      }
      if (task) {
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `400 22px ${F}`;
        let txt = task; while (ctx.measureText(txt).width > 520 && txt.length > 4) txt = txt.slice(0, -2) + '…';
        if (txt !== task && !txt.endsWith('…')) txt += '…';
        ctx.fillText(txt, x, base + 58);
      }
    }
  }

  // Bộ đếm nhịp chạy trong Web Worker để không bị trình duyệt làm chậm khi chuyển tab
  // (giúp cửa sổ nổi và timelapse vẫn chạy khi bạn mở app khác).
  const worker = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 66)'], { type: 'text/javascript' })));
  let lastUi = 0;
  worker.onmessage = () => {
    tickTimer();
    draw();
    tlTick();
    awayTick();
    const now = Date.now();
    if (now - lastUi > 5000) { lastUi = now; save(); }
  };

  // ---------- picture-in-picture ----------
  $('#btnPip').onclick = async () => {
    const pv = $('#pipVideo');
    try {
      if (document.pictureInPictureElement) return document.exitPictureInPicture();
      if (!pv.srcObject) pv.srcObject = canvas.captureStream(15);
      await pv.play();
      await pv.requestPictureInPicture();
      toast('Cửa sổ nổi đã bật. Bạn vẫn thấy mình khi mở app khác.');
    } catch (e) { toast('Trình duyệt chưa hỗ trợ cửa sổ nổi (thử Chrome/Edge).'); }
  };

  // ---------- snapshot ----------
  function snapshot(download = true) {
    const url = canvas.toDataURL('image/jpeg', 0.9);
    if (download) {
      const a = document.createElement('a'); a.href = url; a.download = `study-${dayKey()}-${Date.now()}.jpg`; a.click();
      toast('Đã lưu ảnh');
    }
    return url;
  }
  $('#btnSnap').onclick = () => snapshot();

  function showDone() {
    const min = S.focus;
    $('#doneTitle').textContent = 'Xong một phiên.';
    $('#doneText').textContent = `Bạn vừa tập trung ${min} phút. Hôm nay tổng cộng ${Math.floor(today().sec / 60)} phút. Đây là bạn lúc này — đứng dậy vươn vai nhé!`;
    const img = $('#doneSnap');
    if (cam.stream) { img.src = snapshot(false); img.style.display = 'block'; } else img.style.display = 'none';
    if (!$('#doneDlg').open) $('#doneDlg').showModal();
  }

  // ---------- timelapse ----------
  const tl = { recording: false, frames: [], last: 0 };
  const tlCanvas = document.createElement('canvas'); tlCanvas.width = 960; tlCanvas.height = 540;
  const tlCtx = tlCanvas.getContext('2d');
  function tlStart() {
    if (!cam.stream) { toast('Bật camera trước khi ghi timelapse'); return; }
    tl.recording = true; tl.last = 0; updateTlUI(); toast('Đang ghi timelapse');
  }
  function tlStop() { tl.recording = false; updateTlUI(); }
  function tlCapture(force = false) {
    const now = Date.now();
    if (!force && now - tl.last < S.tlInterval * 1000) return;
    tl.last = now;
    tlCtx.drawImage(canvas, 0, 0, tlCanvas.width, tlCanvas.height);
    tlCanvas.toBlob((b) => { if (b) { tl.frames.push(b); updateTlUI(); } }, 'image/jpeg', 0.8);
  }
  function tlTick() {
    if (tl.recording && cam.stream && timer.running) tlCapture();
  }
  function updateTlUI() {
    const n = tl.frames.length;
    $('#btnTl').textContent = tl.recording ? 'Dừng ghi' : 'Bắt đầu ghi';
    $('#btnTlExport').disabled = !n || tl.recording; $('#btnTlClear').disabled = !n;
    const secs = (n / 30).toFixed(1);
    $('#tlStatus').textContent = n ? `${n} khung hình · video ~${secs}s (30 khung/giây)${tl.recording && !timer.running ? ' · chỉ ghi khi đồng hồ chạy' : ''}` : 'Chưa có khung hình nào.';
    $('#recDot').hidden = !tl.recording;
    $('#recInfo').textContent = n ? `· ${n}` : '';
  }
  $('#btnTl').onclick = () => (tl.recording ? tlStop() : tlStart());
  $('#btnTlClear').onclick = () => { if (confirm('Xoá toàn bộ khung hình timelapse?')) { tl.frames = []; updateTlUI(); } };
  $('#tlInterval').value = S.tlInterval;
  $('#tlInterval').onchange = (e) => { S.tlInterval = +e.target.value; save(); };
  $('#tlAuto').checked = S.tlAuto;
  $('#tlAuto').onchange = (e) => { S.tlAuto = e.target.checked; save(); };

  $('#btnTlExport').onclick = async () => {
    if (!window.MediaRecorder) return toast('Trình duyệt không hỗ trợ xuất video.');
    const btn = $('#btnTlExport'); btn.disabled = true;
    const out = document.createElement('canvas'); out.width = 960; out.height = 540;
    const octx = out.getContext('2d');
    const stream = out.captureStream(30);
    const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start();
    for (let i = 0; i < tl.frames.length; i++) {
      const bmp = await createImageBitmap(tl.frames[i]);
      octx.drawImage(bmp, 0, 0, out.width, out.height); bmp.close?.();
      $('#tlStatus').textContent = `Đang xuất video… ${Math.round(((i + 1) / tl.frames.length) * 100)}% (giữ tab này mở)`;
      await new Promise((r) => setTimeout(r, 1000 / 30));
    }
    await new Promise((r) => setTimeout(r, 300));
    rec.stop(); await done;
    const ext = (rec.mimeType || mimeType).includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `study-timelapse-${dayKey()}.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    updateTlUI(); toast('Đã xuất video timelapse');
    // vài ảnh xem trước
    const g = $('#gallery'); g.innerHTML = '';
    const step = Math.max(1, Math.floor(tl.frames.length / 6));
    for (let i = 0; i < tl.frames.length && g.children.length < 6; i += step) {
      const img = new Image(); img.src = URL.createObjectURL(tl.frames[i]); g.appendChild(img);
    }
  };

  // ---------- away (presence) detection ----------
  const away = { detector: null, kind: '', loading: false, lastSeen: Date.now(), isAway: false, lastCheck: 0, busy: false };
  async function awayStart() {
    if (away.detector || away.loading) return;
    away.loading = true; $('#awayStatus').textContent = 'Đang tải bộ nhận diện khuôn mặt…';
    try {
      if ('FaceDetector' in window) {
        try { away.detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }); await away.detector.detect(canvas); away.kind = 'native'; }
        catch { away.detector = null; }
      }
      if (!away.detector) {
        const V = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
        const { FaceDetector, FilesetResolver } = await import(`${V}/vision_bundle.mjs`);
        const fileset = await FilesetResolver.forVisionTasks(`${V}/wasm`);
        away.detector = await FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite' },
          runningMode: 'VIDEO', minDetectionConfidence: 0.5,
        });
        away.kind = 'mediapipe';
      }
      away.lastSeen = Date.now();
      $('#awayStatus').textContent = 'Đang theo dõi — đã thấy bạn.';
    } catch (e) {
      console.warn(e);
      away.kind = 'motion';
      away.detector = 'motion';
      $('#awayStatus').textContent = 'Không tải được bộ nhận diện khuôn mặt, đang dùng phát hiện chuyển động thay thế.';
    }
    away.loading = false;
  }
  function awayStop() {
    away.detector = null; setAway(false);
    $('#awayStatus').textContent = 'Đang tắt.';
  }
  // phương án dự phòng: so sánh khung hình để phát hiện có chuyển động hay không
  const mCanvas = document.createElement('canvas'); mCanvas.width = 64; mCanvas.height = 36;
  const mCtx = mCanvas.getContext('2d', { willReadFrequently: true }); let mPrev = null;
  function motionPresent() {
    mCtx.drawImage(cam.video, 0, 0, 64, 36);
    const d = mCtx.getImageData(0, 0, 64, 36).data; let diff = 0;
    if (mPrev) for (let i = 0; i < d.length; i += 4) diff += Math.abs(d[i] - mPrev[i]) + Math.abs(d[i + 1] - mPrev[i + 1]);
    mPrev = d.slice();
    return diff / (64 * 36) > 6;
  }
  async function awayTick() {
    if (!S.away || !away.detector || !cam.stream || away.busy) return;
    const now = Date.now();
    if (now - away.lastCheck < 1000 || !cam.video.videoWidth) return;
    away.lastCheck = now; away.busy = true;
    try {
      let present = false;
      if (away.kind === 'native') present = (await away.detector.detect(cam.video)).length > 0;
      else if (away.kind === 'mediapipe') present = away.detector.detectForVideo(cam.video, performance.now()).detections.length > 0;
      else present = motionPresent();
      if (present) { away.lastSeen = now; if (away.isAway) setAway(false); }
      else if (!away.isAway && now - away.lastSeen > S.awaySec * 1000) setAway(true);
    } catch (e) { console.warn(e); }
    away.busy = false;
  }
  function setAway(v) {
    if (away.isAway === v) return;
    away.isAway = v;
    $('#awayBanner').hidden = !v; $('#stage').classList.toggle('away', v);
    if (v) {
      if (timer.running && timer.mode !== 'short' && timer.mode !== 'long') {
        today().away++; renderStats();
        chime('soft');
        if (S.awayPause) { pause(); timer.pausedByAway = true; updateTimerUI(); }
      }
      $('#awayStatus').textContent = 'Không thấy bạn trước camera.';
    } else {
      if (timer.pausedByAway) { start(); toast('Chào mừng quay lại. Tiếp tục nhé.'); }
      if (S.away) $('#awayStatus').textContent = 'Đang theo dõi — đã thấy bạn.';
    }
  }

  // ---------- stats ----------
  function streak() {
    let n = 0; const d = new Date();
    if (!(db.history[dayKey(d)]?.sec >= 60)) d.setDate(d.getDate() - 1);
    while (db.history[dayKey(d)]?.sec >= 60) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function renderStats() {
    const t = today(); const min = Math.floor(t.sec / 60);
    $('#stToday').textContent = min; $('#stSessions').textContent = t.sessions;
    $('#stStreak').textContent = streak(); $('#stAway').textContent = t.away;
    $('#goalText').textContent = `${min} / ${S.goal} phút`;
    $('#goalBar').style.width = Math.min(100, (min / S.goal) * 100) + '%';
    const days = []; const d = new Date(); d.setDate(d.getDate() - 6);
    for (let i = 0; i < 7; i++) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
    const vals = days.map((x) => Math.floor((db.history[dayKey(x)]?.sec || 0) / 60));
    const max = Math.max(S.goal, ...vals);
    $('#weekChart').innerHTML = days.map((x, i) => `<div class="bar ${i === 6 ? 'today' : ''}" title="${vals[i]} phút">
      <em>${vals[i] || ''}</em><i style="height:${(vals[i] / max) * 100}%"></i><span>${i === 6 ? 'Nay' : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][x.getDay()]}</span></div>`).join('');
  }
  let goalCelebrated = false;
  setInterval(() => {
    renderStats();
    if (!goalCelebrated && today().sec / 60 >= S.goal) { goalCelebrated = true; chime(); toast(`Đã đạt mục tiêu ${S.goal} phút hôm nay`, 5000); }
  }, 15000);
  goalCelebrated = today().sec / 60 >= S.goal;
  $('#btnExportStats').onclick = () => {
    const rows = [['ngay', 'phut', 'phien', 'lan_roi_ban'], ...Object.entries(db.history).sort().map(([k, v]) => [k, Math.round(v.sec / 60), v.sessions, v.away])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }));
    a.download = 'study-history.csv'; a.click();
  };

  // ---------- settings panel ----------
  const BIND = {
    setFocus: 'focus', setShort: 'short', setLong: 'long', setLongEvery: 'longEvery', setGoal: 'goal', setChime: 'chime',
    setAutoBreak: 'autoBreak', setAutoFocus: 'autoFocus', setNotify: 'notify', setAway: 'away', setAwaySec: 'awaySec',
    setAwayPause: 'awayPause', setOvTimer: 'ovTimer', setOvClock: 'ovClock', setOvTask: 'ovTask', setOvQuote: 'ovQuote', setOvPosture: 'ovPosture',
  };
  function fillSettings() {
    for (const [id, k] of Object.entries(BIND)) {
      const el = document.getElementById(id);
      el.type === 'checkbox' ? (el.checked = !!S[k]) : (el.value = S[k]);
    }
  }
  for (const [id, k] of Object.entries(BIND)) {
    document.getElementById(id).onchange = async (e) => {
      const el = e.target;
      if (el.type === 'checkbox') S[k] = el.checked;
      else if (el.type === 'number') { const v = Math.max(+el.min || 1, Math.min(+el.max || 999, +el.value || 1)); S[k] = v; el.value = v; }
      else S[k] = el.value;
      if (k === 'notify' && S.notify && 'Notification' in window) {
        const p = await Notification.requestPermission();
        if (p !== 'granted') { S.notify = false; el.checked = false; toast('Bạn chưa cho phép thông báo.'); }
      }
      if (k === 'away') S.away ? (cam.stream ? awayStart() : toast('Sẽ bật khi camera mở.')) : awayStop();
      if (['focus', 'short', 'long'].includes(k) && !timer.running) setMode(timer.mode);
      markPreset(); save(); renderStats();
    };
  }
  $('#btnResetAll').onclick = () => {
    if (!confirm('Xoá toàn bộ nhiệm vụ, lịch sử và cài đặt?')) return;
    localStorage.removeItem(KEY); location.reload();
  };

  // ---------- panels / dialogs / focus mode ----------
  function showPanel(name) {
    $$('#panelTabs button').forEach((b) => b.classList.toggle('active', b.dataset.panel === name));
    $$('.panel').forEach((p) => (p.hidden = p.dataset.panel !== name));
    if (name === 'stats') renderStats();
  }
  $$('#panelTabs button').forEach((b) => (b.onclick = () => showPanel(b.dataset.panel)));
  $('#btnHelp').onclick = () => $('#helpDlg').showModal();

  function toggleFocusMode() {
    const on = !document.body.classList.contains('focus-mode');
    document.body.classList.toggle('focus-mode', on);
    if (on) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen();
  }
  $('#btnFocusMode').onclick = toggleFocusMode;
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) document.body.classList.remove('focus-mode');
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); toggle(); }
    else if (k === 'r') reset();
    else if (k === 'm') $('#btnMirror').click();
    else if (k === 'p') $('#btnPip').click();
    else if (k === 's') $('#btnSnap').click();
    else if (k === 'f') toggleFocusMode();
    else if (k === 'n') { e.preventDefault(); showPanel('tasks'); $('#taskInput').focus(); }
  });

  window.addEventListener('beforeunload', (e) => {
    save(true);
    if (tl.frames.length || timer.running) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- init ----------
  fillSettings(); syncToolbar(); markPreset(); renderTasks(); renderStats();
  setMode('focus');
  updateTlUI();
  // tự bật lại camera nếu đã từng cấp quyền
  navigator.permissions?.query({ name: 'camera' }).then((p) => { if (p.state === 'granted') camStart(); }).catch(() => {});
})();
