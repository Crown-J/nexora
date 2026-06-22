// NEXORA GRID — 核心主檔｜頁面設定
// 組織架構四頁（員工/職務/部門/組）為完整設定；其餘頁為骨架（已接導覽，逐頁補做）。
// 欄位依《需求規格-01 核心主檔 v3.6》。
(function () {
  'use strict';
  var DB = window.NXDB;
  var dict = DB.dict;

  // 下拉來源
  var srcGroups = function () { return DB.groups.filter(function (g) { return g.active; }); };
  var srcDepts = function () { return DB.depts.filter(function (d) { return d.active; }); };
  var srcCountries = function () { return dict.countries; };
  var srcSites = function () { return DB.sites.filter(function (s) { return s.active; }); };
  var srcWarehouses = function () { return DB.warehouses.filter(function (w) { return w.active; }); };
  var srcWhTypes = function () { return DB.whTypes; };

  // 共用：狀態 chip
  function statusChip(active, owner) {
    var s = active ? '<span class="nx-chip on">啟用</span>' : '<span class="nx-chip off">停用</span>';
    if (owner) s += ' <span class="nx-chip owner">負責人</span>';
    return s;
  }
  function mono(v) { return '<span class="mono">' + (v == null ? '' : v) + '</span>'; }
  function tag(v) { return v ? '<span class="nx-tag">' + v + '</span>' : '<span class="sub">—</span>'; }
  function sub(v) { return '<span class="sub">' + (v || '—') + '</span>'; }

  var CFG = {};

  /* ============ 員工基本資料 ============ */
  CFG.emp = {
    id: 'emp', title: '員工基本資料', kind: 'mtab',
    desc: '建立與維護每位員工的個人資料、學經歷、組織歸屬與帳號。部門／組／職務／據點僅顯示（唯讀），指派統一在組織架構圖／據點架構圖組裝。',
    data: function () { return DB.emps; },
    seat: true,
    status: function (e) { return e.active; },
    toggleActive: function (e) {
      if (e.active) { e.active = false; return { msg: '已停用 ' + e.name + '，釋出一席' }; }
      var used = DB.seatUsed(), lim = DB.seatLimit;
      if (used >= lim) return { blocked: true, msg: '席次已滿（' + used + ' / ' + lim + '），無法啟用' };
      e.active = true; return { msg: '已啟用 ' + e.name + '，可登入' };
    },
    titleOf: function (e) { return e.name; },
    subOf: function (e) { return e.no + ' · ' + DB.empRole(e); },
    newRecord: function () { var n = 'Y' + String(1000 + DB.emps.length + 1); return { id: n, no: n, name: '', active: false, owner: false, roleIds: [], nationality: 'TW' }; },
    columns: [
      { label: '員工編號', get: function (e) { return mono(e.no); }, text: function (e) { return e.no; } },
      { label: '姓名', get: function (e) { return '<b>' + e.name + '</b>'; }, text: function (e) { return e.name; } },
      { label: '部門', get: function (e) { return sub(DB.empDept(e)); }, text: function (e) { return DB.empDept(e); } },
      { label: '組', get: function (e) { return sub(DB.empGroup(e)); }, text: function (e) { return DB.empGroup(e); } },
      { label: '職務', get: function (e) { return DB.roleOf(e) ? DB.empRole(e) : '<span class="sub">（未指派）</span>'; }, text: function (e) { return DB.empRoleNames(e).join(' '); } },
      { label: '手機', get: function (e) { return sub(e.mobile); }, text: function (e) { return e.mobile || ''; } },
      { label: '狀態', get: function (e) { return statusChip(e.active, e.owner); }, text: function (e) { return e.active ? '啟用' : '停用'; } }
    ],
    tabs: [
      { label: '基本資料', aside: 'avatar', fields: [
        { type: 'section', label: '編號' },
        { key: 'no', label: '員工編號', type: 'text', req: true, ro: true, hint: 'Y＋4 碼，系統自動給號、租戶內唯一，亦為登入帳號。建立後鎖定。' },
        { key: 'oldNo', label: '舊系統員工編號', type: 'text', placeholder: '資料轉移對照用（進階）' },
        { type: 'section', label: '姓名' },
        { key: 'name', label: '中文姓名', type: 'text', req: true },
        { key: 'eng', label: '英文姓名', type: 'text' },
        { type: 'section', label: '個人資料' },
        { key: 'gender', label: '性別', type: 'select', options: dict.genders, placeholder: '請選擇' },
        { key: 'birth', label: '生日', type: 'date' },
        { key: 'idno', label: '身分證字號', type: 'masked', hint: '預設遮罩顯示，點眼睛圖示解遮看明碼（防意外瞥見／截圖外洩的第二層防護）。' },
        { key: 'nationality', label: '國籍', type: 'select', options: srcCountries, placeholder: '台灣' },
        { type: 'section', label: '聯絡方式' },
        { key: 'email', label: 'Email', type: 'text', hint: '供通知與聯絡，亦可作忘記密碼自助重設管道之一。' },
        { key: 'phone', label: '電話', type: 'text' },
        { key: 'mobile', label: '手機', type: 'text', hint: '供忘記密碼自助重設（簡訊驗證碼）與系統通知。未填手機且未填 Email 者僅能由管理員重設密碼。' },
        { type: 'section', label: '地址' },
        { key: 'reg', label: '戶籍地址', type: 'address', hint: '選縣市 → 鄉鎮市區（自動帶郵遞區號）→ 填詳細地址。' },
        { key: 'mail', label: '通訊地址', type: 'address', hint: '可與戶籍不同。' },
        { type: 'section', label: '緊急聯絡' },
        { key: 'emer', label: '緊急聯絡人姓名', type: 'text' },
        { key: 'emerRel', label: '緊急聯絡人關係', type: 'text', placeholder: '例如 父／母／配偶' },
        { key: 'emerTel', label: '緊急聯絡人電話', type: 'text' }
      ]},
      { label: '教育程度', fields: [
        { key: 'edu', label: '最高學歷', type: 'select', options: dict.edu, placeholder: '請選擇' },
        { key: 'school', label: '畢業學校', type: 'text' },
        { key: 'military', label: '兵役狀況', type: 'select', options: dict.military, placeholder: '請選擇' },
        { key: 'medDate', label: '體檢日期', type: 'date' },
        { key: 'medResult', label: '體檢結果', type: 'select', options: ['合格', '不合格', '複檢', '未體檢'], placeholder: '請選擇', hint: '只記結果文字、不存報告檔。' }
      ]},
      { label: '職務部門', fields: [
        { type: 'section', label: '組織歸屬（唯讀，指派在架構圖）' },
        { label: '部門', type: 'text', ro: true, get: function (e) { return e ? DB.empDept(e) : '—'; }, hint: '由職務指派往上推導，僅顯示。' },
        { label: '組別', type: 'text', ro: true, get: function (e) { return e ? DB.empGroup(e) : '—'; }, hint: '由職務往上推導，僅顯示。' },
        { label: '職務', type: 'text', ro: true, get: function (e) { return e ? (DB.empRoleNames(e).join('、') || '—') : '—'; }, hint: '可掛多個職務（員工因此取得對應權限）。指派在「權限管理 → 組織架構圖」。' },
        { label: '隸屬據點', type: 'text', ro: true, get: function (e) { return e ? DB.empSite(e) : '—'; }, hint: '指派在「據點架構圖」，僅顯示。' }
      ]},
      { label: '帳號狀況', fields: [
        { type: 'section', label: '在職' },
        { key: 'hire', label: '到職日', type: 'date', hint: '供年資計算。' },
        { key: 'leave', label: '離職日期', type: 'date', hint: '留空＝在職；填了即標示已離職（資料保留），建議一併停用以釋出席次。' },
        { type: 'section', label: '帳號安全' },
        { key: 'resetpwd', label: '重置密碼', type: 'action', btn: '重置密碼', icon: 'key', action: 'resetpwd', hint: '按下確認後密碼重設為預設密碼（員工編號）並自動開啟強制改密；員工下次登入改完後自動關閉。' },
        { key: 'twoFa', label: '啟用雙重驗證', type: 'switch', hint: '須有手機或 Email 管道' },
        { label: '最近登入時間', type: 'text', ro: true, get: function () { return '2026-06-12 09:14'; } },
        { key: 'active', label: '是否啟用', type: 'switch', hint: '啟用後才能登入，受席次上限管控' }
      ]}
    ]
  };

  /* ============ 職務基本資料 ============ */
  CFG.role = {
    id: 'role', title: '職務基本資料', kind: 'table',
    desc: '職務是一組畫面權限的集合（例如採購員、業務員、倉管、會計）。員工掛上職務就取得該職務的權限。',
    data: function () { return DB.roles; },
    status: function (r) { return r.active; },
    titleOf: function (r) { return r.name; },
    subOf: function (r) { return r.code; },
    newRecord: function () { return { id: 'R' + Date.now(), code: '', name: '', level: 'G3', group: '', active: true }; },
    columns: [
      { label: '職務代碼', get: function (r) { return mono(r.code); }, text: function (r) { return r.code; } },
      { label: '職務名稱', get: function (r) { return '<b>' + r.name + '</b>'; }, text: function (r) { return r.name; } },
      { label: '層級', get: function (r) { return tag(r.level); }, text: function (r) { return r.level || ''; } },
      { label: '隸屬組', get: function (r) { var g = DB.byId(DB.groups, r.group); return sub(g ? g.name : ''); }, text: function (r) { var g = DB.byId(DB.groups, r.group); return g ? g.name : ''; } },
      { label: '說明', get: function (r) { return sub(r.desc); }, text: function (r) { return r.desc || ''; } },
      { label: '狀態', get: function (r) { return statusChip(r.active); }, text: function (r) { return r.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '職務', fields: [
      { key: 'code', label: '職務代碼', type: 'text', req: true, ro: true, hint: '自動轉大寫（例如 SALES、FINANCE），建立後鎖定。' },
      { key: 'name', label: '職務名稱', type: 'text', req: true },
      { key: 'level', label: '層級', type: 'select', options: ['G1', 'G2', 'G3'], placeholder: '請選擇', hint: '職務階層，供組織呈現與 KPI 參考。' },
      { key: 'group', label: '隸屬組', type: 'select', options: srcGroups, req: true, placeholder: '請選擇組別', hint: '部門由組往上推導（對應組織架構圖 部門→組→職務）。' },
      { key: 'sort', label: '排序', type: 'text', placeholder: '0' },
      { key: 'desc', label: '說明', type: 'textarea', full: true, hint: '備註用（進階）。' }
    ]}]
  };

  /* ============ 部門基本資料 ============ */
  CFG.dept = {
    id: 'dept', title: '部門基本資料', kind: 'table',
    desc: '部門是組織的最上層分類（例如銷售部、採購部、倉儲部）。此頁只建立部門本身；組／職務／員工如何掛進部門，在組織架構圖組裝。',
    data: function () { return DB.depts; },
    status: function (d) { return d.active; },
    titleOf: function (d) { return d.name; },
    subOf: function (d) { return d.code; },
    newRecord: function () { return { id: 'D' + Date.now(), code: '', name: '', sort: 0, active: true }; },
    columns: [
      { label: '部門代碼', get: function (d) { return mono(d.code); }, text: function (d) { return d.code; } },
      { label: '部門名稱', get: function (d) { return '<b>' + d.name + '</b>'; }, text: function (d) { return d.name; } },
      { label: '組數', get: function (d) { return sub(DB.groups.filter(function (g) { return g.dept === d.id; }).length + ' 組'); }, text: function () { return ''; } },
      { label: '排序', get: function (d) { return sub(d.sort); }, text: function () { return ''; } },
      { label: '狀態', get: function (d) { return statusChip(d.active); }, text: function (d) { return d.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '部門', fields: [
      { key: 'code', label: '部門代碼', type: 'text', req: true, ro: true, hint: '自動轉大寫，建立後鎖定。' },
      { key: 'name', label: '部門名稱', type: 'text', req: true, placeholder: '例如 銷售部' },
      { key: 'sort', label: '排序', type: 'text', placeholder: '0', hint: '顯示順序（進階）。' }
    ]}]
  };

  /* ============ 組別基本資料 ============ */
  CFG.group = {
    id: 'group', title: '組別基本資料', kind: 'table',
    desc: '組是部門底下的單位（例如銷售部的「台北一組」）。此頁只建立組本身；職務／員工如何掛進組，在組織架構圖組裝。組長身分也在組織架構圖設定。',
    data: function () { return DB.groups; },
    status: function (g) { return g.active; },
    titleOf: function (g) { return g.name; },
    subOf: function (g) { var d = DB.byId(DB.depts, g.dept); return g.code + ' · ' + (d ? d.name : ''); },
    newRecord: function () { return { id: 'G' + Date.now(), code: '', name: '', dept: '', parent: '', sort: 0, active: true }; },
    columns: [
      { label: '組代碼', get: function (g) { return mono(g.code); }, text: function (g) { return g.code; } },
      { label: '組名稱', get: function (g) { return '<b>' + g.name + '</b>'; }, text: function (g) { return g.name; } },
      { label: '隸屬部門', get: function (g) { var d = DB.byId(DB.depts, g.dept); return sub(d ? d.name : ''); }, text: function (g) { var d = DB.byId(DB.depts, g.dept); return d ? d.name : ''; } },
      { label: '上層組', get: function (g) { var p = DB.byId(DB.groups, g.parent); return p ? sub(p.name) : '<span class="sub">—</span>'; }, text: function () { return ''; } },
      { label: '狀態', get: function (g) { return statusChip(g.active); }, text: function (g) { return g.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '組別', fields: [
      { key: 'code', label: '組代碼', type: 'text', req: true, ro: true, hint: '自動轉大寫（例如 TPE1），建立後鎖定。' },
      { key: 'name', label: '組名稱', type: 'text', req: true, placeholder: '例如 台北一組' },
      { key: 'dept', label: '隸屬部門', type: 'select', options: srcDepts, req: true, placeholder: '請選擇部門' },
      { key: 'parent', label: '上層組', type: 'select', options: srcGroups, placeholder: '（無，一般兩層即可）', hint: '要做更細層級時，可把這組掛在另一個組底下（支援子組）。' },
      { key: 'sort', label: '排序', type: 'text', placeholder: '0' }
    ]}]
  };

  /* ============ 據點基本資料 ============ */
  CFG.sitebase = {
    id: 'sitebase', title: '據點基本資料', kind: 'table',
    data: function () { return DB.sites; },
    status: function (s) { return s.active; },
    titleOf: function (s) { return s.name; },
    newRecord: function () { return { id: 'ST' + Date.now(), code: '', name: '', addr: '', phone: '', sort: 0, active: true }; },
    columns: [
      { label: '據點代碼', get: function (s) { return mono(s.code); }, text: function (s) { return s.code; } },
      { label: '據點名稱', get: function (s) { return '<b>' + s.name + '</b>'; }, text: function (s) { return s.name; } },
      { label: '地址', get: function (s) { return sub(s.addr); }, text: function (s) { return s.addr || ''; } },
      { label: '聯絡電話', get: function (s) { return sub(s.phone); }, text: function (s) { return s.phone || ''; } },
      { label: '倉庫數', get: function (s) { return sub(DB.warehouses.filter(function (w) { return w.site === s.id; }).length + ' 倉'); }, text: function () { return ''; } },
      { label: '狀態', get: function (s) { return statusChip(s.active); }, text: function (s) { return s.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '據點', fields: [
      { key: 'code', label: '據點代碼', type: 'text', req: true, ro: true, hint: '自動轉大寫，建立後鎖定。' },
      { key: 'name', label: '據點名稱', type: 'text', req: true },
      { key: 'phone', label: '聯絡電話', type: 'text' },
      { key: 'addr', label: '地址', type: 'text', full: true, hint: '據點地址（自由文字，進階）。' },
      { key: 'sort', label: '排序', type: 'text', placeholder: '0' }
    ]}]
  };

  /* ============ 倉庫基本資料 ============ */
  CFG.warehouse = {
    id: 'warehouse', title: '倉庫基本資料', kind: 'table',
    data: function () { return DB.warehouses; },
    status: function (w) { return w.active; },
    titleOf: function (w) { return w.name; },
    subOf: function (w) { var s = DB.byId(DB.sites, w.site); return w.code + ' · ' + (s ? s.name : ''); },
    newRecord: function () { return { id: 'WH' + Date.now(), code: '', name: '', site: '', whType: '', note: '', sort: 0, active: true }; },
    columns: [
      { label: '倉庫代碼', get: function (w) { return mono(w.code); }, text: function (w) { return w.code; } },
      { label: '倉庫名稱', get: function (w) { return '<b>' + w.name + '</b>'; }, text: function (w) { return w.name; } },
      { label: '所屬據點', get: function (w) { var s = DB.byId(DB.sites, w.site); return sub(s ? s.name : ''); }, text: function (w) { var s = DB.byId(DB.sites, w.site); return s ? s.name : ''; } },
      { label: '倉別', get: function (w) { var t = DB.byId(DB.whTypes, w.whType); return tag(t ? t.name : ''); }, text: function (w) { var t = DB.byId(DB.whTypes, w.whType); return t ? t.name : ''; } },
      { label: '狀態', get: function (w) { return statusChip(w.active); }, text: function (w) { return w.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '倉庫', fields: [
      { key: 'code', label: '倉庫代碼', type: 'text', req: true, ro: true, hint: '自動轉大寫，建立後鎖定。' },
      { key: 'name', label: '倉庫名稱', type: 'text', req: true },
      { key: 'site', label: '所屬據點', type: 'select', options: srcSites, req: true, placeholder: '請選擇據點' },
      { key: 'whType', label: '倉別', type: 'select', options: srcWhTypes, placeholder: '請選擇倉別', hint: '系統內建倉別（良品／不良品／在途），綁庫存流向邏輯。' },
      { key: 'note', label: '備註', type: 'textarea', full: true },
      { key: 'sort', label: '排序', type: 'text', placeholder: '0' }
    ]}]
  };

  /* ============ 庫位基本資料 ============ */
  CFG.bin = {
    id: 'bin', title: '庫位基本資料', kind: 'table',
    data: function () { return DB.bins; },
    status: function (b) { return b.active; },
    titleOf: function (b) { return b.name || b.code; },
    subOf: function (b) { return b.code; },
    newRecord: function () { return { id: 'BN' + Date.now(), code: '', name: '', warehouse: '', site: '', zone: '', rack: '', level: '', cell: '', sort: 0, active: true }; },
    columns: [
      { label: '庫位代碼', get: function (b) { return mono(b.code); }, text: function (b) { return b.code; } },
      { label: '名稱', get: function (b) { return '<b>' + (b.name || '—') + '</b>'; }, text: function (b) { return b.name || ''; } },
      { label: '所屬倉庫', get: function (b) { var w = DB.byId(DB.warehouses, b.warehouse); return sub(w ? w.name : ''); }, text: function (b) { var w = DB.byId(DB.warehouses, b.warehouse); return w ? w.name : ''; } },
      { label: '所屬據點', get: function (b) { var s = DB.byId(DB.sites, b.site); return sub(s ? s.name : ''); }, text: function (b) { var s = DB.byId(DB.sites, b.site); return s ? s.name : ''; } },
      { label: '位置', get: function (b) { return sub([b.zone, b.rack, b.level, b.cell].filter(Boolean).join('-')); }, text: function () { return ''; } },
      { label: '狀態', get: function (b) { return statusChip(b.active); }, text: function (b) { return b.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '庫位', fields: [
      { key: 'site', label: '所屬據點', type: 'select', options: srcSites, placeholder: '請選擇據點' },
      { key: 'warehouse', label: '所屬倉庫', type: 'select', options: srcWarehouses, req: true, placeholder: '請選擇倉庫' },
      { key: 'code', label: '庫位代碼', type: 'text', req: true, ro: true, hint: '庫位編號，建立後鎖定。' },
      { key: 'name', label: '名稱', type: 'text' },
      { key: 'zone', label: '區', type: 'text' },
      { key: 'rack', label: '架號', type: 'text' },
      { key: 'level', label: '層', type: 'text' },
      { key: 'cell', label: '格', type: 'text' },
      { key: 'sort', label: '排序', type: 'text', placeholder: '0' }
    ]}]
  };

  /* ============ 往來對象基本資料 ============ */
  var ptypes = DB.partnerTypes;
  var srcSalesEmp = function () { return DB.emps.filter(function (e) { return e.active; }).map(function (e) { return { value: e.id, label: e.name }; }); };
  var srcParents = function () { return DB.partners.filter(function (p) { return p.active; }).map(function (p) { return { value: p.id, label: p.name }; }); };
  function pBasic() {
    return [
      { type: 'section', label: '公司' },
      { key: 'code', label: '公司代碼', type: 'text', req: true, ro: true, hint: '類型代碼＋4 碼流水（如 C0001、S0001），自動給號，建立後鎖定。' },
      { key: 'type', label: '對象類型', type: 'select', req: true, options: Object.keys(ptypes).map(function (k) { return { value: k, label: k + ' ' + ptypes[k] }; }), placeholder: '請選擇', hint: '建立後不可改；畫面依類型顯示對應分頁。' },
      { key: 'name', label: '公司全名', type: 'text', req: true },
      { key: 'shortName', label: '公司簡稱', type: 'text' },
      { key: 'eng', label: '英文名稱', type: 'text' },
      { key: 'owner', label: '公司負責人姓名', type: 'text' },
      { type: 'section', label: '聯絡' },
      { key: 'contact', label: '主要聯絡人', type: 'text' },
      { key: 'phone', label: '公司電話', type: 'text' },
      { key: 'mobile', label: '行動電話', type: 'text' },
      { key: 'fax', label: '傳真', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'web', label: '網站', type: 'text' },
      { type: 'section', label: '歸屬' },
      { key: 'country', label: '國別', type: 'select', options: srcCountries, placeholder: '台灣' },
      { key: 'region', label: '地區', type: 'select', options: function () { return DB.dict.regions; }, placeholder: '請選擇' },
      { key: 'parent', label: '母公司', type: 'select', options: srcParents, placeholder: '（無）', hint: '連鎖客戶選母公司後即為其分店。' },
      { key: 'note', label: '備註', type: 'textarea', full: true },
      { type: 'section', label: '聯絡窗口（可建多筆部門窗口）' },
      { key: 'contacts', label: '聯絡窗口', type: 'subtable', addLabel: '窗口', cols: [
        { key: 'name', label: '姓名', placeholder: '必填' }, { key: 'dept', label: '職務／部門' }, { key: 'phone', label: '電話' }, { key: 'mobile', label: '手機' }, { key: 'email', label: 'Email' }, { key: 'note', label: '備註' }
      ] }
    ];
  }
  function pSales() {
    return [
      { key: 'custGrade', label: '客戶分級', type: 'select', options: function () { return DB.custGrades; }, placeholder: '請選擇', hint: '決定售價自動套用的加成率。' },
      { key: 'marginPct', label: '自訂毛利率 %', type: 'text', hint: '有填覆寫分級、沒填跟分級走。' },
      { key: 'creditLimit', label: '信用額度', type: 'text', hint: '0＝不限制。' },
      { key: 'creditStatus', label: '信用狀態', type: 'select', options: [{ value: 'N', label: 'N 正常' }, { value: 'W', label: 'W 警示' }, { value: 'F', label: 'F 凍結' }], placeholder: 'N 正常' },
      { key: 'defaultWh', label: '預設出貨倉', type: 'select', options: srcWarehouses, placeholder: '請選擇' },
      { key: 'allowTransfer', label: '可調貨給此對象', type: 'switch', hint: '同行調貨（軋帳）用' },
      { key: 'salesEmp', label: '業務員', type: 'select', options: srcSalesEmp, placeholder: '請選擇', hint: '我方指派負責此客戶的業務員。' }
    ];
  }
  function pShip() {
    return [
      { key: 'defaultInWh', label: '預設入庫倉（供應商）', type: 'select', options: srcWarehouses, placeholder: '請選擇', hint: '向此供應商進貨時預設收進的倉。' },
      { type: 'section', label: '送貨地址（客戶可建多筆，連鎖分店）' },
      { key: 'addresses', label: '送貨地址', type: 'subtable', addLabel: '地址', cols: [
        { key: 'label', label: '標籤', placeholder: '總公司' }, { key: 'isDefault', label: '預設', type: 'select', options: [{ value: '', label: '否' }, { value: '1', label: '預設' }] }, { key: 'city', label: '縣市', type: 'city' }, { key: 'area', label: '鄉鎮', type: 'area' }, { key: 'zip', label: '郵遞區號', placeholder: '自動／可輸入' }, { key: 'street', label: '路街門牌' }, { key: 'receiver', label: '收件人' }, { key: 'tel', label: '收件電話' }
      ] }
    ];
  }
  function pFinance() {
    return [
      { key: 'taxId', label: '統一編號', type: 'text', hint: '有統編才能開三聯發票。' },
      { key: 'payTerm', label: '國內付款條件', type: 'select', req: true, options: [{ value: 'PREPAY', label: 'PREPAY 預付' }, { value: 'NET30', label: 'NET30 月結30' }, { value: 'NET60', label: 'NET60 月結60' }, { value: 'NET90', label: 'NET90 月結90' }], placeholder: '請選擇' },
      { key: 'importPayTerm', label: '進口付款條件', type: 'select', options: [{ value: 'TT', label: 'TT 電匯' }, { value: 'LC', label: 'LC 信用狀' }, { value: 'DP', label: 'DP 付款交單' }, { value: 'DA', label: 'DA 承兌交單' }], placeholder: '（無）' },
      { key: 'tradeTerm', label: '貿易條件', type: 'select', options: ['CIF', 'FOB', 'EXW'], placeholder: '（無）' },
      { key: 'currency', label: '預設幣別', type: 'select', options: function () { return DB.dict.currencies || [{ value: 'TWD', label: 'TWD 新台幣' }, { value: 'USD', label: 'USD 美金' }]; }, placeholder: 'TWD' },
      { key: 'invoiceCopies', label: '預設發票聯數', type: 'select', options: [{ value: '0', label: '0 不開發票' }, { value: '2', label: '二聯' }, { value: '3', label: '三聯' }], placeholder: '請選擇' },
      { key: 'suppGrade', label: '供應商分級', type: 'select', options: function () { return DB.suppGrades; }, placeholder: '請選擇' },
      { key: 'recalcGrade', label: '分級重算', type: 'action', btn: '依付款條件重算分級', icon: 'refresh', action: 'recalcGrade', onClick: function (p) {
        var map = { NET90: 'A', NET60: 'B', NET30: 'C', PREPAY: 'D' }; var g = map[p.payTerm];
        if (!g) return '此付款條件無對應分級，請手動選擇';
        p.suppGrade = g; return '已依付款條件（' + p.payTerm + '）重算供應商分級為 ' + g + ' 級';
      }, hint: '付款條件越好（月結越長）評等越高：NET90→A、NET60→B、NET30→C、PREPAY→D。' }
    ];
  }
  CFG.partner = {
    id: 'partner', title: '往來對象基本資料', kind: 'subtable',
    data: function () { return DB.partners; },
    status: function (p) { return p.active; },
    titleOf: function (p) { return p.name; },
    entries: [
      { key: 'all', label: '全部', test: function () { return true; } },
      { key: 'C', label: '保養廠', test: function (p) { return p.type === 'C'; } },
      { key: 'O', label: '同行', test: function (p) { return p.type === 'O'; } },
      { key: 'S', label: '供應商', test: function (p) { return p.type === 'S'; } },
      { key: 'T', label: '外包物流', test: function (p) { return p.type === 'T'; } },
      { key: 'V', label: '一般廠商', test: function (p) { return p.type === 'V'; } },
      { key: 'B', label: '銀行', test: function (p) { return p.type === 'B'; } }
    ],
    tabsFor: function (rec) {
      var t = rec && rec.type;
      var basic = { label: '基本資料', fields: pBasic() };
      if (!t) return [basic];
      if (t === 'C' || t === 'O') return [basic, { label: '銷貨', fields: pSales() }, { label: '出貨', fields: pShip() }, { label: '財務', fields: pFinance() }];
      if (t === 'S') return [basic, { label: '出貨', fields: pShip() }, { label: '財務', fields: pFinance() }];
      if (t === 'T') return [basic, { label: '出貨', fields: pShip() }];
      return [basic, { label: '財務', fields: pFinance() }]; // V / B
    },
    newRecord: function () { return { id: 'P' + Date.now(), code: '', type: '', name: '', active: true, contacts: [], addresses: [] }; },
    columns: [
      { label: '公司代碼', get: function (p) { return mono(p.code); }, text: function (p) { return p.code; } },
      { label: '公司全名', get: function (p) { return '<b>' + p.name + '</b>'; }, text: function (p) { return p.name + ' ' + (p.shortName || ''); } },
      { label: '類型', get: function (p) { return tag(ptypes[p.type] || ''); }, text: function (p) { return ptypes[p.type] || ''; } },
      { label: '主要聯絡人', get: function (p) { return sub(p.contact); }, text: function (p) { return p.contact || ''; } },
      { label: '電話', get: function (p) { return sub(p.phone); }, text: function (p) { return p.phone || ''; } },
      { label: '狀態', get: function (p) { return statusChip(p.active); }, text: function (p) { return p.active ? '啟用' : '停用'; } }
    ]
  };

  /* ============ 客戶分級基本資料 ============ */
  CFG.custgrade = {
    id: 'custgrade', title: '客戶分級基本資料', kind: 'builtin',
    data: function () { return DB.custGrades; },
    status: function (g) { return g.active; },
    titleOf: function (g) { return g.name; }, subOf: function (g) { return g.code; },
    columns: [
      { label: '分級代碼', get: function (g) { return mono(g.code); }, text: function (g) { return g.code; } },
      { label: '分級名稱', get: function (g) { return '<b>' + g.name + '</b>'; }, text: function (g) { return g.name; } },
      { label: '加成率(%)', get: function (g) { return sub(g.markup + '%'); }, text: function () { return ''; } },
      { label: '狀態', get: function (g) { return statusChip(g.active); }, text: function (g) { return g.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '客戶分級', fields: [
      { key: 'code', label: '分級代碼', type: 'text', ro: true, hint: 'A／B／C／D（系統內建，不可新增）。' },
      { key: 'name', label: '分級名稱', type: 'text', req: true },
      { key: 'markup', label: '加成率(%)', type: 'text', hint: '這一級套用的加成率（決定售價）。' },
      { key: 'sort', label: '排序', type: 'text' }
    ]}]
  };

  /* ============ 供應商分級基本資料 ============ */
  CFG.suppgrade = {
    id: 'suppgrade', title: '供應商分級基本資料', kind: 'semi',
    data: function () { return DB.suppGrades; },
    status: function (g) { return g.active; },
    titleOf: function (g) { return g.name; }, subOf: function (g) { return g.code; },
    newRecord: function () { return { id: 'SG' + Date.now(), code: '', name: '', desc: '', sort: 0, active: true, builtin: false }; },
    columns: [
      { label: '分級代碼', get: function (g) { return mono(g.code); }, text: function (g) { return g.code; } },
      { label: '分級名稱', get: function (g) { return '<b>' + g.name + '</b>'; }, text: function (g) { return g.name; } },
      { label: '類型', get: function (g) { return g.builtin ? '<span class="nx-tag">內建</span>' : '<span class="nx-chip on">自訂</span>'; }, text: function () { return ''; } },
      { label: '說明', get: function (g) { return sub(g.desc); }, text: function (g) { return g.desc || ''; } },
      { label: '狀態', get: function (g) { return statusChip(g.active); }, text: function (g) { return g.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '供應商分級', fields: [
      { key: 'code', label: '分級代碼', type: 'text', req: true, ro: true, hint: '內建 A～D 鎖定；可新增自訂等級（如 VIP）。' },
      { key: 'name', label: '分級名稱', type: 'text', req: true },
      { key: 'desc', label: '說明', type: 'textarea', full: true },
      { key: 'sort', label: '排序', type: 'text' }
    ]}]
  };

  /* ============ 地區基本資料 ============ */
  CFG.region = {
    id: 'region', title: '地區基本資料', kind: 'table',
    data: function () { return DB.regionList; },
    status: function (r) { return r.active; },
    titleOf: function (r) { return r.name; }, subOf: function (r) { return r.code; },
    newRecord: function () { return { id: 'RG' + Date.now(), code: '', name: '', sort: 0, active: true }; },
    columns: [
      { label: '地區代碼', get: function (r) { return mono(r.code); }, text: function (r) { return r.code; } },
      { label: '地區名稱', get: function (r) { return '<b>' + r.name + '</b>'; }, text: function (r) { return r.name; } },
      { label: '排序', get: function (r) { return sub(r.sort); }, text: function () { return ''; } },
      { label: '狀態', get: function (r) { return statusChip(r.active); }, text: function (r) { return r.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '地區', fields: [
      { key: 'code', label: '地區代碼', type: 'text', req: true, ro: true, hint: '自動轉大寫，建立後鎖定。' },
      { key: 'name', label: '地區名稱', type: 'text', req: true, placeholder: '例如 北部' },
      { key: 'sort', label: '排序', type: 'text', placeholder: '0' }
    ]}]
  };

  /* ============ 國家基本資料 ============ */
  CFG.country = {
    id: 'country', title: '國家基本資料', kind: 'table',
    data: function () { return DB.countryList; },
    status: function (c) { return c.active; },
    titleOf: function (c) { return c.name; }, subOf: function (c) { return c.code; },
    newRecord: function () { return { id: 'CT' + Date.now(), code: '', name: '', sort: 0, active: true }; },
    columns: [
      { label: '國家代碼', get: function (c) { return mono(c.code); }, text: function (c) { return c.code; } },
      { label: '國家名稱', get: function (c) { return '<b>' + c.name + '</b>'; }, text: function (c) { return c.name; } },
      { label: '排序', get: function (c) { return sub(c.sort); }, text: function () { return ''; } },
      { label: '狀態', get: function (c) { return statusChip(c.active); }, text: function (c) { return c.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '國家', fields: [
      { key: 'code', label: '國家代碼', type: 'text', req: true, ro: true, hint: '自動轉大寫，例如 TW。建立後鎖定。' },
      { key: 'name', label: '國家名稱', type: 'text', req: true, placeholder: '例如 台灣' },
      { key: 'sort', label: '排序', type: 'text', placeholder: '0' }
    ]}]
  };

  /* ============ 幣別基本資料 ============ */
  CFG.currency = {
    id: 'currency', title: '幣別基本資料', kind: 'table',
    data: function () { return DB.currencyList; },
    status: function (c) { return c.active; },
    titleOf: function (c) { return c.name; }, subOf: function (c) { return c.code; },
    newRecord: function () { return { id: 'CU' + Date.now(), code: '', name: '', symbol: '', decimals: 2, sort: 0, active: true }; },
    columns: [
      { label: '幣別代碼', get: function (c) { return mono(c.code); }, text: function (c) { return c.code; } },
      { label: '幣別名稱', get: function (c) { return '<b>' + c.name + '</b>'; }, text: function (c) { return c.name; } },
      { label: '符號', get: function (c) { return sub(c.symbol); }, text: function () { return ''; } },
      { label: '小數位', get: function (c) { return sub(c.decimals); }, text: function () { return ''; } },
      { label: '狀態', get: function (c) { return statusChip(c.active); }, text: function (c) { return c.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '幣別', fields: [
      { key: 'code', label: '幣別代碼', type: 'text', req: true, ro: true, hint: '例如 TWD、USD。建立後鎖定。' },
      { key: 'name', label: '幣別名稱', type: 'text', req: true, placeholder: '例如 新台幣' },
      { key: 'symbol', label: '幣別符號', type: 'text', placeholder: 'NT$' },
      { key: 'decimals', label: '小數位數', type: 'text', placeholder: '2' },
      { key: 'sort', label: '排序', type: 'text', placeholder: '0' }
    ]}]
  };

  /* ============ 注音字典基本資料 ============ */
  CFG.zhuyin = {
    id: 'zhuyin', title: '注音字典基本資料', kind: 'table',
    data: function () { return DB.zhuyinList; },
    status: function (z) { return z.active; },
    titleOf: function (z) { return z.char; }, subOf: function (z) { return z.zhuyin; },
    newRecord: function () { return { id: 'ZY' + Date.now(), char: '', zhuyin: '', initial: '', active: true }; },
    search: function (z, q) { return (z.char + ' ' + z.zhuyin + ' ' + z.initial).indexOf(q) >= 0; },
    columns: [
      { label: '字', get: function (z) { return '<b style="font-size:15px">' + z.char + '</b>'; }, text: function (z) { return z.char; } },
      { label: '主注音', get: function (z) { return '<span class="mono">' + z.zhuyin + '</span>'; }, text: function (z) { return z.zhuyin; } },
      { label: '主聲母', get: function (z) { return tag(z.initial); }, text: function (z) { return z.initial; } },
      { label: '狀態', get: function (z) { return statusChip(z.active); }, text: function (z) { return z.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '注音字', fields: [
      { key: 'char', label: '字', type: 'text', req: true, hint: '單一中文字。' },
      { key: 'zhuyin', label: '主注音', type: 'text', req: true, placeholder: 'ㄔㄣˊ' },
      { key: 'initial', label: '主聲母', type: 'text', req: true, placeholder: 'ㄔ（快搜比對用）' }
    ]}]
  };

  /* ============ 零件基本資料 ============ */
  var srcBrands = function () { return DB.brands.filter(function (b) { return b.active && b.isPart; }).map(function (b) { return { value: b.id, label: b.name + '（' + b.eng + '）' }; }); };
  var srcPartGroups = function () { return DB.partGroups.filter(function (g) { return g.active; }); };
  CFG.part = {
    id: 'part', title: '零件基本資料', kind: 'mtab',
    data: function () { return DB.parts; },
    status: function (p) { return p.active; },
    titleOf: function (p) { return p.name; },
    newRecord: function () { return { id: 'P' + Date.now(), code: '', name: '', unit: 'pcs', active: true, genuine: true }; },
    columns: [
      { label: '零件料號', get: function (p) { return mono(p.code); }, text: function (p) { return p.code + ' ' + (p.oldPn || ''); } },
      { label: '品名', get: function (p) { return '<b>' + p.name + '</b>'; }, text: function (p) { return p.name; } },
      { label: '品牌', get: function (p) { var b = DB.byId(DB.brands, p.brand); return sub(b ? b.name : ''); }, text: function (p) { var b = DB.byId(DB.brands, p.brand); return b ? b.name : ''; } },
      { label: '族群', get: function (p) { var g = DB.byId(DB.partGroups, p.group); return tag(g ? g.name : ''); }, text: function (p) { var g = DB.byId(DB.partGroups, p.group); return g ? g.name : ''; } },
      { label: '正廠', get: function (p) { return p.genuine ? '<span class="nx-chip on">正廠</span>' : '<span class="nx-chip off">副廠</span>'; }, text: function () { return ''; } },
      { label: '狀態', get: function (p) { return statusChip(p.active); }, text: function (p) { return p.active ? '啟用' : '停用'; } }
    ],
    tabs: [
      { label: '基本資料', aside: 'photos', fields: [
        { type: 'section', label: '料號（四層編碼）' },
        { key: 'code', label: '零件料號', type: 'text', req: true, ro: true, hint: '對外主料號（B）。沒套件時留空自動帶舊料號（C）並查重；建立後鎖定。' },
        { key: 'name', label: '品名', type: 'text', req: true },
        { key: 'brandPn', label: '廠牌料號', type: 'text', hint: '該廠牌對此料件的料號（對照查詢）。' },
        { key: 'oldPn', label: '舊料號', type: 'text', hint: '客戶舊系統料號；新增時料號留空會帶此值。' },
        { type: 'section', label: '分類' },
        { key: 'genuine', label: '正廠件', type: 'switch', hint: '開＝正廠件／關＝副廠件' },
        { key: 'brand', label: '零件品牌', type: 'select', options: srcBrands, placeholder: '請選擇' },
        { key: 'group', label: '零件族群', type: 'select', options: srcPartGroups, placeholder: '請選擇' },
        { key: 'ptype', label: '零件類型', type: 'select', options: ['專用件', '通用件', '組合件', '拆解件'], placeholder: '請選擇' },
        { key: 'origin', label: '產地', type: 'select', options: srcCountries, placeholder: '請選擇', hint: '實際生產國，與品牌國別不同。' },
        { key: 'unit', label: '單位', type: 'text', req: true, placeholder: 'pcs' },
        { key: 'spec', label: '規格／備註', type: 'textarea', full: true },
        { type: 'section', label: '正廠料號對應（副廠件對照原廠料號）' },
        { key: 'oemRefs', label: '正廠料號對應', type: 'subtable', addLabel: '對應', cols: [
          { key: 'brand', label: '品牌', type: 'select', options: srcBrands, placeholder: '選品牌' },
          { key: 'oemPn', label: '正廠料號', placeholder: '原廠料號' }
        ] },
        { type: 'section', label: '改號關聯（料號改號前後對照）' },
        { key: 'renumber', label: '改號關聯', type: 'subtable', addLabel: '關聯', cols: [
          { key: 'date', label: '變更日期', type: 'date' },
          { key: 'oldPn', label: '舊料號' },
          { key: 'newPn', label: '新料號' },
          { key: 'reason', label: '原因' }
        ] }
      ]},
      { label: '銷貨', fields: [
        { type: 'section', label: '四級售價（依客戶分級自動帶價）' },
        { key: 'priceA', label: 'A 級售價', type: 'text' }, { key: 'priceB', label: 'B 級售價', type: 'text' },
        { key: 'priceC', label: 'C 級售價', type: 'text' }, { key: 'priceD', label: 'D 級售價', type: 'text' },
        { key: 'recalcPrice', label: '售價重算', type: 'action', btn: '依成本重算售價', icon: 'refresh', action: 'recalcPrice', onClick: function (p) {
          var cost = +p.cost || 0, map = { A: 'priceA', B: 'priceB', C: 'priceC', D: 'priceD' };
          DB.custGrades.forEach(function (g) { p[map[g.code]] = cost ? Math.round(cost * (1 + (+g.markup || 0) / 100)) : ''; });
          return cost ? '已依進貨成本 ' + cost + ' × 各分級加成率重算四級售價' : '請先在採購分頁填進貨成本';
        }, hint: '以「進貨成本 × 各分級加成率」自動算 A／B／C／D 四級售價，仍可手動微調。' },
        { label: '售價更新時間', type: 'text', ro: true, get: function () { return '2026-06-08 11:20'; } },
        { label: '最後銷售時間', type: 'text', ro: true, get: function () { return '2026-06-11'; }, hint: '搭配最後進貨時間可抓呆滯料。' }
      ]},
      { label: '採購', fields: [
        { key: 'cost', label: '進貨成本', type: 'text', hint: '由採購填，是「依成本重算」售價的基準。' },
        { label: '最後進貨時間', type: 'text', ro: true, get: function () { return '2026-05-28'; } }
      ]},
      { label: '庫存', fields: [
        { key: 'returnPolicy', label: '退貨政策', type: 'select', req: true, options: [{ value: 'F', label: 'F 廠保' }, { value: 'S', label: 'S 自保' }, { value: 'R', label: 'R 整新' }, { value: 'N', label: 'N 不退' }, { value: 'W', label: 'W 保固' }], placeholder: '請選擇' },
        { key: 'warranty', label: '保固月數', type: 'text', req: true, placeholder: '0＝不保固' },
        { key: 'shelfLife', label: '建議保存期限(月)', type: 'text', hint: '新增時自動繼承族群預設，可覆寫。' },
        { type: 'section', label: '庫存水位' },
        { key: 'safeQty', label: '安全量', type: 'text', hint: '低於即補貨（低庫存警報）。' },
        { key: 'maxQty', label: '最高量', type: 'text', hint: '提醒避免囤貨。' }
      ]}
    ]
  };

  /* ============ 廠牌基本資料 ============ */
  CFG.brand = {
    id: 'brand', title: '廠牌基本資料', kind: 'table',
    data: function () { return DB.brands; },
    status: function (b) { return b.active; },
    titleOf: function (b) { return b.name; }, subOf: function (b) { return b.code; },
    newRecord: function () { return { id: 'BR' + Date.now(), code: '', name: '', eng: '', isCar: false, isPart: true, sort: 0, active: true }; },
    columns: [
      { label: '品牌代碼', get: function (b) { return mono(b.code); }, text: function (b) { return b.code; } },
      { label: '品牌名稱', get: function (b) { return '<b>' + b.name + '</b>'; }, text: function (b) { return b.name + ' ' + (b.eng || ''); } },
      { label: '英文', get: function (b) { return sub(b.eng); }, text: function (b) { return b.eng || ''; } },
      { label: '國別', get: function (b) { var c = DB.byId(DB.countryList, b.country); return sub(c ? c.name : ''); }, text: function () { return ''; } },
      { label: '屬性', get: function (b) { return (b.isCar ? '<span class="nx-tag">車廠</span> ' : '') + (b.isPart ? '<span class="nx-tag">零件</span>' : ''); }, text: function () { return ''; } },
      { label: '狀態', get: function (b) { return statusChip(b.active); }, text: function (b) { return b.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '廠牌', fields: [
      { key: 'code', label: '品牌代碼', type: 'text', req: true, ro: true, hint: '固定三碼、自動轉大寫（例如 BSH）。建立後鎖定。' },
      { key: 'name', label: '品牌名稱', type: 'text', req: true },
      { key: 'eng', label: '英文名稱', type: 'text' },
      { key: 'country', label: '國別', type: 'select', options: function () { return DB.countryList; }, placeholder: '請選擇' },
      { key: 'isCar', label: '汽車品牌', type: 'switch', hint: '開＝車廠品牌（車型字典用）' },
      { key: 'isPart', label: '零件品牌', type: 'switch', hint: '開＝零件主檔品牌下拉會列出' },
      { key: 'sort', label: '排序', type: 'text' }
    ]}]
  };

  /* ============ 零件群組基本資料 ============ */
  CFG.partgroup = {
    id: 'partgroup', title: '零件群組基本資料', kind: 'table',
    data: function () { return DB.partGroups; },
    status: function (g) { return g.active; },
    titleOf: function (g) { return g.name; }, subOf: function (g) { return g.code; },
    newRecord: function () { return { id: 'PG' + Date.now(), code: '', name: '', shelfLife: 0, sort: 0, active: true }; },
    columns: [
      { label: '族群代碼', get: function (g) { return mono(g.code); }, text: function (g) { return g.code; } },
      { label: '族群名稱', get: function (g) { return '<b>' + g.name + '</b>'; }, text: function (g) { return g.name; } },
      { label: '預設保存期限', get: function (g) { return sub(g.shelfLife ? g.shelfLife + ' 月' : '無'); }, text: function () { return ''; } },
      { label: '狀態', get: function (g) { return statusChip(g.active); }, text: function (g) { return g.active ? '啟用' : '停用'; } }
    ],
    tabs: [{ label: '零件群組', fields: [
      { key: 'code', label: '族群代碼', type: 'text', req: true, ro: true, hint: '自動轉大寫，建立後鎖定。' },
      { key: 'name', label: '族群名稱', type: 'text', req: true },
      { key: 'shelfLife', label: '預設建議保存期限(月)', type: 'text', hint: '有保存期限考量的族群填預設值（電瓶、油品），新增該族群零件自動帶入；無則留空。' },
      { key: 'sort', label: '排序', type: 'text' }
    ]}]
  };

  /* ============ 通用件群組 / 供應商供貨對應（群組批次）============ */
  var srcPartsOpt = function () { return DB.parts.map(function (p) { return { value: p.id, label: p.code + ' ' + p.name }; }); };
  CFG.univgroup = {
    id: 'univgroup', title: '通用件群組基本資料', kind: 'batch',
    batch: {
      leftTitle: '通用件群組',
      leftData: function () { return DB.univGroups; },
      leftCode: function (g) { return g.code; }, leftName: function (g) { return g.name; }, leftStatus: function (g) { return g.active; },
      leftAddable: true, leftNew: function () { return { id: 'U' + Date.now(), code: '', name: '', note: '', members: [], sort: 0, active: true }; },
      rightTitle: function (g) { return g.name + ' · 成員'; },
      rightItems: function (g) { return (g.members || (g.members = [])); },
      rightNew: function () { return { partId: '', role: '替代品', price: '', twoWay: false }; },
      rightCols: [
        { key: 'partId', label: '零件', type: 'select', options: srcPartsOpt, placeholder: '選零件', width: 220 },
        { key: 'role', label: '角色', type: 'select', options: ['主件', '替代品'] },
        { key: 'price', label: '專屬售價', placeholder: '留空用本身售價' },
        { key: 'twoWay', label: '雙向替代', type: 'switch' }
      ]
    }
  };
  CFG.supplymap = {
    id: 'supplymap', title: '供應商供貨對應基本資料', kind: 'batch',
    batch: {
      leftTitle: '供應商',
      leftData: function () { return DB.partners.filter(function (p) { return p.active && p.type === 'S'; }); },
      leftCode: function (s) { return s.code; }, leftName: function (s) { return s.name; }, leftStatus: function (s) { return s.active; },
      leftAddable: false,
      rightTitle: function (s) { return s.name + ' · 供貨料件'; },
      rightItems: function (s) { return (DB.supplyMap[s.id] || (DB.supplyMap[s.id] = [])); },
      rightNew: function () { return { partId: '', vendorPn: '', price: '', lead: '', moq: '', primary: false, from: '手動', start: '' }; },
      rightCols: [
        { key: 'partId', label: '料件', type: 'select', options: srcPartsOpt, placeholder: '選料件', width: 220 },
        { key: 'vendorPn', label: '廠商料號' },
        { key: 'price', label: '預設單價' },
        { key: 'lead', label: '交期(天)' },
        { key: 'moq', label: 'MOQ' },
        { key: 'primary', label: '主要', type: 'switch' }
      ],
      importable: true,
      importFilters: [
        { key: 'brand', label: '品牌', options: srcBrands },
        { key: 'group', label: '零件群組', options: srcPartGroups },
        { key: 'origin', label: '產地', options: srcCountries }
      ],
      importMatch: function (p, f) { return (!f.brand || p.brand === f.brand) && (!f.group || p.group === f.group) && (!f.origin || p.origin === f.origin); },
      importAdd: function (left, parts) {
        var arr = DB.supplyMap[left.id] || (DB.supplyMap[left.id] = []); var n = 0;
        parts.forEach(function (p) { if (!arr.some(function (r) { return r.partId === p.id; })) { arr.push({ partId: p.id, vendorPn: '', price: p.cost, lead: '', moq: '', primary: false, from: '手動', start: '' }); n++; } });
        return n;
      }
    }
  };

  window.NX_PAGE_CONFIGS = CFG;
})();
