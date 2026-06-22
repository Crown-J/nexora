// NEXORA GRID — 連續式系統：共用星空 + 共用星球 + 登入→首頁 同頁轉場
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const planetWrap = document.getElementById('planetWrap');
  const slot = document.getElementById('lg-slot');
  const logo = document.querySelector('.logo');
  let appState = 'login'; // login | leaving | app

  /* ---------- password toggle ---------- */
  const eye = document.getElementById('lg-eye'), pwInput = document.getElementById('lg-pw');
  if (eye) eye.addEventListener('click', () => { pwInput.type = pwInput.type === 'password' ? 'text' : 'password'; });

  /* ---------- shared planet placement (login spot <-> TopBar logo) ---------- */
  const BASE = 440; // planetWrap natural px size
  function placePlanet(cx, cy, scale, trans) {
    planetWrap.style.transition = trans || '';
    planetWrap.style.transform =
      'translate(' + (cx - innerWidth / 2).toFixed(1) + 'px,' + (cy - innerHeight / 2).toFixed(1) + 'px) scale(' + scale.toFixed(4) + ')';
  }
  function placeLogin(trans) {
    const r = slot.getBoundingClientRect();
    if (r.width < 2) return; // layout not ready yet
    placePlanet(r.left + r.width / 2, r.top + r.height / 2, r.width / BASE, trans);
  }
  function placeDock(trans) {
    const r = logo.getBoundingClientRect();
    placePlanet(r.left + r.width / 2, r.top + r.height / 2, (r.width / BASE) * 2, trans);
  }
  // initial placement — retry until the slot has resolved layout (width > 0)
  function initialPlace(tries) {
    if (appState !== 'login') return;
    const r = slot.getBoundingClientRect();
    if (r.width < 2 && (tries || 0) < 40) { requestAnimationFrame(() => initialPlace((tries || 0) + 1)); return; }
    placeLogin('none');
  }
  initialPlace(0);
  addEventListener('load', () => { if (appState === 'login') placeLogin('none'); });
  addEventListener('resize', () => {
    if (appState === 'app') placeDock('none');
    else if (appState === 'login') placeLogin('none');
  });

  /* ---------- transition controller ---------- */
  function forceShow() {
    document.body.classList.remove('state-leaving');
    placeDock('none');
    const al = document.getElementById('app-layer');
    if (al) { al.style.transition = 'none'; al.style.opacity = '1'; }
    document.querySelectorAll('.greet, .main .card').forEach(function (el) {
      el.style.transition = 'none'; el.style.opacity = '1'; el.style.transform = 'none';
    });
  }
  function enter() {
    if (appState !== 'login') return;
    // clear any fail-safe inline styles left on login pieces so state-leaving can fade them again
    document.querySelectorAll('.lg-right,.lg-brand,.lg-welcome,.lg-title,.lg-subtitle,.lg-ver').forEach(function (el) { el.style.transition = ''; el.style.opacity = ''; el.style.transform = ''; });
    const sub = document.getElementById('lg-submit');
    if (sub) { sub.classList.add('busy'); const sp = sub.querySelector('span'); if (sp) sp.textContent = '驗證中…'; }
    const ll = document.getElementById('login-layer');

    if (reduce) {
      document.body.classList.add('state-app'); appState = 'app';
      placeDock('none'); if (ll) ll.style.display = 'none'; forceShow(); return;
    }
    appState = 'leaving';
    document.body.classList.add('state-leaving');
    // step 1: planet glides to centre with a slight zoom-in
    placePlanet(innerWidth / 2, innerHeight * 0.44, 1.12, 'transform .8s cubic-bezier(.45,0,.25,1)');
    // step 2: planet shrinks & docks into the TopBar logo slot; dashboard surfaces
    setTimeout(function () {
      document.body.classList.add('state-app'); appState = 'app';
      placeDock('transform .95s cubic-bezier(.6,0,.2,1)');
      setTimeout(function () { if (ll) ll.style.display = 'none'; }, 620);
      setTimeout(forceShow, 1500); // fail-safe: content must end visible even if a tab is backgrounded
    }, 820);
  }
  const form = document.getElementById('lg-form');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); enter(); });

  /* ---------- logout: play the entry transition in reverse ---------- */
  function logout() {
    if (appState !== 'app') return;
    appState = 'leaving';
    document.querySelectorAll('.menu').forEach(function (m) { m.hidden = true; });
    const ll = document.getElementById('login-layer');
    const al = document.getElementById('app-layer');
    // dashboard fades away as a whole
    if (al) { al.style.transition = 'opacity .55s ease'; al.style.opacity = '0'; }
    // restore the login layer (form/brand kept hidden by state-leaving while the planet travels)
    document.body.classList.remove('state-app');
    document.body.classList.add('state-leaving');
    if (ll) { ll.style.display = 'flex'; ll.style.opacity = '1'; }
    if (reduce) {
      placeLogin('none');
      document.body.classList.remove('state-leaving'); appState = 'login';
      if (al) { al.style.transition = ''; al.style.opacity = ''; }
      document.querySelectorAll('.greet, .main .card').forEach(function (el) { el.style.transition = ''; el.style.opacity = ''; el.style.transform = ''; });
      resetSubmit(); return;
    }
    // step 1: planet undocks from the TopBar -> centre with a slight zoom
    placePlanet(innerWidth / 2, innerHeight * 0.44, 1.12, 'transform .8s cubic-bezier(.45,0,.25,1)');
    // step 2: planet glides back to the login spot; form & brand fade in
    setTimeout(function () {
      placeLogin('transform .95s cubic-bezier(.6,0,.2,1)');
      document.body.classList.remove('state-leaving');
      appState = 'login';
      if (al) { al.style.transition = ''; al.style.opacity = ''; }
      document.querySelectorAll('.greet, .main .card').forEach(function (el) { el.style.transition = ''; el.style.opacity = ''; el.style.transform = ''; });
      resetSubmit();
      // fail-safe: login form/brand must end visible even if a transition was frozen (hidden tab)
      setTimeout(function () {
        document.querySelectorAll('.lg-right,.lg-brand,.lg-welcome,.lg-title,.lg-subtitle,.lg-ver').forEach(function (el) { el.style.transition = 'none'; el.style.opacity = '1'; el.style.transform = 'none'; });
      }, 700);
    }, 820);
  }
  function resetSubmit() {
    const sub = document.getElementById('lg-submit');
    if (sub) { sub.classList.remove('busy'); const sp = sub.querySelector('span'); if (sp) sp.textContent = '登入系統'; }
  }
  window.nxLogout = logout;

  /* ---------- 小星球 Dock：全系統唯一導覽（stack 動態多層、Alt+X、鍵盤＋滑鼠）---------- */
  (function dock() {
    const panel = document.getElementById('dock-panel');
    const trigger = document.getElementById('dock-trigger');
    if (!panel || !trigger) return;
    const NAV = window.NX_NAV || [], ICONS = window.NX_ICONS || {};
    const ic = (name) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
    const chev = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
    const labelOf = (it) => typeof it === 'string' ? it : it.label;
    const iconOf = (it) => (typeof it === 'object' && it.icon) ? it.icon : null;
    const drillable = (it) => typeof it === 'object' && it.sub && it.sub.length > 1;

    panel.innerHTML =
      '<div class="dock-h"><span id="dock-title">導覽</span><span class="kbd">Alt+X</span>' +
      '<button class="dock-back" id="dock-back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>返回</button></div>' +
      '<div class="dock-viewport"><div class="dock-rail" id="dock-rail"></div></div>';
    const rail = panel.querySelector('#dock-rail');
    const title = panel.querySelector('#dock-title');

    // 導覽堆疊：每層 { items, idx(鍵焦點), sel(已下鑽的子項), title }
    let stack = [{ items: NAV, idx: 0, sel: -1, title: '導覽' }];

    function itemHtml(it, li, j, rootOn) {
      const icon = iconOf(it);
      return '<button class="dock-item' + (rootOn ? ' on' : '') + '" data-li="' + li + '" data-j="' + j + '">' +
        (icon ? ic(icon) : '') + '<span>' + labelOf(it) + '</span>' + (drillable(it) ? chev : '') + '</button>';
    }
    function render() {
      const n = stack.length;
      rail.style.width = (n * 100) + '%';
      rail.style.transform = 'translateX(-' + (((n - 1) / n) * 100).toFixed(4) + '%)';
      rail.innerHTML = stack.map((lvl, li) =>
        '<div class="dock-col" style="width:' + (100 / n).toFixed(4) + '%">' +
        lvl.items.map((it, j) => itemHtml(it, li, j, li === 0 && typeof it === 'object' && it.key === 'home')).join('') +
        '</div>').join('');
      title.textContent = n > 1 ? stack[n - 1].title : '導覽';
      panel.classList.toggle('lvl1', n > 1);
      setK();
    }
    function setK() {
      const last = stack.length - 1;
      rail.querySelectorAll('.dock-col').forEach((col, li) => {
        col.querySelectorAll('.dock-item').forEach((el, k) => el.classList.toggle('kfocus', li === last && k === stack[li].idx));
      });
    }
    function navigateLeaf(leaf) {
      const moduleKey = stack.length > 1 ? (NAV[stack[0].sel] && NAV[stack[0].sel].key) : leaf.key;
      const payload = { module: moduleKey, page: (typeof leaf === 'object' ? leaf.page : undefined), label: labelOf(leaf) };
      if (typeof window.nxNavigate === 'function') window.nxNavigate(payload);
      closePanel();
    }
    function activate(li, j) {
      stack = stack.slice(0, li + 1);     // 回到該層
      const lvl = stack[li]; lvl.idx = j;
      const item = lvl.items[j];
      if (drillable(item)) {
        lvl.sel = j;
        stack.push({ items: item.sub, idx: 0, sel: -1, title: labelOf(item) });
        render();
      } else { navigateLeaf(item); }
    }
    function pop() { if (stack.length > 1) { stack.pop(); render(); } }

    function openPanel() { panel.hidden = false; requestAnimationFrame(() => panel.classList.add('open')); stack = [{ items: NAV, idx: 0, sel: -1, title: '導覽' }]; render(); }
    function closePanel() { panel.classList.remove('open'); setTimeout(() => { if (!panel.classList.contains('open')) panel.hidden = true; }, 200); }
    function toggle() { panel.hidden ? openPanel() : closePanel(); }
    window.nxCloseDock = closePanel;

    trigger.addEventListener('click', (e) => { e.stopPropagation(); document.querySelectorAll('.menu').forEach((m) => (m.hidden = true)); toggle(); });
    rail.addEventListener('click', (e) => { const b = e.target.closest('.dock-item'); if (!b) return; activate(+b.dataset.li, +b.dataset.j); });
    panel.querySelector('#dock-back').addEventListener('click', pop);
    panel.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => closePanel());

    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'x' || e.key === 'X')) { e.preventDefault(); toggle(); return; }
      if (panel.hidden) return;
      const last = stack[stack.length - 1], n = last.items.length;
      if (e.key === 'Escape') { stack.length > 1 ? pop() : closePanel(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); last.idx = (last.idx + 1) % n; setK(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); last.idx = (last.idx - 1 + n) % n; setK(); }
      else if (e.key === 'Enter') { e.preventDefault(); activate(stack.length - 1, last.idx); }
      else if (e.key === 'ArrowLeft' && stack.length > 1) { e.preventDefault(); pop(); }
      else if (e.key === 'ArrowRight') { const it = last.items[last.idx]; if (drillable(it)) { e.preventDefault(); activate(stack.length - 1, last.idx); } }
    });
  })();

  /* ============ starfield (shared, continues from login) ============ */
  const cv = document.getElementById('stars'), ctx = cv.getContext('2d');
  let W = 0, H = 0; const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const LAYERS = [
    { n: 300, rMin: .25, rMax: .8, depth: 5, aMin: .16, aMax: .42, glow: 0 },
    { n: 140, rMin: .55, rMax: 1.4, depth: 14, aMin: .28, aMax: .6, glow: 0 },
    { n: 42, rMin: 1.1, rMax: 2.3, depth: 30, aMin: .42, aMax: .82, glow: 1 },
  ];
  const TINTS = ['225,242,240', '220,238,238', '236,240,246', '190,250,236', '150,230,255', '198,172,255'];
  let stars = [];
  function build() {
    stars = [];
    LAYERS.forEach((L, li) => {
      for (let i = 0; i < L.n; i++) stars.push({
        li, x: Math.random(), y: Math.random(),
        r: L.rMin + Math.random() * (L.rMax - L.rMin), a: L.aMin + Math.random() * (L.aMax - L.aMin),
        tw: .4 + Math.random() * 1.5, ph: Math.random() * 6.283,
        drift: (Math.random() * .5 + .15) * (Math.random() < .5 ? -1 : 1),
        col: TINTS[(Math.random() * TINTS.length) | 0],
      });
    });
  }
  let sprites = [];
  function buildSprites() {
    sprites = [];
    for (let i = 0; i < 18; i++) sprites.push({
      x: Math.random(), y: Math.random(), r: 2.6 + Math.random() * 4.4,
      sp: .004 + Math.random() * .012, wob: Math.random() * 6.283, wf: .25 + Math.random() * .55, wa: .008 + Math.random() * .02,
      tw: .5 + Math.random() * 1.1, ph: Math.random() * 6.283, depth: 8 + Math.random() * 22,
      hue: Math.random() < .74 ? '120,240,224' : (Math.random() < .5 ? '150,228,255' : '255,212,120'),
    });
  }
  function resize() {
    W = cv.width = Math.floor(innerWidth * DPR); H = cv.height = Math.floor(innerHeight * DPR);
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  }
  resize(); build(); buildSprites();
  addEventListener('resize', resize);
  try { new ResizeObserver(resize).observe(document.documentElement); } catch (e) {}

  let shoot = null, nextShoot = performance.now() + 7000;
  function maybeShoot(t) {
    if (!shoot && t > nextShoot) {
      const fromLeft = Math.random() < .5;
      shoot = { x: (fromLeft ? .05 : .95) * W, y: (.08 + Math.random() * .28) * H, vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 4) * DPR, vy: (1.6 + Math.random() * 1.6) * DPR, life: 0, max: 70 + Math.random() * 30 };
      nextShoot = t + 9000 + Math.random() * 8000;
    }
  }

  let tx = 0, ty = 0, mx = 0, my = 0;
  addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; });
  addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  /* ---- ripple energy wave on the sphere ---- */
  (function buildHexWave() {
    const svg = document.querySelector('svg.hexsphere');
    const layer = svg && svg.querySelector('.hexwave-layer');
    if (!layer) return;
    const NS = 'http://www.w3.org/2000/svg';
    const cx = 100, cy = 100, R = 94, maxD = 95, cycle = 6.8, travel = 1.1, vstep = 11.5;
    for (let row = -1; row < 20; row++) {
      const y = 5.75 + row * vstep;
      if (y < -6 || y > 206) continue;
      const even = (((row % 2) + 2) % 2) === 0;
      for (let i = -1; i < 12; i++) {
        const x = (even ? 10 : 0) + i * 20;
        if (x < -6 || x > 206) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d > R) continue;
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', '5');
        c.setAttribute('class', 'hexcell');
        if (!reduce) { c.style.animation = 'hexwave ' + cycle + 's linear infinite'; c.style.animationDelay = ((d / maxD) * travel).toFixed(2) + 's'; }
        layer.appendChild(c);
      }
    }
  })();

  /* ---- guardian satellites (only while logging in) ---- */
  const satEls = [0, 1, 2].map(i => document.getElementById('sat' + i));
  const sats = [
    { a: 0.0, sp: 0.55, rx: 0.66, ry: 0.30, tilt: 18 * Math.PI / 180 },
    { a: 2.1, sp: -0.46, rx: 0.66, ry: 0.30, tilt: 78 * Math.PI / 180 },
    { a: 4.0, sp: 0.62, rx: 0.66, ry: 0.30, tilt: 132 * Math.PI / 180 },
  ];
  const satPos = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
  let pwRect = null;
  function updatePW() { pwRect = planetWrap ? planetWrap.getBoundingClientRect() : null; }
  updatePW(); addEventListener('resize', updatePW); addEventListener('scroll', updatePW, true);
  let mX = -9999, mY = -9999, mActive = false, lastTs = performance.now() * 0.001;
  addEventListener('pointermove', e => { mX = e.clientX; mY = e.clientY; mActive = true; });
  addEventListener('pointerleave', () => { mActive = false; });
  function updateSats(ts) {
    if (appState !== 'login') { for (const el of satEls) { if (el) el.style.opacity = '0'; } return; }
    updatePW();
    if (!pwRect) return;
    let dt = ts - lastTs; lastTs = ts; if (dt < 0 || dt > 0.1) dt = 0.016;
    const cx = pwRect.left + pwRect.width / 2, cy = pwRect.top + pwRect.height / 2, Hh = pwRect.width / 2;
    const dxm = mX - cx, dym = mY - cy, dm = Math.hypot(dxm, dym);
    const guarding = mActive && dm < pwRect.width * 0.62;
    for (let i = 0; i < 3; i++) {
      const s = sats[i];
      if (!reduce) s.a += s.sp * dt;
      const ox = Math.cos(s.a) * s.rx * Hh, oy = Math.sin(s.a) * s.ry * Hh;
      const ct = Math.cos(s.tilt), st = Math.sin(s.tilt);
      const bx = ox * ct - oy * st, by = ox * st + oy * ct;
      let tX, tY;
      if (guarding) {
        const ang = Math.atan2(dym, dxm) + (i - 1) * 0.46;
        const gR = Math.max(Hh * 0.62, Math.min(dm * 0.66, Hh * 1.02));
        tX = Math.cos(ang) * gR; tY = Math.sin(ang) * gR;
      } else { tX = bx; tY = by; }
      const k = guarding ? 0.16 : 0.085;
      satPos[i].x += (tX - satPos[i].x) * k;
      satPos[i].y += (tY - satPos[i].y) * k;
      const depth = Math.sin(s.a);
      const sc = guarding ? 1.16 : (0.8 + 0.32 * (depth * 0.5 + 0.5));
      const el = satEls[i];
      if (el) {
        el.style.transform = 'translate(' + satPos[i].x.toFixed(1) + 'px,' + satPos[i].y.toFixed(1) + 'px) scale(' + sc.toFixed(2) + ')';
        el.style.zIndex = (guarding || depth >= 0) ? 6 : 1;
        el.style.opacity = guarding ? '1' : (0.55 + 0.45 * (depth * 0.5 + 0.5)).toFixed(2);
      }
    }
  }

  function frame(t) {
    const w = Math.floor(innerWidth * DPR), h = Math.floor(innerHeight * DPR);
    if (w !== W || h !== H) resize();
    if (W === 0 || H === 0) { requestAnimationFrame(frame); return; }
    mx += (tx - mx) * .055; my += (ty - my) * .055;
    const ts = t * .001;
    updateSats(ts);

    const isLight = document.documentElement.classList.contains('light') && document.body.classList.contains('state-app');
    if (isLight) {
      ctx.clearRect(0, 0, W, H);
      const sx = (mx / 2 + .5) * W, sy = (my / 2 + .5) * H;
      const g0 = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.42);
      g0.addColorStop(0, 'rgba(255,255,255,.55)');
      g0.addColorStop(.45, 'rgba(255,236,206,.14)');
      g0.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
      for (const s of sprites) {
        if (!reduce) { s.y -= s.sp * 0.016; if (s.y < -.06) { s.y = 1.06; s.x = Math.random(); } }
        const gx = ((s.x + Math.sin(ts * s.wf + s.wob) * s.wa) % 1 + 1) % 1 * W + mx * s.depth * DPR;
        const gy = s.y * H + my * s.depth * DPR;
        const pulse = .5 + .5 * Math.sin(ts * s.tw + s.ph);
        ctx.fillStyle = 'rgba(150,166,188,' + (.12 * pulse).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(gx, gy, s.r * DPR * 1.3, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(frame); return;
    }

    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const L = LAYERS[s.li];
      const px = ((s.x + (reduce ? 0 : ts * s.drift * .003)) % 1 + 1) % 1 * W + mx * L.depth * DPR;
      const py = s.y * H + my * L.depth * DPR;
      const a = s.a * (.55 + .45 * Math.sin(ts * s.tw + s.ph));
      if (L.glow) { ctx.shadowBlur = 7 * DPR; ctx.shadowColor = 'rgba(' + s.col + ',.85)'; } else ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(' + s.col + ',' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px, py, s.r * DPR, 0, 6.283); ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.globalCompositeOperation = 'lighter';
    for (const s of sprites) {
      if (!reduce) { s.y -= s.sp * 0.016; if (s.y < -0.06) { s.y = 1.06; s.x = Math.random(); } }
      const gx = ((s.x + Math.sin(ts * s.wf + s.wob) * s.wa) % 1 + 1) % 1 * W + mx * s.depth * DPR;
      const gy = s.y * H + my * s.depth * DPR;
      const pulse = .5 + .5 * Math.sin(ts * s.tw + s.ph);
      const rr = s.r * DPR * (1 + .14 * Math.sin(ts * s.tw + s.ph));
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr * 4.2);
      g.addColorStop(0, 'rgba(' + s.hue + ',' + (.8 * pulse).toFixed(3) + ')');
      g.addColorStop(.32, 'rgba(' + s.hue + ',' + (.28 * pulse).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + s.hue + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, rr * 4.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(' + s.hue + ',' + (.9 * pulse).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(gx, gy, rr * .5, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    maybeShoot(t);
    if (shoot) {
      shoot.life++; shoot.x += shoot.vx; shoot.y += shoot.vy;
      const k = 1 - shoot.life / shoot.max, x2 = shoot.x - shoot.vx * 8, y2 = shoot.y - shoot.vy * 8;
      const g = ctx.createLinearGradient(x2, y2, shoot.x, shoot.y);
      g.addColorStop(0, 'rgba(255,236,198,0)'); g.addColorStop(1, 'rgba(255,244,214,' + (.6 * k).toFixed(3) + ')');
      ctx.strokeStyle = g; ctx.lineWidth = 1.5 * DPR; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(shoot.x, shoot.y); ctx.stroke();
      if (shoot.life >= shoot.max) shoot = null;
    }
    requestAnimationFrame(frame);
  }
  frame(performance.now());
})();
