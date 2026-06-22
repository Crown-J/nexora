// NEXORA GRID — 核心主檔｜群組批次引擎（左主體／右成員）
// 左欄選主體（可搜尋、部分可新建），右欄逐列維護其成員（可編輯、移除、新增）。
// 供應商供貨對應另有「品牌＋群組＋產地」批次匯入。規格 v3.9 型態六。
(function () {
  'use strict';
  var ICONS = window.NX_ICONS || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function svg(p, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"' + (w ? ' style="width:' + w + 'px;height:' + w + 'px"' : '') + '>' + p + '</svg>'; }
  function ic(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>'; }
  function opts(o) { var a = typeof o === 'function' ? o() : o; return (a || []).map(function (x) { return x && typeof x === 'object' ? { value: x.value != null ? x.value : x.id, label: x.label != null ? x.label : (x.name || x.code) } : { value: x, label: x }; }); }

  function render(host, cfg, helpers) {
    var B = cfg.batch, toast = (helpers && helpers.toast) || function () {};
    var page = el('<div class="nx-page"></div>');
    if (helpers && helpers.headHtml) page.appendChild(el(helpers.headHtml(cfg)));
    var frame = el('<div class="nx-frame nx-batch"></div>');
    var left = el('<div class="bt-left"></div>');
    var right = el('<div class="bt-right"></div>');
    frame.appendChild(left); frame.appendChild(right);
    page.appendChild(frame); host.appendChild(page);

    var sel = null, q = '';
    // 左欄
    left.innerHTML =
      '<div class="bt-left-h"><b>' + esc(B.leftTitle) + '</b>' + (B.leftAddable ? '<button class="asg-addbtn" id="bt-add">＋ 新建</button>' : '') + '</div>' +
      '<div class="bt-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input type="text" placeholder="搜尋…" autocomplete="off"></div>' +
      '<div class="bt-list" id="bt-list"></div>';
    var listEl = left.querySelector('#bt-list');
    left.querySelector('.bt-search input').addEventListener('input', function (e) { q = e.target.value.trim(); renderLeft(); });
    if (B.leftAddable) left.querySelector('#bt-add').addEventListener('click', function () {
      var it = B.leftNew(); var code = prompt('輸入群組代碼（建立後鎖定）：'); if (code == null) return;
      it.code = code.toUpperCase(); var name = prompt('輸入群組名稱：') || code; it.name = name;
      B.leftData().unshift(it); sel = it; renderLeft(); renderRight(); toast('已新建 ' + it.name);
    });

    function renderLeft() {
      var items = B.leftData().filter(function (it) { if (!q) return true; return (B.leftName(it) + ' ' + B.leftCode(it)).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
      if (!items.length) { listEl.innerHTML = '<div class="asg-empty">沒有符合的資料</div>'; return; }
      listEl.innerHTML = items.map(function (it) {
        var on = sel && (it.id === sel.id);
        var n = (B.rightItems(it) || []).length;
        return '<button class="asg-node' + (on ? ' on' : '') + '" data-id="' + esc(it.id) + '"><span class="asg-node-main"><b>' + esc(B.leftName(it)) + '</b><small>' + esc(B.leftCode(it)) + '</small></span><span class="asg-sub">' + (n || '') + ' 筆' + '</span></button>';
      }).join('');
    }
    listEl.addEventListener('click', function (e) {
      var b = e.target.closest('.asg-node'); if (!b) return;
      var items = B.leftData(); sel = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === b.dataset.id) sel = items[i];
      renderLeft(); renderRight();
    });

    // 右欄
    function cellHtml(c, row) {
      var v = row[c.key] != null ? row[c.key] : '';
      if (c.type === 'switch') return '<input type="checkbox" class="nx-sw bt-ck" data-ck="' + esc(c.key) + '"' + (v ? ' checked' : '') + '>';
      if (c.type === 'select') return '<select class="bt-ck" data-ck="' + esc(c.key) + '">' + (c.placeholder ? '<option value="">' + esc(c.placeholder) + '</option>' : '') + opts(c.options).map(function (o) { return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(v) ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select>';
      return '<input type="text" class="bt-ck" data-ck="' + esc(c.key) + '" value="' + esc(v) + '"' + (c.placeholder ? ' placeholder="' + esc(c.placeholder) + '"' : '') + '>';
    }
    function renderRight() {
      if (!sel) { right.innerHTML = '<div class="bt-empty">' + ic('p_univ') + '<p>從左欄選一個' + esc(B.leftTitle) + '，即可在此維護成員。</p></div>'; return; }
      var rows = B.rightItems(sel);
      var head = B.rightCols.map(function (c) { return '<th' + (c.width ? ' style="width:' + c.width + 'px"' : '') + '>' + esc(c.label) + '</th>'; }).join('') + '<th class="bt-act"></th>';
      var body = rows.length ? rows.map(function (row, ri) {
        return '<tr data-ri="' + ri + '">' + B.rightCols.map(function (c) { return '<td>' + cellHtml(c, row) + '</td>'; }).join('') + '<td class="bt-act"><button class="nx-sub-x" data-ri="' + ri + '">' + svg('<path d="M18 6 6 18M6 6l12 12"/>', 13) + '</button></td></tr>';
      }).join('') : '<tr class="nx-subt-empty"><td colspan="' + (B.rightCols.length + 1) + '">尚無成員，按「＋ 新增」加入</td></tr>';
      right.innerHTML =
        '<div class="bt-right-h"><b>' + esc(B.rightTitle(sel)) + '</b><span class="asg-cnt">' + (rows.length || '') + '</span><span class="sp"></span>' +
          (B.importable ? '<button class="nx-btn ghost" id="bt-import">' + svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', 15) + '批次匯入</button>' : '') +
          '<button class="nx-btn primary" id="bt-addrow">' + svg('<path d="M12 5v14M5 12h14"/>', 15) + '新增</button></div>' +
        '<div class="bt-table-wrap"><table class="nx-subt bt-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
      right.querySelector('#bt-addrow').addEventListener('click', function () { rows.push(B.rightNew()); renderRight(); renderLeft(); });
      if (B.importable) right.querySelector('#bt-import').addEventListener('click', openImport);
      right.querySelectorAll('.nx-sub-x').forEach(function (btn) { btn.addEventListener('click', function () { rows.splice(+btn.dataset.ri, 1); renderRight(); renderLeft(); }); });
      right.querySelectorAll('.bt-ck').forEach(function (inp) {
        inp.addEventListener('change', function () { var ri = +inp.closest('tr').dataset.ri; rows[ri][inp.dataset.ck] = inp.classList.contains('nx-sw') ? inp.checked : inp.value; if (inp.tagName === 'SELECT') renderLeft(); });
      });
    }

    function openImport() {
      var f = {};
      var mask = el('<div class="asg-pickmask"></div>');
      var card = el('<div class="asg-pick"><div class="asg-pick-h"><b>批次匯入料件 — ' + esc(B.leftName(sel)) + '</b><button class="asg-pick-x">' + svg('<path d="M18 6 6 18M6 6l12 12"/>', 16) + '</button></div><div class="bt-imp-filters"></div><div class="asg-pick-list"></div><div class="bt-imp-foot"><span class="bt-imp-cnt"></span><button class="nx-btn primary" id="bt-imp-go">全部匯入</button></div></div>');
      var filt = card.querySelector('.bt-imp-filters');
      filt.innerHTML = B.importFilters.map(function (ff) { return '<label class="bt-imp-f"><span>' + esc(ff.label) + '</span><select data-fk="' + ff.key + '"><option value="">全部</option>' + opts(ff.options).map(function (o) { return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>'; }).join('') + '</select></label>'; }).join('');
      var listEl2 = card.querySelector('.asg-pick-list');
      function matched() { return window.NXDB.parts.filter(function (p) { return p.active && B.importMatch(p, f); }); }
      function draw() {
        var m = matched();
        card.querySelector('.bt-imp-cnt').textContent = '符合 ' + m.length + ' 筆';
        listEl2.innerHTML = m.length ? m.map(function (p) { return '<div class="asg-pick-row"><div class="asg-pick-main"><b>' + esc(p.name) + '</b><small>' + esc(p.code) + '</small></div></div>'; }).join('') : '<div class="asg-empty">沒有符合的料件</div>';
      }
      filt.addEventListener('change', function (e) { var s = e.target.closest('select'); if (s) { f[s.dataset.fk] = s.value; draw(); } });
      function close() { mask.remove(); card.remove(); }
      card.querySelector('.asg-pick-x').addEventListener('click', close); mask.addEventListener('click', close);
      card.querySelector('#bt-imp-go').addEventListener('click', function () { var n = B.importAdd(sel, matched()); toast(n ? '已匯入 ' + n + ' 筆（重複略過）' : '無新增（皆已存在）'); close(); renderRight(); renderLeft(); });
      document.body.appendChild(mask); document.body.appendChild(card); draw();
    }

    renderLeft(); renderRight();
    return page;
  }

  window.NXBatch = { render: render };
})();
