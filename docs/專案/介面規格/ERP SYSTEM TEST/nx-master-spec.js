// NEXORA GRID — 核心主檔｜六大分區導覽樹（規格 NX01 v3.6）
// 三層導覽：主檔 → 六大分區 → 各主檔頁。每個分區 = {key,label,icon,sub:[pages]}，
// 每頁 = {label, icon, page:'pageId', kind:'table|assign|matrix|batch'}。
// 此檔在 Dock 建立前把「主檔」模組（含六分區與所屬頁）補進全域 NX_NAV。
(function () {
  'use strict';

  // ---- 圖示（svg 內容；ic() 會包外層 <svg>）----
  Object.assign(window.NX_ICONS = window.NX_ICONS || {}, {
    boxes: '<path d="M2.97 7.5 12 12l9.03-4.5M12 12v9.5M3 7.2v9.6l9 4.7 9-4.7V7.2L12 2.5 3 7.2Z"/>',
    d_org: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    d_perm: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    d_site: '<path d="M3 21V9l9-6 9 6v12M3 21h18M9 21v-6h6v6"/>',
    d_partner: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.2"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.2a4 4 0 0 1 0 7.6"/>',
    d_product: '<path d="M21 8 12 3 3 8v8l9 5 9-5ZM3 8l9 5 9-5M12 13v8"/>',
    d_dict: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    p_emp: '<circle cx="12" cy="8" r="4"/><path d="M5.5 21a7 7 0 0 1 13 0"/>',
    p_role: '<path d="M20 7h-9M14 17H5M17 3 21 7l-4 4M7 13l-4 4 4 4"/>',
    p_dept: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01"/>',
    p_group: '<circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M2 20a5 5 0 0 1 10 0M12 20a5 5 0 0 1 10 0"/>',
    p_chart: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M12 12H6v4M12 12h6v4"/>',
    p_matrix: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    p_sitebase: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    p_wh: '<path d="M22 8 12 3 2 8v12h20V8ZM6 20v-7h12v7"/>',
    p_bin: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    p_partner: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
    p_grade: '<path d="m12 2 2.9 6 6.6.5-5 4.3 1.6 6.4L12 16.9 5.9 19.2 7.5 12.8 2.5 8.5 9.1 8 12 2Z"/>',
    p_supply: '<path d="M10 17h4V5H2v12h2M14 9h4l3 3v5h-3"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="17.5" cy="17.5" r="1.6"/>',
    p_part: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    p_brand: '<path d="m20.6 13.4-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7" cy="7" r="1.4"/>',
    p_pgroup: '<path d="M3 7h18M3 12h18M3 17h18"/><circle cx="6" cy="7" r="0"/>',
    p_univ: '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><path d="M9 12h6"/>',
    p_region: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20"/>',
    p_country: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/>',
    p_currency: '<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 0 1 6 0c0 1.5-1 2-3 2.5-2 .5-3 1-3 2.5a3 3 0 0 0 6 0M12 6v1.5M12 16.5V18"/>',
    p_zhuyin: '<path d="M4 7V5h16v2M9 5v14M7 19h4"/>'
  });

  // ---- 主檔模組（六大分區，順序依規格 v3.6）----
  var master = {
    key: 'master', label: '主檔', icon: 'boxes', sub: [
      { key: 'org', label: '組織架構', icon: 'd_org', sub: [
        { label: '員工基本資料', icon: 'p_emp', page: 'emp', kind: 'table' },
        { label: '職務基本資料', icon: 'p_role', page: 'role', kind: 'table' },
        { label: '部門基本資料', icon: 'p_dept', page: 'dept', kind: 'table' },
        { label: '組別基本資料', icon: 'p_group', page: 'group', kind: 'table' }
      ]},
      { key: 'perm', label: '權限管理', icon: 'd_perm', sub: [
        { label: '組織架構圖', icon: 'p_chart', page: 'orgchart', kind: 'assign' },
        { label: '職務權限設定', icon: 'p_matrix', page: 'permmatrix', kind: 'matrix' }
      ]},
      { key: 'site', label: '據點倉庫', icon: 'd_site', sub: [
        { label: '據點架構圖', icon: 'p_chart', page: 'sitechart', kind: 'assign' },
        { label: '據點基本資料', icon: 'p_sitebase', page: 'sitebase', kind: 'table' },
        { label: '倉庫基本資料', icon: 'p_wh', page: 'warehouse', kind: 'table' },
        { label: '庫位基本資料', icon: 'p_bin', page: 'bin', kind: 'table' }
      ]},
      { key: 'partner', label: '往來對象', icon: 'd_partner', sub: [
        { label: '往來對象基本資料', icon: 'p_partner', page: 'partner', kind: 'table' },
        { label: '客戶分級基本資料', icon: 'p_grade', page: 'custgrade', kind: 'table' },
        { label: '供應商分級基本資料', icon: 'p_grade', page: 'suppgrade', kind: 'table' },
        { label: '供應商供貨對應基本資料', icon: 'p_supply', page: 'supplymap', kind: 'batch' }
      ]},
      { key: 'product', label: '產品與廠牌', icon: 'd_product', sub: [
        { label: '零件基本資料', icon: 'p_part', page: 'part', kind: 'table' },
        { label: '廠牌基本資料', icon: 'p_brand', page: 'brand', kind: 'table' },
        { label: '零件群組基本資料', icon: 'p_pgroup', page: 'partgroup', kind: 'table' },
        { label: '通用件群組基本資料', icon: 'p_univ', page: 'univgroup', kind: 'batch' }
      ]},
      { key: 'dict', label: '字典主檔', icon: 'd_dict', sub: [
        { label: '地區基本資料', icon: 'p_region', page: 'region', kind: 'table' },
        { label: '國家基本資料', icon: 'p_country', page: 'country', kind: 'table' },
        { label: '幣別基本資料', icon: 'p_currency', page: 'currency', kind: 'table' },
        { label: '注音字典基本資料', icon: 'p_zhuyin', page: 'zhuyin', kind: 'table' }
      ]}
    ]
  };

  // 頁面 → 分區 對照（路由與麵包屑用）
  var pageIndex = {};
  master.sub.forEach(function (div) {
    (div.sub || []).forEach(function (pg) {
      pageIndex[pg.page] = { divKey: div.key, divLabel: div.label, label: pg.label, kind: pg.kind, icon: pg.icon };
    });
  });
  window.NX_MASTER = { tree: master, pageIndex: pageIndex };

  if (Array.isArray(window.NX_NAV) && !window.NX_NAV.some(function (m) { return m.key === 'master'; })) {
    var i = window.NX_NAV.findIndex(function (m) { return m.key === 'personal'; });
    window.NX_NAV.splice(i >= 0 ? i + 1 : 2, 0, master);
  }
})();
