/* NEXORA GRID — 核心主檔 · 群組批次頁　四個案例設定
   1 使用者職務設定 · 2 使用者據點設定 · 3 通用件群組 · 4 供應商供貨對應 */
(function () {
  'use strict';
  const NX = window.NX_CMB;
  const svg = (i) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + i + '</svg>';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => (n == null || n === '') ? '—' : 'NT$ ' + Number(n).toLocaleString('en-US');
  const init = (n) => (n ? n.slice(0, 1) : '?');
  const I = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', chev: '<path d="m6 9 6 6 6-6"/>',
    star: '<path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.6 6.7 19.1l1-5.8L3.5 9.2l5.9-.9Z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5ZM3 8l9 5 9-5M12 13v8"/>',
    role: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    site: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    truck: '<path d="M10 17h4V5H2v12h2M14 9h4l3 3v5h-3"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="17.5" cy="17.5" r="1.6"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="M3 12.2 12 17l9-4.8M3 16.7 12 21.5l9-4.8"/>',
    filter: '<path d="M3 4h18l-7 8v6l-4 2v-8Z"/>',
  };
  const today = '2026-06-11';

  /* ============ 共用：多選加入視窗（職務 / 據點 / 通用件零件）============ */
  function multiSelectModal(cfg) {
    const picked = new Set(); let q = '', optIdx = -1;
    cfg.ctx.openModal(
      '<div class="md-h"><span class="md-typ" style="color:var(--gold-bright);background:color-mix(in srgb,var(--gold) 16%,transparent)">' + esc(cfg.typ) + '</span>' +
      '<button class="md-x" data-close>' + svg(I.x) + '</button></div>' +
      '<div class="md-title" style="margin-bottom:6px">' + esc(cfg.title) + '</div>' +
      '<div style="font-size:12.5px;color:var(--muted);margin-bottom:14px">' + esc(cfg.hint) + '</div>' +
      '<div class="am" style="height:min(56vh,440px)">' +
        '<div class="am-search">' + svg(I.search) + '<input id="ms-q" type="text" placeholder="' + esc(cfg.placeholder || '搜尋…') + '" autocomplete="off"></div>' +
        '<div class="am-list" id="ms-list"></div>' +
        '<div class="am-foot"><span class="am-count">已選 <b id="ms-n">0</b> ' + esc(cfg.unit || '位') + '</span><span class="grow"></span>' +
        '<button class="md-btn ghost" data-close>取消</button>' +
        '<button class="md-btn" id="ms-ok" disabled style="opacity:.5;cursor:not-allowed">' + esc(cfg.okLabel || '加入') + '</button></div>' +
      '</div>', 480
    );
    const listEl = document.getElementById('ms-list'), nEl = document.getElementById('ms-n'),
      okEl = document.getElementById('ms-ok'), qEl = document.getElementById('ms-q');
    function rows() { const qq = q.trim().toLowerCase(); return cfg.items().filter((it) => !qq || cfg.match(it, qq)); }
    function paint() {
      const rs = rows();
      if (!rs.length) { listEl.innerHTML = '<div class="am-none">' + (q ? '查無符合「' + esc(q) + '」' : '沒有可加入的項目') + '</div>'; return; }
      listEl.innerHTML = rs.map((it) =>
        '<div class="opt' + (picked.has(it.id) ? ' sel' : '') + (it.dis ? ' dis' : '') + '" data-id="' + esc(it.id) + '">' +
          '<span class="cb">' + svg(I.check) + '</span>' +
          (cfg.icon ? '<span class="av">' + svg(cfg.icon) + '</span>' : '<span class="av">' + esc(init(it.nm)) + '</span>') +
          '<span class="o-bd"><span class="o-nm">' + esc(it.nm) + '</span><span class="o-sub">' + (it.sub || '') + '</span></span>' +
          (it.dis ? '<span class="badge-in">' + esc(it.disLabel || '已加入') + '</span>' : '') +
        '</div>'
      ).join('');
    }
    function foot() { nEl.textContent = picked.size; const on = picked.size > 0; okEl.disabled = !on; okEl.style.opacity = on ? '1' : '.5'; okEl.style.cursor = on ? 'pointer' : 'not-allowed'; okEl.textContent = on ? (cfg.okLabel || '加入') + ' ' + picked.size + ' ' + (cfg.unit || '位') : (cfg.okLabel || '加入'); }
    function opts() { return [...listEl.querySelectorAll('.opt:not(.dis)')]; }
    function paintHi() { const os = opts(); if (optIdx >= os.length) optIdx = os.length - 1; os.forEach((o, i) => o.classList.toggle('kfocus', i === optIdx)); const o = os[optIdx]; if (o) { const lr = listEl.getBoundingClientRect(), or = o.getBoundingClientRect(); if (or.top < lr.top) listEl.scrollTop -= (lr.top - or.top) + 6; else if (or.bottom > lr.bottom) listEl.scrollTop += (or.bottom - lr.bottom) + 6; } }
    paint(); foot(); qEl.focus();
    qEl.addEventListener('input', (e) => { q = e.target.value; optIdx = -1; paint(); });
    listEl.addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (!o || o.classList.contains('dis')) return; const id = o.dataset.id; if (picked.has(id)) picked.delete(id); else picked.add(id); o.classList.toggle('sel', picked.has(id)); foot(); });
    okEl.addEventListener('click', () => { if (!picked.size) return; const ids = [...picked]; cfg.ctx.closeModal(); cfg.onConfirm(ids); });
    function onKey(e) {
      const m = document.getElementById('nx-modal'); if (!m || m.hidden) { document.removeEventListener('keydown', onKey, true); if (window.__nxAmKey === onKey) window.__nxAmKey = null; return; }
      const os = opts();
      if (e.key === 'ArrowDown') { e.preventDefault(); qEl.blur(); optIdx = os.length ? (optIdx + 1) % os.length : -1; paintHi(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); qEl.blur(); optIdx = os.length ? (optIdx - 1 + os.length) % os.length : -1; paintHi(); }
      else if (e.key === ' ' || e.key === 'Spacebar') { if (document.activeElement === qEl) return; if (optIdx >= 0 && os[optIdx]) { e.preventDefault(); os[optIdx].click(); } }
      else if (e.key === 'Enter') { e.preventDefault(); if (picked.size) okEl.click(); else if (os.length) { qEl.blur(); if (optIdx < 0) optIdx = 0; paintHi(); } }
    }
    if (window.__nxAmKey) document.removeEventListener('keydown', window.__nxAmKey, true);
    window.__nxAmKey = onKey; document.addEventListener('keydown', onKey, true);
  }

  /* ============ 案例 1：使用者職務設定 ============ */
  const roles = {
    key: 'roles', crumb: ['主檔', '帳號與權限'], title: '使用者職務設定', dockLabel: '使用者職務設定',
    subjectIcon: I.role, subjectNoun: '職務', memberNoun: '成員', memberUnit: '位',
    searchPlaceholder: '搜尋職務名稱或代碼…', addLabel: '指派成員', addIcon: I.plus,
    subjects: () => NX.ROLES,
    subjectMatch: (r, q) => r.name.includes(q) || r.id.toLowerCase().includes(q),
    subjectCount: (r) => NX.EMPLOYEES.filter((e) => e.roles.includes(r.id)).length,
    members: (r) => NX.EMPLOYEES.filter((e) => e.roles.includes(r.id)),
    memberId: (m) => m.id,
    renderMembers: (r, ms, ctx) => ms.map((m, i) =>
      '<div class="mbr' + (i === ctx.focusIdx ? ' kfocus' : '') + '" data-id="' + m.id + '" data-i="' + i + '">' +
        '<span class="av">' + esc(init(m.name)) + '</span>' +
        '<span class="m-bd"><span class="m-nm">' + esc(m.name) + '</span>' +
        '<span class="m-sub"><span class="m-code">' + esc(m.id) + '</span><span class="m-dept">' + esc(m.dept) + '</span></span></span>' +
        '<button class="m-x" data-rm="' + m.id + '" title="撤銷" aria-label="撤銷">' + svg(I.x) + '</button>' +
      '</div>').join(''),
    emptyText: (r) => ({ title: '這個職務還沒有成員', desc: '點右上「指派成員」開視窗，搜尋帳號或姓名後一次加入多位。' }),
    removeMember: (r, id, ctx) => { const e = NX.EMPLOYEES.find((x) => x.id === id); if (e) e.roles = e.roles.filter((x) => x !== r.id); ctx.refreshAll(); ctx.toast(svg(I.check), '已將 ' + (e ? e.name : '成員') + ' 從「' + r.name + '」撤銷'); },
    openAdd: (r, ctx) => multiSelectModal({
      ctx, typ: '指派成員', title: '指派成員到「' + r.name + '」', unit: '位', okLabel: '加入',
      hint: '搜尋帳號或姓名後勾選，可一次加入多位；已是成員者不可重複選。', placeholder: '搜尋姓名或帳號…',
      items: () => NX.EMPLOYEES.filter((e) => !e.roles.includes(r.id)).map((e) => ({ id: e.id, nm: e.name, sub: '<span class="m-code">' + esc(e.id) + '</span> · ' + esc(e.dept) })),
      match: (it, q) => it.nm.includes(q) || it.id.toLowerCase().includes(q),
      onConfirm: (ids) => { ids.forEach((id) => { const e = NX.EMPLOYEES.find((x) => x.id === id); if (e && !e.roles.includes(r.id)) e.roles.push(r.id); }); ctx.refreshAll(); ctx.toast(svg(I.check), '已加入 ' + ids.length + ' 位成員到「' + r.name + '」'); },
    }),
  };

  /* ============ 案例 2：使用者據點設定（軸＝據點，單一隸屬）============ */
  const sites = {
    key: 'sites', crumb: ['主檔', '帳號與權限'], title: '使用者據點設定', dockLabel: '使用者據點設定',
    subjectIcon: I.site, subjectNoun: '據點', memberNoun: '隸屬員工', memberUnit: '位',
    searchPlaceholder: '搜尋據點名稱或代碼…', addLabel: '指派員工', addIcon: I.plus,
    subjects: () => NX.SITES,
    subjectMatch: (s, q) => s.name.includes(q) || s.id.toLowerCase().includes(q),
    subjectCount: (s) => NX.EMPLOYEES.filter((e) => e.site === s.id).length,
    members: (s) => NX.EMPLOYEES.filter((e) => e.site === s.id),
    memberId: (m) => m.id,
    renderMembers: (s, ms, ctx) => ms.map((m, i) =>
      '<div class="mbr' + (i === ctx.focusIdx ? ' kfocus' : '') + '" data-id="' + m.id + '" data-i="' + i + '">' +
        '<span class="av">' + esc(init(m.name)) + '</span>' +
        '<span class="m-bd"><span class="m-nm">' + esc(m.name) + '</span>' +
        '<span class="m-sub"><span class="m-code">' + esc(m.id) + '</span><span class="m-dept">' + esc(m.dept) + '</span></span></span>' +
        '<button class="m-x" data-rm="' + m.id + '" title="移出據點" aria-label="移出據點">' + svg(I.x) + '</button>' +
      '</div>').join(''),
    emptyText: (s) => ({ title: '這個據點還沒有隸屬員工', desc: '點右上「指派員工」搜尋後一次加入多位；員工隸屬單一據點，加入會由原據點移轉過來。' }),
    removeMember: (s, id, ctx) => { const e = NX.EMPLOYEES.find((x) => x.id === id); if (e) e.site = null; ctx.refreshAll(); ctx.toast(svg(I.check), '已將 ' + (e ? e.name : '員工') + ' 移出「' + s.name + '」'); },
    openAdd: (s, ctx) => multiSelectModal({
      ctx, typ: '指派員工', title: '指派員工隸屬「' + s.name + '」', unit: '位', okLabel: '加入',
      hint: '員工隸屬單一據點；勾選後加入此據點（原本在其他據點者會移轉過來）。', placeholder: '搜尋姓名或帳號…',
      items: () => NX.EMPLOYEES.filter((e) => e.site !== s.id).map((e) => ({ id: e.id, nm: e.name, sub: '<span class="m-code">' + esc(e.id) + '</span> · ' + esc(e.dept) + (e.site ? ' · 目前：' + esc(NX.siteName(e.site)) : ' · 未設據點') })),
      match: (it, q) => it.nm.includes(q) || it.id.toLowerCase().includes(q),
      onConfirm: (ids) => { ids.forEach((id) => { const e = NX.EMPLOYEES.find((x) => x.id === id); if (e) e.site = s.id; }); ctx.refreshAll(); ctx.toast(svg(I.check), '已將 ' + ids.length + ' 位員工指派到「' + s.name + '」'); },
    }),
  };

  /* ============ 案例 3：通用件群組（成員可展開設角色 / 雙向替代 / 專屬售價）============ */
  let exGroup = null; // {gid, part}
  function roleBadge(role) {
    return role === 'main'
      ? '<span class="rb main">主件</span>'
      : '<span class="rb alt">替代品</span>';
  }
  const groups = {
    key: 'groups', crumb: ['主檔', '產品與料號'], title: '通用件群組基本資料', dockLabel: '通用件群組',
    subjectIcon: I.layers, subjectNoun: '群組', memberNoun: '成員', memberUnit: '項',
    searchPlaceholder: '搜尋群組名稱或代碼…', addLabel: '加入零件', addIcon: I.plus, leftCreatable: true,
    subjects: () => NX.UNIVERSAL_GROUPS,
    subjectMatch: (g, q) => g.name.includes(q) || g.id.toLowerCase().includes(q),
    subjectCount: (g) => g.members.length,
    members: (g) => g.members,
    memberId: (m) => m.part,
    renderMembers: (g, ms, ctx) => ms.map((m, i) => {
      const p = NX.partByCode(m.part) || { name: m.part, price: null };
      const open = exGroup && exGroup.gid === g.id && exGroup.part === m.part;
      const priceTxt = m.price != null ? '<span class="rb price">專屬 ' + money(m.price) + '</span>' : '<span class="m-dept">售價 ' + money(p.price) + '</span>';
      return '<div class="mbr part' + (open ? ' open' : '') + (i === ctx.focusIdx ? ' kfocus' : '') + '" data-id="' + m.part + '" data-i="' + i + '">' +
        '<div class="mbr-main">' +
          '<span class="av sq">' + svg(I.box) + '</span>' +
          '<span class="m-bd"><span class="m-nm">' + esc(p.name) + ' ' + roleBadge(m.role) + (m.bidir ? '<span class="rb bidir">雙向</span>' : '') + '</span>' +
          '<span class="m-sub"><span class="m-code">' + esc(m.part) + '</span>' + priceTxt + (m.note ? '<span class="m-dept">· ' + esc(m.note) + '</span>' : '') + '</span></span>' +
          '<button class="m-chev" data-act="expand" title="設定屬性">' + svg(I.chev) + '</button>' +
          '<button class="m-x" data-rm="' + m.part + '" title="移除" aria-label="移除">' + svg(I.x) + '</button>' +
        '</div>' +
        (open ? '<div class="mbr-ex">' +
          '<label class="exf"><span>角色</span><select data-field="role"><option value="main"' + (m.role === 'main' ? ' selected' : '') + '>主件（首選品項）</option><option value="alt"' + (m.role === 'alt' ? ' selected' : '') + '>替代品</option></select></label>' +
          '<label class="exf"><span>專屬售價</span><input data-field="price" type="number" inputmode="numeric" placeholder="留空＝用本身售價" value="' + (m.price != null ? m.price : '') + '"></label>' +
          '<button class="exf-tog' + (m.bidir ? ' on' : '') + '" data-act="bidir"><span>雙向替代</span><span class="sw"></span></button>' +
          '<label class="exf grow"><span>備註</span><input data-field="note" type="text" placeholder="備註" value="' + esc(m.note || '') + '"></label>' +
        '</div>' : '') +
      '</div>';
    }).join(''),
    emptyText: (g) => ({ title: '這個群組還沒有成員零件', desc: '點右上「加入零件」用料號或品名搜尋後一次加入多顆；加入後可逐筆設角色、雙向替代與專屬售價。' }),
    removeMember: (g, part, ctx) => { g.members = g.members.filter((x) => x.part !== part); if (exGroup && exGroup.part === part) exGroup = null; ctx.refreshAll(); const p = NX.partByCode(part); ctx.toast(svg(I.check), '已將 ' + (p ? p.name : part) + ' 移出「' + g.name + '」'); },
    onMemberClick: (g, part, act, elx, ctx) => {
      if (act === 'expand') { exGroup = (exGroup && exGroup.gid === g.id && exGroup.part === part) ? null : { gid: g.id, part }; ctx.refresh(); }
      else if (act === 'bidir') { const m = g.members.find((x) => x.part === part); if (m) { m.bidir = !m.bidir; ctx.refresh(); } }
    },
    onMemberChange: (g, part, field, val, ctx) => {
      const m = g.members.find((x) => x.part === part); if (!m) return;
      if (field === 'role') { m.role = val; ctx.refresh(); }
      else if (field === 'price') { m.price = (val === '' ? null : Number(val)); ctx.refresh(); }
      else if (field === 'note') { m.note = val; }
    },
    openCreate: (ctx) => {
      ctx.openModal(
        '<div class="md-h"><span class="md-typ" style="color:var(--gold-bright);background:color-mix(in srgb,var(--gold) 16%,transparent)">新增群組</span><button class="md-x" data-close>' + svg(I.x) + '</button></div>' +
        '<div class="md-title">新增通用件群組</div>' +
        '<div class="md-form">' +
          '<label class="md-f"><span>群組代碼（建立後不可改，自動轉大寫）</span><input id="ng-code" type="text" placeholder="例如 UG010" autocomplete="off"></label>' +
          '<label class="md-f"><span>群組名稱</span><input id="ng-name" type="text" placeholder="例如 後煞車片通用組" autocomplete="off"></label>' +
        '</div>' +
        '<div class="md-foot"><button class="md-btn ghost" data-close>取消</button><button class="md-btn" id="ng-ok">建立</button></div>', 420);
      const code = document.getElementById('ng-code'), name = document.getElementById('ng-name'), ok = document.getElementById('ng-ok');
      code.focus();
      ok.addEventListener('click', () => {
        const c = code.value.trim().toUpperCase(), n = name.value.trim();
        if (!c || !n) { ctx.toast(svg(I.x), '請填群組代碼與名稱'); return; }
        if (NX.UNIVERSAL_GROUPS.some((g) => g.id === c)) { ctx.toast(svg(I.x), '群組代碼「' + c + '」已存在'); return; }
        NX.UNIVERSAL_GROUPS.unshift({ id: c, name: n, note: '', members: [] });
        ctx.closeModal();
        window.NXBatch.switchCase('groups');
        ctx.toast(svg(I.check), '已建立群組「' + n + '」');
      });
    },
    openAdd: (g, ctx) => multiSelectModal({
      ctx, typ: '加入零件', title: '加入零件到「' + g.name + '」', unit: '項', okLabel: '加入', icon: I.box,
      hint: '用料號或品名搜尋後勾選，可一次加入多顆；預設角色為替代品，加入後可逐筆改設。', placeholder: '搜尋料號或品名…',
      items: () => NX.PARTS.filter((p) => !g.members.some((m) => m.part === p.code)).map((p) => ({ id: p.code, nm: p.name, sub: '<span class="m-code">' + esc(p.code) + '</span> · ' + esc(NX.brandName(p.brand)) + ' · ' + esc(NX.groupName(p.group)) })),
      match: (it, q) => it.nm.includes(q) || it.id.toLowerCase().includes(q),
      onConfirm: (ids) => { ids.forEach((code) => { if (!g.members.some((m) => m.part === code)) g.members.push({ part: code, role: 'alt', price: null, bidir: false, note: '' }); }); ctx.refreshAll(); ctx.toast(svg(I.check), '已加入 ' + ids.length + ' 顆零件到「' + g.name + '」'); },
    }),
  };

  /* ============ 案例 4：供應商供貨對應（批次匯入：品牌＋群組＋產地）============ */
  let exSupply = null; // {sid, part}
  const supply = {
    key: 'supply', crumb: ['主檔', '分級與供貨設定'], title: '供應商供貨對應基本資料', dockLabel: '供應商供貨對應',
    subjectIcon: I.truck, subjectNoun: '供應商', memberNoun: '供貨料件', memberUnit: '項',
    searchPlaceholder: '搜尋供應商名稱或代碼…', addLabel: '批次匯入', addIcon: I.filter,
    subjects: () => NX.SUPPLIERS,
    subjectMatch: (s, q) => s.name.includes(q) || s.id.toLowerCase().includes(q),
    subjectCount: (s) => (NX.SUPPLY[s.id] || []).length,
    members: (s) => NX.SUPPLY[s.id] || [],
    memberId: (m) => m.part,
    renderMembers: (s, ms, ctx) => {
      const head = '<div class="stbl-wrap"><table class="stbl"><thead><tr>' +
        '<th>料件</th><th>廠商料號</th><th class="r">預設單價</th><th class="r">交期</th><th class="r">MOQ</th><th class="c">主要</th><th class="c">來源</th><th></th></tr></thead><tbody>';
      const body = ms.map((m, i) => {
        const p = NX.partByCode(m.part) || { name: m.part, brand: '', group: '', origin: '' };
        const open = exSupply && exSupply.sid === s.id && exSupply.part === m.part;
        return '<tr class="srow' + (i === ctx.focusIdx ? ' kfocus' : '') + (open ? ' open' : '') + '" data-id="' + m.part + '" data-i="' + i + '">' +
            '<td class="cpart"><button class="m-chev" data-act="expand" title="生效期 / 備註">' + svg(I.chev) + '</button>' +
              '<div><div class="pn">' + esc(p.name) + '</div><div class="pc"><span class="m-code">' + esc(m.part) + '</span> · ' + esc(NX.brandName(p.brand)) + ' · ' + esc(p.origin) + '</div></div></td>' +
            '<td><input class="cin" data-field="vendorCode" value="' + esc(m.vendorCode || '') + '" placeholder="—"></td>' +
            '<td class="r"><input class="cin num" data-field="price" type="number" inputmode="numeric" value="' + (m.price != null ? m.price : '') + '" placeholder="—"></td>' +
            '<td class="r"><input class="cin num sm" data-field="lead" type="number" inputmode="numeric" value="' + (m.lead != null ? m.lead : '') + '" placeholder="—"><span class="u">天</span></td>' +
            '<td class="r"><input class="cin num sm" data-field="moq" type="number" inputmode="numeric" value="' + (m.moq != null ? m.moq : '') + '" placeholder="—"></td>' +
            '<td class="c"><button class="pstar' + (m.primary ? ' on' : '') + '" data-act="primary" title="設為主要供應商">' + svg(I.star) + '</button></td>' +
            '<td class="c"><span class="src ' + (m.source === '系統' ? 'sys' : 'man') + '">' + esc(m.source || '手動') + '</span></td>' +
            '<td class="c"><button class="m-x" data-rm="' + m.part + '" title="移除" aria-label="移除">' + svg(I.x) + '</button></td>' +
          '</tr>' +
          (open ? '<tr class="srow-ex" data-id="' + m.part + '"><td colspan="8"><div class="exrow">' +
            '<label class="exf"><span>生效起期</span><input data-field="start" type="date" value="' + esc(m.start || '') + '"></label>' +
            '<label class="exf"><span>生效迄期（留空＝持續）</span><input data-field="end" type="date" value="' + esc(m.end || '') + '"></label>' +
            '<label class="exf grow"><span>備註</span><input data-field="note" type="text" value="' + esc(m.note || '') + '" placeholder="備註"></label>' +
          '</div></td></tr>' : '');
      }).join('');
      return head + body + '</tbody></table></div>';
    },
    emptyText: (s) => ({ title: '這家供應商還沒有供貨料件', desc: '點右上「批次匯入」用品牌＋零件群組＋產地三條件，一次把符合的零件帶入，再個別移除不需要的品項。' }),
    removeMember: (s, part, ctx) => { NX.SUPPLY[s.id] = (NX.SUPPLY[s.id] || []).filter((x) => x.part !== part); if (exSupply && exSupply.part === part) exSupply = null; ctx.refreshAll(); const p = NX.partByCode(part); ctx.toast(svg(I.check), '已移除供貨料件 ' + (p ? p.name : part)); },
    onMemberClick: (s, part, act, elx, ctx) => {
      const list = NX.SUPPLY[s.id] || [];
      if (act === 'expand') { exSupply = (exSupply && exSupply.sid === s.id && exSupply.part === part) ? null : { sid: s.id, part }; ctx.refresh(); }
      else if (act === 'primary') { const m = list.find((x) => x.part === part); if (m) { m.primary = !m.primary; ctx.refresh(); } }
    },
    onMemberChange: (s, part, field, val, ctx) => {
      const m = (NX.SUPPLY[s.id] || []).find((x) => x.part === part); if (!m) return;
      if (field === 'price' || field === 'lead' || field === 'moq') m[field] = (val === '' ? null : Number(val));
      else m[field] = val;
    },
    openAdd: (s, ctx) => batchImport(s, ctx),
  };

  /* ---------- 案例 4 重點：批次匯入視窗 ---------- */
  function batchImport(s, ctx) {
    let fBrand = '', fGroup = '', fOrigin = '';
    const dropped = new Set(); // 預覽中被使用者剔除者
    const opt = (v, t) => '<option value="' + esc(v) + '">' + esc(t) + '</option>';
    ctx.openModal(
      '<div class="md-h"><span class="md-typ" style="color:var(--gold-bright);background:color-mix(in srgb,var(--gold) 16%,transparent)">批次匯入</span>' +
      '<button class="md-x" data-close>' + svg(I.x) + '</button></div>' +
      '<div class="md-title" style="margin-bottom:6px">匯入供貨料件到「' + esc(s.name) + '」</div>' +
      '<div style="font-size:12.5px;color:var(--muted);margin-bottom:14px">以<b style="color:var(--fg)">品牌 ＋ 零件群組 ＋ 產地</b>三條件篩選，一次帶入符合的零件；已對應的不重複帶入，可在預覽中個別剔除。</div>' +
      '<div class="bi-filters">' +
        '<label class="bi-f"><span>品牌</span><select id="bi-brand">' + opt('', '全部品牌') + NX.BRANDS.map((b) => opt(b.id, b.name)).join('') + '</select></label>' +
        '<label class="bi-f"><span>零件群組</span><select id="bi-group">' + opt('', '全部群組') + NX.PART_GROUPS.map((g) => opt(g.id, g.name)).join('') + '</select></label>' +
        '<label class="bi-f"><span>產地</span><select id="bi-origin">' + opt('', '全部產地') + NX.ORIGINS.map((o) => opt(o, o)).join('') + '</select></label>' +
      '</div>' +
      '<div class="bi-bar"><span id="bi-count" class="bi-count"></span><span class="grow"></span><button class="bi-allbtn" id="bi-all">全選</button></div>' +
      '<div class="am-list bi-list" id="bi-list" style="height:min(40vh,300px)"></div>' +
      '<div class="am-foot"><span class="am-count">將匯入 <b id="bi-n">0</b> 筆</span><span class="grow"></span>' +
      '<button class="md-btn ghost" data-close>取消</button>' +
      '<button class="md-btn" id="bi-ok" disabled style="opacity:.5;cursor:not-allowed">匯入</button></div>', 600
    );
    const existing = () => new Set((NX.SUPPLY[s.id] || []).map((x) => x.part));
    function matched() {
      return NX.PARTS.filter((p) =>
        (!fBrand || p.brand === fBrand) && (!fGroup || p.group === fGroup) && (!fOrigin || p.origin === fOrigin));
    }
    function importable() { const ex = existing(); return matched().filter((p) => !ex.has(p.code) && !dropped.has(p.code)); }
    const listEl = document.getElementById('bi-list'), nEl = document.getElementById('bi-n'),
      okEl = document.getElementById('bi-ok'), cntEl = document.getElementById('bi-count');
    function paint() {
      const ex = existing(), all = matched();
      cntEl.textContent = '符合 ' + all.length + ' 筆' + (all.length ? '（' + all.filter((p) => ex.has(p.code)).length + ' 已對應）' : '');
      if (!all.length) { listEl.innerHTML = '<div class="am-none">' + (fBrand || fGroup || fOrigin ? '沒有符合此條件的零件' : '請選擇至少一個篩選條件') + '</div>'; foot(); return; }
      listEl.innerHTML = all.map((p) => {
        const has = ex.has(p.code), drop = dropped.has(p.code);
        return '<div class="opt' + (has ? ' dis' : (drop ? '' : ' sel')) + '" data-id="' + p.code + '">' +
          '<span class="cb">' + svg(I.check) + '</span><span class="av">' + svg(I.box) + '</span>' +
          '<span class="o-bd"><span class="o-nm">' + esc(p.name) + '</span>' +
          '<span class="o-sub"><span class="m-code">' + esc(p.code) + '</span> · ' + esc(NX.brandName(p.brand)) + ' · ' + esc(NX.groupName(p.group)) + ' · ' + esc(p.origin) + '</span></span>' +
          (has ? '<span class="badge-in">已對應</span>' : '') + '</div>';
      }).join('');
      foot();
    }
    function foot() { const n = importable().length; nEl.textContent = n; okEl.disabled = !n; okEl.style.opacity = n ? '1' : '.5'; okEl.style.cursor = n ? 'pointer' : 'not-allowed'; okEl.textContent = n ? '匯入 ' + n + ' 筆' : '匯入'; }
    document.getElementById('bi-brand').addEventListener('change', (e) => { fBrand = e.target.value; dropped.clear(); paint(); });
    document.getElementById('bi-group').addEventListener('change', (e) => { fGroup = e.target.value; dropped.clear(); paint(); });
    document.getElementById('bi-origin').addEventListener('change', (e) => { fOrigin = e.target.value; dropped.clear(); paint(); });
    document.getElementById('bi-all').addEventListener('click', () => { dropped.clear(); paint(); });
    listEl.addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (!o || o.classList.contains('dis')) return; const id = o.dataset.id; if (dropped.has(id)) dropped.delete(id); else dropped.add(id); paint(); });
    okEl.addEventListener('click', () => {
      const rows = importable(); if (!rows.length) return;
      NX.SUPPLY[s.id] = NX.SUPPLY[s.id] || [];
      rows.forEach((p) => NX.SUPPLY[s.id].push({ part: p.code, vendorCode: '', price: null, lead: null, moq: null, primary: false, source: '手動', start: today, end: '', note: '' }));
      ctx.closeModal(); ctx.refreshAll();
      ctx.toast(svg(I.check), '已批次匯入 ' + rows.length + ' 筆供貨料件到「' + s.name + '」');
    });
    paint();
  }

  /* ---------- 註冊 ---------- */
  window.NX_CASES = { roles, sites, groups, supply };
  window.NX_CASE_BY_LABEL = {
    '使用者職務設定': 'roles', '使用者據點設定': 'sites',
    '通用件群組': 'groups', '供應商供貨對應': 'supply',
  };
  window.NX_DEFAULT_CASE = 'roles';
})();
