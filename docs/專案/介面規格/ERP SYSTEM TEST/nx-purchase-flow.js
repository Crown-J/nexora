// NEXORA GRID — 進貨模組｜統一套版流程作業（v3.4）
// 六作業共用列表/明細套版：列表頁（工具列＋流程圖功能鍵狀態篩選）＋明細頁（表頭＋明細）。
// 流程圖不橫佔版面，收成工具列「流程圖」鍵；打開＝依狀態篩選列表。
// 作業：詢價作業 / 採購作業 / 國內進貨作業 / 國外進貨作業 / 進貨退回作業 / 保固申請作業。
(function () {
  'use strict';
  var DB = window.NXDB, P = window.NXP;
  if (!P) return;
  var esc = P.esc, el = P.el, svg = P.svg, svgI = P.svgI, money = P.money, comma = P.comma, toast = P.toast;
  var partCell = P.partCell, poBadge = P.poBadge, catChip = P.catChip;
  function elWrap(h) { var d = document.createElement('div'); d.innerHTML = h; return d; }

  function shell(host, pageId, desc) {
    var page = el('<div class="nx-page"></div>');
    page.appendChild(el(P.headHtml(pageId, desc)));
    var content = el('<div id="pur-content" style="display:flex;flex-direction:column;gap:14px"></div>');
    page.appendChild(content); host.appendChild(page);
    var ctx = { page: page, content: content, st: { flow: false, filter: null }, lastNo: null };
    P._ctx = ctx; return ctx;
  }
  // Alt+1 列表 / Alt+2 明細 切換鍵（比照核心主檔）
  var SW_LIST = '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>';
  var SW_DETAIL = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>';
  function switcherEl(ctx, active) {
    var sw = el('<div class="nx-pageswitch" style="align-self:flex-start">' +
      '<button class="ps' + (active === 'list' ? ' on' : '') + '" data-v="list">' + svg(SW_LIST, 15) + '資料瀏覽<kbd>Alt+1</kbd></button>' +
      '<button class="ps' + (active === 'detail' ? ' on' : '') + '" data-v="detail">' + svg(SW_DETAIL, 15) + '明細資料<kbd>Alt+2</kbd></button></div>');
    sw.querySelector('[data-v="list"]').addEventListener('click', function () { if (ctx.toList) ctx.toList(); });
    sw.querySelector('[data-v="detail"]').addEventListener('click', function () { if (ctx.toDetail) ctx.toDetail(); });
    return sw;
  }
  function detailPlaceholder(ctx) {
    ctx.content.innerHTML = '';
    ctx.content.appendChild(switcherEl(ctx, 'detail'));
    ctx.content.appendChild(el('<div class="nx-frame"><div class="pur-empty" style="padding:48px">' + svgI('history', 40) + '從「資料瀏覽」點選一筆單據（或按 Alt+1 回列表），即可在此檢視單據明細。</div></div>'));
  }
  if (!P._purKbd) {
    P._purKbd = true;
    document.addEventListener('keydown', function (e) {
      var vp = document.getElementById('view-purchase'); if (!vp || vp.hidden) return;
      var c = P._ctx; if (!c) return;
      var t = document.activeElement, tag = t && t.tagName;
      var inField = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
      if (e.altKey) {
        if (e.key === '1') { e.preventDefault(); if (c.toList) c.toList(); return; }
        if (e.key === '2') { e.preventDefault(); if (c.toDetail) c.toDetail(); return; }
        if (c.mode === 'list' && c._toolbar) {
          var amap = { a: 'add', e: 'edit', f: 'search', d: 'del', p: 'print', l: 'cols', o: 'export', r: 'refresh' };
          var act = amap[(e.key || '').toLowerCase()];
          if (act) { var btn = c._toolbar.querySelector('[data-act="' + act + '"]'); if (btn && !btn.disabled) { e.preventDefault(); btn.click(); } }
        } else if (c.mode === 'detail' && c._toolbar) {
          // 同鍵不同義：依版面型態（①②瀏覽 / ③表頭編輯 / ④明細編輯）綁不同動作
          var dmap;
          if (c._editMode === 'line') dmap = { a: 'additem', e: 'edititem', d: 'delitem', t: 'import', s: 'save', c: 'cancel', r: 'reorder' };
          else if (c._editMode === 'head') dmap = { s: 'save', c: 'cancel', e: 'lineedit', r: 'reorder' };
          else dmap = { a: 'new', e: 'correct', f: 'search', d: 'del', p: 'print', l: 'cols', o: 'export', i: 'lineedit', t: 'reorder' };
          var dact = dmap[(e.key || '').toLowerCase()];
          if (dact) { var dbtn = c._toolbar.querySelector('[data-d="' + dact + '"]'); if (dbtn && !dbtn.disabled) { e.preventDefault(); dbtn.click(); } }
        }
        return;
      }
      if (inField) return;
      if (c.mode === 'list' && c.listNav && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) { if (c.listNav(e.key)) e.preventDefault(); }
    });
  }
  function df(k, v, ro, req) { return '<div class="pur-fld"><span class="k">' + (req ? '<span class="req">*</span>' : '') + esc(k) + (ro ? '<span class="ro">' + esc(ro) + '</span>' : '') + '</span>' + v + '</div>'; }
  function addDays(ds, n) { if (!ds) return '—'; var d = new Date(ds + 'T00:00:00'); if (isNaN(d)) return ds; d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function empNm(id) { return DB.empName ? DB.empName(id) : (id || '—'); }
  function setDocTitle(stateOn, code, name, chips, badge) { var e = P._ctx && P._ctx.content.querySelector('#pur-dtitle'); var html = '<span class="nx-statedot ' + (stateOn ? 'on' : 'off') + '"></span><span class="dt-code">' + esc(code) + '</span>' + (name ? '<b>' + esc(name) + '</b>' : '') + (chips || '') + (badge ? ' ' + badge : ''); if (e) e.innerHTML = html; }
  function metaFields(d, badgeHtml, opts) {
    opts = opts || {};
    var out = df('開單日期', '<span class="v" style="font-family:var(--mono)">' + esc(d.date || '—') + '</span>');
    if (opts.valid) out += df('有效日期', '<span class="v" style="font-family:var(--mono)">' + esc(addDays(d.date, 14)) + '</span>');
    out += df('單據狀態', '<span class="v">' + badgeHtml + '</span>') +
      df('建單人員', '<span class="v">' + esc(empNm(d.by)) + '</span>') +
      df('建單時間', '<span class="v" style="font-family:var(--mono)">' + esc(d.date || '—') + '</span>') +
      df('修改人員', '<span class="v">' + esc(empNm(d.by)) + '</span>') +
      df('修改時間', '<span class="v" style="font-family:var(--mono)">' + esc(d.date || '—') + '</span>');
    return '<div class="pur-doc-grid pur-meta">' + out + '</div>';
  }
  var TB = { prev: '<path d="m15 18-6-6 6-6"/>', next: '<path d="m9 18 6-6-6-6"/>', add: '<path d="M12 5v14M5 12h14"/>', pen: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 5v6m4-6v6"/>', print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6Z"/>', cols: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>', dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', lines: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', sort: '<path d="M3 6h11M3 12h7M3 18h4"/><path d="M18 5v14M21 16l-3 3-3-3"/>', save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>' };
  function tchip(act, letter, path, label, on, dis) { return '<button class="nx-tbtn' + (on ? ' on' : '') + '" data-d="' + act + '"' + (dis ? ' disabled style="opacity:.42;cursor:not-allowed"' : '') + '>' + (letter ? '<span class="nx-key">' + letter + '</span>' : '') + svg(path, 15) + '<span>' + label + '</span></button>'; }
  function backBar(label, onBack, right) {
    var c = P._ctx; if (c) c.mode = 'detail';
    var d = (c && c._detail) || {};
    var wrap = el('<div class="pur-detail-head" style="display:flex;flex-direction:column;gap:14px"></div>');
    var topRow = el('<div class="pur-tophdr"></div>');
    topRow.appendChild(switcherEl(c, 'detail'));
    topRow.appendChild(el('<div class="pur-dtitle" id="pur-dtitle">' + ((c && c._docTitle) || '') + '</div>'));
    wrap.appendChild(topRow);
    var ids = (c && c._ids) || [], pos = c ? ids.indexOf(c.lastNo) : -1;
    var em = (c && c._editMode) || null; // null 瀏覽 / 'head' 表頭編輯 / 'line' 明細編輯
    var mid;
    if (em === 'line') {
      // ④明細編輯 工作列：A 新增品項 / E 更正品項 / D 刪品項 / T 批次匯入 / S 存檔 / C 取消 / R 重新排序
      mid = tchip('additem', 'A', TB.add, '新增品項') + tchip('edititem', 'E', TB.pen, '更正品項', false, !d.editItem) + tchip('delitem', 'D', TB.trash, '刪除品項', false, !d.delItem) +
        (d.batchImport ? tchip('import', 'T', TB.dl, '批次匯入') : '') +
        '<span class="nx-tsep"></span>' + tchip('save', 'S', TB.save, '存檔') + tchip('cancel', 'C', TB.x, '取消') +
        (d.reorder ? '<span class="nx-tsep"></span>' + tchip('reorder', 'R', TB.sort, '重新排序') : '');
    } else if (em === 'head') {
      // ③表頭編輯 工作列：S 存檔 / C 取消 ＋（僅編輯單）E 編輯明細 / R 重新排序
      mid = tchip('save', 'S', TB.save, '存檔') + tchip('cancel', 'C', TB.x, '取消') +
        (d.canLine ? '<span class="nx-tsep"></span>' + tchip('lineedit', 'E', TB.lines, '編輯明細') + (d.reorder ? tchip('reorder', 'R', TB.sort, '重新排序') : '') : '');
    } else {
      mid = tchip('new', 'A', TB.add, '新增', false, !(c && c._onNew)) + tchip('correct', 'E', TB.pen, '更正', false, !d.canCorrect) + tchip('search', 'F', TB.search, '查詢') +
        '<span class="nx-tsep"></span>' +
        tchip('del', 'D', TB.trash, '刪除') + tchip('print', 'P', TB.print, '印表') + tchip('cols', 'L', TB.cols, '欄位') + tchip('export', 'O', TB.dl, '匯出') +
        '<span class="nx-tsep"></span>' +
        tchip('lineedit', 'I', TB.lines, '編輯明細', false, !d.canLine) + tchip('reorder', 'T', TB.sort, '項次重排', false, !d.reorder);
    }
    var b = el('<div class="nx-frame"><div class="nx-toolbar">' +
      '<div class="nx-pager"><button class="nx-iconbtn" data-d="prev">' + svg(TB.prev, 15) + '</button><span class="nx-pageno">' + (pos >= 0 ? (pos + 1) + ' / ' + ids.length : '—') + '</span><button class="nx-iconbtn" data-d="next">' + svg(TB.next, 15) + '</button></div>' +
      '<span class="nx-tsep"></span>' + mid +
      '<span class="nx-tool-sp"></span>' + (right || '') + '</div></div>');
    if (c) c._toolbar = b.querySelector('.nx-toolbar');
    function go(delta) { if (!c || pos < 0) return; var j = pos + delta; if (j < 0 || j >= ids.length) return; c.lastNo = ids[j]; if (c.poMode !== undefined) c.poMode = 'view'; c.openDetail(ids[j]); }
    function delCur() {
      if (!c || !c._onDelete) { toast('此作業單據不支援刪除，請改用作廢／退件', true); return; }
      var id = c.lastNo;
      P.modal({ tag: '刪除確認', title: '確定刪除 ' + id + '？', body: '<p style="font-size:13px;color:var(--muted);line-height:1.6;margin:0">刪除後不可復原。已送出／已過帳的單據不可刪除，請改用作廢或退件。</p>',
        foot: '<button class="nx-btn ghost" id="dc">取消</button><button class="nx-btn" id="dok" style="background:var(--danger);border-color:var(--danger);color:#fff">刪除</button>',
        onMount: function (card, close) { card.querySelector('#dc').addEventListener('click', close); card.querySelector('#dok').addEventListener('click', function () { close(); if (c._onDelete(id)) { toast('已刪除 ' + id, true); onBack(); } }); } });
    }
    b.querySelectorAll('[data-d]').forEach(function (btn) { btn.addEventListener('click', function () {
      var a = btn.dataset.d;
      if (a === 'prev') go(-1); else if (a === 'next') go(1);
      else if (a === 'new') { if (c && c._onNew) c._onNew(); }
      else if (a === 'correct') { if (d.correct) d.correct(); }
      else if (a === 'search') { if (c && c._openSearch) c._openSearch(); }
      else if (a === 'del') delCur();
      else if (a === 'lineedit') { if (d.lineEdit) d.lineEdit(); }
      else if (a === 'save') { if (d.save) d.save(); }
      else if (a === 'cancel') { if (d.cancel) d.cancel(); else onBack(); }
      else if (a === 'additem') { if (d.addItem) d.addItem(); }
      else if (a === 'edititem') { if (d.editItem) d.editItem(); }
      else if (a === 'delitem') { if (d.delItem) d.delItem(); }
      else if (a === 'import') { if (d.batchImport) d.batchImport(); }
      else if (a === 'reorder') { if (d.reorder) d.reorder(); }
      else if (a === 'print') toast('送出列印：' + (c ? c.lastNo : '') + '（規劃中）');
      else if (a === 'cols') toast('欄位顯示設定（規劃中）');
      else if (a === 'export') toast('匯出 CSV／PDF（規劃中）');
    }); });
    wrap.appendChild(b); return wrap;
  }

  /* ====================== 共用列表（統一套版 + 流程圖功能鍵）====================== */
  function docList(ctx, o) {
    ctx.content.innerHTML = '';
    ctx.mode = 'list';
    ctx.toList = function () { docList(ctx, o); };
    ctx.openDetail = o.open;
    var hdr = el('<div class="pur-tophdr"></div>');
    hdr.appendChild(switcherEl(ctx, 'list'));
    ctx.content.appendChild(hdr);
    var st = ctx.st;
    if (st.sel == null) st.sel = 0;
    var P_PEN = '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', P_SRCH = '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', P_DL = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', P_REF = '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>', P_COL = '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>', P_FLOW = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
    var P_ADD = '<path d="M12 5v14M5 12h14"/>', P_TRASH = '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 5v6m4-6v6"/>', P_PRINT = '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6Z"/>';
    function tkey(act, letter, path, label, on, dis) { return '<button class="nx-tbtn' + (on ? ' on' : '') + '" data-act="' + act + '"' + (dis ? ' disabled style="opacity:.42;cursor:not-allowed"' : '') + '>' + (letter ? '<span class="nx-key">' + letter + '</span>' : '') + svg(path, 15) + '<span>' + label + '</span></button>'; }
    var hasNew = !!o.onNew;
    var n2 = o.onNew2 ? '<button class="nx-tbtn" data-act="new2">' + svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', 15) + '<span>' + esc(o.new2Label || '導入') + '</span></button>' : '';
    var frame = el('<div class="nx-frame"></div>');
    frame.appendChild(el('<div class="nx-toolbar">' +
      '<div class="nx-pager"><button class="nx-iconbtn" data-act="prev">' + svg('<path d="m15 18-6-6 6-6"/>', 15) + '</button><span class="nx-pageno" id="selno">—</span><button class="nx-iconbtn" data-act="next">' + svg('<path d="m9 18 6-6-6-6"/>', 15) + '</button></div>' +
      '<span class="nx-tsep"></span>' +
      tkey('add', 'A', P_ADD, '新增', false, !hasNew) + tkey('edit', 'E', P_PEN, '更正') + tkey('search', 'F', P_SRCH, '查詢', !!st.search) +
      '<span class="nx-tsep"></span>' +
      tkey('del', 'D', P_TRASH, '刪除') + tkey('print', 'P', P_PRINT, '印表') + tkey('cols', 'L', P_COL, '欄位') + tkey('export', 'O', P_DL, '匯出') +
      '<span class="nx-tool-sp"></span>' + n2 + tkey('refresh', 'R', P_REF, '重新整理') + '</div>'));
    ctx._toolbar = frame.querySelector('.nx-toolbar');
    // 狀態分頁列（流程圖樣式）— 常駐於切換列右側
    var stchips = '<button class="pur-sttab all' + (st.filter == null ? ' on' : '') + '" data-f="all">全部<span class="c">' + o.rows().length + '</span></button><span class="pur-flowdiv"></span>';
    o.stages.forEach(function (sname, i) {
      var n = o.rows().filter(function (d) { return o.stageOf(d) === i; }).length;
      if (i > 0) stchips += '<span class="pur-flowarr">' + svg('<path d="M2 7h15M12 2l5 5-5 5"/>', 18) + '</span>';
      stchips += '<button class="pur-sttab node' + (st.filter === i ? ' on' : '') + '" data-f="' + i + '"><span class="pf-n">' + (i + 1) + '</span><span class="pf-l">' + esc(sname) + '</span><span class="c">' + n + '</span></button>';
    });
    hdr.appendChild(el('<div class="pur-tabbar inline flow">' + stchips + '</div>'));
    function matchSearch(d) {
      var s = st.search; if (!s) return true;
      if (s.supplier && d.supplierId !== s.supplier) return false;
      if (s.noFrom && (d.no || '') < s.noFrom) return false;
      if (s.noTo && (d.no || '') > s.noTo) return false;
      if (s.dateFrom && (d.date || '') < s.dateFrom) return false;
      if (s.dateTo && (d.date || '') > s.dateTo) return false;
      if (s.part) {
        var q = s.part.toLowerCase();
        var ids = (d.items || []).map(function (it) { return it.partId; }); if (d.partId) ids.push(d.partId);
        var hit = ids.some(function (pid) { var p = DB.byId(DB.parts, pid); return p && ((p.code || '') + ' ' + (p.brandPn || '') + ' ' + (p.name || '')).toLowerCase().indexOf(q) >= 0; });
        if (!hit) return false;
      }
      return true;
    }
    var rows = o.rows().filter(function (d) { return (st.filter == null || o.stageOf(d) === st.filter) && matchSearch(d); });
    ctx._ids = rows.map(function (d) { return o.idOf(d); }); ctx._onNew = o.onNew; ctx._onDelete = o.onDelete; ctx._openSearch = openSearchModal; ctx._detail = null; ctx._docTitle = null; ctx._editMode = null;
    if (st.sel >= rows.length) st.sel = Math.max(0, rows.length - 1);
    var thead = o.cols.map(function (c) { return '<th' + (c.r ? ' style="text-align:right"' : '') + '>' + c.th + '</th>'; }).join('');
    var wrap = el('<div class="nx-table-wrap"><table class="nx-table"><thead><tr>' + thead + '<th>狀態</th></tr></thead><tbody>' +
      rows.map(function (d, i) {
        return '<tr data-id="' + o.idOf(d) + '" class="' + (i === st.sel ? 'sel' : '') + '">' + o.cols.map(function (c) { return '<td' + (c.r ? ' style="text-align:right"' : '') + '>' + c.td(d) + '</td>'; }).join('') +
          '<td>' + o.badge(d) + '</td></tr>';
      }).join('') + (rows.length ? '' : '<tr><td colspan="' + (o.cols.length + 1) + '" style="text-align:center;color:var(--faint);padding:24px">' + (st.q ? '查無符合「' + esc(st.q) + '」的單據' : '此狀態目前無單據') + '</td></tr>') + '</tbody></table></div>');
    frame.appendChild(wrap);
    frame.appendChild(el('<div class="nx-tfoot"><span class="cnt">共 ' + rows.length + ' 張' + (st.filter == null ? '' : ' · ' + o.stages[st.filter]) + '</span>' + (st.search ? '<button class="pur-link ghost" id="clr-search" style="margin-left:10px">' + svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 12) + '查詢中 · 清除條件</button>' : '') + '</div>'));
    var cs = frame.querySelector('#clr-search'); if (cs) cs.addEventListener('click', function () { st.search = null; st.sel = 0; docList(ctx, o); toast('已清除查詢條件'); });
    ctx.content.appendChild(frame);
    function markSel() { wrap.querySelectorAll('tbody tr[data-id]').forEach(function (tr, i) { tr.classList.toggle('sel', i === st.sel); }); }
    function updateSelNo() { var e2 = frame.querySelector('#selno'); if (e2) e2.textContent = rows.length ? (st.sel + 1) + ' / ' + rows.length : '0 / 0'; }
    markSel(); updateSelNo();
    frame.querySelector('.nx-toolbar').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return; var a = b.dataset.act;
      if (a === 'flow') { st.flow = !st.flow; docList(ctx, o); }
      else if (a === 'prev') { if (st.sel > 0) { st.sel--; markSel(); updateSelNo(); } }
      else if (a === 'next') { if (st.sel < rows.length - 1) { st.sel++; markSel(); updateSelNo(); } }
      else if (a === 'add') { if (o.onNew) o.onNew(); else toast('此作業單據由上游轉入，不可手動新增', true); }
      else if (a === 'new2') { if (o.onNew2) o.onNew2(); }
      else if (a === 'edit') { var r = rows[st.sel]; if (r) { ctx.lastNo = o.idOf(r); if (ctx.poMode !== undefined) ctx.poMode = 'head'; o.open(o.idOf(r)); } else toast('請先選一筆單據', true); }
      else if (a === 'search') { openSearchModal(); }
      else if (a === 'del') { delSelected(); }
      else if (a === 'print') { toast('送出列印：' + (rows[st.sel] ? o.idOf(rows[st.sel]) : o.title) + '（規劃中）'); }
      else if (a === 'refresh') { docList(ctx, o); toast('已重新整理'); }
      else if (a === 'export') { toast('匯出 CSV／PDF（規劃中）'); }
      else if (a === 'cols') { toast('欄位顯示設定（規劃中）'); }
    });
    ctx.content.querySelectorAll('[data-f]').forEach(function (b) { b.addEventListener('click', function () { st.filter = b.dataset.f === 'all' ? null : +b.dataset.f; st.sel = 0; docList(ctx, o); }); });
    void 0;
    wrap.querySelectorAll('tbody tr[data-id]').forEach(function (tr, i) {
      tr.addEventListener('click', function () { st.sel = i; markSel(); updateSelNo(); });
      tr.addEventListener('dblclick', function () { ctx.lastNo = tr.dataset.id; o.open(tr.dataset.id); });
    });
    ctx.toDetail = function () { var r = rows[st.sel]; if (r) { ctx.lastNo = o.idOf(r); o.open(o.idOf(r)); } else detailPlaceholder(ctx); };
    ctx.listNav = function (key) {
      if (!rows.length) return false;
      if (key === 'ArrowDown') { st.sel = Math.min(rows.length - 1, st.sel + 1); markSel(); updateSelNo(); return true; }
      if (key === 'ArrowUp') { st.sel = Math.max(0, st.sel - 1); markSel(); updateSelNo(); return true; }
      if (key === 'Enter') { var r = rows[st.sel]; if (r) { ctx.lastNo = o.idOf(r); o.open(o.idOf(r)); } return true; }
      return false;
    };
    function openSearchModal() {
      var s = st.search || {};
      var supOpts = DB.partners.filter(function (p) { return p.type === 'S' && p.active; });
      var body = '<p style="font-size:12px;color:var(--muted);margin:0 0 14px;line-height:1.6">可依零件料號、供應商、單號、開單日期查詢；單號與日期支援區間（起～迄，留白則不限）。</p>' +
        '<div class="pur-doc-grid" style="gap:14px 20px">' +
        '<div class="pur-fld"><span class="k">零件料號</span><input id="s-part" placeholder="我方料號／廠牌料號／品名" value="' + esc(s.part || '') + '"></div>' +
        '<div class="pur-fld"><span class="k">供應商</span><select id="s-sup"><option value="">全部供應商</option>' + supOpts.map(function (x) { return '<option value="' + x.id + '"' + (s.supplier === x.id ? ' selected' : '') + '>' + esc(x.code + ' ' + x.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="pur-fld"><span class="k">單號（起 ～ 迄）</span><div style="display:flex;gap:8px;align-items:center"><input id="s-nof" placeholder="起始單號" value="' + esc(s.noFrom || '') + '"><span style="color:var(--faint)">～</span><input id="s-not" placeholder="結束單號" value="' + esc(s.noTo || '') + '"></div></div>' +
        '<div class="pur-fld"><span class="k">開單日期（起 ～ 迄）</span><div style="display:flex;gap:8px;align-items:center"><input id="s-df" type="date" value="' + esc(s.dateFrom || '') + '"><span style="color:var(--faint)">～</span><input id="s-dt" type="date" value="' + esc(s.dateTo || '') + '"></div></div>' +
        '</div>';
      var m = P.modal({ tag: '查詢', title: o.title + ' 查詢', wide: true, body: body,
        foot: '<button class="nx-btn ghost" id="s-clear">清除條件</button><button class="nx-btn primary" id="s-go">' + svg(P_SRCH, 15) + '查詢</button>' });
      function val(id) { var e = m.card.querySelector(id); return e ? e.value.trim() : ''; }
      m.card.querySelector('#s-go').addEventListener('click', function () {
        var ns = { part: val('#s-part'), supplier: val('#s-sup'), noFrom: val('#s-nof').toUpperCase(), noTo: val('#s-not').toUpperCase(), dateFrom: val('#s-df'), dateTo: val('#s-dt') };
        var any = Object.keys(ns).some(function (k) { return ns[k]; });
        st.search = any ? ns : null; st.sel = 0; m.close(); docList(ctx, o); toast(any ? '已套用查詢條件' : '查詢條件為空，顯示全部');
      });
      m.card.querySelector('#s-clear').addEventListener('click', function () { st.search = null; st.sel = 0; m.close(); docList(ctx, o); toast('已清除查詢條件'); });
    }
    function delSelected() {
      var r = rows[st.sel]; if (!r) { toast('請先選一筆單據', true); return; }
      if (!o.onDelete) { toast('此作業單據不支援刪除，請改用作廢／退件', true); return; }
      var id = o.idOf(r);
      P.modal({ tag: '刪除確認', title: '確定刪除 ' + id + '？', body: '<p style="font-size:13px;color:var(--muted);line-height:1.6;margin:0">刪除後不可復原。已送出／已過帳的單據不可刪除，請改用作廢或退件。</p>',
        foot: '<button class="nx-btn ghost" id="dc">取消</button><button class="nx-btn" id="dok" style="background:var(--danger);border-color:var(--danger);color:#fff">刪除</button>',
        onMount: function (card, close) { card.querySelector('#dc').addEventListener('click', close); card.querySelector('#dok').addEventListener('click', function () { close(); if (o.onDelete(id)) { st.sel = Math.max(0, st.sel - 1); toast('已刪除 ' + id, true); docList(ctx, o); } }); } });
    }
  }
    function auditTrail(d, flow, hideMeta) {
    var by = (d && d.by) ? (DB.empName ? DB.empName(d.by) : d.by) : '系統';
    var date = (d && d.date) || '—';
    var hops = (flow || []).map(function (h) { return '<span class="pur-mini done"><i></i>' + esc(h) + '</span>'; }).join('<span class="pf-mini-arr">›</span>');
    return '<div class="nx-frame"><div class="pur-sec" style="border-top:none;padding:12px 16px 0;margin:0">異動紀錄</div>' +
      '<div style="padding:8px 16px 14px;display:flex;flex-direction:column;gap:9px">' +
      (hideMeta ? '' : '<div style="display:flex;gap:24px;flex-wrap:wrap;font-size:12px;color:var(--muted)">' +
      '<span>建立：<b style="color:var(--fg)">' + esc(date) + '</b> · <b style="color:var(--fg)">' + esc(by) + '</b></span>' +
      '<span>最後修改：<b style="color:var(--fg)">' + esc(date) + '</b> · <b style="color:var(--fg)">' + esc(by) + '</b></span></div>') +
      (hops ? '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap"><span style="font-size:11px;color:var(--faint);margin-right:4px">狀態流轉：</span>' + hops + '</div>' : '') +
      '</div></div>';
  }
  function lineTable(headHtml, bodyHtml, foot) {
    return '<div class="pur-lines-wrap"><table class="pur-lines"><thead><tr>' + headHtml + '</tr></thead><tbody>' + bodyHtml + '</tbody>' + (foot ? '<tfoot>' + foot + '</tfoot>' : '') + '</table></div>';
  }
  // 唯讀＋可選的明細清單（明細編輯態下方清單唯讀，逐筆用品項彈窗編輯）
  function lineTableSel(headHtml, rowsHtml, count, selectable, emptyMsg) {
    var cls = 'pur-lines' + (selectable ? ' selectable' : '');
    var cols = (headHtml.match(/<th/g) || []).length || 1;
    var body = count ? rowsHtml : '<tr><td colspan="' + cols + '" style="text-align:center;color:var(--faint);padding:16px">' + esc(emptyMsg || '尚無資料') + '</td></tr>';
    return '<div class="pur-lines-wrap"><table class="' + cls + '"><thead><tr>' + headHtml + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  // 唯讀明細列點料號 → 開料號即時查詢（唯讀資訊卡）。全模組共用。
  function wirePartInfo(container) {
    if (!container) return;
    container.querySelectorAll('.pur-lines:not(.selectable) tbody tr[data-pid]').forEach(function (tr) {
      tr.style.cursor = 'pointer'; tr.title = '點此看料號即時資訊';
      tr.addEventListener('click', function () { var p = DB.byId(DB.parts, tr.dataset.pid); if (p) P.partInfoModal(p); });
    });
  }

  /* ============================================================ 作業 2：詢價作業 */
  function renderRfq(host) {
    var ctx = shell(host, 'pur_rfq', '只管<b>詢價單</b>（一作業一單據）；一張鎖單一供應商。非必經——要比價才詢價。先選詢價對象＋入庫地（表頭），再編明細（手 Key 或從缺貨簿導入）。流程圖收成功能鍵。');
    var RST = { open: ['m', '待詢價'], sent: ['b', '詢價中'], replied: ['g', '已回覆'] };
    function list() {
      docList(ctx, {
        icon: P.ic('pu_rfq', 16), title: '詢價單', stages: DB.RFQ_STAGE_LABEL,
        stageOf: function (r) { return DB.RFQ_STAGE[r.status]; }, rows: function () { return DB.rfqList; }, idOf: function (r) { return r.no; },
        cols: [
          { th: '詢價單號', td: function (r) { return '<span style="font-family:var(--mono);color:var(--gold-bright)">' + esc(r.no) + '</span>'; } },
          { th: '詢價對象', td: function (r) { var s = DB.byId(DB.partners, r.supplierId); return esc(s ? s.name : '') + ' ' + catChip(s); } },
          { th: '入庫地', td: function (r) { return esc((DB.byId(DB.warehouses, r.inWh) || {}).name || '—'); } },
          { th: '料件', td: function (r) { return r.items.length + ' 項'; } },
          { th: '日期', td: function (r) { return '<span style="font-family:var(--mono);color:var(--muted)">' + esc(r.date) + '</span>'; } }
        ],
        badge: function (r) { var t = RST[r.status]; return '<span class="pur-badge ' + t[0] + '">' + t[1] + '</span>'; },
        onNew: function () { editor(null); }, open: function (no) { detail(no); },
        onDelete: function (id) { var i = DB.rfqList.findIndex(function (r) { return r.no === id; }); if (i < 0) return false; if (DB.rfqList[i].status !== 'open') { toast('已發出的詢價單不可刪除', true); return false; } DB.rfqList.splice(i, 1); return true; }
      });
    }
    function detail(no) {
      var r = DB.rfqOf(no); if (!r) return; var s = DB.byId(DB.partners, r.supplierId), imp = DB.isImportSupplier(s);
      var editing = r.status !== 'replied';
      ctx.content.innerHTML = '';
      ctx._editMode = null; ctx._detail = null;
      var t = RST[r.status];
      ctx._docTitle = '<span class="nx-statedot ' + (r.status === 'replied' ? 'on' : 'off') + '"></span><span class="dt-code">' + esc(r.no) + '</span><b>' + esc(s ? s.name : '') + '</b>' + catChip(s) + ' <span class="pur-badge ' + t[0] + '">' + t[1] + '</span>';
      ctx.content.appendChild(backBar('返回列表', list, '<div class="nx-detail-actions" id="acts"></div>'));
      var card = el('<div class="nx-frame nx-detail"></div>');
      var body = el('<div class="pur-doc" style="padding-top:18px"></div>');
      body.appendChild(el('<div class="pur-doc-grid">' +
        df('單號', '<span class="v mono">' + esc(r.no) + '</span>', '建立後不可改') +
        df('詢價對象（供應商）', '<span class="v">' + esc(s ? s.name : '') + '</span>', '鎖定', true) +
        df('開單日期', '<span class="v" style="font-family:var(--mono)">' + esc(r.date) + '</span>') +
        df('有效日期', '<span class="v" style="font-family:var(--mono)">' + esc(addDays(r.date, 14)) + '</span>') +
        df('單據狀態', '<span class="v"><span class="pur-badge ' + t[0] + '">' + t[1] + '</span></span>') +
        df('入庫地', '<span class="v">' + esc((DB.byId(DB.warehouses, r.inWh) || {}).name || '—') + '</span>') +
        df('幣別', '<span class="v" style="font-family:var(--mono)">' + (s ? (s.currency || 'TWD') : '—') + '</span>') +
        df('建單人員', '<span class="v">' + esc(empNm(r.by)) + '</span>') +
        df('建單時間', '<span class="v" style="font-family:var(--mono)">' + esc(r.date) + '</span>') +
        df('修改人員', '<span class="v">' + esc(empNm(r.by)) + '</span>') +
        df('修改時間', '<span class="v" style="font-family:var(--mono)">' + esc(r.date) + '</span>') + '</div>'));
      var foot = '<tr><td colspan="' + (imp ? 3 : 2) + '" style="text-align:right">整單折讓/優惠</td><td class="num">' + (editing ? '<input class="r-disc" value="' + (r.discount || '') + '">' : 'NT$ ' + comma(r.discount)) + '</td><td class="num">含折讓 NT$ ' + comma(DB.rfqTotal(r)) + '</td></tr>';
      body.appendChild(elWrap('<div class="pur-sec" style="border-top:none;padding-top:0">詢價明細</div>' + lineTable(
        '<th>料件</th><th class="num">數量</th><th class="num">報價' + (imp ? '（' + s.currency + '）' : '') + '</th>' + (imp ? '<th class="num">換算台幣</th>' : '') + '<th class="num">交期(天)</th>',
        r.items.map(function (li, i) { var p = DB.byId(DB.parts, li.partId); return '<tr><td>' + partCell(p) + '</td><td class="num">' + li.qty + '</td>' +
          '<td class="num">' + (editing ? '<input class="r-price" data-i="' + i + '" value="' + (li.price === '' ? '' : li.price) + '">' : (li.currency === 'TWD' ? 'NT$ ' : s.currency + ' ') + comma(li.price)) + '</td>' +
          (imp ? '<td class="num" style="color:var(--muted);font-family:var(--mono)">≈ NT$ ' + comma(DB.toTwd(li.price, li.currency)) + '</td>' : '') +
          '<td class="num">' + (editing ? '<input class="r-lead" data-i="' + i + '" value="' + (li.lead || '') + '" style="width:56px">' : li.lead) + '</td></tr>'; }).join(''), foot)));
      card.appendChild(body); ctx.content.appendChild(card); ctx.content.appendChild(el(auditTrail(r, DB.RFQ_STAGE_LABEL.slice(0, (DB.RFQ_STAGE[r.status]) + 1), true)));
      if (editing) {
        body.querySelectorAll('.r-price').forEach(function (inp) { inp.addEventListener('change', function () { r.items[+inp.dataset.i].price = inp.value === '' ? '' : (+inp.value || 0); detail(no); }); });
        body.querySelectorAll('.r-lead').forEach(function (inp) { inp.addEventListener('change', function () { r.items[+inp.dataset.i].lead = +inp.value || 0; }); });
        var dc = body.querySelector('.r-disc'); if (dc) dc.addEventListener('change', function () { r.discount = +dc.value || 0; detail(no); });
      }
      var acts = ctx.content.querySelector('#acts'), btns = '';
      if (r.status === 'open') btns = '<button class="nx-btn primary" data-a="send">' + svgI('send', 15) + '發出詢價</button>';
      else if (r.status === 'sent') btns = '<button class="nx-btn primary" data-a="reply">' + svgI('check', 15) + '報價回填完成</button>';
      else btns = '';
      acts.innerHTML = btns;
      acts.querySelectorAll('[data-a]').forEach(function (b) { b.addEventListener('click', function () {
        var a = b.dataset.a;
        if (a === 'send') { r.status = 'sent'; toast('已發出詢價給 ' + (s ? s.name : '')); detail(no); }
        else if (a === 'reply') { if (r.items.some(function (li) { return li.price === '' || li.price == null; })) { toast('請先回填所有料件報價', true); return; } r.status = 'replied'; toast('報價已回填，狀態→已回覆'); detail(no); }
      }); });
    }
    function editor() {
      ctx.content.innerHTML = '';
      var work = { supplierId: '', inWh: '', items: [], lineFocus: false, sel: 0 };
      var supOpts = DB.partners.filter(function (p) { return p.type === 'S' && p.active; });
      function curSP() { return work.supplierId ? (DB.supplyMap[work.supplierId] || []).map(function (m) { return DB.byId(DB.parts, m.partId); }).filter(Boolean) : []; }
      function avail() { var used = work.items.map(function (x) { return x.partId; }); return curSP().filter(function (p) { return used.indexOf(p.id) < 0; }); }
      function addItem() {
        if (!avail().length) { toast('此供應商可供料件已全數加入', true); return; }
        P.itemEditor({ mode: 'add', leadField: true, lookupParts: avail(), lookupTitle: '料號即時查詢（限本供應商供貨）',
          onSave: function (li) { work.items.push({ partId: li.partId, qty: li.qty, lead: li.lead || '', bin: li.bin || '', note: li.note || '' }); work.sel = work.items.length - 1; work.lineFocus = true; render(); } });
      }
      function editItem() {
        var li = work.items[work.sel]; if (!li) { toast('請先選一筆品項', true); return; }
        var pool = curSP().filter(function (p) { return p.id === li.partId || work.items.every(function (x) { return x.partId !== p.id; }); });
        P.itemEditor({ mode: 'edit', leadField: true, lookupParts: pool, line: li, onSave: function (n) { work.items[work.sel] = { partId: n.partId, qty: n.qty, lead: n.lead || '', bin: n.bin || '', note: n.note || '' }; render(); } });
      }
      function delItem() { if (!work.items.length) { toast('無品項可刪除', true); return; } work.items.splice(work.sel, 1); work.sel = Math.max(0, work.sel - 1); render(); }
      function doImport() { var sp = curSP(); var n = 0; DB.shortageRows().forEach(function (sr) { if (sp.some(function (p) { return p.id === sr.part.id; }) && !work.items.some(function (x) { return x.partId === sr.part.id; })) { work.items.push({ partId: sr.part.id, qty: sr.reqQty }); n++; } }); toast(n ? '已從缺貨簿批次匯入 ' + n + ' 項（限本供應商可供）' : '缺貨簿無這家可供的缺料'); work.lineFocus = true; render(); }
      function reorder() { work.items.sort(function (a, b) { var pa = DB.byId(DB.parts, a.partId), pb = DB.byId(DB.parts, b.partId); return ((pa ? pa.code : '') + '').localeCompare((pb ? pb.code : '') + ''); }); toast('已依料號 A→Z 重排項次'); render(); }
      function doSave() { if (!work.supplierId) { toast('請選擇詢價對象', true); return; } if (!work.items.length) { toast('明細不可為空，新增單將放棄建檔（失效）', true); return; } var sup = DB.byId(DB.partners, work.supplierId); var no = 'RFQ-2026-' + String(44 + DB.rfqList.length).padStart(4, '0'); DB.rfqList.unshift({ id: no, no: no, supplierId: work.supplierId, inWh: work.inWh, status: 'open', date: '2026-06-13', by: 'Y0006', discount: 0, items: work.items.map(function (li) { var sm = (DB.supplyMap[work.supplierId] || []).filter(function (m) { return m.partId === li.partId; })[0]; return { partId: li.partId, qty: li.qty, price: '', currency: sup.currency || 'TWD', lead: li.lead || (sm ? sm.lead : '') }; }) }); toast('已建立詢價單 ' + no + '（向 ' + sup.name + '）'); ctx._editMode = null; detail(no); }
      function listHtml() {
        return lineTableSel('<th style="width:46px">項次</th><th>料件</th><th class="num">數量</th><th>庫位</th><th>備註</th>',
          work.items.map(function (li, i) { var p = DB.byId(DB.parts, li.partId); return '<tr data-li="' + i + '" class="' + (i === work.sel ? 'sel' : '') + '"><td class="num">' + (i + 1) + '</td><td>' + partCell(p) + '</td><td class="num">' + li.qty + '</td><td>' + esc(li.bin || '—') + '</td><td style="color:var(--muted)">' + esc(li.note || '—') + '</td></tr>'; }).join(''),
          work.items.length, work.lineFocus, '尚無料件，按工具列「I 編輯明細」再「A 新增品項」或「T 批次匯入」');
      }
      function wireSel() { ctx.content.querySelectorAll('.pur-lines.selectable tbody tr[data-li]').forEach(function (tr) { tr.addEventListener('click', function () { work.sel = +tr.dataset.li; ctx.content.querySelectorAll('.pur-lines.selectable tbody tr').forEach(function (t) { t.classList.toggle('sel', t === tr); }); }); tr.addEventListener('dblclick', function () { if (work.lineFocus) { work.sel = +tr.dataset.li; editItem(); } }); }); }
      function render() {
        var sup = work.supplierId ? DB.byId(DB.partners, work.supplierId) : null;
        ctx.content.innerHTML = '';
        ctx._editMode = work.lineFocus ? 'line' : 'head';
        ctx._detail = { canLine: !!work.supplierId, lineEdit: function () { if (!work.supplierId) { toast('請先選詢價對象', true); return; } work.lineFocus = true; render(); }, save: function () { if (!work.lineFocus) { if (!work.supplierId) { toast('請先選詢價對象', true); return; } work.lineFocus = true; render(); } else { doSave(); } }, cancel: list, addItem: addItem, editItem: editItem, delItem: delItem, batchImport: doImport, reorder: work.items.length > 1 ? reorder : null };
        ctx.content.appendChild(backBar('返回列表', list, ''));
        var card = el('<div class="nx-frame nx-detail"></div>');
        card.appendChild(el('<div class="nx-detail-bar"><span class="nx-statedot off"></span><div class="nx-detail-id"><span class="code">（存檔後給號）</span><b>新增詢價單</b></div><span class="pur-badge gold">' + (work.lineFocus ? '明細編輯態' : '表頭編輯態') + '</span></div>'));
        var body = el('<div class="pur-doc"></div>');
        body.appendChild(el('<div class="pur-doc-grid">' +
          '<div class="pur-fld"><span class="k"><span class="req">*</span>詢價對象（供應商）</span><select id="e-sup"' + (work.lineFocus ? ' disabled' : '') + '><option value="">請選擇供應商</option>' +
          supOpts.map(function (x) { return '<option value="' + x.id + '"' + (x.id === work.supplierId ? ' selected' : '') + '>' + esc(x.code + ' ' + x.name) + (DB.isImportSupplier(x) ? '（進口）' : '（國內）') + '</option>'; }).join('') + '</select></div>' +
          '<div class="pur-fld"><span class="k">入庫地</span><select id="e-wh"' + (work.supplierId && !work.lineFocus ? '' : ' disabled') + '>' + DB.warehouses.filter(function (w) { return w.active; }).map(function (w) { return '<option value="' + w.id + '"' + (w.id === work.inWh ? ' selected' : '') + '>' + esc(w.name) + '</option>'; }).join('') + '</select></div>' +
          df('幣別', '<span class="v" style="font-family:var(--mono)">' + (sup ? (sup.currency || 'TWD') : '—') + '</span>') + '</div>'));
        if (!work.supplierId) body.appendChild(el('<div class="pur-empty" style="padding:30px">' + svgI('warn', 30) + '請先在表頭選好詢價對象，再按「I 編輯明細」逐筆加料件（明細只能加這家供貨對應有的料件）。</div>'));
        else body.appendChild(elWrap('<div class="pur-sec">詢價明細' + (work.lineFocus ? '（明細編輯態 · 下方清單唯讀，請用工具列 A 新增 / E 更正 / T 批次匯入）' : '') + '</div>' + listHtml()));
        card.appendChild(body); ctx.content.appendChild(card);
        var supSel = ctx.content.querySelector('#e-sup'); if (supSel && !work.lineFocus) supSel.addEventListener('change', function (e) { work.supplierId = e.target.value; var ns = DB.byId(DB.partners, work.supplierId); work.inWh = ns ? ns.defaultInWh : ''; work.items = []; work.sel = 0; render(); });
        var wh = ctx.content.querySelector('#e-wh'); if (wh && !work.lineFocus) wh.addEventListener('change', function (e) { work.inWh = e.target.value; });
        wireSel();
      }
      render();
    }
    list();
  }
  function makePoFromRfq(r) {
    var sup = DB.byId(DB.partners, r.supplierId), no = 'PO-2026-' + String(119 + DB.poList.length).padStart(4, '0');
    var po = { id: no, no: no, supplierId: r.supplierId, status: 'draft', date: '2026-06-13', by: 'Y0006', srcRfq: r.no, payTerm: sup.payTerm, inWh: r.inWh || sup.defaultInWh, eta: '', currency: sup.currency || 'TWD', rate: DB.isImportSupplier(sup) ? 31.5 : 1, tradeTerm: sup.tradeTerm, importPayTerm: sup.importPayTerm,
      items: r.items.map(function (li) { return { partId: li.partId, qty: li.qty, received: 0, cancelled: 0, price: li.price || 0, eta: '' }; }) };
    DB.poList.unshift(po); return po;
  }

  /* ============================================================ 作業 3：採購作業 */
  function poTotal(o) { return o.items.reduce(function (s, it) { return s + (it.qty - (it.cancelled || 0)) * (+it.price || 0); }, 0); }
  function renderPo(host) {
    var ctx = shell(host, 'pur_po', '只管<b>採購單</b>。國內外共用（選供應商後依國別自動判國內/進口）。新增先選採購對象＋入庫地，再編明細（手 Key、從詢價單導入、或特殊採購免詢價直接開）。送審→主管簽核→廠商確認後結案轉進貨。');
    function list() {
      docList(ctx, {
        icon: P.ic('pu_po', 16), title: '採購單', stages: DB.PO_STAGE_LABEL,
        stageOf: function (o) { return DB.PO_STAGE(o.status); }, rows: function () { return DB.poList.filter(function (o) { return o.status !== 'void'; }); }, idOf: function (o) { return o.no; },
        cols: [
          { th: '採購單號', td: function (o) { return '<span style="font-family:var(--mono);color:var(--gold-bright)">' + esc(o.no) + '</span>'; } },
          { th: '採購對象', td: function (o) { var s = DB.byId(DB.partners, o.supplierId); return esc(s ? s.name : '') + ' ' + catChip(s); } },
          { th: '開單日期', td: function (o) { return '<span style="font-family:var(--mono);color:var(--muted)">' + esc(o.date) + '</span>'; } },
          { th: '採購類別', td: function (o) { return DB.isImportSupplier(DB.byId(DB.partners, o.supplierId)) ? '進口' : '國內'; } },
          { th: '總金額', r: true, td: function (o) { return money(poTotal(o), o.currency); } },
          { th: '預計到貨日', td: function (o) { return '<span style="font-family:var(--mono);color:var(--muted)">' + esc(o.eta || '—') + '</span>'; } }
        ],
        badge: function (o) { return poBadge(o.status); },
        onNew: function () { editor(null); }, onNew2: function () { importFromRfq(); }, new2Label: '從詢價單導入',
        open: function (no) { ctx.poMode = 'view'; detail(no); },
        onDelete: function (id) { var i = DB.poList.findIndex(function (o2) { return o2.no === id; }); if (i < 0) return false; if (DB.poList[i].status !== 'draft') { toast('非草稿的採購單不可刪除，請改用作廢／退件', true); return false; } DB.poList.splice(i, 1); return true; }
      });
    }
    function importFromRfq() {
      var replied = DB.rfqList.filter(function (r) { return r.status === 'replied'; });
      var body = replied.length ? '<p style="font-size:12.5px;color:var(--muted);margin:0 0 10px">選一張已回覆的詢價單，帶出採購單草稿：</p>' + replied.map(function (r) { var s = DB.byId(DB.partners, r.supplierId); return '<div class="pur-inbox-card"><div class="ico">' + svgI('pu_rfq' in P.I ? 'history' : 'history', 18) + '</div><div class="bd"><div class="r1"><span class="src">' + esc(r.no) + '</span>' + catChip(s) + '<span class="meta">' + esc(s ? s.name : '') + ' · ' + r.items.length + ' 項 · NT$ ' + comma(DB.rfqTotal(r)) + '</span></div></div><div class="acts"><button class="pur-link" data-r="' + r.no + '">帶出採購單</button></div></div>'; }).join('') : '<div class="pur-empty">' + svgI('warn', 30) + '目前沒有「已回覆」的詢價單可導入。</div>';
      var m = P.modal({ tag: '從詢價單導入', title: '選擇來源詢價單', wide: true, body: '<div class="pur-inbox-list">' + body + '</div>' });
      m.card.querySelectorAll('[data-r]').forEach(function (b) { b.addEventListener('click', function () { var po = makePoFromRfq(DB.rfqOf(b.dataset.r)); m.close(); ctx.poMode = 'view'; toast('已從 ' + b.dataset.r + ' 帶出採購單 ' + po.no); detail(po.no); }); });
    }
    function detail(no) {
      var o = DB.poOf(no); if (!o) return; var sup = DB.byId(DB.partners, o.supplierId), imp = DB.isImportSupplier(sup);
      var mode = ctx.poMode || 'view', hEdit = mode !== 'view', lEdit = mode === 'line', canEdit = o.status === 'draft';
      var PENCIL = '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>';
      ctx.content.innerHTML = '';
      ctx._editMode = mode === 'view' ? null : mode;
      if (ctx._poLineSel == null || ctx._poLineSel >= o.items.length) ctx._poLineSel = 0;
      function usedExcept(idx) { return o.items.filter(function (x, i) { return i !== idx; }).map(function (x) { return x.partId; }); }
      ctx._detail = {
        canCorrect: canEdit && mode === 'view',
        correct: function () { ctx.poMode = 'head'; detail(no); },
        canLine: canEdit,
        lineEdit: function () { collect(); ctx.poMode = 'line'; detail(no); },
        save: function () { collect(); ctx.poMode = 'view'; toast('已存檔採購單 ' + o.no); detail(no); },
        cancel: function () { ctx.poMode = 'view'; detail(no); },
        addItem: function () { collect(); var used = o.items.map(function (x) { return x.partId; }); var pool = DB.parts.filter(function (x) { return x.active && used.indexOf(x.id) < 0; }); if (!pool.length) { toast('已無可新增的料件', true); return; } P.itemEditor({ mode: 'add', priceField: true, currency: o.currency, lookupParts: pool, onSave: function (li) { o.items.push({ partId: li.partId, qty: li.qty, received: 0, cancelled: 0, price: +li.price || 0, eta: '', bin: li.bin || '', note: li.note || '' }); ctx._poLineSel = o.items.length - 1; detail(no); } }); },
        editItem: function () { var it = o.items[ctx._poLineSel]; if (!it) { toast('請先選一筆品項', true); return; } var pool = DB.parts.filter(function (x) { return x.active && (x.id === it.partId || usedExcept(ctx._poLineSel).indexOf(x.id) < 0); }); P.itemEditor({ mode: 'edit', priceField: true, currency: o.currency, lookupParts: pool, line: { partId: it.partId, qty: it.qty, price: it.price, bin: it.bin, note: it.note }, onSave: function (n) { it.partId = n.partId; it.qty = n.qty; it.price = +n.price || 0; it.bin = n.bin || ''; it.note = n.note || ''; detail(no); } }); },
        delItem: function () { if (o.items.length <= 1) { toast('至少保留一個品項', true); return; } o.items.splice(ctx._poLineSel, 1); ctx._poLineSel = Math.max(0, ctx._poLineSel - 1); toast('已刪除品項', true); detail(no); },
        batchImport: function () { var used = o.items.map(function (x) { return x.partId; }); var n = 0; DB.shortageRows().forEach(function (sr) { if (used.indexOf(sr.part.id) < 0) { o.items.push({ partId: sr.part.id, qty: sr.reqQty, received: 0, cancelled: 0, price: sr.part.cost || 0, eta: '' }); used.push(sr.part.id); n++; } }); toast(n ? '已從缺貨簿批次匯入 ' + n + ' 項' : '缺貨簿料件都已在單上'); detail(no); },
        reorder: canEdit ? function () { o.items.sort(function (a, b) { var pa = DB.byId(DB.parts, a.partId), pb = DB.byId(DB.parts, b.partId); return ((pa ? pa.code : '') + '').localeCompare((pb ? pb.code : '') + ''); }); toast('已依料號 A→Z 重排項次'); detail(no); } : null
      };
      ctx.content.appendChild(backBar('返回列表', function () { ctx.poMode = 'view'; list(); }, '<div class="nx-detail-actions" id="acts"></div>'));
      var card = el('<div class="nx-frame nx-detail"></div>');
      setDocTitle(['confirmed', 'approved', 'sent'].indexOf(o.status) >= 0, o.no, sup ? sup.name : '', catChip(sup) + (o.srcRfq ? ' <span class="pur-badge b">源自 ' + esc(o.srcRfq) + '</span>' : '') + (hEdit ? ' <span class="pur-badge gold">' + (lEdit ? '明細編輯態' : '表頭編輯態') + '</span>' : ''), poBadge(o.status));
      var body = el('<div class="pur-doc" style="padding-top:18px"></div>');
      var whOpts = DB.warehouses.filter(function (w) { return w.active; });
      body.appendChild(el('<div class="pur-doc-grid">' +
        df('單號', '<span class="v mono">' + esc(o.no) + '</span>', '建立後不可改') +
        df('採購對象（供應商）', '<span class="v">' + esc(sup ? sup.name : '') + '</span>', '鎖定', true) +
        df('採購類別', '<span class="v">' + (imp ? '進口' : '國內') + ' <span style="font-size:11px;color:var(--faint)">（依國別自動判定）</span></span>') +
        df('入庫地', hEdit ? '<select id="h-wh">' + whOpts.map(function (w) { return '<option value="' + w.id + '"' + (w.id === o.inWh ? ' selected' : '') + '>' + esc(w.name) + '</option>'; }).join('') + '</select>' : '<span class="v">' + esc((DB.byId(DB.warehouses, o.inWh) || {}).name || '—') + '</span>') +
        df('預計到貨日', hEdit ? '<input id="h-eta" type="date" value="' + esc(o.eta || '') + '">' : '<span class="v" style="font-family:var(--mono)">' + esc(o.eta || '—') + '</span>') +
        df('付款條件', hEdit ? '<input id="h-pay" value="' + esc(o.payTerm || '') + '">' : '<span class="v">' + esc(o.payTerm || '—') + '</span>') +
        df('總金額', '<span class="v">' + money(poTotal(o), o.currency) + (imp ? ' <span class="twd2">≈ NT$ ' + comma(poTotal(o) * (o.rate || 31.5)) + '</span>' : '') + '</span>') +
        (imp ? '<div class="pur-sec">國外額外欄位（進口才顯示）</div>' + df('幣別 / 匯率', '<span class="v" style="font-family:var(--mono)">' + esc(o.currency) + ' / ' + (o.rate || 31.5) + '</span>') + df('貿易條件 / 進口付款', '<span class="v">' + esc(o.tradeTerm || '—') + ' / ' + esc(o.importPayTerm || '—') + '</span>') : '') + '</div>'));
      var poRows = o.items.map(function (it, i) { var p = DB.byId(DB.parts, it.partId); return '<tr data-li="' + i + '" class="' + (lEdit && i === ctx._poLineSel ? 'sel' : '') + '"><td class="num">' + (i + 1) + '</td><td>' + partCell(p) + '</td><td class="num">' + it.qty + '</td><td class="num">' + (it.received || 0) + '/' + (it.cancelled || 0) + '</td><td class="num">' + (imp ? o.currency + ' ' : '') + comma(it.price) + '</td><td class="num">' + (imp ? o.currency + ' ' : 'NT$ ') + comma((it.qty - (it.cancelled || 0)) * it.price) + '</td></tr>'; }).join('');
      body.appendChild(elWrap('<div class="pur-sec" style="border-top:none;padding-top:0">採購明細' + (lEdit ? '（明細編輯態 · 下方清單唯讀，用工作列 A 新增 / E 更正 / D 刪除 / T 批次匯入）' : '') + '</div>' +
        '<div class="pur-lines-wrap"><table class="pur-lines' + (lEdit ? ' selectable' : '') + '"><thead><tr><th>項次</th><th>我方料號 / 廠牌 / 品名</th><th class="num">數量</th><th class="num">已進/取消</th><th class="num">單價</th><th class="num">金額</th></tr></thead><tbody>' + poRows + '</tbody><tfoot><tr><td colspan="5" style="text-align:right">總金額（含稅）</td><td class="num">' + (imp ? o.currency + ' ' : 'NT$ ') + comma(poTotal(o)) + '</td></tr></tfoot></table></div>'));
      body.insertBefore(el(metaFields(o, poBadge(o.status), { valid: true })), body.children[1] || null);
      card.appendChild(body); ctx.content.appendChild(card); ctx.content.appendChild(el(auditTrail(o, DB.PO_STAGE_LABEL.slice(0, (DB.PO_STAGE(o.status)) + 1), true)));
      if (lEdit) ctx.content.querySelectorAll('.pur-lines.selectable tbody tr[data-li]').forEach(function (tr) { tr.addEventListener('click', function () { ctx._poLineSel = +tr.dataset.li; ctx.content.querySelectorAll('.pur-lines.selectable tbody tr').forEach(function (t) { t.classList.toggle('sel', t === tr); }); }); tr.addEventListener('dblclick', function () { ctx._poLineSel = +tr.dataset.li; ctx._detail.editItem(); }); });
      var acts = ctx.content.querySelector('#acts'), btns = '';
      if (mode === 'view') {
        if (o.status === 'draft') btns += '<button class="nx-btn ghost" data-a="void">作廢</button><button class="nx-btn primary" data-a="submit">' + svgI('arrowR', 15) + '送審</button>';
        else if (o.status === 'pending') btns += '<button class="nx-btn ghost" data-a="reject">退件</button><button class="nx-btn primary" data-a="approve">' + svgI('check', 15) + '主管簽核</button>';
        else if (o.status === 'approved') btns += '<button class="nx-btn primary" data-a="send">' + svgI('send', 15) + '寄廠商</button>';
        else if (o.status === 'sent') btns += '<button class="nx-btn primary" data-a="confirm">' + svgI('check', 15) + '廠商確認</button>';
        else if (o.status === 'confirmed') btns += '<button class="nx-btn primary" data-a="toin">' + svgI('arrowR', 15) + '轉進貨作業</button>';
      } else if (mode === 'head') {
        btns = '';
      } else {
        btns = '';
      }
      acts.innerHTML = btns;
      function collect() {
        var wh = ctx.content.querySelector('#h-wh'); if (wh) o.inWh = wh.value;
        var eta = ctx.content.querySelector('#h-eta'); if (eta) o.eta = eta.value;
        var pay = ctx.content.querySelector('#h-pay'); if (pay) o.payTerm = pay.value;
        ctx.content.querySelectorAll('.l-qty').forEach(function (inp) { o.items[+inp.dataset.i].qty = +inp.value || 0; });
        ctx.content.querySelectorAll('.l-price').forEach(function (inp) { o.items[+inp.dataset.i].price = +inp.value || 0; });
      }
      acts.querySelectorAll('[data-a]').forEach(function (b) { b.addEventListener('click', function () {
        var a = b.dataset.a;
        if (a === 'correct') { ctx.poMode = 'head'; detail(no); }
        else if (a === 'toline') { collect(); ctx.poMode = 'line'; detail(no); }
        else if (a === 'cancel') { ctx.poMode = 'view'; detail(no); }
        else if (a === 'save') { collect(); ctx.poMode = 'view'; toast('已存檔採購單 ' + o.no); detail(no); }
        else if (a === 'submit') { o.status = 'pending'; toast('已送審，表頭明細鎖定'); detail(no); }
        else if (a === 'approve') { o.status = 'approved'; toast('主管已簽核（需核准權限）'); detail(no); }
        else if (a === 'reject') { o.status = 'draft'; toast('已退件，退回採購編輯', true); detail(no); }
        else if (a === 'send') { o.status = 'sent'; toast('已寄給廠商'); detail(no); }
        else if (a === 'confirm') { o.status = 'confirmed'; toast('廠商已確認接單'); detail(no); }
        else if (a === 'void') { o.status = 'void'; toast('已作廢', true); ctx.poMode = 'view'; list(); }
        else if (a === 'toin') { var im = DB.isImportSupplier(sup); toast('已轉「' + (im ? '國外' : '國內') + '進貨作業」'); setTimeout(function () { if (window.nxNavigate) window.nxNavigate({ module: 'purchase', page: im ? 'pur_foreign' : 'pur_domestic' }); }, 500); }
      }); });
    }

    function editor() {
      ctx.content.innerHTML = '';
      var work = { supplierId: '', inWh: '', items: [], lineFocus: false, sel: 0 };
      var supOpts = DB.partners.filter(function (p) { return p.type === 'S' && p.active; });
      function avail() { var used = work.items.map(function (x) { return x.partId; }); return DB.parts.filter(function (p) { return p.active && used.indexOf(p.id) < 0; }); }
      function cur() { var s = work.supplierId ? DB.byId(DB.partners, work.supplierId) : null; return s ? (s.currency || 'TWD') : 'TWD'; }
      function addItem() { if (!avail().length) { toast('已無可新增的料件', true); return; } P.itemEditor({ mode: 'add', priceField: true, currency: cur(), lookupParts: avail(), onSave: function (li) { work.items.push({ partId: li.partId, qty: li.qty, price: +li.price || 0, bin: li.bin || '', note: li.note || '' }); work.sel = work.items.length - 1; work.lineFocus = true; render(); } }); }
      function editItem() { var li = work.items[work.sel]; if (!li) { toast('請先選一筆品項', true); return; } var pool = DB.parts.filter(function (p) { return p.active && (p.id === li.partId || work.items.every(function (x) { return x.partId !== p.id; })); }); P.itemEditor({ mode: 'edit', priceField: true, currency: cur(), lookupParts: pool, line: li, onSave: function (n) { work.items[work.sel] = { partId: n.partId, qty: n.qty, price: +n.price || 0, bin: n.bin || '', note: n.note || '' }; render(); } }); }
      function delItem() { if (!work.items.length) { toast('無品項可刪除', true); return; } work.items.splice(work.sel, 1); work.sel = Math.max(0, work.sel - 1); render(); }
      function doImport() { var used = work.items.map(function (x) { return x.partId; }); var n = 0; DB.shortageRows().forEach(function (sr) { if (used.indexOf(sr.part.id) < 0) { work.items.push({ partId: sr.part.id, qty: sr.reqQty, price: sr.part.cost || 0 }); used.push(sr.part.id); n++; } }); toast(n ? '已從缺貨簿批次匯入 ' + n + ' 項' : '缺貨簿料件都已在單上'); work.lineFocus = true; render(); }
      function reorder() { work.items.sort(function (a, b) { var pa = DB.byId(DB.parts, a.partId), pb = DB.byId(DB.parts, b.partId); return ((pa ? pa.code : '') + '').localeCompare((pb ? pb.code : '') + ''); }); toast('已依料號 A→Z 重排項次'); render(); }
      function doSave() { if (!work.supplierId) { toast('請選擇採購對象', true); return; } if (!work.items.length) { toast('明細不可為空，新增單將放棄建檔（失效）', true); return; } var s = DB.byId(DB.partners, work.supplierId), no = 'PO-2026-' + String(119 + DB.poList.length).padStart(4, '0'); DB.poList.unshift({ id: no, no: no, supplierId: work.supplierId, status: 'draft', date: '2026-06-13', by: 'Y0006', payTerm: s.payTerm, inWh: work.inWh, eta: '', currency: s.currency || 'TWD', rate: DB.isImportSupplier(s) ? 31.5 : 1, tradeTerm: s.tradeTerm, importPayTerm: s.importPayTerm, items: work.items.map(function (li) { return { partId: li.partId, qty: li.qty, received: 0, cancelled: 0, price: +li.price || 0, eta: '', bin: li.bin || '', note: li.note || '' }; }) }); ctx.poMode = 'line'; ctx._poLineSel = 0; toast('已建立採購單 ' + no + '，自動跳明細層'); detail(no); }
      function listHtml() {
        var imp = work.supplierId ? DB.isImportSupplier(DB.byId(DB.partners, work.supplierId)) : false;
        return lineTableSel('<th style="width:46px">項次</th><th>料件</th><th class="num">數量</th><th class="num">單價' + (imp ? '（' + cur() + '）' : '') + '</th><th>庫位</th>',
          work.items.map(function (li, i) { var p = DB.byId(DB.parts, li.partId); return '<tr data-li="' + i + '" class="' + (i === work.sel ? 'sel' : '') + '"><td class="num">' + (i + 1) + '</td><td>' + partCell(p) + '</td><td class="num">' + li.qty + '</td><td class="num">' + (imp ? cur() + ' ' : 'NT$ ') + comma(li.price || 0) + '</td><td>' + esc(li.bin || '—') + '</td></tr>'; }).join(''),
          work.items.length, work.lineFocus, '尚無料件，按工具列「I 編輯明細」再「A 新增品項」或「T 批次匯入」');
      }
      function wireSel() { ctx.content.querySelectorAll('.pur-lines.selectable tbody tr[data-li]').forEach(function (tr) { tr.addEventListener('click', function () { work.sel = +tr.dataset.li; ctx.content.querySelectorAll('.pur-lines.selectable tbody tr').forEach(function (t) { t.classList.toggle('sel', t === tr); }); }); tr.addEventListener('dblclick', function () { if (work.lineFocus) { work.sel = +tr.dataset.li; editItem(); } }); }); }
      function render() {
        var sup = work.supplierId ? DB.byId(DB.partners, work.supplierId) : null, imp = sup ? DB.isImportSupplier(sup) : false;
        ctx.content.innerHTML = '';
        ctx._editMode = work.lineFocus ? 'line' : 'head';
        ctx._detail = { canLine: !!work.supplierId, lineEdit: function () { if (!work.supplierId) { toast('請先選採購對象', true); return; } work.lineFocus = true; render(); }, save: function () { if (!work.lineFocus) { if (!work.supplierId) { toast('請先選採購對象', true); return; } work.lineFocus = true; render(); } else { doSave(); } }, cancel: list, addItem: addItem, editItem: editItem, delItem: delItem, batchImport: doImport, reorder: work.items.length > 1 ? reorder : null };
        ctx.content.appendChild(backBar('返回列表', list, ''));
        var card = el('<div class="nx-frame nx-detail"></div>');
        card.appendChild(el('<div class="nx-detail-bar"><span class="nx-statedot off"></span><div class="nx-detail-id"><span class="code">（存檔後給號）</span><b>特殊採購（免詢價）</b></div><span class="pur-badge gold">' + (work.lineFocus ? '明細編輯態' : '表頭編輯態') + '</span></div>'));
        var body = el('<div class="pur-doc"></div>');
        body.appendChild(el('<div class="pur-doc-grid">' +
          '<div class="pur-fld"><span class="k"><span class="req">*</span>採購對象（供應商）</span><select id="e-sup"' + (work.lineFocus ? ' disabled' : '') + '><option value="">請選擇供應商</option>' + supOpts.map(function (x) { return '<option value="' + x.id + '"' + (x.id === work.supplierId ? ' selected' : '') + '>' + esc(x.code + ' ' + x.name) + (DB.isImportSupplier(x) ? '（進口）' : '（國內）') + '</option>'; }).join('') + '</select></div>' +
          '<div class="pur-fld"><span class="k">入庫地</span><select id="e-wh"' + (work.supplierId && !work.lineFocus ? '' : ' disabled') + '>' + DB.warehouses.filter(function (w) { return w.active; }).map(function (w) { return '<option value="' + w.id + '"' + (w.id === work.inWh ? ' selected' : '') + '>' + esc(w.name) + '</option>'; }).join('') + '</select></div>' +
          df('採購類別', '<span class="v">' + (sup ? (imp ? '進口' : '國內') : '—') + '</span>') + '</div>'));
        if (!work.supplierId) body.appendChild(el('<div class="pur-empty" style="padding:30px">' + svgI('warn', 30) + '請先在表頭選好採購對象＋入庫地，再按「I 編輯明細」逐筆加料件。</div>'));
        else body.appendChild(elWrap('<div class="pur-sec">採購明細' + (work.lineFocus ? '（明細編輯態 · 下方清單唯讀，用工具列 A 新增 / E 更正 / T 批次匯入）' : '') + '</div>' + listHtml()));
        card.appendChild(body); ctx.content.appendChild(card);
        var supSel = ctx.content.querySelector('#e-sup'); if (supSel && !work.lineFocus) supSel.addEventListener('change', function (e) { work.supplierId = e.target.value; var ns = DB.byId(DB.partners, work.supplierId); work.inWh = ns ? ns.defaultInWh : ''; render(); });
        var wh = ctx.content.querySelector('#e-wh'); if (wh && !work.lineFocus) wh.addEventListener('change', function (e) { work.inWh = e.target.value; });
        wireSel();
      }
      render();
    }
    list();
  }

  /* ============================================================ 作業 4：國內進貨作業 */
  function grnLines(g, withStock) {
    return lineTable('<th>我方料號 / 廠牌 / 品名</th>' + (withStock ? '<th class="num">目前庫存</th>' : '') + '<th class="num">預期量</th><th class="num">實際量</th><th class="num">瑕疵</th><th>瑕疵類型</th><th>批號</th><th class="num">入庫成本</th>',
      g.items.map(function (it) { var p = DB.byId(DB.parts, it.partId); return '<tr data-pid="' + it.partId + '"><td>' + partCell(p) + '</td>' + (withStock ? '<td class="num">' + P.stockCell(DB.stockOf(it.partId), p ? +p.safeQty : 0) + '</td>' : '') + '<td class="num">' + it.expectQty + '</td><td class="num">' + (it.actualQty || '—') + '</td><td class="num">' + (it.defectQty || 0) + '</td><td>' + esc(it.defectType || '—') + '</td><td style="font-family:var(--mono);font-size:11px;color:var(--muted)">' + esc(it.batchNo || '（入帳產生）') + '</td><td class="num">' + money(it.inCost, 'TWD') + '</td></tr>'; }).join(''));
  }
  function postEntryModal(g, onDone) {
    var sup = DB.byId(DB.partners, g.supplierId);
    var body = '<p style="font-size:12.5px;color:var(--muted);margin:0 0 12px">進貨<b>入帳</b>由進貨模組做（實體驗收與庫存數量增加由庫存模組完成）。入帳一次做三件事：</p><div class="pur-post-list">' +
      ['更新移動平均成本｜以本次入庫成本重算', '產生應付帳｜對 ' + esc(sup ? sup.name : '') + ' 認列應付（時點對齊財務 NX05）', '更新「最後進貨時間」｜寫回零件主檔，並回寫採購單已進量'].map(function (t, i) { var m = t.split('｜'); return '<div class="pur-post-item"><span class="n">' + (i + 1) + '</span><span class="t">' + esc(m[0]) + '<span>' + esc(m[1]) + '</span></span></div>'; }).join('') + '</div>';
    var m = P.modal({ tag: '進貨入帳', title: '入帳確認', wide: true, body: body, foot: '<button class="nx-btn ghost" id="c">取消</button><button class="nx-btn primary" id="ok">' + svgI('check', 15) + '確認入帳</button>' });
    m.card.querySelector('#c').addEventListener('click', m.close); m.card.querySelector('#ok').addEventListener('click', function () { m.close(); onDone(); });
  }
  function renderDomestic(host) {
    var ctx = shell(host, 'pur_domestic', '採購確認後、國內供應商到貨的進貨單。<b>驗收由庫存模組做</b>（清點、查瑕疵、實體入庫）、回報狀況；<b>入帳由進貨模組做</b>（移動平均成本／應付帳／最後進貨時間）。流程圖收成功能鍵。');
    var ST = { wait: ['m', '待到貨'], inspect: ['o', '待驗收'], dispose: ['r', '待處置'], done: ['g', '已完成'] };
    function list() {
      docList(ctx, {
        icon: svgI('pu_domestic' in P.I ? 'pu_domestic' : 'history', 16), title: '進貨單（國內）', stages: DB.GRN_DOM_LABEL,
        stageOf: function (g) { return DB.GRN_DOM_STAGE[g.status]; }, rows: function () { return DB.grnList.filter(function (g) { return g.kind === 'domestic'; }); }, idOf: function (g) { return g.no; },
        cols: [
          { th: '進貨單號', td: function (g) { return '<span style="font-family:var(--mono);color:var(--gold-bright)">' + esc(g.no) + '</span>'; } },
          { th: '供應商', td: function (g) { var s = DB.byId(DB.partners, g.supplierId); return esc(s ? s.name : ''); } },
          { th: '對應採購單', td: function (g) { return '<span style="font-family:var(--mono);color:var(--muted)">' + esc(g.poNo) + '</span>'; } },
          { th: '入庫倉', td: function (g) { return esc((DB.byId(DB.warehouses, g.inWh) || {}).name || ''); } },
          { th: '到貨日', td: function (g) { return '<span style="font-family:var(--mono);color:var(--muted)">' + esc(g.date) + '</span>'; } },
          { th: '物流追蹤', td: function (g) { return '<span style="font-family:var(--mono);color:var(--muted)">' + esc(g.tracking || '—') + '</span>'; } }
        ],
        badge: function (g) { var t = ST[g.status]; return '<span class="pur-badge ' + t[0] + '">' + t[1] + '</span>'; }, open: function (no) { detail(no); }
      });
    }
    function detail(no) {
      var g = DB.grnList.filter(function (x) { return x.no === no; })[0]; if (!g) return; var sup = DB.byId(DB.partners, g.supplierId);
      ctx.content.innerHTML = '';
      ctx.content.appendChild(backBar('返回列表', list, '<div class="nx-detail-actions" id="acts"></div>'));
      var t = ST[g.status];
      var card = el('<div class="nx-frame nx-detail"></div>');
      setDocTitle(g.status === 'done', g.no, sup ? sup.name : '', '<span class="pur-cat dom">國內</span>', '<span class="pur-badge ' + t[0] + '">' + t[1] + '</span>');
      var body = el('<div class="pur-doc" style="padding-top:18px"></div>');
      body.appendChild(el('<div class="pur-doc-grid">' + df('進貨單號', '<span class="v mono">' + esc(g.no) + '</span>', '建立後不可改') + df('來源採購單', '<span class="v mono">' + esc(g.poNo) + '</span>') + df('入庫倉', '<span class="v">' + esc((DB.byId(DB.warehouses, g.inWh) || {}).name || '') + '</span>') + df('物流追蹤', g.status === 'wait' ? '<input id="g-track" placeholder="黑貓／嘉里／大榮 單號" value="' + esc(g.tracking || '') + '">' : '<span class="v">' + esc(g.logistics || '') + ' ' + esc(g.tracking || '') + '</span>') + '</div>'));
      if (g.status === 'inspect') body.appendChild(el('<div class="pur-mgmt-banner">' + svgI('warn', 17) + '<div>實體驗收由<b>庫存模組</b>進行；下方驗收資料待庫存回報帶入。此處可模擬庫存回報結果。</div></div>'));
      if (g.status === 'dispose') body.appendChild(el('<div class="pur-costalert-bar">' + svgI('warn', 17) + '<div class="t">庫存驗收回報<b>有問題</b>（瑕疵/短少），待處置（退貨／折讓／接受）後方可入帳。</div></div>'));
      body.appendChild(elWrap('<div class="pur-sec" style="border-top:none;padding-top:0">驗收明細（庫存回報、進貨端唯讀）</div>' + grnLines(g, true)));
      body.insertBefore(el(metaFields(g, '<span class="pur-badge ' + t[0] + '">' + t[1] + '</span>')), body.children[1] || null);
      card.appendChild(body); ctx.content.appendChild(card); ctx.content.appendChild(el(auditTrail(g, DB.GRN_DOM_LABEL.slice(0, (DB.GRN_DOM_STAGE[g.status]) + 1), true))); wirePartInfo(ctx.content);
      var acts = ctx.content.querySelector('#acts'), btns = '';
      if (g.status === 'wait') btns = '<button class="nx-btn ghost" data-a="track">' + svgI('send', 15) + '填物流追蹤</button><button class="nx-btn primary" data-a="arrive">到貨（轉待驗收）</button>';
      else if (g.status === 'inspect') btns = '<button class="nx-btn ghost" data-a="bad">庫存回報：有問題</button><button class="nx-btn primary" data-a="ok">庫存回報：沒問題 → 入帳</button>';
      else if (g.status === 'dispose') btns = '<button class="nx-btn primary" data-a="disp">處置完成 → 入帳</button>';
      else if (g.status === 'done') btns = '<button class="nx-btn ghost" data-a="ret">開進貨退回單</button>';
      acts.innerHTML = btns;
      acts.querySelectorAll('[data-a]').forEach(function (b) { b.addEventListener('click', function () {
        var a = b.dataset.a;
        if (a === 'track') { var tk = ctx.content.querySelector('#g-track'); g.tracking = tk ? tk.value : g.tracking; g.logistics = '黑貓宅急便'; toast('已填物流追蹤'); detail(no); }
        else if (a === 'arrive') { g.status = 'inspect'; toast('貨到，轉待驗收（待庫存驗收回報）'); detail(no); }
        else if (a === 'bad') { g.items.forEach(function (it) { if (!it.actualQty) it.actualQty = it.expectQty; if (!it.defectQty) { it.defectQty = 1; it.defectType = '外觀損壞'; } }); g.status = 'dispose'; toast('庫存回報有問題，轉待處置', true); detail(no); }
        else if (a === 'ok') { g.items.forEach(function (it) { it.actualQty = it.expectQty; }); doEntry(g, no); }
        else if (a === 'disp') { doEntry(g, no); }
        else if (a === 'ret') { toast('開進貨退回單'); setTimeout(function () { if (window.nxNavigate) window.nxNavigate({ module: 'purchase', page: 'pur_return' }); }, 500); }
      }); });
    }
    function doEntry(g, no) {
      postEntryModal(g, function () {
        g.items.forEach(function (it) { DB._stock[it.partId] = (DB._stock[it.partId] || 0) + (it.actualQty || it.expectQty); it.batchNo = '202606-' + it.partId.slice(1); var po = DB.poOf(g.poNo); if (po) { var pit = po.items.filter(function (x) { return x.partId === it.partId; })[0]; if (pit) pit.received = (pit.received || 0) + (it.actualQty || it.expectQty); } });
        g.status = 'done'; var po2 = DB.poOf(g.poNo); if (po2) { var all = po2.items.every(function (x) { return (x.received || 0) >= x.qty; }); po2.status = all ? 'received' : 'partial'; }
        toast('入帳完成：移動平均成本、應付帳、最後進貨時間已更新'); detail(no);
      });
    }
    list();
  }

  /* ============================================================ 作業 5：國外進貨作業 */
  function renderForeign(host) {
    var ctx = shell(host, 'pur_foreign', '採購確認後、國外進口物流追蹤。狀態依<b>我方掌握的資訊/動作</b>推進（看不到對方備貨）；待提貨需填貨號＋提貨號、待到貨需填物流編號，系統會擋未填者推進。最後攤分進口費、庫存驗收、進貨入帳。');
    var FL = DB.GRN_FOR_LABEL;
    function list() {
      docList(ctx, {
        icon: svgI('pu_foreign' in P.I ? 'pu_foreign' : 'ship', 16), title: '進貨單（國外）', stages: FL,
        stageOf: function (g) { return DB.GRN_FOR_STAGE[g.status]; }, rows: function () { return DB.grnList.filter(function (g) { return g.kind === 'foreign'; }); }, idOf: function (g) { return g.no; },
        cols: [
          { th: '進貨單號', td: function (g) { return '<span style="font-family:var(--mono);color:var(--gold-bright)">' + esc(g.no) + '</span>'; } },
          { th: '供應商', td: function (g) { var s = DB.byId(DB.partners, g.supplierId); return esc(s ? s.name : ''); } },
          { th: '報關行', td: function (g) { return esc(g.broker || '—'); } },
          { th: '幣別', td: function (g) { return '<span style="font-family:var(--mono)">' + esc(g.currency || '—') + '</span>'; } },
          { th: '貨號 / 提貨號', td: function (g) { return '<span style="font-family:var(--mono);font-size:11px;color:var(--muted)">' + esc(g.cargoNo || '—') + ' / ' + esc(g.doNo || '—') + '</span>'; } }
        ],
        badge: function (g) { var i = DB.GRN_FOR_STAGE[g.status]; return '<span class="pur-badge ' + (i >= 5 ? 'g' : (i === 4 ? 'r' : 'gold')) + '">' + (i + 1) + '. ' + FL[i] + '</span>'; }, open: function (no) { detail(no); }
      });
    }
    function detail(no) {
      var g = DB.grnList.filter(function (x) { return x.no === no; })[0]; if (!g) return; var sup = DB.byId(DB.partners, g.supplierId); var idx = DB.GRN_FOR_STAGE[g.status];
      ctx.content.innerHTML = '';
      ctx.content.appendChild(backBar('返回列表', list, '<div class="nx-detail-actions" id="acts"></div>'));
      var card = el('<div class="nx-frame nx-detail"></div>');
      setDocTitle(g.status === 'done', g.no, sup ? sup.name : '', '<span class="pur-cat imp">進口</span>', '<span class="pur-badge gold">' + (idx + 1) + '. ' + FL[idx] + '</span>');
      var body = el('<div class="pur-doc" style="padding-top:18px"></div>');
      var ed = idx <= 2; // 待出貨/待提貨/待到貨 可編物流欄
      body.appendChild(el('<div class="pur-doc-grid">' + df('進貨單號', '<span class="v mono">' + esc(g.no) + '</span>', '建立後不可改') + df('來源採購單', '<span class="v mono">' + esc(g.poNo) + '</span>') + df('幣別 / 匯率', '<span class="v" style="font-family:var(--mono)">' + esc(g.currency) + ' / ' + g.rate + '</span>') + df('報關行', '<span class="v">' + esc(g.broker || '—') + '</span>') +
        df('船號（可選）', ed ? '<input id="f-ship" value="' + esc(g.shipNo || '') + '">' : '<span class="v" style="font-family:var(--mono)">' + esc(g.shipNo || '—') + '</span>') +
        df('貨號' + (idx === 0 ? '（轉待提貨硬條件）' : ''), ed ? '<input id="f-cargo" value="' + esc(g.cargoNo || '') + '">' : '<span class="v" style="font-family:var(--mono)">' + esc(g.cargoNo || '—') + '</span>') +
        df('提貨單號 D/O' + (idx === 0 ? '（轉待提貨硬條件）' : ''), ed ? '<input id="f-do" value="' + esc(g.doNo || '') + '">' : '<span class="v" style="font-family:var(--mono)">' + esc(g.doNo || '—') + '</span>') +
        df('物流編號' + (idx === 1 ? '（轉待到貨硬條件）' : ''), ed ? '<input id="f-log" value="' + esc(g.logisticsNo || '') + '">' : '<span class="v" style="font-family:var(--mono)">' + esc(g.logisticsNo || '—') + '</span>') + '</div>'));
      // 進口費用攤分（待驗收/待處置/已完成階段結算）
      var feeEd = idx >= 3;
      var fkeys = [['freight', '運費'], ['duty', '關稅'], ['clearance', '報關費'], ['storage', '倉儲費'], ['other', '其他']];
      var feeTotal = fkeys.reduce(function (s, k) { return s + (+g.fees[k[0]] || 0); }, 0);
      body.appendChild(el('<div><div class="pur-sec">進口費用攤分（影響入庫成本）</div><div class="pur-doc-grid">' + fkeys.map(function (k) { return '<div class="pur-fld"><span class="k">' + k[1] + '</span>' + (feeEd ? '<input class="f-fee" data-k="' + k[0] + '" value="' + (g.fees[k[0]] || '') + '" placeholder="NT$">' : '<span class="v">' + (g.fees[k[0]] ? 'NT$ ' + comma(g.fees[k[0]]) : '—') + '</span>') + '</div>'; }).join('') + '<div class="pur-fld"><span class="k">合計</span><span class="v" id="f-feetotal">NT$ ' + comma(feeTotal) + '</span></div></div></div>'));
      body.appendChild(elWrap('<div class="pur-sec">驗收明細（庫存回報）</div>' + grnLines(g, false)));
      body.insertBefore(el(metaFields(g, '<span class="pur-badge gold">' + (idx + 1) + '. ' + FL[idx] + '</span>')), body.children[1] || null);
      card.appendChild(body); ctx.content.appendChild(card); ctx.content.appendChild(el(auditTrail(g, DB.GRN_FOR_LABEL.slice(0, (DB.GRN_FOR_STAGE[g.status]) + 1), true))); wirePartInfo(ctx.content);
      if (feeEd) { body.querySelectorAll('.f-fee').forEach(function (inp) { inp.addEventListener('input', function () { g.fees[inp.dataset.k] = +inp.value || 0; recompute(); }); }); recompute(); }
      function recompute() {
        var tot = fkeys.reduce(function (s, k) { return s + (+g.fees[k[0]] || 0); }, 0);
        var goods = g.items.reduce(function (s, it) { var po = DB.poOf(g.poNo); var pr = po ? ((po.items.filter(function (x) { return x.partId === it.partId; })[0] || {}).price || 0) : 0; return s + it.expectQty * pr * g.rate; }, 0);
        g.items.forEach(function (it) { var po = DB.poOf(g.poNo); var pr = po ? ((po.items.filter(function (x) { return x.partId === it.partId; })[0] || {}).price || 0) : 0; var base = pr * g.rate; var line = it.expectQty * base; it.inCost = Math.round(base + (goods && it.expectQty ? tot * (line / goods) / it.expectQty : 0)); });
        var ft = body.querySelector('#f-feetotal'); if (ft) ft.textContent = 'NT$ ' + comma(tot);
        body.querySelectorAll('.pur-lines tbody tr').forEach(function (tr, i) { var c = tr.querySelector('td:last-child'); if (c && g.items[i]) c.innerHTML = money(g.items[i].inCost, 'TWD'); });
      }
      var acts = ctx.content.querySelector('#acts'), btns = '';
      if (g.status === 'f_ship') btns = '<button class="nx-btn ghost" data-a="pay">付款</button><button class="nx-btn primary" data-a="topick">' + svgI('arrowR', 15) + '填貨號+提貨號 → 待提貨</button>';
      else if (g.status === 'f_pick') btns = '<button class="nx-btn primary" data-a="toarr">' + svgI('arrowR', 15) + '填物流編號 → 待到貨</button>';
      else if (g.status === 'f_arr') btns = '<button class="nx-btn primary" data-a="toinspect">到貨（轉待驗收）</button>';
      else if (g.status === 'f_inspect') btns = '<button class="nx-btn ghost" data-a="bad">庫存回報：有問題</button><button class="nx-btn primary" data-a="entry">攤分結算 → 入帳</button>';
      else if (g.status === 'f_dispose') btns = '<button class="nx-btn primary" data-a="entry">處置完成 → 入帳</button>';
      else btns = '<button class="nx-btn ghost" data-a="ret">開進貨退回單</button>';
      acts.innerHTML = btns;
      function save() { var q = function (id) { var e = ctx.content.querySelector(id); return e ? e.value : ''; }; if (ed) { g.shipNo = q('#f-ship'); g.cargoNo = q('#f-cargo'); g.doNo = q('#f-do'); g.logisticsNo = q('#f-log'); } }
      acts.querySelectorAll('[data-a]').forEach(function (b) { b.addEventListener('click', function () {
        var a = b.dataset.a; save();
        if (a === 'pay') { toast('依貿易條件（' + (sup.tradeTerm || 'CIF') + '）／' + (sup.importPayTerm || 'TT') + ' 付款並記錄'); }
        else if (a === 'topick') { if (!g.cargoNo || !g.doNo) { toast('需填「貨號＋提貨號」才能轉待提貨', true); return; } g.status = 'f_pick'; toast('已轉待提貨，請報關行處理提貨'); detail(no); }
        else if (a === 'toarr') { if (!g.logisticsNo) { toast('需填「物流編號」才能轉待到貨', true); return; } g.status = 'f_arr'; toast('已轉待到貨，運回倉庫途中'); detail(no); }
        else if (a === 'toinspect') { g.status = 'f_inspect'; toast('貨到，轉待驗收（待庫存驗收回報）'); detail(no); }
        else if (a === 'bad') { g.items.forEach(function (it) { if (!it.actualQty) it.actualQty = it.expectQty; if (!it.defectQty) { it.defectQty = 1; it.defectType = '規格不符'; } }); g.status = 'f_dispose'; toast('庫存回報有問題，轉待處置', true); detail(no); }
        else if (a === 'entry') {
          g.items.forEach(function (it) { if (!it.actualQty) it.actualQty = it.expectQty; });
          if (g.items.every(function (it) { return !it.inCost; })) recompute();
          postEntryModal(g, function () { g.items.forEach(function (it) { DB._stock[it.partId] = (DB._stock[it.partId] || 0) + it.actualQty; it.batchNo = '202606-' + it.partId.slice(1); var po = DB.poOf(g.poNo); if (po) { var pit = po.items.filter(function (x) { return x.partId === it.partId; })[0]; if (pit) pit.received = (pit.received || 0) + it.actualQty; } }); g.status = 'done'; var po2 = DB.poOf(g.poNo); if (po2) po2.status = 'received'; toast('進口攤分＋入帳完成'); detail(no); });
        } else if (a === 'ret') { toast('開進貨退回單'); setTimeout(function () { if (window.nxNavigate) window.nxNavigate({ module: 'purchase', page: 'pur_return' }); }, 500); }
      }); });
    }
    list();
  }

  /* ============================================================ 作業 6：進貨退回作業 */
  function renderReturn(host) {
    var ctx = shell(host, 'pur_return', '退貨回供應商＝反向出貨：撿貨→包貨→取貨（實體動作由<b>庫存模組</b>做，進貨只看狀態），送回後入帳沖回（扣庫存、沖回應付）。能不能退、走哪種處置依零件「退貨政策」。');
    var ST = { apply: ['b', '申請中'], pick: ['o', '待撿貨'], pack: ['o', '待包貨'], take: ['gold', '待取貨'], done: ['g', '已完成'] };
    function list() {
      docList(ctx, {
        icon: svgI('pu_return' in P.I ? 'pu_return' : 'history', 16), title: '進貨退回單', stages: DB.RET_STAGE_LABEL,
        stageOf: function (r) { return DB.RET_STAGE[r.status]; }, rows: function () { return DB.returnList; }, idOf: function (r) { return r.no; },
        cols: [
          { th: '退回單號', td: function (r) { return '<span style="font-family:var(--mono);color:var(--gold-bright)">' + esc(r.no) + '</span>'; } },
          { th: '對應進貨單', td: function (r) { return '<span style="font-family:var(--mono);color:var(--muted)">' + esc(r.grnNo) + '</span>'; } },
          { th: '供應商', td: function (r) { var s = DB.byId(DB.partners, r.supplierId); return esc(s ? s.name : ''); } },
          { th: '處置', td: function (r) { return '<span class="nx-tag">' + P.retPolicy(r.disposal) + '</span>'; } },
          { th: '原因', td: function (r) { return '<span class="sub" style="color:var(--muted)">' + esc(r.reason || '—') + '</span>'; } }
        ],
        badge: function (r) { var t = ST[r.status]; return '<span class="pur-badge ' + t[0] + '">' + t[1] + '</span>'; },
        onNew: function () { editor(); }, open: function (no) { detail(no); },
        onDelete: function (id) { var i = DB.returnList.findIndex(function (r) { return r.no === id; }); if (i < 0) return false; if (DB.returnList[i].status !== 'apply') { toast('已送出的退回單不可刪除', true); return false; } DB.returnList.splice(i, 1); return true; }
      });
    }
    function detail(no) {
      var r = DB.retOf(no); if (!r) return; var sup = DB.byId(DB.partners, r.supplierId); var t = ST[r.status];
      ctx.content.innerHTML = '';
      ctx.content.appendChild(backBar('返回列表', list, '<div class="nx-detail-actions" id="acts"></div>'));
      var card = el('<div class="nx-frame nx-detail"></div>');
      setDocTitle(r.status === 'done', r.no, sup ? sup.name : '', '', '<span class="pur-badge ' + t[0] + '">' + t[1] + '</span>');
      var body = el('<div class="pur-doc" style="padding-top:18px"></div>');
      body.appendChild(el('<div class="pur-doc-grid">' + df('單號', '<span class="v mono">' + esc(r.no) + '</span>', '建立後不可改') + df('對應進貨單', '<span class="v mono">' + esc(r.grnNo) + '</span>', null, true) + df('供應商', '<span class="v">' + esc(sup ? sup.name : '') + '</span>') + df('處置方式', '<span class="v">' + P.retPolicy(r.disposal) + '</span>') + df('退貨原因', '<span class="v">' + esc(r.reason || '—') + '</span>') + '</div>'));
      body.appendChild(elWrap('<div class="pur-sec" style="border-top:none;padding-top:0">退貨明細</div>' + lineTable('<th>我方料號 / 廠牌 / 品名</th><th class="num">退貨數量</th>', r.items.map(function (it) { var p = DB.byId(DB.parts, it.partId); return '<tr data-pid="' + it.partId + '"><td>' + partCell(p) + '</td><td class="num">' + it.qty + '</td></tr>'; }).join(''))));
      if (r.status !== 'apply' && r.status !== 'done') body.appendChild(el('<div class="pur-mgmt-banner">' + svgI('warn', 17) + '<div>撿貨／包貨／取貨等實體動作由<b>庫存模組</b>執行，完成後回寫此退回單狀態。</div></div>'));
      body.insertBefore(el(metaFields(r, '<span class="pur-badge ' + t[0] + '">' + t[1] + '</span>')), body.children[1] || null);
      card.appendChild(body); ctx.content.appendChild(card); ctx.content.appendChild(el(auditTrail(r, DB.RET_STAGE_LABEL.slice(0, (DB.RET_STAGE[r.status]) + 1), true))); wirePartInfo(ctx.content);
      var acts = ctx.content.querySelector('#acts'), btns = '';
      if (r.status === 'apply') btns = '<button class="nx-btn primary" data-a="pick">送出（轉待撿貨）</button>';
      else if (r.status === 'pick') btns = '<button class="nx-btn primary" data-a="pack">（庫存）撿貨完成 → 待包貨</button>';
      else if (r.status === 'pack') btns = '<button class="nx-btn primary" data-a="take">（庫存）包貨完成 → 待取貨</button>';
      else if (r.status === 'take') btns = '<button class="nx-btn primary" data-a="done">已送回 → 入帳沖回</button>';
      acts.innerHTML = btns;
      acts.querySelectorAll('[data-a]').forEach(function (b) { b.addEventListener('click', function () {
        var a = b.dataset.a;
        if (a === 'pick') { r.status = 'pick'; toast('已送出退貨申請，待倉庫撿貨'); detail(no); }
        else if (a === 'pack') { r.status = 'pack'; toast('撿貨完成，待包貨'); detail(no); }
        else if (a === 'take') { r.status = 'take'; toast('包貨完成，待物流/供應商來收'); detail(no); }
        else if (a === 'done') { r.items.forEach(function (it) { DB._stock[it.partId] = (DB._stock[it.partId] || 0) - it.qty; }); r.status = 'done'; toast('已送回供應商：扣減庫存、沖回應付（對齊財務 NX05）'); detail(no); }
      }); });
    }
    function editor() {
      ctx.content.innerHTML = '';
      var doneGrns = DB.grnList.filter(function (g) { return g.status === 'done'; });
      var work = { grnNo: '', disposal: 'N', reason: '', items: [], lineFocus: false, sel: 0 };
      function grnObj() { return work.grnNo ? DB.grnList.filter(function (x) { return x.no === work.grnNo; })[0] : null; }
      function grnMax(pid) { var g = grnObj(); if (!g) return 0; var it = g.items.filter(function (x) { return x.partId === pid; })[0]; return it ? (it.actualQty || it.expectQty) : 0; }
      function grnParts() { var g = grnObj(); if (!g) return []; return g.items.map(function (it) { return DB.byId(DB.parts, it.partId); }).filter(Boolean); }
      function avail() { var used = work.items.map(function (x) { return x.partId; }); return grnParts().filter(function (p) { return used.indexOf(p.id) < 0; }); }
      function addItem() { if (!work.grnNo) { toast('請先選對應進貨單', true); return; } if (!avail().length) { toast('該進貨單料件已全數加入', true); return; } var first = avail()[0]; P.itemEditor({ mode: 'add', lookupParts: avail(), qtyMax: grnMax(first.id), lookupTitle: '退貨料件（限對應進貨單）', onSave: function (li) { var mx = grnMax(li.partId); work.items.push({ partId: li.partId, qty: Math.min(li.qty, mx), note: li.note || '' }); work.sel = work.items.length - 1; work.lineFocus = true; render(); } }); }
      function editItem() { var li = work.items[work.sel]; if (!li) { toast('請先選一筆品項', true); return; } var pool = grnParts().filter(function (p) { return p.id === li.partId || work.items.every(function (x) { return x.partId !== p.id; }); }); P.itemEditor({ mode: 'edit', lookupParts: pool, qtyMax: grnMax(li.partId), line: li, onSave: function (n) { work.items[work.sel] = { partId: n.partId, qty: Math.min(n.qty, grnMax(n.partId)), note: n.note || '' }; render(); } }); }
      function delItem() { if (!work.items.length) { toast('無品項可刪除', true); return; } work.items.splice(work.sel, 1); work.sel = Math.max(0, work.sel - 1); render(); }
      function doImport() { var g = grnObj(); if (!g) { toast('請先選對應進貨單', true); return; } var used = work.items.map(function (x) { return x.partId; }); var n = 0; g.items.forEach(function (it) { if (used.indexOf(it.partId) < 0) { work.items.push({ partId: it.partId, qty: it.actualQty || it.expectQty }); n++; } }); toast(n ? '已帶入進貨單全部 ' + n + ' 項（可再調整數量）' : '進貨單料件都已在單上'); work.lineFocus = true; render(); }
      function doSave() {
        if (!work.grnNo) { toast('請選對應進貨單', true); return; }
        var items = work.items.filter(function (li) { return li.qty > 0; });
        if (!items.length) { toast('明細不可為空，請至少加一筆退貨數量', true); return; }
        var g = grnObj(); var no = 'RT-2026-' + String(8 + DB.returnList.length).padStart(4, '0');
        DB.returnList.unshift({ id: no, no: no, grnNo: work.grnNo, supplierId: g.supplierId, status: 'apply', date: '2026-06-13', by: 'Y0006', reason: work.reason, disposal: work.disposal, items: items.map(function (li) { return { partId: li.partId, qty: li.qty }; }) });
        ctx._editMode = null; toast('已建立退回單 ' + no); detail(no);
      }
      function listHtml() {
        return lineTableSel('<th style="width:46px">項次</th><th>料件</th><th class="num">原進量</th><th class="num">退貨數量</th><th>備註</th>',
          work.items.map(function (li, i) { var p = DB.byId(DB.parts, li.partId); return '<tr data-li="' + i + '" class="' + (i === work.sel ? 'sel' : '') + '"><td class="num">' + (i + 1) + '</td><td>' + partCell(p) + '</td><td class="num">' + grnMax(li.partId) + '</td><td class="num">' + li.qty + '</td><td style="color:var(--muted)">' + esc(li.note || '—') + '</td></tr>'; }).join(''),
          work.items.length, work.lineFocus, '尚無退貨料件，按「I 編輯明細」再「A 新增品項」或「T 批次匯入」');
      }
      function wireSel() { ctx.content.querySelectorAll('.pur-lines.selectable tbody tr[data-li]').forEach(function (tr) { tr.addEventListener('click', function () { work.sel = +tr.dataset.li; ctx.content.querySelectorAll('.pur-lines.selectable tbody tr').forEach(function (t) { t.classList.toggle('sel', t === tr); }); }); tr.addEventListener('dblclick', function () { if (work.lineFocus) { work.sel = +tr.dataset.li; editItem(); } }); }); }
      function render() {
        var g = grnObj();
        ctx.content.innerHTML = '';
        ctx._editMode = work.lineFocus ? 'line' : 'head';
        ctx._detail = { canLine: !!work.grnNo, lineEdit: function () { if (!work.grnNo) { toast('請先選對應進貨單', true); return; } work.lineFocus = true; render(); }, save: function () { if (!work.lineFocus) { if (!work.grnNo) { toast('請先選對應進貨單', true); return; } work.lineFocus = true; render(); } else { doSave(); } }, cancel: list, addItem: addItem, editItem: editItem, delItem: delItem, batchImport: doImport, reorder: null };
        ctx.content.appendChild(backBar('返回列表', list, ''));
        var card = el('<div class="nx-frame nx-detail"></div>');
        card.appendChild(el('<div class="nx-detail-bar"><span class="nx-statedot off"></span><div class="nx-detail-id"><span class="code">（存檔後給號）</span><b>新增進貨退回單</b></div><span class="pur-badge gold">' + (work.lineFocus ? '明細編輯態' : '表頭編輯態') + '</span></div>'));
        var body = el('<div class="pur-doc"></div>');
        body.appendChild(el('<div class="pur-doc-grid">' +
          '<div class="pur-fld"><span class="k"><span class="req">*</span>對應進貨單</span><select id="e-grn"' + (work.lineFocus ? ' disabled' : '') + '><option value="">選已完成的進貨單</option>' + doneGrns.map(function (x) { var s = DB.byId(DB.partners, x.supplierId); return '<option value="' + x.no + '"' + (x.no === work.grnNo ? ' selected' : '') + '>' + esc(x.no + ' · ' + (s ? s.name : '')) + '</option>'; }).join('') + '</select></div>' +
          '<div class="pur-fld"><span class="k">處置方式</span><select id="e-disp"' + (work.lineFocus ? ' disabled' : '') + '>' + [['N', 'N 一般退貨'], ['W', 'W 保固'], ['S', 'S 自保壞品'], ['R', 'R 整新']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === work.disposal ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
          '<div class="pur-fld" style="grid-column:1/-1"><span class="k">退貨原因</span><input id="e-reason" value="' + esc(work.reason) + '" placeholder="說明退貨原因"' + (work.lineFocus ? ' disabled' : '') + '></div></div>'));
        if (!g) body.appendChild(el('<div class="pur-empty" style="padding:30px">' + svgI('warn', 30) + '請先選對應進貨單，再按「I 編輯明細」逐筆加退貨料件（不可超原進貨實收量）。</div>'));
        else body.appendChild(elWrap('<div class="pur-sec">退貨明細（不可超原進貨實收量）' + (work.lineFocus ? ' · 下方清單唯讀，用工具列 A 新增 / E 更正 / T 批次匯入' : '') + '</div>' + listHtml()));
        card.appendChild(body); ctx.content.appendChild(card);
        var gs = ctx.content.querySelector('#e-grn'); if (gs && !work.lineFocus) gs.addEventListener('change', function (e) { work.grnNo = e.target.value; work.items = []; work.sel = 0; render(); });
        var ds = ctx.content.querySelector('#e-disp'); if (ds && !work.lineFocus) ds.addEventListener('change', function (e) { work.disposal = e.target.value; });
        var rs = ctx.content.querySelector('#e-reason'); if (rs && !work.lineFocus) rs.addEventListener('change', function (e) { work.reason = e.target.value; });
        wireSel();
      }
      render();
    }
    list();
  }

  /* ============================================================ 作業 7：保固申請作業 */
  function renderWarranty(host) {
    var ctx = shell(host, 'pur_warranty', '料件壞掉向供應商主張保固。兩種來源：客訴型（銷售提出、連銷貨單）／自用型（庫存發現）。是否在保固內依零件「退貨政策＋保固月數」判定。待送審→申請中→已完成。');
    var ST = { pending: ['o', '待送審'], ing: ['b', '申請中'], done: ['g', '已完成'] };
    function list() {
      docList(ctx, {
        icon: svgI('pu_warranty' in P.I ? 'pu_warranty' : 'warn', 16), title: '保固申請單', stages: DB.WR_STAGE_LABEL,
        stageOf: function (w) { return DB.WR_STAGE[w.status]; }, rows: function () { return DB.warrantyList; }, idOf: function (w) { return w.no; },
        cols: [
          { th: '申請單號', td: function (w) { return '<span style="font-family:var(--mono);color:var(--gold-bright)">' + esc(w.no) + '</span>'; } },
          { th: '類型', td: function (w) { return w.type === 'claim' ? '<span class="pur-badge o">客訴型</span>' : '<span class="pur-badge b">自用型</span>'; } },
          { th: '供應商', td: function (w) { var s = DB.byId(DB.partners, w.supplierId); return esc(s ? s.name : w.supplierId); } },
          { th: '零件', td: function (w) { var p = DB.byId(DB.parts, w.partId); return esc(p ? p.name : w.partId); } },
          { th: '保固判定', td: function (w) { var j = DB.warrantyJudge(DB.byId(DB.parts, w.partId)); return '<span class="pur-badge ' + (j.ok ? 'g' : 'r') + '">' + esc(j.label) + '</span>'; } }
        ],
        badge: function (w) { var t = ST[w.status]; return '<span class="pur-badge ' + t[0] + '">' + t[1] + '</span>'; },
        onNew: function () { toast('新增保固申請：選類型→選零件→系統依退貨政策＋保固月數判定在保/逾保'); }, open: function (no) { detail(no); }
      });
    }
    function detail(no) {
      var w = DB.warrantyList.filter(function (x) { return x.no === no; })[0]; if (!w) return; var sup = DB.byId(DB.partners, w.supplierId), p = DB.byId(DB.parts, w.partId), j = DB.warrantyJudge(p), t = ST[w.status];
      ctx.content.innerHTML = '';
      ctx.content.appendChild(backBar('返回列表', list, '<div class="nx-detail-actions" id="acts"></div>'));
      var card = el('<div class="nx-frame nx-detail"></div>');
      setDocTitle(w.status === 'done', w.no, p ? p.name : '', (w.type === 'claim' ? '<span class="pur-badge o">客訴型</span>' : '<span class="pur-badge b">自用型</span>'), '<span class="pur-badge ' + t[0] + '">' + t[1] + '</span>');
      var body = el('<div class="pur-doc" style="padding-top:18px"></div>');
      body.appendChild(el('<div class="pur-doc-grid">' + df('單號', '<span class="v mono">' + esc(w.no) + '</span>', '建立後不可改') + df('類型', '<span class="v">' + (w.type === 'claim' ? '客訴型（連銷貨單）' : '自用型（庫存發現）') + '</span>', null, true) + (w.type === 'claim' ? df('來源銷貨單', '<span class="v mono">' + esc(w.srcSo) + '</span>', null, true) : '') + df('供應商', '<span class="v">' + esc(sup ? sup.name : w.supplierId) + '</span>', null, true) + df('零件', '<span class="v pur-cust-link" id="w-pinfo">' + esc(p ? p.code + ' ' + p.name : '') + '</span>', null, true) + df('保固判定', '<span class="v"><span class="pur-badge ' + (j.ok ? 'g' : 'r') + '">' + esc(j.label) + '</span> <span style="font-size:11px;color:var(--faint)">退貨政策 ' + P.retPolicy(p ? p.returnPolicy : '') + '</span></span>') + df('處理結果', w.status === 'done' ? '<span class="v">' + esc(w.result || '—') + '</span>' : '<input id="w-res" placeholder="判定結果／退錢/換貨" value="' + esc(w.result || '') + '">') + df('退款方式', w.status === 'done' ? '<span class="v">' + esc(w.refund || '—') + '</span>' : '<input id="w-ref" placeholder="退款／換貨" value="' + esc(w.refund || '') + '">') + '</div>'));
      body.insertBefore(el(metaFields(w, '<span class="pur-badge ' + t[0] + '">' + t[1] + '</span>')), body.children[1] || null);
      card.appendChild(body); ctx.content.appendChild(card); ctx.content.appendChild(el(auditTrail(w, DB.WR_STAGE_LABEL.slice(0, (DB.WR_STAGE[w.status]) + 1), true)));
      var wpi = ctx.content.querySelector('#w-pinfo'); if (wpi && p) { wpi.style.cursor = 'pointer'; wpi.title = '點此看料號即時資訊'; wpi.addEventListener('click', function () { P.partInfoModal(p); }); }
      var acts = ctx.content.querySelector('#acts'), btns = '';
      if (w.status === 'pending') btns = '<button class="nx-btn ghost" data-a="reject">退件</button><button class="nx-btn primary" data-a="approve">' + svgI('check', 15) + '核准（送審通過）</button>';
      else if (w.status === 'ing') btns = '<button class="nx-btn primary" data-a="close">結案</button>';
      acts.innerHTML = btns;
      acts.querySelectorAll('[data-a]').forEach(function (b) { b.addEventListener('click', function () {
        var a = b.dataset.a;
        if (a === 'approve') { w.status = 'ing'; toast('已核准（需核准權限）→ 申請中，向供應商主張'); detail(no); }
        else if (a === 'reject') { toast('已退件', true); }
        else if (a === 'close') { var r = ctx.content.querySelector('#w-res'), rf = ctx.content.querySelector('#w-ref'); w.result = r ? r.value : ''; w.refund = rf ? rf.value : ''; w.status = 'done'; toast('已結案 → 已完成'); detail(no); }
      }); });
    }
    list();
  }

  /* ---------- 註冊 ---------- */
  P.pages.pur_rfq = renderRfq;
  P.pages.pur_po = renderPo;
  P.pages.pur_domestic = renderDomestic;
  P.pages.pur_foreign = renderForeign;
  P.pages.pur_return = renderReturn;
  P.pages.pur_warranty = renderWarranty;
})();
