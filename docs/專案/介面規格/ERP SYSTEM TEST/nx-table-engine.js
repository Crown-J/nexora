// NEXORA GRID — 核心主檔｜一般表格引擎（config 驅動，規格 v3.9 型態一）
// 頁內雙分頁：資料瀏覽（清單）Alt+1 / 詳細資料（明細）Alt+2。
// 清單頁：工具列（翻頁/更正/查詢/停用啟用/匯出/重新整理/欄位/篩選/顯示停用/選取/新增）＋表格＋頁尾筆數。
// 詳細頁：標題列（狀態圓點＋瀏覽/編輯中）＋欄位區（多分頁）＋異動紀錄；瀏覽→更正進編輯→存檔/取消。
(function () {
  'use strict';
  var ICONS = window.NX_ICONS || {};
  function ic(name, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (w ? ' style="width:' + w + 'px;height:' + w + 'px"' : '') + '>' + (ICONS[name] || '') + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  // lucide-ish 線條圖示
  var I = {
    prev: '<path d="m15 18-6-6 6-6"/>', next: '<path d="m9 18 6-6-6-6"/>',
    pencil: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    power: '<path d="M18.36 6.64A9 9 0 1 1 5.64 6.64M12 2v10"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54Z"/>', check: '<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="m2 2 20 20M6.7 6.7C4 8.4 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4.3-.9M9.9 4.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.1"/>',
    key: '<circle cx="7.5" cy="15.5" r="4"/><path d="m10.5 12.5 7-7M16 6l2 2 3-3-2-2Z"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'
  };
  function svg(p, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"' + (w ? ' style="width:' + w + 'px;height:' + w + 'px"' : '') + '>' + p + '</svg>'; }

  function resolveOptions(opt) {
    var arr = typeof opt === 'function' ? opt() : opt;
    return (arr || []).map(function (o) {
      if (o && typeof o === 'object') return { value: o.value != null ? o.value : o.id, label: o.label != null ? o.label : (o.name || o.code) };
      return { value: o, label: o };
    });
  }

  /* ---------- 頁首 ---------- */
  function chev() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'; }
  function headHtml(cfg) {
    var meta = (window.NX_MASTER && window.NX_MASTER.pageIndex[cfg.id]) || {};
    return '<div class="nx-page-head">' +
      '<div class="nx-crumb">' + ic('boxes') + '<span>主檔</span>' + chev() + '<span>' + esc(meta.divLabel || '') + '</span>' + chev() + '<span class="cur">' + esc(cfg.title) + '</span></div>' +
      '</div>';
  }
  function kindName(k) { return { table: '一般表格', mtab: '一般表格（多分頁）', subtable: '一般表格（含子表）', builtin: '一般表格（系統內建）', semi: '一般表格（半開放）', assign: '圖像化指派', matrix: '權限矩陣', batch: '群組批次' }[k] || '一般表格'; }

  /* ---------- 欄位 ---------- */
  function findZip(z) { var zd = (window.NXDB.dict.zipData) || {}; z = String(z || '').trim(); if (!z) return null; for (var ct in zd) { var hit = zd[ct].filter(function (o) { return o.zip === z; })[0]; if (hit) return { city: ct, area: hit.area }; } return null; }
  function subCell(c, row) {
    var v = row[c.key] != null ? row[c.key] : '';
    if (c.type === 'city') { var zd = (window.NXDB.dict.zipData) || {}; return '<select data-ck="city"><option value="">縣市</option>' + Object.keys(zd).map(function (ct) { return '<option' + (ct === row.city ? ' selected' : '') + '>' + esc(ct) + '</option>'; }).join('') + '</select>'; }
    if (c.type === 'area') { var zd2 = (window.NXDB.dict.zipData) || {}; var ar = row.city ? (zd2[row.city] || []) : []; return '<select data-ck="area"><option value="">鄉鎮</option>' + ar.map(function (o) { return '<option' + (o.area === row.area ? ' selected' : '') + '>' + esc(o.area) + '</option>'; }).join('') + '</select>'; }
    if (c.type === 'select') { var opts = resolveOptions(c.options); return '<select data-ck="' + esc(c.key) + '">' + (c.placeholder ? '<option value="">' + esc(c.placeholder) + '</option>' : '') + opts.map(function (o) { return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(v) ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select>'; }
    return '<input type="' + (c.type === 'date' ? 'date' : 'text') + '" data-ck="' + esc(c.key) + '" value="' + esc(v) + '"' + (c.placeholder ? ' placeholder="' + esc(c.placeholder) + '"' : '') + '>';
  }
  function subtableHtml(f, rec) {
    var rows = (rec && rec[f.key]) || [];
    var head = f.cols.map(function (c) { return '<th>' + esc(c.label) + '</th>'; }).join('') + '<th class="nx-subt-act"></th>';
    var body = rows.length ? rows.map(function (row, ri) {
      return '<tr data-ri="' + ri + '">' + f.cols.map(function (c) { return '<td>' + subCell(c, row) + '</td>'; }).join('') + '<td class="nx-subt-act"><button class="nx-sub-x" data-sub="' + esc(f.key) + '" data-ri="' + ri + '" title="移除">' + svg('<path d="M18 6 6 18M6 6l12 12"/>', 13) + '</button></td></tr>';
    }).join('') : '<tr class="nx-subt-empty"><td colspan="' + (f.cols.length + 1) + '">' + (rec ? '尚無資料，按下方新增' : '存檔後可維護此子表') + '</td></tr>';
    return '<div class="nx-field full nx-subtable"><label>' + esc(f.label) + '</label>' +
      '<table class="nx-subt"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>' +
      (rec ? '<button class="nx-sub-add" data-sub="' + esc(f.key) + '">' + svg('<path d="M12 5v14M5 12h14"/>', 14) + '新增' + esc(f.addLabel || '一列') + '</button>' : '') + '</div>';
  }

  function fieldHtml(f, rec, mode) {
    if (f.type === 'section') return '<div class="nx-section-label">' + esc(f.label) + '</div>';
    if (f.type === 'subtable') return subtableHtml(f, rec);
    if (f.type === 'address') {
      var a = (rec && rec[f.key]) || {};
      var lk = mode === 'view' ? ' disabled' : '';
      var zd = (window.NXDB.dict.zipData) || {};
      var cities = Object.keys(zd);
      var areas = a.city ? (zd[a.city] || []) : [];
      var lab = '<label>' + (f.req ? '<span class="req">*</span>' : '') + esc(f.label) + '</label>';
      var html = '<div class="nx-addr">' +
        '<select data-addr="' + esc(f.key) + '" data-af="city"' + lk + '><option value="">縣市</option>' + cities.map(function (c) { return '<option' + (c === a.city ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
        '<select data-addr="' + esc(f.key) + '" data-af="area"' + lk + '><option value="">鄉鎮市區</option>' + areas.map(function (o) { return '<option' + (o.area === a.area ? ' selected' : '') + '>' + esc(o.area) + '</option>'; }).join('') + '</select>' +
        '<input type="text" data-addr="' + esc(f.key) + '" data-af="zip" value="' + esc(a.zip || '') + '"' + lk + ' placeholder="郵遞區號" title="輸入郵遞區號可反帶縣市鄉鎮">' +
        '<input type="text" data-addr="' + esc(f.key) + '" data-af="detail" value="' + esc(a.detail || '') + '" placeholder="路 / 街 / 巷 / 弄 / 號 / 樓"' + lk + '>' +
      '</div>';
      return '<div class="nx-field full">' + lab + html + (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '</div>';
    }
    var val = f.get ? f.get(rec) : (rec && f.key ? rec[f.key] : '');
    var locked = f.ro || mode === 'view';            // 唯讀或瀏覽模式 → 不可編輯
    var lab = '<label>' + (f.req ? '<span class="req">*</span>' : '') + esc(f.label) + (f.ro ? '<span class="ro">唯讀</span>' : '') + '</label>';

    if (f.type === 'action') {
      return '<div class="nx-field' + (f.full ? ' full' : '') + '"><label>' + esc(f.label) + '</label>' +
        '<button class="nx-btn ghost nx-action" data-action="' + esc(f.action || '') + '"' + (mode === 'view' ? ' disabled' : '') + '>' + (f.icon ? svg(I[f.icon] || '', 15) : '') + esc(f.btn || '執行') + '</button>' +
        (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '</div>';
    }
    if (f.type === 'masked') {
      return '<div class="nx-field' + (f.full ? ' full' : '') + '">' + lab +
        '<div class="nx-masked"><input type="password" data-key="' + esc(f.key || '') + '" value="' + esc(val) + '"' + (locked ? ' disabled' : '') + ' autocomplete="off">' +
        '<button type="button" class="nx-reveal" title="顯示">' + svg(I.eye, 15) + '</button></div>' +
        (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '</div>';
    }
    if (f.type === 'switch') {
      return '<div class="nx-field sw' + (f.full ? ' full' : '') + '">' +
        '<div class="nx-sw-row"><label>' + esc(f.label) + '</label>' +
        '<input type="checkbox" class="nx-sw" data-key="' + esc(f.key || '') + '"' + (val ? ' checked' : '') + (locked ? ' disabled' : '') + '></div>' +
        (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '</div>';
    }
    var ctrl;
    if (f.type === 'select') {
      var opts = resolveOptions(f.options);
      ctrl = '<select data-key="' + esc(f.key || '') + '"' + (locked ? ' disabled' : '') + '>' +
        (f.placeholder ? '<option value="">' + esc(f.placeholder) + '</option>' : '') +
        opts.map(function (o) { return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(val) ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select>';
    } else if (f.type === 'textarea') {
      ctrl = '<textarea data-key="' + esc(f.key || '') + '"' + (locked ? ' disabled' : '') + '>' + esc(val) + '</textarea>';
    } else {
      var t = f.type === 'date' ? 'date' : 'text';
      ctrl = '<input type="' + t + '" data-key="' + esc(f.key || '') + '" value="' + esc(val) + '"' + (locked ? ' disabled' : '') + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + '>';
    }
    return '<div class="nx-field' + (f.full ? ' full' : '') + '">' + lab + ctrl + (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '</div>';
  }

  var active = null; // 目前掛載中的頁面（給 Alt 快捷用）

  function avatarHtml(rec, mode) {
    var src = rec && rec._avatar ? rec._avatar : '';
    var dis = mode === 'view' ? ' disabled' : '';
    return '<aside class="nx-avatar">' +
      '<div class="nx-avatar-img' + (src ? ' has' : '') + '">' + (src ? '<img src="' + esc(src) + '" alt="大頭貼">' : svg(I.camera, 40) + '<span>大頭貼</span>') + '</div>' +
      '<div class="nx-avatar-acts">' +
        '<button class="nx-btn ghost nx-av-up"' + dis + '>' + svg(I.upload, 15) + '上傳</button>' +
        '<button class="nx-btn ghost nx-av-cam"' + dis + '>' + svg(I.camera, 15) + '拍照</button>' +
      '</div>' +
      '<input type="file" accept="image/*" class="nx-av-file" hidden>' +
      '<input type="file" accept="image/*" capture="user" class="nx-av-camfile" hidden>' +
    '</aside>';
  }

  function photosHtml() { return '<aside class="nx-photos"></aside>'; }
  function renderPhotos(aside, rec, mode) {
    rec._photos = rec._photos || [];
    var ps = rec._photos;
    var idx = Math.max(0, Math.min(aside._idx || 0, ps.length - 1)); aside._idx = idx;
    var dis = mode === 'view' ? ' disabled' : '';
    var viewer = ps.length
      ? '<div class="ph-view"><img src="' + ps[idx] + '" alt="零件照片">' +
          (idx === 0 ? '<span class="ph-main">主圖</span>' : '') +
          (ps.length > 1 ? '<button class="ph-nav ph-prev"' + (idx === 0 ? ' disabled' : '') + '>' + svg(I.prev, 20) + '</button><button class="ph-nav ph-next"' + (idx === ps.length - 1 ? ' disabled' : '') + '>' + svg(I.next, 20) + '</button>' : '') +
          '<span class="ph-idx">' + (idx + 1) + ' / ' + ps.length + '</span></div>'
      : '<div class="ph-view ph-empty">' + svg(I.camera, 40) + '<span>尚無照片</span></div>';
    var rowctl = ps.length ? '<div class="ph-rowctl"><button class="ph-mini ph-setmain"' + (idx === 0 ? ' disabled' : dis) + '>設為主圖</button><button class="ph-mini ph-del"' + dis + '>刪除此張</button></div>' : '';
    var thumbs = ps.length ? '<div class="ph-thumbs">' + ps.map(function (p, i) { return '<button class="ph-thumb' + (i === idx ? ' on' : '') + '" data-i="' + i + '"><img src="' + p + '"></button>'; }).join('') + '</div>' : '';
    var acts = '<div class="ph-acts"><button class="nx-btn ghost ph-up"' + dis + '>' + svg(I.upload, 15) + '上傳</button><button class="nx-btn ghost ph-cam"' + dis + '>' + svg(I.camera, 15) + '拍照</button></div><div class="ph-hint">最多 5 張，第一張為主圖</div>';
    aside.innerHTML = '<label class="ph-label">零件照片</label>' + viewer + rowctl + thumbs + acts +
      '<input type="file" accept="image/*" multiple class="ph-file" hidden><input type="file" accept="image/*" capture="environment" class="ph-camfile" hidden>';
    function reread(input) { [].slice.call(input.files || []).forEach(function (f) { if (ps.length >= 5) return; var r = new FileReader(); r.onload = function () { ps.push(r.result); aside._idx = ps.length - 1; renderPhotos(aside, rec, mode); }; r.readAsDataURL(f); }); }
    var fileEl = aside.querySelector('.ph-file'), camEl = aside.querySelector('.ph-camfile');
    var up = aside.querySelector('.ph-up'), cam = aside.querySelector('.ph-cam');
    if (up) up.addEventListener('click', function () { if (ps.length >= 5) { toast('每顆最多 5 張', true); return; } fileEl.click(); });
    if (cam) cam.addEventListener('click', function () { if (ps.length >= 5) { toast('每顆最多 5 張', true); return; } camEl.click(); });
    fileEl.addEventListener('change', function () { reread(fileEl); });
    camEl.addEventListener('change', function () { reread(camEl); });
    var prev = aside.querySelector('.ph-prev'), next = aside.querySelector('.ph-next');
    if (prev) prev.addEventListener('click', function () { aside._idx = idx - 1; renderPhotos(aside, rec, mode); });
    if (next) next.addEventListener('click', function () { aside._idx = idx + 1; renderPhotos(aside, rec, mode); });
    aside.querySelectorAll('.ph-thumb').forEach(function (b) { b.addEventListener('click', function () { aside._idx = +b.dataset.i; renderPhotos(aside, rec, mode); }); });
    var del = aside.querySelector('.ph-del'); if (del) del.addEventListener('click', function () { ps.splice(idx, 1); aside._idx = Math.max(0, idx - 1); renderPhotos(aside, rec, mode); });
    var sm = aside.querySelector('.ph-setmain'); if (sm) sm.addEventListener('click', function () { var p = ps.splice(idx, 1)[0]; ps.unshift(p); aside._idx = 0; renderPhotos(aside, rec, mode); toast('已設為主圖'); });
    var vimg = aside.querySelector('.ph-view img'); if (vimg) { vimg.style.cursor = 'zoom-in'; vimg.addEventListener('click', function () { openLightbox(ps, aside._idx); }); }
  }
  function openLightbox(ps, start) {
    if (!ps || !ps.length) return;
    var i = start || 0;
    var mask = el('<div class="ph-lb"></div>');
    function draw() {
      mask.innerHTML = '<button class="ph-lb-x">' + svg('<path d="M18 6 6 18M6 6l12 12"/>', 20) + '</button>' +
        '<div class="ph-lb-stage"><img src="' + ps[i] + '" alt="零件照片">' +
        (ps.length > 1 ? '<button class="ph-lb-nav ph-lb-prev"' + (i === 0 ? ' disabled' : '') + '>' + svg(I.prev, 26) + '</button><button class="ph-lb-nav ph-lb-next"' + (i === ps.length - 1 ? ' disabled' : '') + '>' + svg(I.next, 26) + '</button>' : '') +
        '<span class="ph-lb-idx">' + (i + 1) + ' / ' + ps.length + '</span></div>';
      mask.querySelector('.ph-lb-x').addEventListener('click', close);
      var p = mask.querySelector('.ph-lb-prev'), n = mask.querySelector('.ph-lb-next');
      if (p) p.addEventListener('click', function (e) { e.stopPropagation(); i--; draw(); });
      if (n) n.addEventListener('click', function (e) { e.stopPropagation(); i++; draw(); });
    }
    function close() { mask.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft' && i > 0) { i--; draw(); } else if (e.key === 'ArrowRight' && i < ps.length - 1) { i++; draw(); } }
    mask.addEventListener('click', function (e) { if (e.target === mask || e.target.classList.contains('ph-lb-stage')) close(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(mask); draw();
  }

  /* ---------- 列表 + 明細 雙 Tab ---------- */
  function buildTable(cfg, host) {
    var state = { q: '', showOff: false, view: 'list', rec: undefined, sel: 0, page: 1, per: 20, hidden: {}, panel: null, mode: 'view', entryIdx: 0 };
    var cols = cfg.columns;

    var page = el('<div class="nx-page"></div>');
    page.appendChild(el(headHtml(cfg)));

    var sw = el(
      '<div class="nx-pageswitch">' +
        '<button class="ps on" data-v="list">' + svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', 15) + '資料瀏覽<kbd>Alt+1</kbd></button>' +
        '<button class="ps" data-v="detail">' + svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>', 15) + '詳細資料<kbd>Alt+2</kbd></button>' +
      '</div>');
    page.appendChild(sw);

    var views = el('<div class="nx-views"></div>');
    var listView = el('<div class="nx-view-pane nx-listview on"></div>');
    var detailView = el('<div class="nx-view-pane nx-detailview"></div>');
    views.appendChild(listView); views.appendChild(detailView);
    page.appendChild(views);
    host.appendChild(page);

    /* ===== 清單頁 ===== */
    var card = el('<div class="nx-frame"></div>');
    function tbtn(id, icon, label, cls) { return '<button class="nx-tbtn' + (cls ? ' ' + cls : '') + '" data-act="' + id + '">' + svg(I[icon], 15) + '<span>' + label + '</span></button>'; }
    var seatHtml = cfg.seat ? '<span class="nx-seat" id="nx-seat"></span>' : '';
    var toolbar = el(
      '<div class="nx-toolbar">' +
        '<div class="nx-pager"><button class="nx-iconbtn" data-act="prev">' + svg(I.prev, 15) + '</button><span class="nx-pageno" id="nx-pageno">1 / 1</span><button class="nx-iconbtn" data-act="next">' + svg(I.next, 15) + '</button></div>' +
        '<span class="nx-tsep"></span>' +
        tbtn('edit', 'pencil', '更正') + tbtn('search', 'search', '查詢') +
        '<span class="nx-tsep"></span>' +
        tbtn('toggle', 'power', '停用／啟用') + tbtn('export', 'download', '匯出') + tbtn('refresh', 'refresh', '重新整理') +
        '<span class="nx-tsep"></span>' +
        tbtn('cols', 'columns', '欄位') + tbtn('filter', 'filter', '篩選') +
        '<span class="nx-tool-sp"></span>' +
        '<label class="nx-toggle"><input type="checkbox" id="nx-showoff"><span>顯示停用</span></label>' +
        seatHtml +
        tbtn('select', 'check', '選取') +
        '<button class="nx-btn primary" data-act="add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + I.plus + '</svg>新增<kbd>Alt+A</kbd></button>' +
      '</div>');
    card.appendChild(toolbar);
    var panelHost = el('<div class="nx-panelhost"></div>'); card.appendChild(panelHost);
    var wrap = el('<div class="nx-table-wrap"></div>'); card.appendChild(wrap);
    var footer = el('<div class="nx-tfoot"><span class="cnt" id="nx-cnt"></span><label class="per">每頁 <select id="nx-per"><option>20</option><option>50</option><option>100</option></select> 筆</label></div>');
    card.appendChild(footer);
    listView.appendChild(card);

    // 六入口濾鏡（依類型分類的入口列）
    var entryBar = null;
    function curEntry() { return cfg.entries ? cfg.entries[state.entryIdx] : null; }
    if (cfg.entries) {
      entryBar = el('<div class="nx-entrybar"></div>');
      entryBar.innerHTML = cfg.entries.map(function (en, i) { return '<button class="nx-entry' + (i === 0 ? ' on' : '') + '" data-i="' + i + '">' + esc(en.label) + '</button>'; }).join('');
      card.insertBefore(entryBar, toolbar);
      entryBar.addEventListener('click', function (e) {
        var b = e.target.closest('.nx-entry'); if (!b) return;
        state.entryIdx = +b.dataset.i; state.page = 1; state.sel = 0;
        entryBar.querySelectorAll('.nx-entry').forEach(function (x) { x.classList.toggle('on', x === b); });
        renderRows();
      });
    }

    function visCols() { return cols.filter(function (c, i) { return !state.hidden[i]; }); }
    function filtered() { return cfg.data().filter(function (r) { return matchq(r) && (state.showOff || !cfg.status || cfg.status(r)) && (!cfg.entries || curEntry().test(r)); }); }
    function matchq(rec) {
      if (!state.q) return true;
      if (cfg.search) return cfg.search(rec, state.q);
      var hay = cols.map(function (c) { return (c.text ? c.text(rec) : ''); }).join(' ').toLowerCase();
      return hay.indexOf(state.q.toLowerCase()) >= 0;
    }
    function renderSeat() {
      if (!cfg.seat) return;
      var used = window.NXDB.seatUsed(), lim = window.NXDB.seatLimit;
      toolbar.querySelector('#nx-seat').innerHTML = '席次 <b>' + used + '</b> <span class="lim">/ ' + lim + ' 席</span> · 已啟用含負責人';
    }
    function renderRows() {
      var all = filtered();
      var per = state.per, pages = Math.max(1, Math.ceil(all.length / per));
      if (state.page > pages) state.page = pages;
      var start = (state.page - 1) * per, rows = all.slice(start, start + per);
      if (state.sel >= rows.length) state.sel = Math.max(0, rows.length - 1);
      var vc = visCols();
      var ths = vc.map(function (c) { return '<th' + (c.cls ? ' class="' + c.cls + '"' : '') + '>' + esc(c.label) + '</th>'; }).join('');
      if (!rows.length) {
        wrap.innerHTML = '';
        wrap.appendChild(el('<table class="nx-table"><thead><tr>' + ths + '<th style="text-align:right">操作</th></tr></thead></table>'));
        wrap.appendChild(el('<div class="nx-empty">沒有符合的資料</div>'));
      } else {
        var html = '<table class="nx-table"><thead><tr>' + ths + '<th style="text-align:right">操作</th></tr></thead><tbody>';
        rows.forEach(function (r, i) {
          var act = !cfg.status || cfg.status(r);
          var tds = vc.map(function (c) { return '<td' + (c.cls ? ' class="' + c.cls + '"' : '') + '>' + c.get(r) + '</td>'; }).join('');
          var tgl = act ? svg(I.power, 15) : svg(I.plus, 15);
          html += '<tr class="' + (act ? '' : 'off') + (i === state.sel ? ' sel' : '') + '" data-i="' + i + '">' + tds +
            '<td><div class="nx-rowact">' +
              '<button class="nx-iconbtn act-edit" title="明細">' + svg(I.pencil, 15) + '</button>' +
              (cfg.status ? '<button class="nx-iconbtn act-toggle" title="' + (act ? '停用' : '啟用') + '">' + tgl + '</button>' : '') +
            '</div></td></tr>';
        });
        html += '</tbody></table>';
        wrap.innerHTML = ''; wrap.appendChild(el(html));
        wrap.querySelectorAll('tbody tr').forEach(function (tr) {
          var rec = rows[+tr.dataset.i];
          tr.addEventListener('click', function (e) {
            if (e.target.closest('.act-toggle')) { e.stopPropagation(); doToggle(rec); return; }
            if (e.target.closest('.act-edit')) { e.stopPropagation(); openDetail(rec, 'edit'); return; }
            state.sel = +tr.dataset.i; markSel();
          });
          tr.addEventListener('dblclick', function () { openDetail(rec, 'view'); });
        });
      }
      toolbar.querySelector('#nx-pageno').textContent = state.page + ' / ' + pages;
      footer.querySelector('#nx-cnt').textContent = '共 ' + all.length + ' 筆，顯示 ' + rows.length + ' 筆';
      renderSeat();
    }
    function markSel() { wrap.querySelectorAll('tbody tr').forEach(function (tr, i) { tr.classList.toggle('sel', i === state.sel); }); }
    function ensureSelVisible() {
      var tr = wrap.querySelector('tbody tr.sel'); if (!tr) return;
      var top = tr.offsetTop, bot = top + tr.offsetHeight;
      if (top < wrap.scrollTop) wrap.scrollTop = top - 4;
      else if (bot > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = bot - wrap.clientHeight + 4;
    }
    function listNav(key) {
      if (state.view !== 'list') return false;
      var all = filtered(), per = state.per, pages = Math.max(1, Math.ceil(all.length / per));
      var rows = all.slice((state.page - 1) * per, (state.page - 1) * per + per);
      if (!rows.length) return false;
      if (key === 'Enter') { if (rows[state.sel]) openDetail(rows[state.sel], 'view'); return true; }
      if (key === 'ArrowDown') {
        if (state.sel < rows.length - 1) { state.sel++; markSel(); ensureSelVisible(); }
        else if (state.page < pages) { state.page++; state.sel = 0; renderRows(); wrap.scrollTop = 0; }
        return true;
      }
      if (key === 'ArrowUp') {
        if (state.sel > 0) { state.sel--; markSel(); ensureSelVisible(); }
        else if (state.page > 1) { state.page--; state.sel = state.per - 1; renderRows(); ensureSelVisible(); }
        return true;
      }
      return false;
    }
    function curRow() { var all = filtered(); var start = (state.page - 1) * state.per; return all.slice(start, start + state.per)[state.sel]; }
    function doToggle(rec) {
      if (cfg.toggleActive) { var res = cfg.toggleActive(rec); if (res && res.blocked) { toast(res.msg || '無法啟用', true); return; } toast(res && res.msg ? res.msg : '已更新'); }
      else { rec.active = !rec.active; }
      renderRows();
    }

    // 浮動面板（查詢 / 欄位）互斥
    function closePanel() { panelHost.innerHTML = ''; state.panel = null; toolbar.querySelectorAll('.nx-tbtn').forEach(function (b) { b.classList.remove('on'); }); }
    function openSearch() {
      if (state.panel === 'search') { closePanel(); return; }
      closePanel(); state.panel = 'search';
      toolbar.querySelector('[data-act="search"]').classList.add('on');
      var p = el('<div class="nx-panel"><div class="nx-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + I.search + '</svg><input type="text" placeholder="搜尋（注音／代碼／名稱），忽略空格星號點與大小寫…" value="' + esc(state.q) + '" autocomplete="off"></div></div>');
      panelHost.appendChild(p);
      var inp = p.querySelector('input'); inp.focus();
      inp.addEventListener('input', function (e) { state.q = e.target.value.trim(); state.page = 1; renderRows(); });
    }
    function openCols() {
      if (state.panel === 'cols') { closePanel(); return; }
      closePanel(); state.panel = 'cols';
      toolbar.querySelector('[data-act="cols"]').classList.add('on');
      var p = el('<div class="nx-panel"><div class="nx-collist"></div></div>');
      var list = p.querySelector('.nx-collist');
      cols.forEach(function (c, i) {
        var lab = el('<label class="nx-colitem"><input type="checkbox"' + (state.hidden[i] ? '' : ' checked') + '><span>' + esc(c.label) + '</span></label>');
        lab.querySelector('input').addEventListener('change', function (e) { state.hidden[i] = !e.target.checked; renderRows(); });
        list.appendChild(lab);
      });
      panelHost.appendChild(p);
    }

    toolbar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = b.dataset.act;
      if (a === 'add') openDetail(null, 'edit');
      else if (a === 'edit') { var r = curRow(); if (r) openDetail(r, 'edit'); else toast('請先選一筆資料', true); }
      else if (a === 'toggle') { var r2 = curRow(); if (r2) doToggle(r2); else toast('請先選一筆資料', true); }
      else if (a === 'search') openSearch();
      else if (a === 'cols') openCols();
      else if (a === 'refresh') { renderRows(); toast('已重新整理'); }
      else if (a === 'export') toast('匯出 CSV／PDF／列印（規劃中）');
      else if (a === 'filter') toast('多條件篩選（規劃中）');
      else if (a === 'select') toast('多選批次模式（規劃中）');
      else if (a === 'prev') { if (state.page > 1) { state.page--; state.sel = 0; renderRows(); } }
      else if (a === 'next') { var pages = Math.max(1, Math.ceil(filtered().length / state.per)); if (state.page < pages) { state.page++; state.sel = 0; renderRows(); } }
    });
    toolbar.querySelector('#nx-showoff').addEventListener('change', function (e) { state.showOff = e.target.checked; state.page = 1; renderRows(); });
    footer.querySelector('#nx-per').addEventListener('change', function (e) { state.per = +e.target.value; state.page = 1; renderRows(); });

    /* ===== 詳細頁 ===== */
    function detailPlaceholder() {
      detailView.innerHTML = '';
      detailView.appendChild(el(
        '<div class="nx-frame"><div class="nx-detail-empty">' + svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>', 46) +
        '<p>從「資料瀏覽」點選一筆資料，或按 <kbd>Alt+A</kbd> 新增，即可在此檢視與編輯明細。</p>' +
        '<button class="nx-btn ghost" id="nx-godetail-add">新增一筆</button></div></div>'));
      detailView.querySelector('#nx-godetail-add').addEventListener('click', function () { openDetail(null, 'edit'); });
    }
    function buildDetail(rec, mode, startTab) {
      state.mode = mode;
      var isNew = !rec;
      var nm = isNew ? '新增' + cfg.title.replace('基本資料', '') : (cfg.titleOf ? cfg.titleOf(rec) : (rec.name || rec.code || ''));
      var code = isNew ? '' : (rec.no || rec.code || '');
      var act = isNew ? true : (!cfg.status || cfg.status(rec));
      var tabs = (cfg.tabsFor && cfg.tabsFor(rec)) || cfg.tabs || [{ label: '資料', fields: cfg.fields || [] }];
      var tabNav = tabs.length > 1 ? '<div class="nx-tabs">' + tabs.map(function (t, i) { return '<button class="nx-tab' + (i === 0 ? ' on' : '') + '" data-t="' + i + '">' + esc(t.label) + '</button>'; }).join('') + '</div>' : '';
      var panes = tabs.map(function (t, i) {
        var formHtml = '<div class="nx-form">' + t.fields.map(function (f) { return fieldHtml(f, rec, mode); }).join('') + '</div>';
        var inner = t.aside === 'avatar' ? '<div class="nx-pane-split">' + formHtml + avatarHtml(rec, mode) + '</div>'
          : t.aside === 'photos' ? '<div class="nx-pane-split nx-pane-split-photos">' + formHtml + photosHtml() + '</div>'
          : formHtml;
        return '<div class="nx-pane' + (i === 0 ? ' on' : '') + '" data-p="' + i + '">' + inner + '</div>';
      }).join('');
      var audit = isNew ? '' : '<div class="nx-audit"><span>建立：2024-01-02 09:30 · 系統管理員</span><span>最後修改：2026-06-10 14:08 · ' + esc((window.NXDB.emps[0] || {}).name || '系統') + '</span></div>';

      detailView.innerHTML = '';
      var frame = el('<div class="nx-frame nx-detail"></div>');
      frame.appendChild(el(
        '<div class="nx-detail-bar">' +
          '<button class="nx-btn ghost" id="nx-back">' + svg(I.prev, 16) + '返回列表</button>' +
          '<span class="nx-statedot ' + (act ? 'on' : 'off') + '"></span>' +
          '<div class="nx-detail-id">' + (code ? '<span class="code">' + esc(code) + '</span>' : '') + '<b>' + esc(nm) + '</b></div>' +
          '<span class="nx-modetag" id="nx-modetag"></span>' +
          '<span class="sp"></span><span class="nx-locknote">' + lockNote() + '</span>' +
          '<div class="nx-detail-actions" id="nx-dacts"></div>' +
        '</div>'));
      if (tabNav) frame.appendChild(el(tabNav));
      frame.appendChild(el('<div class="nx-detail-body">' + panes + (audit || '') + '</div>'));
      detailView.appendChild(frame);

      frame.querySelectorAll('.nx-tab').forEach(function (b) {
        b.addEventListener('click', function () {
          frame.querySelectorAll('.nx-tab').forEach(function (x) { x.classList.toggle('on', x === b); });
          frame.querySelectorAll('.nx-pane').forEach(function (p) { p.classList.toggle('on', p.dataset.p === b.dataset.t); });
        });
      });
      if (startTab) { var tb = frame.querySelector('.nx-tab[data-t="' + startTab + '"]'); if (tb) tb.click(); }
      // 子表：新增／移除／格內編輯
      function curTab() { var on = frame.querySelector('.nx-tab.on'); return on ? +on.dataset.t : 0; }
      frame.querySelectorAll('.nx-sub-add').forEach(function (btn) {
        btn.addEventListener('click', function () { if (!rec) return; var k = btn.dataset.sub; rec[k] = rec[k] || []; rec[k].push({}); buildDetail(rec, state.mode, curTab()); });
      });
      frame.querySelectorAll('.nx-sub-x').forEach(function (btn) {
        btn.addEventListener('click', function () { if (!rec) return; var k = btn.dataset.sub; (rec[k] || []).splice(+btn.dataset.ri, 1); buildDetail(rec, state.mode, curTab()); });
      });
      frame.querySelectorAll('.nx-subt [data-ck]').forEach(function (inp) {
        function subKey() { var tbl = inp.closest('.nx-subtable'); var k = (tbl.querySelector('.nx-sub-add') || tbl.querySelector('.nx-sub-x') || {}).dataset; return k ? k.sub : null; }
        inp.addEventListener('change', function () {
          var key = subKey(); if (!key) return; var ri = +inp.closest('tr').dataset.ri; var row = rec[key] && rec[key][ri]; if (!row) return;
          var ck = inp.dataset.ck; row[ck] = inp.classList.contains('nx-sw') ? inp.checked : inp.value;
          var zd = window.NXDB.dict.zipData;
          if (ck === 'city') { row.area = ''; row.zip = ''; buildDetail(rec, state.mode, curTab()); }
          else if (ck === 'area') { var hit = (zd[row.city] || []).filter(function (o) { return o.area === row.area; })[0]; row.zip = hit ? hit.zip : ''; buildDetail(rec, state.mode, curTab()); }
          else if (ck === 'zip') { var fz = findZip(row.zip); if (fz) { row.city = fz.city; row.area = fz.area; } buildDetail(rec, state.mode, curTab()); }
        });
        inp.addEventListener('input', function () { if (inp.tagName === 'INPUT' && inp.dataset.ck !== 'zip') { var key = subKey(); if (!key) return; var ri = +inp.closest('tr').dataset.ri; if (rec[key] && rec[key][ri]) rec[key][ri][inp.dataset.ck] = inp.value; } });
      });
      // 結構化地址：選縣市→鄉鎮自動帶郵遞區號
      frame.querySelectorAll('.nx-addr [data-addr]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var k = inp.dataset.addr, af = inp.dataset.af; rec[k] = rec[k] || {};
          rec[k][af] = inp.value;
          if (af === 'city') { rec[k].area = ''; rec[k].zip = ''; buildDetail(rec, state.mode, curTab()); }
          else if (af === 'area') { var arr = (window.NXDB.dict.zipData[rec[k].city] || []); var hit = arr.filter(function (o) { return o.area === inp.value; })[0]; rec[k].zip = hit ? hit.zip : ''; buildDetail(rec, state.mode, curTab()); }
          else if (af === 'zip') { var fz = findZip(rec[k].zip); if (fz) { rec[k].city = fz.city; rec[k].area = fz.area; } buildDetail(rec, state.mode, curTab()); }
        });
      });
      // 遮罩顯示切換
      frame.querySelectorAll('.nx-reveal').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var inp = btn.parentNode.querySelector('input');
          var show = inp.type === 'password';
          inp.type = show ? 'text' : 'password';
          btn.innerHTML = show ? svg(I.eyeoff, 15) : svg(I.eye, 15);
        });
      });
      // 動作鈕（重置密碼、依成本重算售價、依付款條件重算分級等）
      var actionMap = {};
      tabs.forEach(function (t) { t.fields.forEach(function (f) { if (f.type === 'action' && f.onClick) actionMap[f.action] = f.onClick; }); });
      function collectForm() { frame.querySelectorAll('.nx-form [data-key]').forEach(function (input) { var k = input.dataset.key; if (!k || input.disabled) return; if (input.classList.contains('nx-sw')) rec[k] = input.checked; else rec[k] = input.value; }); }
      frame.querySelectorAll('.nx-action').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var act = btn.dataset.action;
          if (actionMap[act]) { if (rec) { collectForm(); var msg = actionMap[act](rec); toast(msg || '已重算'); buildDetail(rec, state.mode, curTab()); } else toast('請先存檔再重算', true); return; }
          if (act === 'resetpwd') {
            if (confirm('確定將此員工密碼重設為預設密碼（員工編號）並要求下次登入改密碼？')) toast('密碼已重設，已開啟強制改密');
          } else toast('已執行');
        });
      });
      // 大頭貼上傳／拍照
      var avBox = frame.querySelector('.nx-avatar');
      frame.querySelectorAll('.nx-photos').forEach(function (a) { renderPhotos(a, rec, state.mode); });
      if (avBox) {
        var avFile = avBox.querySelector('.nx-av-file'), avCam = avBox.querySelector('.nx-av-camfile');
        function readImg(input) { var f = input.files && input.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { if (rec) rec._avatar = r.result; var box = avBox.querySelector('.nx-avatar-img'); box.classList.add('has'); box.innerHTML = '<img src="' + r.result + '" alt="大頭貼">'; }; r.readAsDataURL(f); }
        avBox.querySelector('.nx-av-up').addEventListener('click', function () { avFile.click(); });
        avBox.querySelector('.nx-av-cam').addEventListener('click', function () { avCam.click(); });
        avFile.addEventListener('change', function () { readImg(avFile); });
        avCam.addEventListener('change', function () { readImg(avCam); });
      }
      frame.querySelector('#nx-back').addEventListener('click', function () { setView('list'); renderRows(); });

      function setMode(m) {
        state.mode = m;
        frame.querySelector('#nx-modetag').textContent = m === 'edit' ? '編輯中' : '瀏覽';
        frame.querySelector('#nx-modetag').className = 'nx-modetag ' + m;
        // 啟用/停用輸入
        frame.querySelectorAll('.nx-form [data-key], .nx-action, .nx-avatar .nx-btn, .nx-subt [data-ck], .nx-sub-add, .nx-sub-x, .nx-addr [data-addr]').forEach(function (input) {
          var fieldRo = input.closest('.nx-field') && input.closest('.nx-field').querySelector('label .ro');
          if (m === 'edit' && !input.dataset.lockro) input.disabled = false;
          if (m === 'view') input.disabled = true;
          if (fieldRo) input.disabled = true; // 永久唯讀欄
        });
        frame.querySelectorAll('.nx-photos').forEach(function (a) { renderPhotos(a, rec, m); });
        var acts = frame.querySelector('#nx-dacts');
        if (m === 'edit') {
          acts.innerHTML = '<button class="nx-btn ghost" id="nx-cancel">取消</button><button class="nx-btn primary" id="nx-save">' + svg(I.save, 15) + '儲存<kbd>Alt+S</kbd></button>';
          acts.querySelector('#nx-cancel').addEventListener('click', function () { isNew ? (setView('list')) : buildDetail(rec, 'view'); });
          acts.querySelector('#nx-save').addEventListener('click', doSave);
          active.save = doSave;
        } else {
          acts.innerHTML = '<button class="nx-btn primary" id="nx-edit2">' + svg(I.pencil, 15) + '更正</button>';
          acts.querySelector('#nx-edit2').addEventListener('click', function () { setMode('edit'); });
          active.save = null;
        }
      }
      function doSave() { saveDetail(cfg, rec, isNew, frame); setView('list'); renderRows(); }
      // 標記永久唯讀欄位（f.ro），避免編輯模式被開啟
      tabs.forEach(function (t) { t.fields.forEach(function (f) { if (f.ro && f.key) { var inp = frame.querySelector('[data-key="' + f.key + '"]'); if (inp) inp.dataset.lockro = '1'; } }); });
      setMode(mode);
    }
    function openDetail(rec, mode) { state.rec = rec; buildDetail(rec, mode || 'view'); setView('detail'); }
    /* ===== 視圖切換 ===== */
    function setView(v) {
      state.view = v;
      sw.querySelectorAll('.ps').forEach(function (b) { b.classList.toggle('on', b.dataset.v === v); });
      listView.classList.toggle('on', v === 'list');
      detailView.classList.toggle('on', v === 'detail');
      if (v === 'detail' && state.rec === undefined && !detailView.querySelector('.nx-detail')) {
        var r = curRow();
        if (r) openDetail(r, 'view'); else detailPlaceholder();
      }
    }
    sw.querySelector('[data-v="list"]').addEventListener('click', function () { setView('list'); });
    sw.querySelector('[data-v="detail"]').addEventListener('click', function () { setView('detail'); });

    active = { setView: setView, addNew: function () { openDetail(null, 'edit'); }, save: null, listNav: listNav };
    detailPlaceholder();
    renderRows();
    return page;
  }

  function saveDetail(cfg, rec, isNew, container) {
    var target = rec;
    if (isNew) target = cfg.newRecord ? cfg.newRecord() : {};
    container.querySelectorAll('[data-key]').forEach(function (input) {
      var k = input.dataset.key; if (!k || input.disabled) return;
      if (input.classList.contains('nx-sw')) target[k] = input.checked;
      else target[k] = input.value;
    });
    if (isNew && cfg.data) { var arr = cfg.data(); if (Array.isArray(arr)) arr.unshift(target); }
    toast(isNew ? '已新增' : '已儲存變更');
  }

  function lockNote() { return svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', 14) + '代碼類欄位建立後鎖定'; }

  /* ---------- 骨架頁 ---------- */
  function buildSkeleton(cfg, host) {
    var meta = (window.NX_MASTER && window.NX_MASTER.pageIndex[cfg.id]) || {};
    var page = el('<div class="nx-page"></div>');
    page.appendChild(el(headHtml(cfg)));
    var card = el('<div class="nx-frame"></div>');
    var skel = el('<div class="nx-skel"></div>');
    skel.appendChild(el('<span class="nx-wip">此頁規劃中 · 已接入導覽</span>'));
    skel.appendChild(el('<div class="nx-skel-top"><div class="nx-skel-ic">' + ic(meta.icon || 'boxes') + '</div><div class="t"><b>' + esc(cfg.title) + '</b><span>' + (kindName(cfg.kind) ? kindName(cfg.kind) + ' · ' : '') + esc(meta.divLabel || '') + '</span></div></div>'));
    if (cfg.note) skel.appendChild(el('<p class="nx-skel-note">' + esc(cfg.note) + '</p>'));
    if (cfg.fields && cfg.fields.length) skel.appendChild(el('<div class="nx-skel-fields">' + cfg.fields.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>'));
    skel.appendChild(el('<div class="nx-skel-bars"><div class="nx-skel-bar" style="width:62%"></div><div class="nx-skel-bar" style="width:88%"></div><div class="nx-skel-bar" style="width:74%"></div></div>'));
    card.appendChild(skel); page.appendChild(card); host.appendChild(page);
    active = null;
    return page;
  }

  /* ---------- toast ---------- */
  var toastEl, toastTimer;
  function toast(msg, warn) {
    if (!toastEl) { toastEl = el('<div class="nx-toast"></div>'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = (warn
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="#e8a06b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>') + '<span>' + esc(msg) + '</span>';
    toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------- Alt 快捷 ---------- */
  document.addEventListener('keydown', function (e) {
    var mv = document.getElementById('view-master');
    if (!mv || mv.hidden || !active) return;
    // 列表鍵盤選列（上下鍵移動、Enter 進明細）—焦點不在表單時
    if (!e.altKey && active.listNav) {
      var t = document.activeElement, tag = t && t.tagName;
      if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
          if (active.listNav(e.key)) { e.preventDefault(); return; }
        }
      }
    }
    if (!e.altKey) return;
    if (e.key === '1') { e.preventDefault(); active.setView('list'); }
    else if (e.key === '2') { e.preventDefault(); active.setView('detail'); }
    else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); active.addNew(); }
    else if (e.key === 's' || e.key === 'S') { if (active.save) { e.preventDefault(); active.save(); } }
  });

  /* ---------- 對外 ---------- */
  window.NXMaster = {
    render: function (pageId, host) {
      host.innerHTML = ''; active = null;
      var cfg = (window.NX_PAGE_CONFIGS || {})[pageId];
      if (!cfg) { host.appendChild(el('<div class="nx-page"><div class="nx-frame"><div class="nx-empty">找不到此頁設定：' + esc(pageId) + '</div></div></div>')); return; }
      var helpers = { headHtml: headHtml, toast: toast };
      if ((pageId === 'orgchart' || pageId === 'sitechart') && window.NXAssign) return window.NXAssign.render(host, cfg, helpers);
      if ((pageId === 'univgroup' || pageId === 'supplymap') && window.NXBatch) return window.NXBatch.render(host, cfg, helpers);
      if (pageId === 'permmatrix' && window.NXMatrix) return window.NXMatrix.render(host, cfg, helpers);
      if (cfg.skeleton) return buildSkeleton(cfg, host);
      return buildTable(cfg, host);
    },
    toast: toast
  };
})();
