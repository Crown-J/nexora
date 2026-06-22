// NEXORA GRID — 進貨模組｜DOCK 導覽註冊（NX02，規格 02 進貨 v3.1）
// 比照核心主檔：在 NX_NAV 的「主檔」之後插入「進貨」模組，底下直接掛七項作業。
// 七項作業：缺貨簿／詢價採購作業／國內進退貨作業／國外進退貨作業／保固申請作業／產品管理／供應商管理。
(function () {
  'use strict';

  Object.assign(window.NX_ICONS = window.NX_ICONS || {}, {
    purchase: '<path d="M3 3h2l.4 2M7 13h10l3-7H6.4M7 13 5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17M9 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm9 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>',
    pu_short: '<path d="M3 3v18h18"/><path d="m7 14 3-4 4 3 5-7"/><path d="M19 11V6h-5"/>',
    pu_inquiry: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M11 8v3l2 1"/>',
    pu_rfq: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M11 8v3l2 1"/>',
    pu_po: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 14l2 2 4-4"/>',
    pu_return: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>',
    pu_domestic: '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/><path d="m9.5 11 1.5 1.5L14 9.5"/>',
    pu_foreign: '<path d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/>',
    pu_warranty: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    pu_product: '<path d="M21 8 12 3 3 8v8l9 5 9-5ZM3 8l9 5 9-5M12 13v8"/><path d="m7.5 5.5 9 5"/>',
    pu_supplier: '<path d="M10 17h4V5H2v12h2M14 9h4l3 3v5h-3"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="17.5" cy="17.5" r="1.6"/>'
  });

  var purchase = {
    key: 'purchase', label: '進貨', icon: 'purchase', sub: [
      { label: '缺貨簿', icon: 'pu_short', page: 'pur_shortage' },
      { label: '詢價作業', icon: 'pu_rfq', page: 'pur_rfq' },
      { label: '採購作業', icon: 'pu_po', page: 'pur_po' },
      { label: '國內進貨作業', icon: 'pu_domestic', page: 'pur_domestic' },
      { label: '國外進貨作業', icon: 'pu_foreign', page: 'pur_foreign' },
      { label: '進貨退回作業', icon: 'pu_return', page: 'pur_return' },
      { label: '保固申請作業', icon: 'pu_warranty', page: 'pur_warranty' },
      { label: '產品管理', icon: 'pu_product', page: 'pur_product' },
      { label: '供應商管理', icon: 'pu_supplier', page: 'pur_supplier' }
    ]
  };

  window.NX_PURCHASE = { tree: purchase };

  // 既有 NX_NAV 內已有一個 key='purchase' 的佔位「採購」（採購需求/詢價單/採購單…字串子項）。
  // 用真正的「進貨」模組（七項作業）就地取代它；若不存在則插在「主檔」之後。
  if (Array.isArray(window.NX_NAV)) {
    var idx = window.NX_NAV.findIndex(function (m) { return m.key === 'purchase'; });
    if (idx >= 0) {
      window.NX_NAV[idx] = purchase;
    } else {
      var mi = window.NX_NAV.findIndex(function (m) { return m.key === 'master'; });
      window.NX_NAV.splice(mi >= 0 ? mi + 1 : 3, 0, purchase);
    }
  }
})();
