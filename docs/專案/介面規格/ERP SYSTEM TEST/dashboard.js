// NEXORA GRID — 首頁儀表板 邏輯
(function () {
  'use strict';
  const T = window.NX_TODAY;
  const EV = window.NX_EVENTS, EVT = window.NX_EVTYPE;
  const DT = window.NX_DOCTYPE, BULL = window.NX_BULLETINS;
  const ICONS = window.NX_ICONS;
  const $ = (s) => document.querySelector(s);
  const key = (y, m, d) => y + '-' + m + '-' + d;
  const todayKey = key(T.y, T.m, T.d);
  const WD = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  function svg(inner, cls) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : '') + '>' + inner + '</svg>';
  }
  // 比較日期 key（a < b 回傳負）
  function cmp(a, b) {
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    return (pa[0] - pb[0]) || (pa[1] - pb[1]) || (pa[2] - pb[2]);
  }

  /* ---------- 問候語（依真實時間）---------- */
  (function greet() {
    const el = $('#greet-h'); if (!el) return;
    const h = new Date().getHours();
    const g = h < 5 ? '夜深了' : h < 12 ? '早安' : h < 18 ? '午安' : '晚安';
    el.innerHTML = g + '，<b>' + window.NX_USER.name + '</b>';
  })();

  /* ---------- 時鐘 ---------- */
  (function clock() {
    const dEl = $('#clk-d'), tEl = $('#clk-t');
    function tick() {
      const now = new Date();
      dEl.textContent = now.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' });
      tEl.textContent = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
    tick(); setInterval(tick, 1000);
  })();

  /* ---------- 模組導覽（已收斂進小星球 Dock；無 #nav 時跳過）---------- */
  (function nav() {
    const el = $('#nav'); if (!el) return;
    el.innerHTML = window.NX_NAV.map((it) =>
      '<button class="navitem' + (it.key === 'home' ? ' on' : '') + '" data-k="' + it.key + '">' +
      svg(ICONS[it.icon]) + it.label + '</button>'
    ).join('');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.navitem'); if (!b) return;
      el.querySelectorAll('.navitem').forEach((x) => x.classList.toggle('on', x === b));
    });
  })();

  /* ---------- 下拉開合 ---------- */
  function bindMenu(btn, menu) {
    if (!btn || !menu) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !menu.hidden;
      document.querySelectorAll('.menu').forEach((m) => (m.hidden = true));
      menu.hidden = open;
      if (typeof window.nxCloseDock === 'function') window.nxCloseDock();
    });
    menu.addEventListener('click', (e) => e.stopPropagation());
  }

  /* ---------- 公告（喇叭）---------- */
  (function announcements() {
    const list = $('#bull-list'); if (!list) return;
    const unread = BULL.filter((b) => b.unread).length;
    const badge = $('#bell-badge'); if (badge) { badge.textContent = unread; badge.style.display = unread ? '' : 'none'; }
    const c = $('#bell-c'); if (c) c.textContent = '未讀 ' + unread;
    list.innerHTML = BULL.map((b) =>
      '<div class="bull">' +
        '<span class="tag" style="color:' + b.color + ';background:color-mix(in srgb,' + b.color + ' 16%,transparent)">' + b.type + '</span>' +
        '<div class="bd"><div class="ti">' + b.title + '</div><div class="mt">' + b.date + '</div></div>' +
        (b.unread ? '<span class="un"></span>' : '') +
      '</div>'
    ).join('');
  })();

  /* ---------- 通知（鈴鐸，待辦驅動）---------- */
  (function notifications() {
    const list = $('#noti-list'); if (!list) return;
    const N = window.NX_NOTIFICATIONS || [];
    const badge = $('#noti-badge'); if (badge) { badge.textContent = N.length; badge.style.display = N.length ? '' : 'none'; }
    const c = $('#noti-c'); if (c) c.textContent = N.length + ' 件待處理';
    list.innerHTML = N.length ? N.map((n) =>
      '<div class="bull">' +
        '<span class="un"' + (n.urgent ? '' : ' style="background:var(--muted)"') + '></span>' +
        '<div class="bd"><div class="ti">' + n.text + '</div>' +
        '<div class="mt">' + n.code + ' · ' + n.when + '</div></div>' +
      '</div>'
    ).join('') : '<div class="bull" style="color:var(--faint);justify-content:center">目前沒有待處理事項</div>';
  })();

  /* ---------- 主題切換（共用）---------- */
  let nxLight = false;
  try { nxLight = localStorage.getItem('nx-theme') === 'light'; } catch (e) {}
  function applyTheme() {
    document.documentElement.classList.toggle('light', nxLight);
    const ic = $('#theme-ic'); if (ic) ic.innerHTML = nxLight
      ? '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>'
      : '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5"/>';
  }
  function setTheme(v) { nxLight = v; try { localStorage.setItem('nx-theme', v ? 'light' : 'dark'); } catch (e) {} applyTheme(); paintSettings(); }
  applyTheme();
  const themeBtn = $('#theme-btn'); if (themeBtn) themeBtn.addEventListener('click', () => setTheme(!nxLight));

  /* ---------- 環境設定（齒輪）：本次僅深淺主題＋雙重驗證可動 ---------- */
  let tfa = false; try { tfa = localStorage.getItem('nx-2fa') === '1'; } catch (e) {}
  function paintSettings() {
    const menu = $('#settings-menu'); if (!menu) return;
    const tt = menu.querySelector('[data-set="theme"]'); if (tt) tt.setAttribute('aria-checked', String(nxLight));
    const ft = menu.querySelector('[data-set="2fa"]'); if (ft) ft.setAttribute('aria-checked', String(tfa));
  }
  (function settings() {
    const menu = $('#settings-menu'); if (!menu) return;
    menu.addEventListener('click', (e) => {
      const row = e.target.closest('.set-row'); if (!row) return;
      const k = row.dataset.set;
      if (k === 'theme') setTheme(!nxLight);
      else if (k === '2fa') { tfa = !tfa; try { localStorage.setItem('nx-2fa', tfa ? '1' : '0'); } catch (_) {} paintSettings(); }
    });
    paintSettings();
  })();

  bindMenu($('#bell-btn'), $('#bell-menu'));
  bindMenu($('#noti-btn'), $('#noti-menu'));
  bindMenu($('#settings-btn'), $('#settings-menu'));
  bindMenu($('#user-btn'), $('#user-menu'));
  document.addEventListener('click', () => document.querySelectorAll('.menu').forEach((m) => (m.hidden = true)));

  /* ============ 行事曆 + 事件簿 ============ */
  let focus = new Date(T.y, T.m - 1, T.d);   // 中央卡片的日期
  let selected = todayKey;                     // = 中央卡片
  const MS = 86400000;
  function eventsOn(k) { return EV[k] || []; }
  function dKey(dt) { return dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate(); }
  function addDays(dt, n) { const d = new Date(dt); d.setDate(d.getDate() + n); return d; }
  function dayNum(dt) { return Math.floor(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / MS); }

  /* ----- 七張卡片 coverflow 行事曆（中央較大・滾輪輪轉・點擊置中）----- */
  const track = $('#cal-days');
  const cardMap = {};         // dayNum -> element
  const RANGE = 4;            // 中央 ±4（可見 ±3，外圈為進出緩衝）
  function cardInner(dt) {
    const k = dKey(dt);
    const evs = eventsOn(k);
    const types = [...new Set(evs.map((e) => e.type))].slice(0, 4);
    const dots = types.map((t) => '<i style="background:' + EVT[t].color + '"></i>').join('');
    return '<span class="cc-wd">' + WD[dt.getDay()].replace('星期', '週') + '</span>' +
      '<span class="cc-d">' + dt.getDate() + '</span>' +
      '<span class="cc-mo">' + (dt.getMonth() + 1) + ' 月</span>' +
      '<span class="cc-dots">' + dots + '</span>' +
      (evs.length ? '<span class="cc-cnt">' + evs.length + ' 個行程</span>' : '<span class="cc-cnt cc-none">無行程</span>') +
      (k === todayKey ? '<span class="cc-today">今天</span>' : '');
  }
  function makeCard(dt) {
    const n = dayNum(dt);
    const el = document.createElement('button');
    el.className = 'cc-card'; el.dataset.n = n; el.dataset.k = dKey(dt);
    el.innerHTML = cardInner(dt);
    track.appendChild(el); cardMap[n] = el; return el;
  }
  function transformFor(off) {
    const x = off * 104;
    const sc = off === 0 ? 1 : Math.max(0.5, 1 - Math.abs(off) * 0.16);
    const ry = off === 0 ? 0 : (off < 0 ? 1 : -1) * Math.min(40, Math.abs(off) * 24);
    const z = off === 0 ? 0 : -Math.abs(off) * 45;
    return 'translateX(' + x + 'px) translateZ(' + z + 'px) rotateY(' + ry + 'deg) scale(' + sc.toFixed(3) + ')';
  }
  function opacityFor(off) { return [1, .9, .6, .32, 0][Math.min(4, Math.abs(off))]; }
  function layout(animate) {
    const fN = dayNum(focus);
    for (let o = -RANGE; o <= RANGE; o++) { const dt = addDays(focus, o); if (!cardMap[dayNum(dt)]) makeCard(dt); }
    Object.keys(cardMap).forEach((n) => {
      const off = (+n) - fN, el = cardMap[n];
      if (Math.abs(off) > RANGE) { el.remove(); delete cardMap[n]; return; }
      el.style.transition = animate ? 'transform .44s cubic-bezier(.25,.8,.3,1), opacity .44s ease' : 'none';
      el.style.transform = transformFor(off);
      el.style.opacity = opacityFor(off);
      el.style.zIndex = String(20 - Math.abs(off));
      el.classList.toggle('center', off === 0);
      el.style.pointerEvents = Math.abs(off) <= 3 ? 'auto' : 'none';
    });
    $('#cal-mo').innerHTML = focus.getFullYear() + ' 年 ' + (focus.getMonth() + 1) + ' 月';
  }
  function setFocus(dt, animate) {
    focus = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    selected = dKey(focus);
    layout(animate); renderEventBook();
  }
  function shiftDays(n) { setFocus(addDays(focus, n), true); }

  let ebEvents = [];
  function renderEventBook() {
    const p = selected.split('-').map(Number);
    const dateObj = new Date(p[0], p[1] - 1, p[2]);
    const dEl = $('#eb-dt'); if (dEl) dEl.textContent = p[1] + ' 月 ' + p[2] + ' 日';
    const wEl = $('#eb-wd'); if (wEl) wEl.textContent = WD[dateObj.getDay()] + (selected === todayKey ? ' · 今天' : '');
    ebEvents = eventsOn(selected).slice().sort((a, b) => a.time.localeCompare(b.time));
    const cEl = $('#eb-c'); if (cEl) cEl.textContent = ebEvents.length ? ebEvents.length + ' 個行程' : '';
    const body = $('#eb-body'); if (!body) return;
    if (!ebEvents.length) {
      body.innerHTML = '<div class="eb-empty">' +
        svg('<path d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>') +
        '<div>這天沒有安排行程</div></div>';
      return;
    }
    body.innerHTML = '<div class="eb-list">' + ebEvents.map((e, i) => {
      const ty = EVT[e.type];
      return '<button class="ev" data-i="' + i + '">' +
        '<span class="time">' + e.time + '</span>' +
        '<span class="bar" style="background:' + ty.color + '"></span>' +
        '<div class="bd"><div class="tt">' + e.title + '</div>' +
          (e.meta ? '<div class="mt">' + svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/>') + e.meta + '</div>' : '') +
        '</div>' +
        '<span class="typ" style="color:' + ty.color + ';background:color-mix(in srgb,' + ty.color + ' 15%,transparent)">' + ty.label + '</span>' +
        '</button>';
    }).join('') + '</div>';
  }

  let lastWheel = 0;
  track.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = Date.now(); if (now - lastWheel < 130) return; lastWheel = now;
    shiftDays(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  track.addEventListener('click', (e) => {
    const c = e.target.closest('.cc-card'); if (!c) return;
    const p = c.dataset.k.split('-').map(Number);
    setFocus(new Date(p[0], p[1] - 1, p[2]), true);
  });
  const cpv = $('#cal-prev'); if (cpv) cpv.addEventListener('click', () => shiftDays(-7));
  const cnx = $('#cal-next'); if (cnx) cnx.addEventListener('click', () => shiftDays(7));
  $('#cal-today').addEventListener('click', () => setFocus(new Date(T.y, T.m - 1, T.d), true));

  /* 年月選擇 */
  (function ymPicker() {
    const btn = $('#cal-mo-btn'), pop = $('#cal-ym-pop'); if (!btn || !pop) return;
    let py = focus.getFullYear();
    function paint() {
      const yl = pop.querySelector('.ymp-y'); if (yl) yl.textContent = py + ' 年';
      pop.querySelectorAll('.ymp-m').forEach((b) => {
        b.classList.toggle('on', py === focus.getFullYear() && (+b.dataset.m) === (focus.getMonth() + 1));
      });
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !pop.hidden;
      document.querySelectorAll('.menu').forEach((m) => (m.hidden = true));
      py = focus.getFullYear(); pop.hidden = open; paint();
    });
    pop.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('.ymp-prev')) { py--; paint(); return; }
      if (e.target.closest('.ymp-next')) { py++; paint(); return; }
      const mb = e.target.closest('.ymp-m'); if (!mb) return;
      const m = +mb.dataset.m;
      const day = Math.min(focus.getDate(), new Date(py, m, 0).getDate());
      setFocus(new Date(py, m - 1, day), true);
      pop.hidden = true;
    });
  })();

  /* ---------- 出勤狀況 ---------- */
  function renderAttendance() {
    const body = $('#attend-body'); if (!body) return;
    const A = window.NX_ATTENDANCE || [], S = window.NX_ATTEND_STATUS || {};
    const present = A.filter((a) => ['work', 'remote', 'trip'].indexOf(a.status) >= 0).length;
    const c = $('#attend-c'); if (c) c.textContent = present + ' / ' + A.length + ' 在勤';
    body.innerHTML = '<div class="att-list">' + A.map((a) => {
      const s = S[a.status] || { label: a.status, color: 'var(--muted)' };
      return '<div class="att">' +
        '<span class="att-av">' + a.name.slice(0, 1) + '</span>' +
        '<div class="att-bd"><div class="att-n">' + a.name + '</div><div class="att-r">' + a.role + '</div></div>' +
        '<span class="att-s" style="color:' + s.color + ';background:color-mix(in srgb,' + s.color + ' 14%,transparent)"><i style="background:' + s.color + '"></i>' + s.label + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 彈跳視窗 ---------- */
  function openModal(html) {
    const m = $('#nx-modal'); if (!m) return;
    $('#nx-modal-card').innerHTML = html;
    m.hidden = false; requestAnimationFrame(() => m.classList.add('open'));
  }
  function closeModal() {
    const m = $('#nx-modal'); if (!m) return;
    m.classList.remove('open'); setTimeout(() => { if (!m.classList.contains('open')) m.hidden = true; }, 200);
  }
  function mdRow(k, v) { return '<div class="md-row"><span class="md-k">' + k + '</span><span class="md-v">' + v + '</span></div>'; }
  (function modalInit() {
    const m = $('#nx-modal'); if (!m) return;
    m.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target.classList.contains('nx-modal-bg')) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  })();
  (function ebClicks() {
    const body = $('#eb-body'); if (!body) return;
    body.addEventListener('click', (e) => {
      const b = e.target.closest('.ev'); if (!b) return;
      const ev = ebEvents[+b.dataset.i]; if (!ev) return;
      const ty = EVT[ev.type], p = selected.split('-').map(Number);
      openModal(
        '<div class="md-h"><span class="md-typ" style="color:' + ty.color + ';background:color-mix(in srgb,' + ty.color + ' 16%,transparent)">' + ty.label + '</span>' +
        '<button class="md-x" data-close>' + svg('<path d="M18 6 6 18M6 6l12 12"/>') + '</button></div>' +
        '<div class="md-title">' + ev.title + '</div>' +
        '<div class="md-rows">' +
          mdRow('日期', p[1] + ' 月 ' + p[2] + ' 日（' + WD[new Date(p[0], p[1] - 1, p[2]).getDay()] + '）') +
          mdRow('時間', ev.time) +
          (ev.meta ? mdRow('地點 / 備註', ev.meta) : '') +
          mdRow('類別', ty.label) +
        '</div>' +
        '<div class="md-foot"><button class="md-btn ghost" data-close>關閉</button><button class="md-btn">編輯行程</button></div>'
      );
    });
  })();
  (function addEvent() {
    const btn = $('#cal-add'); if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = selected.split('-').map(Number);
      const ds = p[0] + '-' + String(p[1]).padStart(2, '0') + '-' + String(p[2]).padStart(2, '0');
      openModal(
        '<div class="md-h"><span class="md-typ" style="color:var(--gold-bright);background:color-mix(in srgb,var(--gold) 16%,transparent)">新增事件</span>' +
        '<button class="md-x" data-close>' + svg('<path d="M18 6 6 18M6 6l12 12"/>') + '</button></div>' +
        '<div class="md-title">新增行事曆事件</div>' +
        '<div class="md-form">' +
          '<label class="md-f"><span>標題</span><input type="text" placeholder="輸入事件標題"></label>' +
          '<label class="md-f"><span>日期</span><input type="text" value="' + ds + '"></label>' +
          '<label class="md-f"><span>時間</span><input type="text" placeholder="09:00"></label>' +
          '<label class="md-f"><span>類別</span><select><option>會議</option><option>活動</option><option>教育訓練</option><option>請假</option></select></label>' +
        '</div>' +
        '<div class="md-foot"><button class="md-btn ghost" data-close>取消</button><button class="md-btn" data-close>儲存</button></div>'
      );
    });
  })();

  /* ============ 任務清單（未完成單據）============ */
  let tasks = window.NX_TASKS.map((t) => ({ ...t }));
  let filter = 'all';

  function dueLabel(t) {
    const c = cmp(t.due, todayKey);
    const p = t.due.split('-');
    const ds = p[1] + '/' + String(p[2]).padStart(2, '0');
    if (t.done) return { txt: ds, over: false };
    if (c < 0) return { txt: '逾期 · ' + ds, over: true };
    if (c === 0) return { txt: '今天到期', over: false };
    return { txt: ds + ' 到期', over: false };
  }
  function statusStyle(s) {
    if (s === '草稿') return 'color:var(--muted);background:var(--chip)';
    return 'color:var(--gold-bright);background:color-mix(in srgb,var(--gold) 16%,transparent)';
  }

  function renderFilters() {
    const types = ['all', 'quote', 'sales', 'ship', 'collect', 'purchase'];
    const labels = { all: '全部', quote: '報價', sales: '銷貨', ship: '出貨', collect: '收款', purchase: '採購' };
    $('#tk-filters').innerHTML = types.map((t) => {
      const n = t === 'all' ? tasks.filter((x) => !x.done).length : tasks.filter((x) => x.type === t && !x.done).length;
      return '<button class="fchip' + (t === filter ? ' on' : '') + '" data-t="' + t + '">' +
        labels[t] + (n ? ' <span style="opacity:.7">' + n + '</span>' : '') + '</button>';
    }).join('');
  }

  function renderTasks() {
    const pending = tasks.filter((t) => !t.done).length;
    const over = tasks.filter((t) => !t.done && cmp(t.due, todayKey) < 0).length;
    const _m = $('#tk-meta'); if (_m) _m.textContent = pending + ' 筆待處理';
    [['#s-task', pending], ['#g-task', pending], ['#s-over', over]].forEach(([id, v]) => { const e = $(id); if (e) e.textContent = v; });

    let list = tasks.filter((t) => filter === 'all' || t.type === filter);
    // 未完成在前（依到期），已完成置底
    list.sort((a, b) => (a.done - b.done) || cmp(a.due, b.due));

    const el = $('#tk-list');
    if (!list.length) { el.innerHTML = '<div class="tk-empty">此分類沒有單據</div>'; return; }
    el.innerHTML = list.map((t) => {
      const ty = DT[t.type];
      const dl = dueLabel(t);
      return '<div class="task' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
        '<div class="bd">' +
          '<div class="r1">' +
            '<span class="typ" style="color:' + ty.color + ';background:color-mix(in srgb,' + ty.color + ' 15%,transparent)">' + ty.label + '</span>' +
            '<span class="code">' + t.code + '</span>' +
            '<span class="amt">' + t.amount + '</span>' +
          '</div>' +
          '<div class="r2">' +
            '<span class="st" style="' + statusStyle(t.status) + '">' + t.status + '</span>' +
            '<span class="pt">' + t.partner + '</span>' +
            '<span class="due' + (dl.over ? ' over' : '') + '">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>') + dl.txt + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  $('#tk-filters').addEventListener('click', (e) => {
    const b = e.target.closest('.fchip'); if (!b) return;
    filter = b.dataset.t; renderFilters(); renderTasks();
  });
  $('#tk-list').addEventListener('click', (e) => {
    const cb = e.target.closest('.cb'); if (!cb) return;
    const row = e.target.closest('.task'); const id = row.dataset.id;
    const t = tasks.find((x) => x.id === id); if (!t) return;
    t.done = !t.done;
    renderFilters(); renderTasks();
  });

  /* ---------- 今日行程數 ---------- */
  function renderTodaySummary() {
    const n = eventsOn(todayKey).length;
    [['#s-ev', n], ['#g-ev', n]].forEach(([id, v]) => { const e = $(id); if (e) e.textContent = v; });
  }

  /* ---------- 初始渲染 ---------- */
  layout(false); renderEventBook(); renderAttendance();
  renderFilters(); renderTasks(); renderTodaySummary();

  /* ============ 星空背景 + 進場（standalone 模式才執行；合併頁由 system-engine 接管）============ */
  if (!window.NX_EMBED) {
  const cv = $('#stars'), ctx = cv.getContext('2d');
  let W = 0, H = 0; const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let warpE = { on: false, t: 1 };
  function startEnterWarp() { warpE.on = true; warpE.t = 1; }
  const LAYERS = [
    { n: 170, rMin: .25, rMax: .8, depth: 5, aMin: .14, aMax: .36 },
    { n: 80, rMin: .5, rMax: 1.3, depth: 13, aMin: .24, aMax: .52 },
    { n: 24, rMin: 1.0, rMax: 2.1, depth: 26, aMin: .4, aMax: .76, glow: 1 },
  ];
  const TINTS = ['225,242,240', '220,238,238', '236,240,246', '190,250,236', '150,230,255', '198,172,255'];
  let stars = [];
  function build() {
    stars = [];
    LAYERS.forEach((L, li) => {
      for (let i = 0; i < L.n; i++) stars.push({
        li, x: Math.random(), y: Math.random(),
        r: L.rMin + Math.random() * (L.rMax - L.rMin),
        a: L.aMin + Math.random() * (L.aMax - L.aMin),
        tw: .4 + Math.random() * 1.4, ph: Math.random() * 6.283,
        drift: (Math.random() * .4 + .12) * (Math.random() < .5 ? -1 : 1),
        col: TINTS[(Math.random() * TINTS.length) | 0],
      });
    });
  }
  // 上飄生物光點
  let sprites = [];
  function buildSprites() {
    sprites = [];
    for (let i = 0; i < 12; i++) sprites.push({
      x: Math.random(), y: Math.random(), r: 2.2 + Math.random() * 3.8,
      sp: .004 + Math.random() * .01, tw: .5 + Math.random() * 1.0, ph: Math.random() * 6.283,
      wob: Math.random() * 6.283, wf: .25 + Math.random() * .5, wa: .008 + Math.random() * .018,
      depth: 8 + Math.random() * 20,
      hue: Math.random() < .7 ? '120,240,224' : (Math.random() < .5 ? '150,228,255' : '255,212,120'),
    });
  }
  function resize() {
    W = cv.width = Math.floor(innerWidth * DPR); H = cv.height = Math.floor(innerHeight * DPR);
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  }
  resize(); build(); buildSprites();
  addEventListener('resize', resize);

  let tx = 0, ty = 0, mx = 0, my = 0;
  addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; });
  addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  function frame(t) {
    const w = Math.floor(innerWidth * DPR), h = Math.floor(innerHeight * DPR);
    if (w !== W || h !== H) resize();
    if (W === 0 || H === 0) { requestAnimationFrame(frame); return; }
    mx += (tx - mx) * .05; my += (ty - my) * .05;
    const ts = t * .001;
    ctx.clearRect(0, 0, W, H);
    if (warpE.on) { warpE.t *= 0.9; if (warpE.t < 0.03) warpE.on = false; }
    for (const s of stars) {
      const L = LAYERS[s.li];
      const px = ((s.x + (reduce ? 0 : ts * s.drift * .003)) % 1 + 1) % 1 * W + mx * L.depth * DPR;
      const py = s.y * H + my * L.depth * DPR;
      const a = s.a * (.55 + .45 * Math.sin(ts * s.tw + s.ph));
      if (L.glow) { ctx.shadowBlur = 6 * DPR; ctx.shadowColor = 'rgba(' + s.col + ',.8)'; } else ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(' + s.col + ',' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px, py, s.r * DPR, 0, 6.283); ctx.fill();
      if (warpE.on) {
        const dx = px - W / 2, dy = py - H / 2, d = Math.hypot(dx, dy) || 1;
        const len = warpE.t * (30 + d * 0.5), ux = dx / d, uy = dy / d;
        ctx.strokeStyle = 'rgba(' + s.col + ',' + Math.min(1, a + warpE.t * .4).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1, s.r * DPR * (0.8 + warpE.t * 1.4));
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - ux * len, py - uy * len); ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter';
    for (const s of sprites) {
      if (!reduce) { s.y -= s.sp * 0.016; if (s.y < -0.06) { s.y = 1.06; s.x = Math.random(); } }
      const gx = ((s.x + Math.sin(ts * s.wf + s.wob) * s.wa) % 1 + 1) % 1 * W + mx * s.depth * DPR;
      const gy = s.y * H + my * s.depth * DPR;
      const pulse = .5 + .5 * Math.sin(ts * s.tw + s.ph);
      const rr = s.r * DPR;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr * 4.2);
      g.addColorStop(0, 'rgba(' + s.hue + ',' + (.7 * pulse).toFixed(3) + ')');
      g.addColorStop(.32, 'rgba(' + s.hue + ',' + (.24 * pulse).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + s.hue + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, rr * 4.2, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  frame(performance.now());

  /* ---------- 登入轉場進場動畫（星球入塢）---------- */
  (function enterAnim() {
    let on = false;
    try { on = !!sessionStorage.getItem('nx-dock'); if (on) sessionStorage.removeItem('nx-dock'); } catch (e) {}
    const root = document.documentElement;
    if (!on || reduce) { root.classList.remove('nx-dock'); return; }
    let done = false;
    function reveal() {
      if (done) return; done = true;
      root.classList.add('nx-go');       // stagger delays (transition already on base)
      void document.body.offsetWidth;     // force reflow so opacity 0 is the start frame
      root.classList.remove('nx-dock');   // drop the pre-hide -> animates opacity/transform in
    }
    requestAnimationFrame(() => requestAnimationFrame(reveal));
    setTimeout(reveal, 120); // robust fallback if rAF is throttled
    // hard fail-safe: content must be visible even if transitions never run (e.g. hidden tab)
    setTimeout(function () {
      root.classList.remove('nx-dock');
      document.querySelectorAll('.greet, .main .card').forEach(function (el) {
        el.style.transition = 'none';
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }, 1500);
  })();
  } /* end standalone-only block */
})();
