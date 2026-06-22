// NEXORA GRID — 核心主檔｜權限矩陣引擎（職務權限設定）
// 上方選職務，縱軸各畫面（依模組分群）、橫軸六種權限（瀏覽/新增/修改/停用/匯出/核准），打勾授權。
// 暫存後一次存檔；未存離開會提醒。系統管理員與公司負責人不在下拉（本即全權限）。規格 v3.9 型態八。
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function svg(p, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (w ? ' style="width:' + w + 'px;height:' + w + 'px"' : '') + '>' + p + '</svg>'; }

  var PERMS = [{ k: 'view', label: '瀏覽' }, { k: 'add', label: '新增' }, { k: 'edit', label: '修改' }, { k: 'disable', label: '停用' }, { k: 'export', label: '匯出' }, { k: 'approve', label: '核准' }];
  var store = {}; // { roleId: { 'div/page': {view:bool,...} } }

  // 從六大分區建立「畫面清單」(依模組分群)
  function screenGroups() {
    var tree = window.NX_MASTER && window.NX_MASTER.tree;
    if (!tree) return [];
    return tree.sub.map(function (div) {
      return { key: div.key, label: div.label, pages: (div.sub || []).map(function (p) { return { key: div.key + '/' + p.page, label: p.label }; }) };
    });
  }

  function render(host, cfg, helpers) {
    var DB = window.NXDB;
    var toast = (helpers && helpers.toast) || function () {};
    var groups = screenGroups();
    var roles = DB.roles.filter(function (r) { return r.active; });
    var page = el('<div class="nx-page"></div>');
    if (helpers && helpers.headHtml) page.appendChild(el(helpers.headHtml(cfg)));

    var frame = el('<div class="nx-frame nx-matrix"></div>');
    frame.appendChild(el(
      '<div class="mx-bar">' +
        '<label class="mx-role"><span>職務</span><select id="mx-role">' + roles.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + '（' + esc(r.code) + '）</option>'; }).join('') + '</select></label>' +
        '<span class="mx-note">' + svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>', 14) + '系統管理員與公司負責人本即全權限，不在此設定</span>' +
        '<span class="sp"></span>' +
        '<span class="mx-dirty" id="mx-dirty" hidden>● 有未存變更</span>' +
        '<button class="nx-btn primary" id="mx-save">' + svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>', 15) + '存檔<kbd>Alt+S</kbd></button>' +
      '</div>'));
    var wrap = el('<div class="mx-wrap"></div>');
    frame.appendChild(wrap);
    page.appendChild(frame);
    host.appendChild(page);

    var roleId = roles.length ? roles[0].id : '';
    var dirty = false;
    function perms() { store[roleId] = store[roleId] || {}; return store[roleId]; }
    function cell(scrKey) { var p = perms(); p[scrKey] = p[scrKey] || {}; return p[scrKey]; }
    function setDirty(v) { dirty = v; frame.querySelector('#mx-dirty').hidden = !v; }

    function build() {
      var head = '<thead><tr><th class="mx-scr">畫面</th>' + PERMS.map(function (pm) { return '<th class="mx-perm">' + pm.label + '</th>'; }).join('') + '<th class="mx-rowact">整列</th></tr></thead>';
      var body = groups.map(function (g) {
        var modRow = '<tr class="mx-mod"><td class="mx-scr"><b>' + esc(g.label) + '</b></td><td colspan="6"></td>' +
          '<td class="mx-rowact"><button class="mx-mini" data-mod="' + g.key + '" data-on="1">整模組全選</button><button class="mx-mini" data-mod="' + g.key + '" data-on="0">清除</button></td></tr>';
        var rows = g.pages.map(function (p) {
          var c = cell(p.key);
          var tds = PERMS.map(function (pm) { return '<td><button class="mx-chk' + (c[pm.k] ? ' on' : '') + '" data-scr="' + p.key + '" data-p="' + pm.k + '" aria-label="' + pm.label + '">' + (c[pm.k] ? svg('<path d="M20 6 9 17l-5-5"/>', 14) : '') + '</button></td>'; }).join('');
          return '<tr><td class="mx-scr">' + esc(p.label) + '</td>' + tds + '<td class="mx-rowact"><button class="mx-mini" data-row="' + p.key + '" data-on="1">全選</button><button class="mx-mini" data-row="' + p.key + '" data-on="0">清除</button></td></tr>';
        }).join('');
        return modRow + rows;
      }).join('');
      wrap.innerHTML = '<table class="mx-table">' + head + '<tbody>' + body + '</tbody></table>';
    }

    wrap.addEventListener('click', function (ev) {
      var chk = ev.target.closest('.mx-chk');
      if (chk) {
        var c = cell(chk.dataset.scr); c[chk.dataset.p] = !c[chk.dataset.p];
        chk.classList.toggle('on', c[chk.dataset.p]);
        chk.innerHTML = c[chk.dataset.p] ? svg('<path d="M20 6 9 17l-5-5"/>', 16) : '';
        setDirty(true); return;
      }
      var mini = ev.target.closest('.mx-mini'); if (!mini) return;
      var on = mini.dataset.on === '1';
      if (mini.dataset.row) { var c2 = cell(mini.dataset.row); PERMS.forEach(function (pm) { c2[pm.k] = on; }); setDirty(true); build(); }
      else if (mini.dataset.mod) {
        var g = groups.filter(function (x) { return x.key === mini.dataset.mod; })[0];
        if (g) g.pages.forEach(function (p) { var c3 = cell(p.key); PERMS.forEach(function (pm) { c3[pm.k] = on; }); });
        setDirty(true); build();
      }
    });
    frame.querySelector('#mx-role').addEventListener('change', function (e) {
      if (dirty && !confirm('有未存檔的權限變更，確定切換職務並放棄變更？')) { e.target.value = roleId; return; }
      roleId = e.target.value; setDirty(false); build();
    });
    function save() { setDirty(false); var r = DB.byId(DB.roles, roleId); toast('已存檔「' + (r ? r.name : '') + '」的權限設定'); }
    frame.querySelector('#mx-save').addEventListener('click', save);

    build();
    return page;
  }

  window.NXMatrix = { render: render };
})();
