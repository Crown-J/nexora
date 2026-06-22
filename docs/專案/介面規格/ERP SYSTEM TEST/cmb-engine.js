/* NEXORA GRID — 核心主檔 · 群組批次頁　共用引擎（config 驅動，多案例）
   左欄主體 / 右欄成員骨架；案例設定見 cmb-cases.js。DOCK 可切換四個案例。 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const svg = (inner) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => (n == null || n === '') ? '—' : 'NT$ ' + Number(n).toLocaleString('en-US');
  const initial = (name) => (name ? name.slice(0, 1) : '?');

  const I = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    user: '<circle cx="12" cy="8" r="4.2"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>',
    star: '<path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.6 6.7 19.1l1-5.8L3.5 9.2l5.9-.9Z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5ZM3 8l9 5 9-5M12 13v8"/>',
    role: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    site: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    truck: '<path d="M10 17h4V5H2v12h2M14 9h4l3 3v5h-3"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="17.5" cy="17.5" r="1.6"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="M3 12.2 12 17l9-4.8M3 16.7 12 21.5l9-4.8"/>',
    filter: '<path d="M3 4h18l-7 8v6l-4 2v-8Z"/>',
  };

  /* ---------- 狀態 ---------- */
  let CASE = null;
  let selectedId = null, subjQuery = '', zone = 'left', leftIdx = 0, rightIdx = 0, loadingMembers = false;

  const el = {
    leftHead: $('#gb-left-head'),
    subjSearch: $('#gb-subj-search'),
    subjList: $('#gb-subj-list'),
    rightHead: $('#gb-right-head'),
    memberBody: $('#gb-member-body'),
    crumb: $('#cm-crumb'),
  };

  /* ---------- ctx 提供給案例 ---------- */
  const ctx = {
    svg, esc, money, initial, I, NX: window.NX_CMB,
    get focusIdx() { return zone === 'right' ? rightIdx : -1; },
    refresh: () => renderRight(),
    refreshAll: () => { renderSubjects(); renderRight(); },
    toast,
    openModal: (h, w) => window.nxOpenModal(h, w),
    closeModal: () => window.nxCloseModal(),
    selectedId: () => selectedId,
  };

  /* ---------- 共用：主體清單 ---------- */
  function filteredSubjects() {
    const q = subjQuery.trim().toLowerCase();
    const list = CASE.subjects();
    return q ? list.filter((s) => CASE.subjectMatch(s, q)) : list;
  }
  function renderLeftHead() {
    const total = CASE.subjects().length;
    el.leftHead.innerHTML =
      '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + CASE.subjectIcon + '</svg>' +
      '<span class="ti">' + esc(CASE.subjectNoun) + '</span><span class="sp"></span>' +
      (CASE.leftCreatable ? '<button class="gb-add-s" id="gb-create" title="新增' + esc(CASE.subjectNoun) + '">' + svg(I.plus) + '新增</button>' : '') +
      '<span class="cnt" id="gb-subj-count">' + total + ' 項</span>';
    const cb = $('#gb-create'); if (cb) cb.addEventListener('click', () => CASE.openCreate(ctx));
  }
  function renderSubjects() {
    const list = filteredSubjects();
    const cnt = $('#gb-subj-count'); if (cnt) cnt.textContent = CASE.subjects().length + ' 項';
    if (!list.length) {
      el.subjList.innerHTML = '<div class="gb-empty" style="padding:34px 20px"><div class="et" style="font-size:13px">查無符合「' + esc(subjQuery) + '」的' + esc(CASE.subjectNoun) + '</div></div>';
      return;
    }
    el.subjList.innerHTML = list.map((s, i) =>
      '<button class="subj' + (s.id === selectedId ? ' on' : '') + (zone === 'left' && i === leftIdx ? ' kfocus' : '') + '" data-id="' + s.id + '" data-i="' + i + '">' +
        '<span class="s-ic">' + svg(CASE.subjectIcon) + '</span>' +
        '<span class="s-bd"><span class="s-nm">' + esc(s.name) + '</span></span>' +
        '<span class="s-meta">' + CASE.subjectCount(s) + '</span>' +
      '</button>'
    ).join('');
  }

  /* ---------- 共用：右欄 ---------- */
  function renderRight() {
    const subj = CASE.subjects().find((s) => s.id === selectedId);
    if (!subj) {
      el.rightHead.innerHTML =
        '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I.user + '</svg>' +
        '<span class="ti">' + esc(CASE.memberNoun) + '清單</span><span class="sp"></span>';
      el.memberBody.innerHTML = emptyState(I.arrowRight, '請先從左欄選一個' + CASE.subjectNoun,
        '選定後，這裡會載入該' + CASE.subjectNoun + '目前的' + CASE.memberNoun + '清單，並可' + CASE.addLabel + '或移除。', null);
      return;
    }
    el.rightHead.innerHTML =
      '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + CASE.subjectIcon + '</svg>' +
      '<span class="ti">' + esc(subj.name) + ' · ' + CASE.memberNoun + '</span>' +
      '<span class="cnt" id="gb-mcnt">—</span><span class="sp"></span>' +
      '<button class="act" id="gb-add">' + svg(CASE.addIcon || I.plus) + esc(CASE.addLabel) + '<span class="k">Alt+A</span></button>';
    const ab = $('#gb-add'); if (ab) ab.addEventListener('click', () => CASE.openAdd(subj, ctx));

    if (loadingMembers) { renderSkeleton(); return; }
    const members = CASE.members(subj);
    const cnt = $('#gb-mcnt'); if (cnt) cnt.textContent = members.length + ' ' + (CASE.memberUnit || '位');
    if (!members.length) {
      const e = CASE.emptyText ? CASE.emptyText(subj) : { title: '這個' + CASE.subjectNoun + '還沒有' + CASE.memberNoun, desc: '點右上「' + CASE.addLabel + '」加入。' };
      el.memberBody.innerHTML = emptyState(I.inbox, e.title, e.desc, CASE.addLabel);
      const ec = $('#gb-empty-cta'); if (ec) ec.addEventListener('click', () => CASE.openAdd(subj, ctx));
      return;
    }
    el.memberBody.innerHTML = CASE.renderMembers(subj, members, ctx);
  }
  function renderSkeleton() {
    let h = '';
    for (let i = 0; i < 5; i++) h += '<div class="sk"><span class="b c"></span><span class="col"><span class="b l1"></span><span class="b l2"></span></span></div>';
    el.memberBody.innerHTML = h;
  }
  function emptyState(icon, title, desc, ctaLabel) {
    return '<div class="gb-empty"><span class="ei">' + svg(icon) + '</span>' +
      '<div class="et">' + esc(title) + '</div><div class="ed">' + esc(desc) + '</div>' +
      (ctaLabel ? '<button class="ec" id="gb-empty-cta">' + svg(I.plus) + esc(ctaLabel) + '</button>' : '') + '</div>';
  }

  /* ---------- 選主體（含短暫載入態）---------- */
  function selectSubject(id, opts) {
    opts = opts || {};
    if (selectedId === id && !opts.force) return;
    selectedId = id; rightIdx = 0; loadingMembers = true;
    renderSubjects(); renderRight();
    clearTimeout(selectSubject._t);
    selectSubject._t = setTimeout(() => { loadingMembers = false; renderRight(); }, 320);
  }

  /* ---------- toast ---------- */
  let toastEl, toastT;
  function toast(icon, msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'cm-toast'; document.body.appendChild(toastEl); }
    toastEl.innerHTML = (icon || svg(I.check)) + '<span>' + esc(msg) + '</span>';
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ---------- 事件：左欄 ---------- */
  el.subjSearch.addEventListener('input', (e) => { subjQuery = e.target.value; leftIdx = 0; renderSubjects(); });
  el.subjList.addEventListener('click', (e) => {
    const b = e.target.closest('.subj'); if (!b) return;
    leftIdx = +b.dataset.i; zone = 'right'; rightIdx = 0; selectSubject(b.dataset.id);
  });

  /* ---------- 事件：右欄成員（委派）---------- */
  el.memberBody.addEventListener('click', (e) => {
    const subj = CASE.subjects().find((s) => s.id === selectedId); if (!subj) return;
    const rm = e.target.closest('[data-rm]');
    if (rm) { const id = rm.dataset.rm; CASE.removeMember(subj, id, ctx); return; }
    const act = e.target.closest('[data-act]');
    if (act) {
      const holder = e.target.closest('[data-id]');
      CASE.onMemberClick && CASE.onMemberClick(subj, holder ? holder.dataset.id : null, act.dataset.act, act, ctx);
      return;
    }
    if (e.target.closest('input,select,textarea,label')) return;
    const row = e.target.closest('[data-i]');
    if (row) { zone = 'right'; rightIdx = +row.dataset.i; renderRight(); }
  });
  el.memberBody.addEventListener('change', (e) => {
    const f = e.target.closest('[data-field]'); if (!f) return;
    const subj = CASE.subjects().find((s) => s.id === selectedId); if (!subj) return;
    const holder = e.target.closest('[data-id]'); if (!holder) return;
    const val = f.type === 'checkbox' ? f.checked : f.value;
    CASE.onMemberChange && CASE.onMemberChange(subj, holder.dataset.id, f.dataset.field, val, ctx);
  });

  /* ---------- 鍵盤導覽 ---------- */
  document.addEventListener('keydown', (e) => {
    const mv = document.getElementById('view-master'); if (mv && mv.hidden) return;
    const dock = $('#dock-panel'); if (dock && !dock.hidden) return;
    const modal = $('#nx-modal'); if (modal && !modal.hidden) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) { if (e.key === 'Escape') t.blur(); return; }
    if (e.altKey && (e.key === 'a' || e.key === 'A')) { if (selectedId) { e.preventDefault(); const s = CASE.subjects().find((x) => x.id === selectedId); CASE.openAdd(s, ctx); } return; }

    if (zone === 'left') {
      const subs = filteredSubjects(); if (!subs.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); leftIdx = (leftIdx + 1) % subs.length; renderSubjects(); ensureVisible(el.subjList, '.subj.kfocus'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); leftIdx = (leftIdx - 1 + subs.length) % subs.length; renderSubjects(); ensureVisible(el.subjList, '.subj.kfocus'); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSubject(subs[leftIdx].id, { force: true }); zone = 'right'; rightIdx = 0; }
      else if (e.key === 'ArrowRight') { e.preventDefault(); if (selectedId !== subs[leftIdx].id) selectSubject(subs[leftIdx].id, { force: true }); zone = 'right'; rightIdx = 0; renderRight(); }
    } else {
      const subj = CASE.subjects().find((s) => s.id === selectedId);
      const members = subj ? CASE.members(subj) : [];
      if (e.key === 'ArrowLeft' || e.key === 'Escape') { e.preventDefault(); zone = 'left'; renderRight(); renderSubjects(); ensureVisible(el.subjList, '.subj.kfocus'); }
      else if (e.key === 'Enter') { e.preventDefault(); if (subj) CASE.openAdd(subj, ctx); }
      else if (!members.length) { return; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); rightIdx = (rightIdx + 1) % members.length; renderRight(); ensureVisible(el.memberBody, '.kfocus'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); rightIdx = (rightIdx - 1 + members.length) % members.length; renderRight(); ensureVisible(el.memberBody, '.kfocus'); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); const m = members[rightIdx]; if (m) CASE.removeMember(subj, CASE.memberId(m), ctx); }
    }
  });
  function ensureVisible(container, sel) {
    const elx = container.querySelector(sel); if (!elx) return;
    const cr = container.getBoundingClientRect(), er = elx.getBoundingClientRect();
    if (er.top < cr.top) container.scrollTop -= (cr.top - er.top) + 6;
    else if (er.bottom > cr.bottom) container.scrollTop += (er.bottom - cr.bottom) + 6;
  }

  /* ---------- 切換案例 ---------- */
  function switchCase(key) {
    const next = window.NX_CASES[key]; if (!next) return;
    CASE = next;
    selectedId = null; subjQuery = ''; zone = 'left'; leftIdx = 0; rightIdx = 0; loadingMembers = false;
    el.subjSearch.value = '';
    el.subjSearch.placeholder = CASE.searchPlaceholder || ('搜尋' + CASE.subjectNoun + '…');
    el.crumb.innerHTML = CASE.crumb.map((c, i) => (i ? '<span class="sep">/</span>' : '') + '<b>' + esc(c) + '</b>').join('') + '<span class="sep">/</span>' + esc(CASE.title);
    document.title = 'NEXORA GRID — 主檔 · ' + CASE.title;
    window.NX_ACTIVE_SUB = CASE.dockLabel || CASE.title;
    renderLeftHead(); renderSubjects(); renderRight();
  }
  window.nxNavigate = function (moduleKey, label) {
    const map = window.NX_CASE_BY_LABEL || {};
    if (moduleKey === 'master' && map[label]) {
      if (CASE && map[label] === CASE.key) return;
      switchCase(map[label]);
      toast(svg(I.check), '已切換到「' + label + '」');
      return;
    }
    toast(svg(I.arrowRight), '「' + label + '」為後續階段；本打樣聚焦主檔四個群組批次頁');
  };
  window.NXBatch = { switchCase, ctx };

  /* ---------- 啟動 ---------- */
  function start() {
    switchCase(window.NX_DEFAULT_CASE || 'roles');
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('cm-ready')));
    setTimeout(() => document.body.classList.add('cm-ready'), 120);
    setTimeout(() => {
      document.querySelectorAll('.cm-head, .gb').forEach((x) => {
        if (parseFloat(getComputedStyle(x).opacity) < 0.98) { x.style.opacity = '1'; x.style.transform = 'none'; }
      });
    }, 900);
  }
  if (window.NX_CASES) start();
  else window.addEventListener('DOMContentLoaded', start);
})();
