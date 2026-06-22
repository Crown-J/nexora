// NEXORA GRID — 核心主檔｜圖像化指派引擎（組織架構圖）
// 四層串接：部門 → 組別 → 職務 → 成員；點左層節點，右層顯示其下層內容。
// 員工掛在「職務」節點下，組與部門由此往上推導；未指派員工停留在「未指派成員池」。
// 規格 v3.9 型態七。
(function () {
  'use strict';
  var ICONS = window.NX_ICONS || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function svg(p, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"' + (w ? ' style="width:' + w + 'px;height:' + w + 'px"' : '') + '>' + p + '</svg>'; }
  function ic(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>'; }
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

  function render(host, cfg, helpers) {
    if (cfg.id === 'sitechart') return renderSite(host, cfg, helpers);
    var DB = window.NXDB;
    var toast = (helpers && helpers.toast) || function () {};
    var page = el('<div class="nx-page"></div>');
    if (helpers && helpers.headHtml) page.appendChild(el(helpers.headHtml(cfg)));

    var frame = el('<div class="nx-frame nx-assign"></div>');
    frame.appendChild(el(
      '<div class="asg-bar">' +
        '<div class="asg-legend">' + ic('p_chart') + '<span>由左至右逐層指派：部門 → 組別 → 職務 → 成員。點職務後，從下方「未指派成員池」把員工指派進該職務。</span></div>' +
      '</div>'));
    var cols = el('<div class="asg-cols"></div>');
    frame.appendChild(cols);
    var pool = el('<div class="asg-pool"></div>');
    frame.appendChild(pool);
    page.appendChild(frame);
    host.appendChild(page);

    var sel = { dept: null, group: null, role: null };

    function colHtml(title, hint) {
      return '<div class="asg-col"><div class="asg-col-h"><b>' + title + '</b><span class="asg-cnt"></span></div><div class="asg-list"></div><div class="asg-col-hint">' + (hint || '') + '</div></div>';
    }
    cols.innerHTML = colHtml('① 部門') + colHtml('② 組別') + colHtml('③ 職務') + colHtml('④ 成員');
    var colEls = cols.querySelectorAll('.asg-col');

    function fillCol(i, items, opts) {
      opts = opts || {};
      var listEl = colEls[i].querySelector('.asg-list');
      var cntEl = colEls[i].querySelector('.asg-cnt');
      cntEl.textContent = items.length ? items.length : '';
      if (!items.length) { listEl.innerHTML = '<div class="asg-empty">' + (opts.empty || '—') + '</div>'; return; }
      listEl.innerHTML = items.map(function (it) {
        return '<button class="asg-node' + (opts.selId === it.id ? ' on' : '') + '" data-id="' + esc(it.id) + '">' +
          '<span class="asg-node-main"><b>' + esc(it.name) + '</b>' + (it.code ? '<small>' + esc(it.code) + '</small>' : '') + '</span>' +
          (opts.drill ? '<span class="asg-sub">' + (it.sub != null ? it.sub : '') + ARROW + '</span>' : (opts.member ? '<span class="asg-x" title="移除指派">' + svg('<path d="M18 6 6 18M6 6l12 12"/>', 14) + '</span>' : '')) +
          '</button>';
      }).join('');
    }

    function render4() {
      // 部門
      var depts = DB.depts.filter(function (d) { return d.active; }).map(function (d) {
        return { id: d.id, name: d.name, code: d.code, sub: DB.groups.filter(function (g) { return g.active && g.dept === d.id; }).length + ' 組' };
      });
      fillCol(0, depts, { drill: true, selId: sel.dept });
      // 組別
      if (sel.dept) {
        var groups = DB.groups.filter(function (g) { return g.active && g.dept === sel.dept; }).map(function (g) {
          return { id: g.id, name: g.name, code: g.code, sub: DB.roles.filter(function (r) { return r.active && r.group === g.id; }).length + ' 職' };
        });
        fillCol(1, groups, { drill: true, selId: sel.group, empty: '此部門尚無組別' });
      } else fillCol(1, [], { empty: '請先選部門' });
      // 職務
      if (sel.group) {
        var roles = DB.roles.filter(function (r) { return r.active && r.group === sel.group; }).map(function (r) {
          return { id: r.id, name: r.name, code: r.code, sub: DB.emps.filter(function (e) { return (e.roleIds || []).indexOf(r.id) >= 0; }).length + ' 人' };
        });
        fillCol(2, roles, { drill: true, selId: sel.role, empty: '此組尚無職務' });
      } else fillCol(2, [], { empty: '請先選組別' });
      // 成員
      if (sel.role) {
        var mems = DB.emps.filter(function (e) { return (e.roleIds || []).indexOf(sel.role) >= 0; }).map(function (e) {
          return { id: e.id, name: e.name, code: e.no };
        });
        fillCol(3, mems, { member: true, empty: '此職務尚無成員，按「＋ 指派」或點下方池加入' });
      } else fillCol(3, [], { empty: '請先選職務' });
      // 成員欄頭「＋ 指派」鈕（可指派任何員工，含已任其他職務者）
      var memHead = colEls[3].querySelector('.asg-col-h');
      var oldBtn = memHead.querySelector('.asg-addbtn'); if (oldBtn) oldBtn.remove();
      if (sel.role) {
        var ab = el('<button class="asg-addbtn">＋ 指派</button>');
        ab.addEventListener('click', openPicker);
        memHead.appendChild(ab);
      }
      renderPool();
    }

    function renderPool() {
      var unassigned = DB.emps.filter(function (e) { return !(e.roleIds && e.roleIds.length); });
      var roleName = sel.role ? (DB.byId(DB.roles, sel.role) || {}).name : '';
      pool.innerHTML =
        '<div class="asg-pool-h">' + svg('<circle cx="12" cy="8" r="4"/><path d="M5.5 21a7 7 0 0 1 13 0"/>', 16) +
          '<b>未指派成員池</b><span class="asg-cnt">' + (unassigned.length || '') + '</span>' +
          '<span class="asg-pool-hint">' + (sel.role ? '點員工 → 指派到「' + esc(roleName) + '」' : '請先在上方選一個職務，再點此處員工指派') + '</span></div>' +
        '<div class="asg-pool-list">' + (unassigned.length
          ? unassigned.map(function (e) { return '<button class="asg-chip' + (sel.role ? ' arm' : '') + '" data-id="' + e.id + '"><b>' + esc(e.name) + '</b><small>' + esc(e.no) + '</small></button>'; }).join('')
          : '<div class="asg-empty">目前沒有未指派員工</div>') + '</div>';
    }

    // 互動
    cols.addEventListener('click', function (ev) {
      var node = ev.target.closest('.asg-node'); if (!node) return;
      var colEl = ev.target.closest('.asg-col');
      var idx = Array.prototype.indexOf.call(colEls, colEl);
      var id = node.dataset.id;
      if (idx === 0) { sel.dept = id; sel.group = null; sel.role = null; render4(); }
      else if (idx === 1) { sel.group = id; sel.role = null; render4(); }
      else if (idx === 2) { sel.role = id; render4(); }
      else if (idx === 3) {
        if (ev.target.closest('.asg-x')) { var e = DB.byId(DB.emps, id); if (e) { e.roleIds = (e.roleIds || []).filter(function (x) { return x !== sel.role; }); toast('已移除 ' + e.name + ' 的此職務指派' + (e.roleIds.length ? '' : '，回未指派池')); render4(); } }
      }
    });
    pool.addEventListener('click', function (ev) {
      var chip = ev.target.closest('.asg-chip'); if (!chip) return;
      if (!sel.role) { toast('請先選一個職務', true); return; }
      var e = DB.byId(DB.emps, chip.dataset.id);
      if (e) { e.roleIds = (e.roleIds || []); if (e.roleIds.indexOf(sel.role) < 0) e.roleIds.push(sel.role); var r = DB.byId(DB.roles, sel.role); toast('已將 ' + e.name + ' 指派到「' + (r ? r.name : '') + '」'); render4(); }
    });

    // 指派成員選擇器：列出所有「尚未在此職務」的員工（含已任其他職務者），支援一人多職
    function openPicker() {
      if (!sel.role) return;
      var role = DB.byId(DB.roles, sel.role);
      var mask = el('<div class="asg-pickmask"></div>');
      var card = el(
        '<div class="asg-pick">' +
          '<div class="asg-pick-h"><b>指派成員到「' + esc(role.name) + '」</b><button class="asg-pick-x">' + svg('<path d="M18 6 6 18M6 6l12 12"/>', 16) + '</button></div>' +
          '<div class="asg-pick-search"><input type="text" placeholder="搜尋姓名／編號…" autocomplete="off"></div>' +
          '<div class="asg-pick-list"></div>' +
        '</div>');
      var listEl = card.querySelector('.asg-pick-list');
      var q = '';
      function draw() {
        var cands = DB.emps.filter(function (e) {
          if (!e.active) return false;
          if ((e.roleIds || []).indexOf(sel.role) >= 0) return false;
          if (!q) return true;
          return (e.name + ' ' + e.no).toLowerCase().indexOf(q.toLowerCase()) >= 0;
        });
        if (!cands.length) { listEl.innerHTML = '<div class="asg-empty">沒有可指派的員工</div>'; return; }
        listEl.innerHTML = cands.map(function (e) {
          var rn = DB.empRoleNames(e);
          var tag = rn.length ? '<span class="asg-pick-role">現任：' + esc(rn.join('、')) + '</span>' : '<span class="asg-pick-role pool">未指派</span>';
          return '<div class="asg-pick-row" data-id="' + e.id + '"><div class="asg-pick-main"><b>' + esc(e.name) + '</b><small>' + esc(e.no) + '</small></div>' + tag + '<button class="asg-pick-add">' + svg('<path d="M12 5v14M5 12h14"/>', 15) + '指派</button></div>';
        }).join('');
      }
      function close() { mask.remove(); card.remove(); }
      card.querySelector('.asg-pick-x').addEventListener('click', close);
      mask.addEventListener('click', close);
      card.querySelector('.asg-pick-search input').addEventListener('input', function (e) { q = e.target.value.trim(); draw(); });
      listEl.addEventListener('click', function (ev) {
        var row = ev.target.closest('.asg-pick-row'); if (!row) return;
        var e = DB.byId(DB.emps, row.dataset.id);
        if (e) { e.roleIds = (e.roleIds || []); if (e.roleIds.indexOf(sel.role) < 0) e.roleIds.push(sel.role); toast('已指派 ' + e.name + ' 到「' + role.name + '」'); draw(); render4(); }
      });
      document.body.appendChild(mask); document.body.appendChild(card);
      draw();
      card.querySelector('.asg-pick-search input').focus();
    }

    render4();
    return page;
  }

  window.NXAssign = { render: render };

  /* ============ 據點架構圖（三層：據點 → 倉庫 → 庫位 ＋ 員工據點指派）============ */
  function renderSite(host, cfg, helpers) {
    var DB = window.NXDB;
    var toast = (helpers && helpers.toast) || function () {};
    var USERS = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>';
    var X = '<path d="M18 6 6 18M6 6l12 12"/>';
    var page = el('<div class="nx-page"></div>');
    if (helpers && helpers.headHtml) page.appendChild(el(helpers.headHtml(cfg)));
    var frame = el('<div class="nx-frame nx-assign"></div>');
    frame.appendChild(el('<div class="asg-bar"><div class="asg-legend">' + ic('p_chart') + '<span>由左至右逐層展開：據點 → 倉庫 → 庫位。點據點後，於下方指派隸屬此據點的員工。</span></div></div>'));
    var cols = el('<div class="asg-cols asg-cols-3"></div>'); frame.appendChild(cols);
    var pool = el('<div class="asg-pool"></div>'); frame.appendChild(pool);
    page.appendChild(frame); host.appendChild(page);

    var sel = { site: null, wh: null };
    function colHtml(t) { return '<div class="asg-col"><div class="asg-col-h"><b>' + t + '</b><span class="asg-cnt"></span></div><div class="asg-list"></div></div>'; }
    cols.innerHTML = colHtml('① 據點') + colHtml('② 倉庫') + colHtml('③ 庫位');
    var colEls = cols.querySelectorAll('.asg-col');
    function fillCol(i, items, opts) {
      opts = opts || {};
      var listEl = colEls[i].querySelector('.asg-list'), cntEl = colEls[i].querySelector('.asg-cnt');
      cntEl.textContent = items.length ? items.length : '';
      if (!items.length) { listEl.innerHTML = '<div class="asg-empty">' + (opts.empty || '—') + '</div>'; return; }
      listEl.innerHTML = items.map(function (it) {
        return '<button class="asg-node' + (opts.selId === it.id ? ' on' : '') + '" data-id="' + esc(it.id) + '">' +
          '<span class="asg-node-main"><b>' + esc(it.name) + '</b>' + (it.code ? '<small>' + esc(it.code) + '</small>' : '') + '</span>' +
          (opts.drill ? '<span class="asg-sub">' + (it.sub != null ? it.sub : '') + ARROW + '</span>' : '') + '</button>';
      }).join('');
    }

    function render3() {
      var sites = DB.sites.filter(function (s) { return s.active; }).map(function (s) {
        return { id: s.id, name: s.name, code: s.code, sub: DB.warehouses.filter(function (w) { return w.active && w.site === s.id; }).length + ' 倉' };
      });
      fillCol(0, sites, { drill: true, selId: sel.site });
      if (sel.site) {
        var whs = DB.warehouses.filter(function (w) { return w.active && w.site === sel.site; }).map(function (w) {
          return { id: w.id, name: w.name, code: w.code, sub: DB.bins.filter(function (b) { return b.active && b.warehouse === w.id; }).length + ' 位' };
        });
        fillCol(1, whs, { drill: true, selId: sel.wh, empty: '此據點尚無倉庫' });
      } else fillCol(1, [], { empty: '請先選據點' });
      if (sel.wh) {
        var bins = DB.bins.filter(function (b) { return b.active && b.warehouse === sel.wh; }).map(function (b) { return { id: b.id, name: b.name || b.code, code: b.code }; });
        fillCol(2, bins, { empty: '此倉庫尚無庫位' });
      } else fillCol(2, [], { empty: '請先選倉庫' });
      renderMembers();
    }
    function renderMembers() {
      var site = sel.site ? DB.byId(DB.sites, sel.site) : null;
      var mems = site ? DB.emps.filter(function (e) { return e.siteId === site.id; }) : [];
      pool.innerHTML = '<div class="asg-pool-h">' + svg(USERS, 16) + '<b>據點隸屬員工' + (site ? '：' + esc(site.name) : '') + '</b>' +
        '<span class="asg-cnt">' + (mems.length || '') + '</span>' +
        (site ? '<button class="asg-addbtn" id="site-add">＋ 指派員工</button>' : '<span class="asg-pool-hint">請先在上方選一個據點</span>') + '</div>' +
        '<div class="asg-pool-list">' + (site
          ? (mems.length ? mems.map(function (e) { return '<div class="asg-chip arm" data-id="' + e.id + '"><b>' + esc(e.name) + '</b><small>' + esc(e.no) + '</small><span class="asg-x" title="移除據點">' + svg(X, 13) + '</span></div>'; }).join('') : '<div class="asg-empty">此據點尚無員工，按「＋ 指派員工」加入</div>')
          : '<div class="asg-empty">選擇據點後在此指派員工</div>') + '</div>';
    }

    cols.addEventListener('click', function (ev) {
      var node = ev.target.closest('.asg-node'); if (!node) return;
      var idx = Array.prototype.indexOf.call(colEls, ev.target.closest('.asg-col'));
      if (idx === 0) { sel.site = node.dataset.id; sel.wh = null; render3(); }
      else if (idx === 1) { sel.wh = node.dataset.id; render3(); }
    });
    pool.addEventListener('click', function (ev) {
      if (ev.target.closest('#site-add')) { openSitePicker(); return; }
      var x = ev.target.closest('.asg-x'); if (x) { var chip = x.closest('[data-id]'); var e = DB.byId(DB.emps, chip.dataset.id); if (e) { e.siteId = ''; toast('已移除 ' + e.name + ' 的據點歸屬'); renderMembers(); } }
    });
    function openSitePicker() {
      var site = DB.byId(DB.sites, sel.site); if (!site) return;
      var mask = el('<div class="asg-pickmask"></div>');
      var card = el('<div class="asg-pick"><div class="asg-pick-h"><b>指派員工到「' + esc(site.name) + '」</b><button class="asg-pick-x">' + svg(X, 16) + '</button></div><div class="asg-pick-search"><input type="text" placeholder="搜尋姓名／編號…" autocomplete="off"></div><div class="asg-pick-list"></div></div>');
      var listEl = card.querySelector('.asg-pick-list'), q = '';
      function draw() {
        var cands = DB.emps.filter(function (e) { if (e.siteId === sel.site) return false; if (!q) return true; return (e.name + ' ' + e.no).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
        if (!cands.length) { listEl.innerHTML = '<div class="asg-empty">沒有可指派的員工</div>'; return; }
        listEl.innerHTML = cands.map(function (e) {
          var cur = e.siteId ? DB.empSite(e) : '未指派';
          return '<div class="asg-pick-row" data-id="' + e.id + '"><div class="asg-pick-main"><b>' + esc(e.name) + '</b><small>' + esc(e.no) + '</small></div><span class="asg-pick-role' + (e.siteId ? '' : ' pool') + '">現屬：' + esc(cur) + '</span><button class="asg-pick-add">' + svg('<path d="M12 5v14M5 12h14"/>', 15) + '指派</button></div>';
        }).join('');
      }
      function close() { mask.remove(); card.remove(); }
      card.querySelector('.asg-pick-x').addEventListener('click', close);
      mask.addEventListener('click', close);
      card.querySelector('input').addEventListener('input', function (e) { q = e.target.value.trim(); draw(); });
      listEl.addEventListener('click', function (ev) {
        var row = ev.target.closest('.asg-pick-row'); if (!row) return;
        var e = DB.byId(DB.emps, row.dataset.id);
        if (e) { e.siteId = sel.site; toast('已指派 ' + e.name + ' 到「' + site.name + '」'); draw(); renderMembers(); }
      });
      document.body.appendChild(mask); document.body.appendChild(card);
      draw(); card.querySelector('input').focus();
    }

    render3();
    return page;
  }
})();
