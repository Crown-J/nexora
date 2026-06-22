// NEXORA GRID — 進貨模組｜單據明細共用元件（v3.10）
// 規格 v3.9/v3.10「單據面」：明細採「品項編輯彈窗逐筆」（非表格直接改），下方清單唯讀；
// 品項彈窗內「使用料號」走【料號即時查詢元件 F2】（多查法＋顯示庫存/預進量/最近進價/ABCD 價…，全模組共用）。
// 本檔把這兩個元件掛上 NXP，供 nx-purchase-flow.js 各單據作業共用。
(function () {
  'use strict';
  var DB = window.NXDB, P = window.NXP;
  if (!P || !DB) return;
  var esc = P.esc, el = P.el, svg = P.svg, svgI = P.svgI, comma = P.comma, toast = P.toast, modal = P.modal;

  /* ---------- 衍生資訊：預進量 / 最近進價 / 預設庫位 / 盤點日 / 進料日 ---------- */
  // 預進量＝已核准未入庫的採購在途量（規格：可用庫存＝現庫存＋在途－已配）
  function predInbound(partId) {
    var live = { approved: 1, sent: 1, confirmed: 1, partial: 1 };
    return (DB.poList || []).reduce(function (s, o) {
      if (!live[o.status]) return s;
      return s + o.items.filter(function (it) { return it.partId === partId; })
        .reduce(function (a, it) { return a + Math.max(0, (it.qty || 0) - (it.received || 0) - (it.cancelled || 0)); }, 0);
    }, 0);
  }
  // 最近進價：優先取最近一張已完成進貨單的入庫成本，否則取主要供貨對應預設單價
  function lastInPrice(partId) {
    var grns = (DB.grnList || []).filter(function (g) { return g.status === 'done' && g.items.some(function (it) { return it.partId === partId && it.inCost; }); });
    if (grns.length) { var it = grns[0].items.filter(function (x) { return x.partId === partId; })[0]; if (it && it.inCost) return it.inCost; }
    var hit = null;
    Object.keys(DB.supplyMap || {}).forEach(function (sid) { (DB.supplyMap[sid] || []).forEach(function (m) { if (m.partId === partId && (!hit || m.primary)) hit = m; }); });
    return hit ? hit.price : (DB.byId(DB.parts, partId) || {}).cost || 0;
  }
  function defBin(p) {
    var bins = DB.bins || []; if (!bins.length) return '—';
    var idx = (p.id.charCodeAt(4) || 0) % bins.length;
    return bins[idx].code;
  }
  function dseed(p) { return (p.id.charCodeAt(4) || 5) + (p.id.charCodeAt(5) || 3); }
  function fakeDate(p, base) { var d = new Date('2026-06-01T00:00:00'); d.setDate(d.getDate() - ((dseed(p) * base) % 90)); return d.toISOString().slice(0, 10); }

  // 一顆零件的「即時查詢」完整資訊（規格列舉欄位全收）
  function partInfo(p) {
    var stock = DB.stockOf(p.id), safe = +p.safeQty || 0;
    var sellable = Math.max(0, stock), unsellable = stock < 0 ? 0 : 0;
    var pre = predInbound(p.id), avail = stock + pre;
    return {
      stock: stock, safe: safe, whTotal: stock, sellable: sellable, unsellable: unsellable,
      pre: pre, avail: avail, bin: defBin(p), lastIn: lastInPrice(p.id),
      a: p.priceA, b: p.priceB, c: p.priceC, d: p.priceD, unit: p.unit || 'pcs',
      stocktake: fakeDate(p, 2), inDate: fakeDate(p, 1),
      ret: P.retPolicy(p.returnPolicy), warranty: (+p.warranty || 0) + ' 個月',
      ref: [p.brand, p.origin, p.ptype].filter(Boolean).join(' · ')
    };
  }

  // 各倉拆分（單一總量資料 → 依倉別權重合理拆分，各欄合計＝全公司總量）
  function whRows(p) {
    var whs = (DB.warehouses || []).filter(function (w) { return w.active; });
    var n = whs.length; if (!n) return [];
    var weights = whs.map(function (w, i) { return n === 1 ? 1 : (i === 0 ? 0.6 : 0.4 / (n - 1)); });
    function split(tot) {
      if (tot < 0) return whs.map(function (w, i) { return i === 0 ? tot : 0; });
      var rem = tot, out = [];
      whs.forEach(function (w, i) { var q = i === n - 1 ? rem : Math.min(rem, Math.round(tot * weights[i])); rem -= q; out.push(q); });
      return out;
    }
    var s = split(DB.stockOf(p.id)), sf = split(+p.safeQty || 0), mx = split(+p.maxQty || 0);
    return whs.map(function (w, i) { return { w: w, stock: s[i], safe: sf[i], max: mx[i] }; });
  }
  // 資訊卡（F2 右側／彈窗內）— 上方全公司彙總（建議補貨／現有庫存／安全量／最高量）＋ 下方各倉現有庫存/安全量/最高量
  function infoCardHtml(p) {
    if (!p) return '<div class="pil-info empty">搜尋後點選一筆料號，檢視庫存彙總</div>';
    var rows = whRows(p), safe = +p.safeQty || 0, max = +p.maxQty || 0, total = DB.stockOf(p.id);
    var suggest = Math.max(0, (max || safe) - total);
    function lit(q) { return q < 0 ? 'neg' : (q === 0 ? 'zero' : (q < safe ? 'low' : 'ok')); }
    function sumCell(k, v, cls) { return '<div class="pil-sumcell"><span class="k">' + esc(k) + '</span><span class="v ' + (cls || '') + '">' + v + '</span></div>'; }
    return '<div class="pil-info"><div class="pil-info-h">' + svgI('box', 14) + '<b>' + esc(p.code) + '</b> ' + esc(p.name) +
      '<span class="pil-unit">單位 ' + esc(p.unit || 'pcs') + '</span></div>' +
      '<div class="pil-sum">' +
      sumCell('建議補貨數量', comma(suggest), 'gold') +
      sumCell('全公司現有庫存', '<span class="pur-stk ' + lit(total) + '"><i></i>' + comma(total) + '</span>') +
      sumCell('全公司安全量', comma(safe)) +
      sumCell('全公司最高量', comma(max)) +
      '</div>' +
      '<div class="pil-whh">各倉庫存 · 安全量 · 最高量</div>' +
      '<table class="pur-mini-table pil-wh"><thead><tr><th>倉庫</th><th>據點</th><th class="num">現有庫存</th><th class="num">安全量</th><th class="num">最高量</th></tr></thead><tbody>' +
      rows.map(function (r) { var s = DB.byId(DB.sites, r.w.site); return '<tr><td>' + esc(r.w.name) + '</td><td>' + esc(s ? s.name : '') + '</td><td class="num"><span class="pur-stk ' + lit(r.stock) + '"><i></i>' + comma(r.stock) + '</span></td><td class="num">' + comma(r.safe) + '</td><td class="num">' + comma(r.max) + '</td></tr>'; }).join('') +
      '<tr class="pil-wh-total"><td>合計</td><td></td><td class="num"><span class="pur-stk ' + lit(total) + '"><i></i>' + comma(total) + '</span></td><td class="num">' + comma(safe) + '</td><td class="num">' + comma(max) + '</td></tr>' +
      '</tbody></table></div>';
  }

  /* ====================== 料號即時查詢元件（F2，全模組共用）====================== */
  // opts: { parts:[part]?, allowDisabled?, onPick(part), title? }
  var SEARCH_KEYS = [
    ['all', '全部'],
    ['code_base', '使用料號（依基準料號排序）'],
    ['code_use', '使用料號（依使用料號排序）'],
    ['name_model', '中文品名 + 車型'],
    ['model_name', '車型 + 中文品名'],
    ['group_model', '族群 + 車型'],
    ['brand', '廠牌']
  ];
  function partLookup(opts) {
    opts = opts || {};
    var st = { key: 'all', q: '', showOff: false, sel: null };
    var basePool = opts.parts && opts.parts.length ? opts.parts.slice() : DB.parts.slice();
    var body =
      '<div class="pil-bar">' +
      '<select id="pil-key" class="pil-sel">' + SEARCH_KEYS.map(function (k) { return '<option value="' + k[0] + '">' + esc(k[1]) + '</option>'; }).join('') + '</select>' +
      '<div class="pil-search">' + svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 14) + '<input id="pil-q" placeholder="輸入料號 / 廠牌料號 / 品名（注音快搜，忽略空格大小寫）"></div>' +
      '<label class="pil-chk"><input type="checkbox" id="pil-off">顯示停用料</label>' +
      '</div>' +
      '<div class="pil-split"><div class="pil-listwrap" id="pil-listwrap"></div>' + (opts.readOnly ? '' : '') + '<div id="pil-infowrap">' + infoCardHtml(null) + '</div></div>';
    var m = modal({ tag: '料號即時查詢', title: opts.title || '料號即時查詢（F2）', wide: true, xl: true, body: body,
      foot: opts.readOnly ? '<button class="nx-btn ghost" id="pil-close">關閉</button>'
        : '<span class="pil-foot-hint">雙擊或按「選定」帶回品項；↑↓ 移動、Enter 選定</span><button class="nx-btn ghost" id="pil-cancel">取消</button><button class="nx-btn primary" id="pil-ok" disabled>' + svgI('check', 15) + '選定</button>' });
    var card = m.card;
    function norm(s) { return String(s || '').toLowerCase().replace(/[\s*.]/g, ''); }
    function pool() {
      var q = norm(st.q);
      if (!q) return [];
      var rows = basePool.filter(function (p) { return st.showOff ? true : p.active; });
      rows = rows.filter(function (p) { return norm((p.code || '') + (p.brandPn || '') + (p.oldPn || '') + (p.name || '') + (p.brand || '')).indexOf(q) >= 0; });
      var byCode = function (a, b) { return String(a.code).localeCompare(String(b.code)); };
      if (st.key === 'brand') rows.sort(function (a, b) { return String(a.brand).localeCompare(String(b.brand)) || byCode(a, b); });
      else if (st.key === 'group_model') rows.sort(function (a, b) { return String(a.group).localeCompare(String(b.group)) || String(a.name).localeCompare(String(b.name)); });
      else if (st.key === 'name_model' || st.key === 'model_name') rows.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
      else rows.sort(byCode);
      return rows;
    }
    function drawList() {
      var rows = pool();
      if (st.sel && rows.indexOf(st.sel) < 0) st.sel = null;
      var html = '<table class="pur-lines pil-table"><thead><tr><th>使用料號</th><th>廠牌料號</th><th>品名</th><th>廠牌</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (p) {
          return '<tr data-pid="' + p.id + '" class="' + (st.sel === p ? 'sel' : '') + (p.active ? '' : ' off') + '">' +
            '<td><span class="pn">' + esc(p.code) + '</span>' + (p.active ? '' : ' <span class="pur-badge m">停用</span>') + '</td>' +
            '<td><span class="pn2">' + esc(p.brandPn || '—') + '</span></td>' +
            '<td>' + esc(p.name) + '</td><td>' + esc(p.brand || '—') + '</td></tr>';
        }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--faint);padding:26px">' + (st.q ? '查無符合「' + esc(st.q) + '」的料號' : '輸入關鍵字開始搜尋（料號／廠牌料號／品名／廠牌）') + '</td></tr>') +
        '</tbody></table>';
      card.querySelector('#pil-listwrap').innerHTML = html;
      card.querySelectorAll('.pil-table tbody tr[data-pid]').forEach(function (tr) {
        var p = DB.byId(DB.parts, tr.dataset.pid);
        tr.addEventListener('click', function () { st.sel = p; refreshSel(); });
        tr.addEventListener('dblclick', function () { pick(p); });
      });
      refreshSel();
    }
    function refreshSel() {
      card.querySelectorAll('.pil-table tbody tr[data-pid]').forEach(function (tr) { tr.classList.toggle('sel', st.sel && tr.dataset.pid === st.sel.id); });
      card.querySelector('#pil-infowrap').innerHTML = infoCardHtml(st.sel);
      var ok = card.querySelector('#pil-ok'); if (ok) ok.disabled = !st.sel;
    }
    function pick(p) { if (!p) return; m.close(); if (opts.onPick) opts.onPick(p); }
    card.querySelector('#pil-key').addEventListener('change', function (e) { st.key = e.target.value; drawList(); });
    card.querySelector('#pil-q').addEventListener('input', function (e) { st.q = e.target.value; drawList(); });
    card.querySelector('#pil-off').addEventListener('change', function (e) { st.showOff = e.target.checked; drawList(); });
    var ok = card.querySelector('#pil-ok'); if (ok) ok.addEventListener('click', function () { pick(st.sel); });
    var cc = card.querySelector('#pil-cancel') || card.querySelector('#pil-close'); if (cc) cc.addEventListener('click', m.close);
    card.addEventListener('keydown', function (e) {
      var rows = pool();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var i = st.sel ? rows.indexOf(st.sel) : -1; i = e.key === 'ArrowDown' ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1); st.sel = rows[i] || st.sel; refreshSel(); var tr = card.querySelector('.pil-table tbody tr.sel'); if (tr) tr.scrollIntoViewIfNeeded ? tr.scrollIntoViewIfNeeded() : 0; }
      else if (e.key === 'Enter' && !opts.readOnly) { e.preventDefault(); if (st.sel) pick(st.sel); }
    });
    drawList();
    setTimeout(function () { var q = card.querySelector('#pil-q'); if (q) q.focus(); }, 30);
    return m;
  }
  // 唯讀檢視（進貨/退回/保固 等明細點料號看即時資訊）
  function partInfoModal(p) { if (!p) return; partLookup({ parts: [p], readOnly: true, title: '料號即時資訊 · ' + p.code, onPick: function () {} }); }

  /* ====================== 品項編輯彈窗（逐筆）====================== */
  // opts: { mode:'add'|'edit', line:{partId,qty,price,lead,bin,note}, lookupParts?, allowDisabled?,
  //         priceField?, leadField?, qtyMax?, currency?, onSave(line), title? }
  function itemEditor(opts) {
    opts = opts || {};
    var line = Object.assign({ partId: '', qty: 1, price: '', lead: '', bin: '', note: '' }, opts.line || {});
    var body =
      '<div class="pie-pick">' +
      '<div class="pie-pick-l"><span class="pie-lbl">使用料號 <span class="req">*</span></span>' +
      '<div id="pie-partbox"></div></div>' +
      '<button class="nx-btn ghost" id="pie-f2">' + svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 14) + '查詢料號 <kbd class="pie-kbd">F2</kbd></button>' +
      '</div>' +
      '<div id="pie-info">' + infoCardHtml(opts.line && line.partId ? DB.byId(DB.parts, line.partId) : null) + '</div>' +
      '<div class="pur-doc-grid" style="margin-top:14px">' +
      '<div class="pur-fld"><span class="k"><span class="req">*</span>數量</span><input id="pie-qty" value="' + esc(line.qty) + '"' + (opts.qtyMax != null ? ' data-max="' + opts.qtyMax + '"' : '') + '></div>' +
      (opts.priceField ? '<div class="pur-fld"><span class="k">單價' + (opts.currency && opts.currency !== 'TWD' ? '（' + esc(opts.currency) + '）' : '') + '</span><input id="pie-price" value="' + esc(line.price) + '"></div>' : '') +
      (opts.leadField ? '<div class="pur-fld"><span class="k">交期（天）</span><input id="pie-lead" value="' + esc(line.lead) + '"></div>' : '') +
      '<div class="pur-fld"><span class="k">庫位</span><input id="pie-bin" value="' + esc(line.bin) + '" placeholder="預設帶料號庫位"></div>' +
      '<div class="pur-fld" style="grid-column:1/-1"><span class="k">備註</span><input id="pie-note" value="' + esc(line.note) + '" placeholder="此品項備註"></div>' +
      (opts.qtyMax != null ? '<div class="pur-fld" style="grid-column:1/-1"><span class="k" style="color:var(--muted)">可退上限</span><span class="v">' + opts.qtyMax + '</span></div>' : '') +
      '</div>';
    var m = modal({ tag: opts.mode === 'edit' ? '更正品項' : '新增品項', title: opts.title || (opts.mode === 'edit' ? '更正品項' : '新增品項'), wide: true, body: body,
      foot: '<button class="nx-btn ghost" id="pie-cancel">取消</button><button class="nx-btn primary" id="pie-save">' + svgI('check', 15) + '存檔</button>' });
    var card = m.card;
    function partBox() {
      var p = line.partId ? DB.byId(DB.parts, line.partId) : null;
      card.querySelector('#pie-partbox').innerHTML = p
        ? '<div class="pie-part"><span class="pn">' + esc(p.code) + '</span><b>' + esc(p.name) + '</b><span class="meta">' + esc(p.brand || '') + (p.brandPn ? ' · ' + esc(p.brandPn) : '') + ' · ' + esc(p.unit || 'pcs') + '</span></div>'
        : '<div class="pie-part empty">尚未選料號 — 按「查詢料號 / F2」選取</div>';
      card.querySelector('#pie-info').innerHTML = infoCardHtml(p);
    }
    function openLookup() {
      partLookup({ parts: opts.lookupParts, allowDisabled: opts.allowDisabled, title: opts.lookupTitle || '料號即時查詢（F2）', onPick: function (p) {
        line.partId = p.id;
        var be = card.querySelector('#pie-bin'); if (be && !be.value) { be.value = defBin(p); line.bin = be.value; }
        var pe = card.querySelector('#pie-price'); if (pe && pe.value === '') { pe.value = lastInPrice(p.id); line.price = +pe.value || 0; }
        partBox();
        var qi = card.querySelector('#pie-qty'); if (qi) qi.focus();
      } });
    }
    card.querySelector('#pie-f2').addEventListener('click', openLookup);
    card.addEventListener('keydown', function (e) { if (e.key === 'F2') { e.preventDefault(); openLookup(); } });
    card.querySelector('#pie-cancel').addEventListener('click', m.close);
    card.querySelector('#pie-save').addEventListener('click', function () {
      if (!line.partId) { toast('請先按 F2 選取使用料號', true); return; }
      var qi = card.querySelector('#pie-qty'); var qv = +qi.value || 0;
      if (qv <= 0) { toast('數量必須大於 0', true); return; }
      if (opts.qtyMax != null && qv > opts.qtyMax) { toast('不可超過可退上限 ' + opts.qtyMax, true); qi.value = opts.qtyMax; return; }
      line.qty = qv;
      var pe = card.querySelector('#pie-price'); if (pe) line.price = pe.value === '' ? '' : (+pe.value || 0);
      var le = card.querySelector('#pie-lead'); if (le) line.lead = +le.value || 0;
      var be = card.querySelector('#pie-bin'); if (be) line.bin = be.value;
      var ne = card.querySelector('#pie-note'); if (ne) line.note = ne.value;
      m.close(); if (opts.onSave) opts.onSave(line);
    });
    partBox();
    if (!line.partId && opts.mode !== 'edit') setTimeout(openLookup, 60);
    return m;
  }

  P.predInbound = predInbound;
  P.lastInPrice = lastInPrice;
  P.partInfo = partInfo;
  P.infoCardHtml = infoCardHtml;
  P.partLookup = partLookup;
  P.partInfoModal = partInfoModal;
  P.itemEditor = itemEditor;
})();
