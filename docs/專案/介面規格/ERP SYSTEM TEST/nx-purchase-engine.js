// NEXORA GRID — 進貨模組｜引擎核心（共用元件 + 路由 + 缺貨簿 + 產品/供應商管理）
// 流程作業頁（詢價採購／國內外進退貨／保固）在 nx-purchase-flow.js 註冊到 NXP.pages。
(function () {
  'use strict';
  var DB = window.NXDB;
  var ICONS = window.NX_ICONS || {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function svg(p, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"' + (w ? ' style="width:' + w + 'px;height:' + w + 'px"' : '') + '>' + p + '</svg>'; }
  function ic(name, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (w ? ' style="width:' + w + 'px;height:' + w + 'px"' : '') + '>' + (ICONS[name] || '') + '</svg>'; }
  function toast(m, w) { if (window.NXMaster) window.NXMaster.toast(m, w); }

  var I = {
    prev: '<path d="m15 18-6-6 6-6"/>', next: '<path d="m9 18 6-6-6-6"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', plus: '<path d="M12 5v14M5 12h14"/>', refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>', send: '<path d="m22 2-7 20-4-9-9-4Z"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    warn: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', box: '<path d="M2.97 7.5 12 12l9.03-4.5M12 12v9.5M3 7.2v9.6l9 4.7 9-4.7V7.2L12 2.5 3 7.2Z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 1.5-1 2-3 2.5-2 .5-3 1-3 2.5a3 3 0 0 0 6 0M12 6v1.5M12 16.5V18"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    ship: '<path d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/>',
    chev: '<path d="m9 18 6-6-6-6"/>'
  };
  function svgI(k, w) { return svg(I[k] || '', w); }

  /* ---------- 金額格式 ---------- */
  function comma(n) { n = Math.round((+n || 0) * 100) / 100; var parts = String(n).split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return parts.join('.'); }
  function money(v, cur) {
    cur = cur || 'TWD';
    if (cur === 'TWD') return '<span class="pur-money"><span class="cur">NT$</span>' + comma(v) + '</span>';
    var sym = { USD: '$', JPY: '¥', EUR: '€', CNY: '¥' }[cur] || '';
    return '<span class="pur-money"><span class="cur">' + cur + '</span>' + sym + comma(v) + '</span>';
  }

  /* ---------- 庫存燈號 ---------- */
  function stockCell(stock, safe) {
    var cls = stock < 0 ? 'neg' : (stock === 0 ? 'zero' : (stock < safe ? 'low' : 'ok'));
    return '<span class="pur-stk ' + cls + '"><i></i>' + comma(stock) + '</span>';
  }

  /* ---------- 料號三併（我方/廠牌/品名）---------- */
  function partCell(p) {
    if (!p) return '—';
    return '<div style="display:flex;flex-direction:column;gap:1px">' +
      '<span style="display:flex;gap:8px;align-items:baseline"><span class="pn" style="font-family:var(--mono);font-size:12px;color:var(--gold-bright)">' + esc(p.code) + '</span>' +
      (p.brandPn ? '<span class="pn2" style="font-family:var(--mono);font-size:11px;color:var(--muted)">' + esc(p.brandPn) + '</span>' : '') + '</span>' +
      '<span style="font-size:12.5px;color:var(--fg)">' + esc(p.name) + '</span></div>';
  }

  /* ---------- 採購單狀態徽章 ---------- */
  var PO_ST = {
    draft: { cls: 'm', label: '草稿' }, pending: { cls: 'o', label: '待核准' }, approved: { cls: 'b', label: '已核准' },
    sent: { cls: 'b', label: '已寄廠商' }, confirmed: { cls: 'gold', label: '廠商確認' }, partial: { cls: 'gold', label: '部分驗收' },
    received: { cls: 'g', label: '全部驗收' }, closed: { cls: 'g', label: '已結案' }, void: { cls: 'r', label: '作廢' }
  };
  function poBadge(st) { var s = PO_ST[st] || { cls: 'm', label: st }; return '<span class="pur-badge ' + s.cls + '">' + esc(s.label) + '</span>'; }
  function catChip(sup) { var imp = DB.isImportSupplier(sup); return '<span class="pur-cat ' + (imp ? 'imp' : 'dom') + '">' + (imp ? '進口' : '國內') + '</span>'; }

  /* ====================== 兩層流程圖 ====================== */
  // stages: [{name, sub, substates:[{name, state:'done|cur|todo'}]}]; curIdx; branchAfter (index)→'退貨單'
  function flowHtml(stages, curIdx, branch) {
    var parts = ['<div class="pur-flow"><div class="pf-cap">' + svgI('history', 15) + '<b>流程進度</b>　大階段為主軸，點有下拉箭頭的階段展開細狀態' +
      '<span class="pf-hint">當前：' + esc(stages[curIdx] ? stages[curIdx].name : '') + '</span></div><div class="pf-track">'];
    stages.forEach(function (s, i) {
      var cls = i < curIdx ? 'done' : (i === curIdx ? 'cur' : 'todo');
      var hasSub = s.substates && s.substates.length;
      parts.push('<button class="pf-stage ' + cls + (hasSub ? ' expandable' : '') + '" data-i="' + i + '">' +
        '<span class="pf-dot">' + (i < curIdx ? svgI('check', 16) : (i + 1)) + '</span>' +
        '<span class="pf-nm">' + esc(s.name) + '</span>' +
        (s.sub ? '<span class="pf-sub">' + esc(s.sub) + '</span>' : '') + '</button>');
      if (branch && branch.after === i) parts.push('<span class="pf-branch">' + esc(branch.label) + '</span>');
      if (i < stages.length - 1) parts.push('<span class="pf-arrow ' + (i < curIdx ? 'done' : '') + '">' + svg('<path d="M2 7h18M15 2l5 5-5 5" stroke-width="2"/>', 22) + '</span>');
    });
    parts.push('</div><div class="pf-substates" id="pf-subs"></div></div>');
    return parts.join('');
  }
  function wireFlow(root, stages, curIdx) {
    var subBox = root.querySelector('#pf-subs');
    root.querySelectorAll('.pf-stage').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = +btn.dataset.i, s = stages[i];
        if (!s.substates || !s.substates.length) { subBox.classList.remove('open'); root.querySelectorAll('.pf-stage').forEach(function (b) { b.classList.remove('open'); }); return; }
        var wasOpen = btn.classList.contains('open');
        root.querySelectorAll('.pf-stage').forEach(function (b) { b.classList.remove('open'); });
        if (wasOpen) { subBox.classList.remove('open'); return; }
        btn.classList.add('open');
        var track = s.substates.map(function (ss, j) {
          return (j ? '<span class="pf-mini-arr">›</span>' : '') + '<span class="pf-mini ' + (ss.state || 'todo') + '"><i></i>' + esc(ss.name) + '</span>';
        }).join('');
        subBox.innerHTML = '<div class="pf-sub-h">' + svgI('chev', 13) + '展開「<b>' + esc(s.name) + '</b>」的細狀態（單據狀態流轉）</div><div class="pf-sub-track">' + track + '</div>';
        subBox.classList.add('open');
      });
    });
  }

  /* ---------- 頁首 ---------- */
  function headHtml(pageId, descHtml) {
    var meta = (DB.PUR_PAGEINDEX || {})[pageId] || {};
    return '<div class="nx-page-head"><div class="nx-crumb">' + ic('purchase', 13) + '<span>進貨</span>' +
      svg('<path d="m9 18 6-6-6-6" stroke-width="2"/>', 13) + '<span class="cur">' + esc(meta.label || '') + '</span></div></div>' +
      '<div class="pur-head"><span class="pur-title">' + esc(meta.label || '') + '</span>' +
      '<span class="pur-kind">' + esc(meta.kind || '') + '</span><span class="pur-lite">LITE</span>' +
      (descHtml ? '<div class="pur-desc">' + descHtml + '</div>' : '') + '</div>';
  }

  /* ---------- 通用彈窗 ---------- */
  function modal(opts) {
    var m = el('<div class="pur-modal"><div class="pur-modal-bg"></div></div>');
    var card = el('<div class="pur-modal-card' + (opts.wide ? ' wide' : '') + (opts.xl ? ' xl' : '') + '"></div>');
    card.innerHTML = '<div class="pur-modal-h">' + (opts.tag ? '<span class="mt">' + esc(opts.tag) + '</span>' : '') +
      '<b>' + esc(opts.title || '') + '</b><button class="pur-modal-x">' + svgI('x', 16) + '</button></div>' +
      '<div class="pur-modal-body">' + (opts.body || '') + '</div>' +
      (opts.foot ? '<div class="pur-modal-foot">' + opts.foot + '</div>' : '');
    m.appendChild(card);
    document.body.appendChild(m);
    function close() { m.remove(); }
    m.querySelector('.pur-modal-bg').addEventListener('click', close);
    card.querySelector('.pur-modal-x').addEventListener('click', close);
    if (opts.onMount) opts.onMount(card, close);
    return { close: close, card: card };
  }

  /* ====================== 缺貨簿 ====================== */
  function renderShortage(host) {
    var sel = {};
    var page = el('<div class="nx-page"></div>');
    page.appendChild(el(headHtml('pur_shortage',
      '採購即時戰情看板：低於安全量自動列入、補足回安全量自動移除，靠庫存說話、不設狀態欄。缺貨簿為缺料資料來源，由「詢價作業」建單時導入；缺貨簿本身不發起詢價。')));
    var frame = el('<div class="nx-frame"></div>');
    var bar = el('<div class="pur-listbar"><span class="pur-lt">' + svgI('warn', 16) + '缺料清單</span>' +
      '<span class="sp"></span>' +
      '<span class="pur-stepnote" style="margin-right:8px">' + svgI('warn', 13) + '缺料資料來源 · 由詢價作業建單時導入</span>' +
      '<button class="pur-link ghost" id="sh-refresh">' + svgI('refresh', 13) + '重新整理</button></div>');
    frame.appendChild(bar);
    var wrap = el('<div class="nx-table-wrap"></div>'); frame.appendChild(wrap);
    var foot = el('<div class="nx-tfoot"><span class="cnt"></span></div>'); frame.appendChild(foot);
    page.appendChild(frame); host.appendChild(page);

    function render() {
      var rows = DB.shortageRows();
      var html = '<table class="nx-table"><thead><tr>' +
        '<th>料號 / 品名</th><th>客訂</th><th>目前庫存</th><th>安全量</th><th>最高量</th><th>需求數量</th><th>歷史</th><th>備註</th><th style="text-align:right">忽略</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var alert = DB.priceChain(r.part).costChanged;
        var ig = DB._shIgnore && DB._shIgnore[r.part.id];
        html += '<tr data-pid="' + r.part.id + '"' + (ig ? ' style="opacity:.5"' : '') + '>' +
          '<td>' + partCell(r.part) + (alert ? ' <span class="pur-alert">' + svgI('warn', 12) + '成本已變動</span>' : '') + (ig ? ' <span class="pur-badge m">已忽略</span>' : '') + '</td>' +
          '<td>' + (r.custOrders.length ? '<span class="pur-cust-link" data-cust="' + r.part.id + '">' + svgI('eye', 12) + '客訂 ' + r.custOrders.length + ' 筆</span>' : '<span class="pur-cust-none">—</span>') + '</td>' +
          '<td>' + stockCell(r.stock, r.safe) + '</td>' +
          '<td><input class="pur-inline-edit sh-safe" data-pid="' + r.part.id + '" value="' + r.safe + '"></td>' +
          '<td><span class="pur-link ghost sh-max" data-pid="' + r.part.id + '" style="font-family:var(--mono)">' + comma(r.max) + ' ▾</span></td>' +
          '<td><div style="display:flex;align-items:center;gap:8px"><input class="pur-inline-edit sh-req" data-pid="' + r.part.id + '" value="' + r.reqQty + '"><span class="pur-suggest">建議 <b>' + r.suggest + '</b></span></div></td>' +
          '<td><button class="nx-iconbtn sh-hist" data-pid="' + r.part.id + '" title="歷史數據">' + svgI('history', 15) + '</button></td>' +
          '<td><input class="pur-inline-edit sh-note" data-pid="' + r.part.id + '" style="width:120px;text-align:left" placeholder="—" value="' + esc(DB._shNote && DB._shNote[r.part.id] || '') + '"></td>' +
          '<td style="text-align:right"><button class="pur-link ghost sh-ig" data-pid="' + r.part.id + '">' + (ig ? '取消忽略' : '忽略 30 天') + '</button></td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      if (!rows.length) { wrap.innerHTML = '<div class="pur-empty">' + svgI('check', 40) + '目前沒有低於安全量的料件，庫存健康。</div>'; }
      else wrap.innerHTML = html;
      var igN = DB._shIgnore ? Object.keys(DB._shIgnore).filter(function (k) { return DB._shIgnore[k]; }).length : 0;
      foot.querySelector('.cnt').textContent = '共 ' + rows.length + ' 項缺料' + (igN ? ' · 其中 ' + igN + ' 項已忽略（到期自動重現）' : '');
      bind();
    }
    function bind() {
      wrap.querySelectorAll('.sh-safe').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var p = DB.byId(DB.parts, inp.dataset.pid); if (!p) return; p.safeQty = +inp.value || 0;
          toast('已寫回零件主檔安全量：' + p.name + ' → ' + p.safeQty);
          render();
        });
      });
      wrap.querySelectorAll('.sh-req').forEach(function (inp) { inp.addEventListener('change', function () { DB._reqQty = DB._reqQty || {}; DB._reqQty[inp.dataset.pid] = +inp.value || 0; }); });
      wrap.querySelectorAll('.sh-note').forEach(function (inp) { inp.addEventListener('change', function () { DB._shNote = DB._shNote || {}; DB._shNote[inp.dataset.pid] = inp.value; }); });
      wrap.querySelectorAll('.pur-cust-link').forEach(function (b) { b.addEventListener('click', function () { custModal(DB.byId(DB.parts, b.dataset.cust)); }); });
      wrap.querySelectorAll('.sh-max').forEach(function (b) { b.addEventListener('click', function () { maxModal(DB.byId(DB.parts, b.dataset.pid)); }); });
      wrap.querySelectorAll('.sh-hist').forEach(function (b) { b.addEventListener('click', function () { histModal(DB.byId(DB.parts, b.dataset.pid)); }); });
      wrap.querySelectorAll('.sh-ig').forEach(function (b) { b.addEventListener('click', function () { DB._shIgnore = DB._shIgnore || {}; var pid = b.dataset.pid; if (DB._shIgnore[pid]) { delete DB._shIgnore[pid]; toast('已取消忽略'); } else { DB._shIgnore[pid] = true; toast('已設忽略 30 天，到期自動重現'); } render(); }); });
    }
    bar.querySelector('#sh-refresh').addEventListener('click', function () { render(); toast('已重新整理'); });
    render();
  }
  function custModal(p) {
    var rows = DB.custOrdersOf(p.id);
    modal({
      tag: '客訂明細', title: p.name, body: '<p style="font-size:12.5px;color:var(--muted);margin:0 0 8px">跨讀銷貨（NX04）客訂資料 · 唯讀</p>' +
        '<table class="pur-mini-table"><thead><tr><th>客訂單號</th><th>客戶</th><th class="num">數量</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td style="font-family:var(--mono);color:var(--gold-bright)">' + esc(r.so) + '</td><td>' + esc(r.cust) + '</td><td class="num">' + r.qty + '</td></tr>'; }).join('') +
        '</tbody></table>'
    });
  }
  function maxModal(p) {
    var whs = DB.warehouses.filter(function (w) { return w.active; });
    var per = Math.round((+p.maxQty || 0) / Math.max(1, whs.length));
    modal({
      tag: '各倉最高量', title: p.name + ' · 最高量（唯讀）', body:
        '<p style="font-size:12.5px;color:var(--muted);margin:0 0 8px">最高量歸庫存模組（倉管依坪效決定），採購只能看。預設顯示全公司最高量 <b style="color:var(--gold-bright)">' + comma(p.maxQty) + '</b>。</p>' +
        '<table class="pur-mini-table"><thead><tr><th>倉庫</th><th>據點</th><th class="num">最高量</th></tr></thead><tbody>' +
        whs.map(function (w, i) { var s = DB.byId(DB.sites, w.site); return '<tr><td>' + esc(w.name) + '</td><td>' + esc(s ? s.name : '') + '</td><td class="num">' + (i === 0 ? (+p.maxQty - per * (whs.length - 1)) : per) + '</td></tr>'; }).join('') +
        '</tbody></table>'
    });
  }
  function histModal(p) {
    // 生成 54 個月（2022-01 ～ 2026-06）資料，支援：近12月 / 年度 / 進該年看每月 / 該月跨年比較
    var seed = (p.id.charCodeAt(4) || 5) + (p.id.charCodeAt(5) || 3);
    var allM = [], end = (+p.maxQty || 50), sy = 2022, sm = 1, COUNT = 54;
    for (var i = 0; i < COUNT; i++) {
      var inq = ((seed * (i + 3)) % 7) * 6 + 8, sl = ((seed * (i + 5)) % 8) * 5 + 10;
      end = Math.max(0, end + inq - sl);
      var idx = sm - 1 + i, mm = idx % 12, yy = sy + Math.floor(idx / 12);
      allM.push({ y: yy, m: mm + 1, label: (mm + 1) + '月', full: yy + ' 年 ' + (mm + 1) + ' 月', in: inq, sell: sl, end: end });
    }
    var months12 = allM.slice(-12);
    var ymap = {}; allM.forEach(function (r) { if (!ymap[r.y]) ymap[r.y] = { y: r.y, in: 0, sell: 0, end: r.end }; ymap[r.y].in += r.in; ymap[r.y].sell += r.sell; ymap[r.y].end = r.end; });
    var years = Object.keys(ymap).sort().map(function (k) { return ymap[k]; });
    var monName = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    var avgSell = Math.round(months12.reduce(function (a, b) { return a + b.sell; }, 0) / 12);
    var avgEnd = Math.max(1, Math.round(months12.reduce(function (a, b) { return a + b.end; }, 0) / 12));
    var turn = (avgSell * 12 / avgEnd).toFixed(1);
    var days = Math.round(DB.stockOf(p.id) / Math.max(1, avgSell / 30));
    var body =
      '<div class="pur-turn"><div class="tile"><div class="v">' + avgSell + '</div><div class="l">月均銷量</div></div>' +
      '<div class="tile"><div class="v">' + turn + '</div><div class="l">周轉率（年銷量÷平均庫存）</div></div>' +
      '<div class="tile"><div class="v">' + (days < 0 ? 0 : days) + '<span style="font-size:12px"> 天</span></div><div class="l">目前庫存約可撐</div></div></div>' +
      '<div class="pur-hist-bar"><div id="hist-nav"></div>' +
      '<div class="pur-hist-legend"><span><i class="in"></i>進貨量</span><span><i class="sell"></i>銷貨量</span><span class="hint" id="hist-hint"></span></div></div>' +
      '<div id="hist-chart"></div>';
    modal({
      wide: true, tag: '歷史數據 · 周轉率', title: p.name, body: body, onMount: function (card) {
        // 檢視狀態：recent 近12月 / year 年度 / ymon 某年每月 / macross 某月跨年
        var st = { view: 'recent', year: null, month: null };
        function cfg() {
          if (st.view === 'recent') return { rows: months12, xl: function (r) { return r.label; }, period: '月底', drill: null,
            hint: '近 12 個月，滑鼠移到長條看當月進/銷/月底庫存' };
          if (st.view === 'year') return { rows: years, xl: function (r) { return r.y; }, period: '年底', drill: 'ymon',
            hint: '點任一年份的長條，進去看該年每月狀況' };
          if (st.view === 'ymon') return { rows: allM.filter(function (r) { return r.y === st.year; }), xl: function (r) { return r.label; }, period: '月底', drill: 'macross',
            hint: '點任一月份的長條，看該月跨年比較' };
          return { rows: allM.filter(function (r) { return r.m === st.month; }), xl: function (r) { return r.y; }, period: '月底', drill: null,
            hint: '同一個月（' + st.month + ' 月）逐年並排，看每年此月的進/銷' };
        }
        function navHtml() {
          if (st.view === 'recent' || st.view === 'year') {
            return '<div class="pur-stagefilter"><button class="pur-sf' + (st.view === 'recent' ? ' on' : '') + '" data-mode="recent">近 12 月</button>' +
              '<button class="pur-sf' + (st.view === 'year' ? ' on' : '') + '" data-mode="year">年度</button></div>';
          }
          var crumb = st.view === 'ymon'
            ? '<button class="pur-hist-back" data-back="year">' + svgI('prev', 13) + '年度</button><span class="pur-hist-title">' + st.year + ' 年 · 每月</span>'
            : '<button class="pur-hist-back" data-back="ymon">' + svgI('prev', 13) + (st.year ? st.year + ' 年' : '返回') + '</button><span class="pur-hist-title">' + st.month + ' 月 · 跨年比較</span>';
          return '<div class="pur-hist-crumb">' + crumb + '</div>';
        }
        function draw() {
          var c = cfg();
          card.querySelector('#hist-nav').innerHTML = navHtml();
          var hint = card.querySelector('#hist-hint'); if (hint) hint.textContent = c.hint;
          var maxBar = Math.max.apply(null, c.rows.map(function (r) { return Math.max(r.in, r.sell); }).concat([1]));
          var chart = '<div class="pur-hist"><div class="pur-hist-tip" id="hist-tip"></div><div class="pur-hist-bars">' +
            c.rows.map(function (r, i) {
              return '<div class="pur-hist-grp' + (c.drill ? ' drill' : '') + '" data-i="' + i + '"><div class="pur-hist-pair">' +
                '<div class="bar in" style="height:' + Math.round(r.in / maxBar * 100) + '%"></div>' +
                '<div class="bar sell" style="height:' + Math.round(r.sell / maxBar * 100) + '%"></div></div>' +
                '<div class="pur-hist-x">' + c.xl(r) + '</div></div>';
            }).join('') + '</div></div>';
          card.querySelector('#hist-chart').innerHTML = chart;
          var tip = card.querySelector('#hist-tip'), host = card.querySelector('.pur-hist');
          card.querySelectorAll('.pur-hist-grp').forEach(function (g) {
            var r = c.rows[+g.dataset.i];
            g.addEventListener('mouseenter', function () {
              tip.innerHTML = '<b>' + r.full + '</b>' +
                '<span><i class="in"></i>進貨 <b>' + r.in + '</b></span>' +
                '<span><i class="sell"></i>銷貨 <b>' + r.sell + '</b></span>' +
                '<span class="end">' + c.period + '庫存 <b>' + r.end + '</b></span>' +
                (c.drill ? '<span class="end">' + (c.drill === 'ymon' ? '點我看該年每月 ›' : '點我看此月跨年 ›') + '</span>' : '');
              var gr = g.getBoundingClientRect(), cr = host.getBoundingClientRect();
              tip.style.left = (gr.left - cr.left + gr.width / 2) + 'px';
              tip.classList.add('show');
            });
            g.addEventListener('mouseleave', function () { tip.classList.remove('show'); });
            if (c.drill) g.addEventListener('click', function () {
              if (c.drill === 'ymon') { st.view = 'ymon'; st.year = r.y; }
              else { st.view = 'macross'; st.month = r.m; }
              draw();
            });
          });
          // 導覽鈕
          card.querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { st.view = b.dataset.mode; draw(); }); });
          card.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { st.view = b.dataset.back; if (b.dataset.back === 'year') st.year = null; draw(); }); });
        }
        draw();
      }
    });
  }

  /* ====================== 產品管理（採購）====================== */
  function renderProduct(host) {
    var page = el('<div class="nx-page"></div>');
    page.appendChild(el(headHtml('pur_product',
      '採購＝產品部門，負責產品資訊正確性：可<b>新建零件</b>、維護基本資料＋進貨/採購資料（含價格鏈）。庫存欄唯讀、銷貨欄不可見。')));
    page.appendChild(el('<div class="pur-mgmt-banner">' + svgI('box', 17) + '<div><b>主檔中心 vs 模組管理頁：</b>資料只有一份、歸核心主檔（NX01）。此頁是同一張零件主檔的「採購視角」——只露採購可編欄位，不另存一份。</div></div>'));

    // 成本變動提醒匯總
    var changed = DB.parts.filter(function (p) { return p.active && DB.priceChain(p).costChanged; });
    if (changed.length) page.appendChild(el('<div class="pur-costalert-bar">' + svgI('warn', 17) + '<div class="t"><b>凍結品成本變動提醒</b>：有 ' + changed.length + ' 項凍結定價的零件，進貨成本變動已超過門檻（' + DB.purSettings.costAlertPct + '%）。點開該列比對「當初 vs 現在」決定重設定價或清空回自動。</div></div>'));

    var frame = el('<div class="nx-frame"></div>');
    var inboxN = DB.purInbox.length;
    var bar = el('<div class="pur-listbar"><span class="pur-lt">' + ic('pu_product', 16) + '產品（採購視角）</span><span class="sp"></span>' +
      '<button class="pur-inbox-btn" id="pr-inbox">' + svgI('inbox', 16) + '待建檔／待更新' + (inboxN ? '<span class="badge">' + inboxN + '</span>' : '') + '</button>' +
      '<button class="nx-btn primary" id="pr-new">' + svgI('plus', 15) + '新建零件</button></div>');
    frame.appendChild(bar);
    var wrap = el('<div class="nx-table-wrap"></div>'); frame.appendChild(wrap);
    var foot = el('<div class="nx-tfoot"><span class="cnt"></span></div>'); frame.appendChild(foot);
    page.appendChild(frame); host.appendChild(page);

    function listView() {
      var parts = DB.parts.filter(function (p) { return p.active; });
      var html = '<table class="nx-table"><thead><tr><th>料號 / 品名</th><th>採購成本</th><th>利潤率</th><th>公司定價</th><th>安全量</th><th>退貨政策</th><th>定價狀態</th><th style="text-align:right">操作</th></tr></thead><tbody>';
      parts.forEach(function (p) {
        var pc = DB.priceChain(p);
        html += '<tr data-pid="' + p.id + '">' + '<td>' + partCell(p) + '</td>' +
          '<td><span class="pur-money">NT$ ' + comma(p.cost) + '</span> <span style="font-size:10px;color:#e8a06b">僅採購</span></td>' +
          '<td style="font-family:var(--mono)">' + pc.margin + '%</td>' +
          '<td>' + money(pc.price) + '</td>' +
          '<td style="font-family:var(--mono)">' + (p.safeQty || 0) + '</td>' +
          '<td><span class="nx-tag">' + retPolicy(p.returnPolicy) + '</span></td>' +
          '<td>' + (pc.frozen ? '<span class="pur-badge gold">凍結</span>' : '<span class="pur-badge b">自動</span>') + (pc.costChanged ? ' <span class="pur-alert">' + svgI('warn', 12) + pc.changePct + '%</span>' : '') + '</td>' +
          '<td style="text-align:right"><span class="pur-link" data-edit="' + p.id + '">設定價／編輯</span></td></tr>';
      });
      html += '</tbody></table>';
      wrap.innerHTML = html;
      foot.querySelector('.cnt').textContent = '共 ' + parts.length + ' 項零件';
      wrap.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { detailView(DB.byId(DB.parts, b.dataset.edit)); }); });
      wrap.querySelectorAll('tbody tr').forEach(function (tr) { tr.addEventListener('dblclick', function () { detailView(DB.byId(DB.parts, tr.dataset.pid)); }); });
    }

    function detailView(p) {
      var pc = DB.priceChain(p);
      var frame2 = el('<div class="nx-frame nx-detail"></div>');
      frame2.appendChild(el('<div class="nx-detail-bar"><button class="pur-back" id="pr-back">' + svgI('prev', 15) + '返回列表</button>' +
        '<span class="nx-statedot on"></span><div class="nx-detail-id"><span class="code">' + esc(p.code) + '</span><b>' + esc(p.name) + '</b></div>' +
        '<span class="pur-cat ' + (p.genuine ? 'dom' : '') + '" style="margin-left:4px">' + (p.genuine ? '正廠' : '副廠') + '</span><span class="sp"></span>' +
        '<button class="nx-btn primary" id="pr-save">' + svgI('save', 15) + '存檔</button></div>'));
      var body = el('<div class="nx-detail-body"></div>');

      // 價格鏈面板
      body.appendChild(el(priceChainHtml(p, pc)));
      // 採購可編欄位
      var formHtml = '<div class="pur-sec" style="border-top:none;padding-top:18px">採購可編欄位（基本資料＋進貨/採購）</div><div class="nx-form">' +
        fld('品名', '<input data-k="name" value="' + esc(p.name) + '">') +
        fld('廠牌料號', '<input data-k="brandPn" value="' + esc(p.brandPn || '') + '">') +
        fld('安全量', '<input data-k="safeQty" value="' + (p.safeQty || '') + '">', '採購依銷售狀況定補貨底線；缺貨簿亦可就地改。') +
        fldSelect('退貨政策', 'returnPolicy', [['F', 'F 廠保'], ['S', 'S 自保'], ['R', 'R 整新'], ['N', 'N 不退'], ['W', 'W 保固']], p.returnPolicy) +
        fld('保固月數', '<input data-k="warranty" value="' + (p.warranty || '') + '">') +
        fldSelect('預設供應商', '_defSup', DB.partners.filter(function (s) { return s.type === 'S' && s.active; }).map(function (s) { return [s.id, s.name]; }), p._defSup) +
        roField('最高量 / 儲位', comma(p.maxQty) + ' · 歸庫存模組（唯讀）') +
        roField('售價 / ABCD 價', '不可見 · 歸銷售模組') +
        roField('最後進貨時間', p._lastIn || '2026-05-28') +
        '</div>';
      body.appendChild(el(formHtml));
      frame2.appendChild(body);
      frame.replaceWith(frame2);
      frame2.querySelector('#pr-back').addEventListener('click', function () { rebuild(); });
      frame2.querySelector('#pr-save').addEventListener('click', function () {
        frame2.querySelectorAll('[data-k]').forEach(function (inp) { var k = inp.dataset.k; p[k] = (k === 'safeQty' || k === 'warranty') ? (+inp.value || 0) : inp.value; });
        toast('已存檔：' + p.name); rebuild();
      });
      wirePriceChain(frame2, p);
    }
    function rebuild() { host.innerHTML = ''; renderProduct(host); }

    bar.querySelector('#pr-new').addEventListener('click', function () { toast('新建零件：寫進核心零件主檔，存檔後因庫存 0 低於安全量自動進缺貨簿（示範）'); });
    bar.querySelector('#pr-inbox').addEventListener('click', function () { inboxModal(); });
    listView();
  }

  function priceChainHtml(p, pc) {
    return '<div class="pur-pricechain"><div class="pc-h">' + svgI('coin', 16) + '價格鏈（成本 → 公司定價 → ABCD 地板）' +
      '<span class="pc-auto ' + (pc.frozen ? 'frozen' : 'auto') + '">' + (pc.frozen ? '凍結（吃採購填的值）' : '自動（吃系統預設利潤率 ' + DB.purSettings.defaultMargin + '%）') + '</span></div>' +
      (pc.costChanged ? '<div style="padding:12px 16px 0"><div class="pur-costalert-bar" style="margin:0">' + svgI('warn', 17) + '<div class="t">此凍結品成本基準為 <b>NT$ ' + comma(pc.baseline) + '</b>，現進貨成本 <b>NT$ ' + comma(pc.cost) + '</b>，已變動 <b>' + pc.changePct + '%</b>（超門檻）。請決定重設定價、清空回自動、或確認知道了。</div></div></div>' : '') +
      '<div class="pc-flow">' +
        '<div class="pc-node"><span class="pc-lbl">採購成本</span><div class="pc-box cost"><span class="big">' + comma(pc.cost) + '</span><span class="secret">' + svgI('eye', 11) + '僅採購可見</span></div></div>' +
        '<div class="pc-arrow">' + svg('<path d="M2 7h18M15 2l5 5-5 5" stroke-width="1.8"/>', 26) + '<span class="op">×(1+利潤率)</span></div>' +
        '<div class="pc-node"><span class="pc-lbl">利潤率</span><div class="pc-box"><input id="pc-margin" value="' + (pc.frozen ? pc.margin : '') + '" placeholder="' + pc.margin + '"><span class="unit">% ' + (pc.frozen ? '' : '（自動）') + '</span></div></div>' +
        '<div class="pc-arrow">' + svg('<path d="M2 7h18M15 2l5 5-5 5" stroke-width="1.8"/>', 26) + '<span class="op">=</span></div>' +
        '<div class="pc-node"><span class="pc-lbl">公司定價 <span class="lock">下游唯讀</span></span><div class="pc-box price"><input id="pc-price" value="' + (pc.frozen ? pc.price : '') + '" placeholder="' + pc.price + '"><span class="unit">NT$ ' + (pc.frozen ? '' : '（自動）') + '</span></div></div>' +
        '<div class="pc-arrow">' + svg('<path d="M2 7h18M15 2l5 5-5 5" stroke-width="1.8"/>', 26) + '<span class="op">地板</span></div>' +
        '<div class="pc-node"><span class="pc-lbl">ABCD 價 <span class="lock">銷貨 NX04</span></span><div class="pc-box"><span class="big" style="font-size:14px;color:var(--muted)">依分級加成</span><span class="unit">下半段屬銷貨</span></div></div>' +
      '</div>' +
      '<div class="pc-foot"><span class="note">填<b>利潤率</b>或<b>公司定價</b>任一欄，系統即時換算另一欄；兩欄皆空＝吃系統預設利潤率，兩欄皆有值＝整組凍結（成本變動只提醒、不覆蓋）。</span>' +
      '<button class="pc-reset" id="pc-reset">清空兩欄 · 回自動</button></div></div>';
  }
  function wirePriceChain(root, p) {
    var mi = root.querySelector('#pc-margin'), pi = root.querySelector('#pc-price');
    var cost = +p.cost || 0;
    function refreshHeader() {
      var pc = DB.priceChain(p);
      var hd = root.querySelector('.pc-auto');
      if (hd) { hd.className = 'pc-auto ' + (pc.frozen ? 'frozen' : 'auto'); hd.textContent = pc.frozen ? '凍結（吃採購填的值）' : '自動（吃系統預設利潤率 ' + DB.purSettings.defaultMargin + '%）'; }
    }
    if (mi) mi.addEventListener('input', function () {
      var m = parseFloat(mi.value);
      if (mi.value === '') { p.purMargin = ''; p.companyPrice = ''; pi.value = ''; refreshHeader(); return; }
      if (isNaN(m)) return;
      p.purMargin = m; var price = cost ? Math.round(cost * (1 + m / 100)) : 0; p.companyPrice = price; pi.value = price;
      if (!p.costBaseline) p.costBaseline = cost; refreshHeader();
    });
    if (pi) pi.addEventListener('input', function () {
      var price = parseFloat(pi.value);
      if (pi.value === '') { p.purMargin = ''; p.companyPrice = ''; mi.value = ''; refreshHeader(); return; }
      if (isNaN(price)) return;
      p.companyPrice = price; var m = cost ? Math.round((price / cost - 1) * 1000) / 10 : 0; p.purMargin = m; mi.value = m;
      if (!p.costBaseline) p.costBaseline = cost; refreshHeader();
    });
    var rb = root.querySelector('#pc-reset');
    if (rb) rb.addEventListener('click', function () { p.purMargin = ''; p.companyPrice = ''; if (mi) mi.value = ''; if (pi) pi.value = ''; refreshHeader(); toast('已清空兩欄，回到「吃系統預設利潤率」'); });
  }
  function inboxModal() {
    var body = '<p style="font-size:12.5px;color:var(--muted);margin:0 0 12px">採購是產品的管理者；有產品待建檔或待更新的提醒掛在此。只有採購能正式寫入主檔。</p><div class="pur-inbox-list">' +
      DB.purInbox.map(function (it) {
        var draft = it.kind === 'new' ?
          ('品名 <b>' + esc(it.draft.name) + '</b> · 廠牌料號 ' + esc(it.draft.brandPn || '—')) :
          ('料號 <b>' + esc(it.draft.code) + '</b> · ' + esc(it.draft.field) + '：' + esc(it.draft.value));
        return '<div class="pur-inbox-card"><div class="ico">' + svgI(it.kind === 'new' ? 'plus' : 'history', 18) + '</div><div class="bd">' +
          '<div class="r1"><span class="src">' + esc(it.source) + '</span><span class="kindtag ' + it.kind + '">' + (it.kind === 'new' ? '待建檔' : '待更新') + '</span><span class="meta">' + esc(it.from) + ' · ' + esc(it.date) + '</span></div>' +
          '<div class="draft">' + draft + '</div><div class="draft" style="color:var(--faint)">' + esc(it.note) + '</div></div>' +
          '<div class="acts"><button class="pur-link" data-ib="' + it.id + '">' + (it.kind === 'new' ? '正式建檔' : '更新主檔') + '</button></div></div>';
      }).join('') + '</div>';
    var m = modal({ tag: '待建檔／待更新收件匣', title: '採購的主檔異動收件匣', wide: true, body: body });
    m.card.querySelectorAll('[data-ib]').forEach(function (b) { b.addEventListener('click', function () { toast('已正式寫入零件主檔（示範）；新建零件因庫存 0 自動進缺貨簿。'); }); });
  }

  /* ====================== 供應商管理（採購）====================== */
  function renderSupplier(host) {
    var page = el('<div class="nx-page"></div>');
    page.appendChild(el(headHtml('pur_supplier',
      '採購的供應商管理頁（往來對象中供應商類型的濾鏡視圖）。露採購可編欄位（付款條件、貿易條件、預設入庫倉、供貨對應…）；不顯示售價、客戶分級加成等銷售敏感資料。')));
    page.appendChild(el('<div class="pur-mgmt-banner">' + ic('pu_supplier', 17) + '<div><b>國別驅動分流：</b>開採購時選定供應商，系統依其<b>國別</b>自動判定走國內（台灣）或進口（其他）流程，並決定要不要長出幣別／匯率／貿易條件等進口欄位。</div></div>'));
    var frame = el('<div class="nx-frame"></div>');
    var bar = el('<div class="pur-listbar"><span class="pur-lt">' + ic('pu_supplier', 16) + '供應商（採購視角）</span><span class="sp"></span><button class="nx-btn primary" id="su-new">' + svgI('plus', 15) + '新增供應商</button></div>');
    frame.appendChild(bar);
    var wrap = el('<div class="nx-table-wrap"></div>'); frame.appendChild(wrap);
    var foot = el('<div class="nx-tfoot"><span class="cnt"></span></div>'); frame.appendChild(foot);
    page.appendChild(frame); host.appendChild(page);

    function listView() {
      var sups = DB.partners.filter(function (p) { return p.type === 'S' && p.active; });
      var html = '<table class="nx-table"><thead><tr><th>代碼</th><th>供應商全名</th><th>國別 / 分流</th><th>付款條件</th><th>貿易條件</th><th>預設幣別</th><th>分級</th><th>供貨對應</th><th style="text-align:right">操作</th></tr></thead><tbody>';
      sups.forEach(function (s) {
        var ctry = DB.byId(DB.countryList, s.country); var n = (DB.supplyMap[s.id] || []).length;
        html += '<tr data-id="' + s.id + '"><td><span class="mono" style="font-family:var(--mono);color:var(--gold-bright)">' + esc(s.code) + '</span></td>' +
          '<td><b>' + esc(s.name) + '</b> <span style="color:var(--faint);font-size:11px">' + esc(s.shortName || '') + '</span></td>' +
          '<td>' + esc(ctry ? ctry.name : s.country) + ' ' + catChip(s) + '</td>' +
          '<td>' + esc(s.payTerm || '—') + (s.importPayTerm ? ' / ' + esc(s.importPayTerm) : '') + '</td>' +
          '<td>' + esc(s.tradeTerm || '—') + '</td><td style="font-family:var(--mono)">' + esc(s.currency || 'TWD') + '</td>' +
          '<td><span class="nx-tag">' + esc((s.suppGrade || '—')) + ' 級</span></td>' +
          '<td><span class="pur-link ghost" data-supply="' + s.id + '">' + n + ' 項料件</span></td>' +
          '<td style="text-align:right"><span class="pur-link" data-edit="' + s.id + '">編輯</span></td></tr>';
      });
      html += '</tbody></table>'; wrap.innerHTML = html;
      foot.querySelector('.cnt').textContent = '共 ' + sups.length + ' 家供應商';
      wrap.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { detailView(DB.byId(DB.partners, b.dataset.edit)); }); });
      wrap.querySelectorAll('[data-supply]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); supplyModal(DB.byId(DB.partners, b.dataset.supply)); }); });
    }
    function detailView(s) {
      var imp = DB.isImportSupplier(s);
      var f2 = el('<div class="nx-frame nx-detail"></div>');
      f2.appendChild(el('<div class="nx-detail-bar"><button class="pur-back" id="su-back">' + svgI('prev', 15) + '返回列表</button>' +
        '<span class="nx-statedot on"></span><div class="nx-detail-id"><span class="code">' + esc(s.code) + '</span><b>' + esc(s.name) + '</b></div>' + catChip(s) + '<span class="sp"></span>' +
        '<button class="nx-btn primary" id="su-save">' + svgI('save', 15) + '存檔</button></div>'));
      var ctry = DB.byId(DB.countryList, s.country);
      var form = '<div class="nx-detail-body"><div class="pur-sec" style="border-top:none;padding-top:0">採購可編欄位</div><div class="nx-form">' +
        roField('公司代碼', s.code) + fld('公司全名', '<input data-k="name" value="' + esc(s.name) + '">') +
        fldSelect('國別', 'country', DB.countryList.map(function (c) { return [c.code, c.name]; }), s.country, '採購分流依據：台灣＝國內、其他＝進口。') +
        fldSelect('母公司', '_parent', [['', '（無）']].concat(DB.partners.filter(function (x) { return x.type === 'S' && x.id !== s.id; }).map(function (x) { return [x.id, x.name]; })), s.parent, '集團歸戶：如台灣 BOSCH 母公司指向德國 BOSCH。分流仍看各筆自己國別。') +
        fldSelect('國內付款條件', 'payTerm', [['PREPAY', 'PREPAY 預付'], ['NET30', 'NET30 月結30'], ['NET60', 'NET60 月結60'], ['NET90', 'NET90 月結90']], s.payTerm) +
        fldSelect('進口付款條件', 'importPayTerm', [['', '（無）'], ['TT', 'TT 電匯'], ['LC', 'LC 信用狀'], ['DP', 'DP 付款交單'], ['DA', 'DA 承兌交單']], s.importPayTerm) +
        fldSelect('貿易條件', 'tradeTerm', [['', '（無）'], ['CIF', 'CIF'], ['FOB', 'FOB'], ['EXW', 'EXW']], s.tradeTerm) +
        fldSelect('預設幣別', 'currency', (DB.dict.currencies || []).map(function (c) { return [c.value, c.label]; }), s.currency) +
        fldSelect('供應商分級', 'suppGrade', DB.suppGrades.map(function (g) { return [g.code, g.name]; }), s.suppGrade) +
        fldSelect('預設入庫倉', 'defaultInWh', DB.warehouses.filter(function (w) { return w.active; }).map(function (w) { return [w.id, w.name]; }), s.defaultInWh, '向這家進貨時採購單/進貨單預設收此倉。') +
        '</div><div class="pur-sec">供貨對應</div><div style="padding:0 0 8px"><button class="pur-link ghost" id="su-supply">' + (DB.supplyMap[s.id] || []).length + ' 項料件 · 點開檢視</button></div></div>';
      f2.appendChild(el(form));
      wrap.closest('.nx-frame').replaceWith(f2);
      f2.querySelector('#su-back').addEventListener('click', function () { host.innerHTML = ''; renderSupplier(host); });
      f2.querySelector('#su-save').addEventListener('click', function () { f2.querySelectorAll('[data-k]').forEach(function (inp) { s[inp.dataset.k] = inp.value; }); toast('已存檔：' + s.name); host.innerHTML = ''; renderSupplier(host); });
      f2.querySelector('#su-supply').addEventListener('click', function () { supplyModal(s); });
    }
    bar.querySelector('#su-new').addEventListener('click', function () { toast('新增供應商：寫進核心往來對象主檔（供應商類型）'); });
    listView();
  }
  function supplyModal(s) {
    var rows = DB.supplyMap[s.id] || [];
    modal({
      wide: true, tag: '供貨對應', title: s.name + ' · 供貨料件', body:
        '<table class="pur-mini-table"><thead><tr><th>料件</th><th>廠商料號</th><th class="num">預設單價</th><th class="num">交期(天)</th><th class="num">MOQ</th><th>主要</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (r) { var p = DB.byId(DB.parts, r.partId); return '<tr><td>' + (p ? esc(p.code) + ' ' + esc(p.name) : r.partId) + '</td><td style="font-family:var(--mono)">' + esc(r.vendorPn || '—') + '</td><td class="num">' + comma(r.price) + '</td><td class="num">' + (r.lead || '—') + '</td><td class="num">' + (r.moq || '—') + '</td><td>' + (r.primary ? '<span class="pur-badge gold">主要</span>' : '—') + '</td></tr>'; }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--faint);padding:18px">尚無供貨對應</td></tr>') +
        '</tbody></table>'
    });
  }

  /* ---------- 小欄位 helpers ---------- */
  function fld(label, ctrl, hint) { return '<div class="nx-field"><label>' + esc(label) + '</label>' + ctrl + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div>'; }
  function fldSelect(label, key, opts, val, hint) {
    return '<div class="nx-field"><label>' + esc(label) + '</label><select data-k="' + key + '">' +
      opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val || '') ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div>';
  }
  function roField(label, val) { return '<div class="nx-field"><label>' + esc(label) + '<span class="ro">唯讀</span></label><input value="' + esc(val) + '" disabled></div>'; }
  function retPolicy(c) { return { F: 'F 廠保', S: 'S 自保', R: 'R 整新', N: 'N 不退', W: 'W 保固' }[c] || c || '—'; }

  /* ====================== 對外 NXP 命名空間 ====================== */
  window.NXP = {
    esc: esc, el: el, svg: svg, ic: ic, svgI: svgI, I: I, toast: toast, money: money, comma: comma,
    stockCell: stockCell, partCell: partCell, poBadge: poBadge, catChip: catChip, PO_ST: PO_ST,
    flowHtml: flowHtml, wireFlow: wireFlow, headHtml: headHtml, modal: modal,
    fld: fld, fldSelect: fldSelect, roField: roField, retPolicy: retPolicy,
    pages: {}
  };

  // 註冊本檔頁面
  window.NXP.pages.pur_shortage = renderShortage;
  window.NXP.pages.pur_product = renderProduct;
  window.NXP.pages.pur_supplier = renderSupplier;

  /* ---------- 骨架（未建頁）---------- */
  function skeleton(host, pageId) {
    var meta = (DB.PUR_PAGEINDEX || {})[pageId] || {};
    var page = el('<div class="nx-page"></div>');
    page.appendChild(el(headHtml(pageId, '')));
    page.appendChild(el('<div class="nx-frame"><div class="nx-skel"><span class="nx-wip">此作業規劃中 · 已接入 DOCK 導覽</span>' +
      '<div class="nx-skel-top"><div class="nx-skel-ic">' + ic(meta.icon || 'purchase') + '</div><div class="t"><b>' + esc(meta.label) + '</b><span>' + esc(meta.kind) + '</span></div></div>' +
      '<div class="nx-skel-bars"><div class="nx-skel-bar" style="width:64%"></div><div class="nx-skel-bar" style="width:88%"></div><div class="nx-skel-bar" style="width:72%"></div></div></div></div>'));
    host.appendChild(page);
  }

  window.NXPurchase = {
    has: function (pageId) { return !!(DB.PUR_PAGEINDEX && DB.PUR_PAGEINDEX[pageId]); },
    render: function (pageId, host) {
      host.innerHTML = '';
      var fn = window.NXP.pages[pageId];
      if (fn) return fn(host);
      return skeleton(host, pageId);
    }
  };
})();
