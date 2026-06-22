// NEXORA GRID — 進貨模組｜假資料（NX02，沿用核心主檔 NXDB 的零件／供應商長出單據）
// 單據底層綁零件內碼（partId）與供應商內碼（supplierId）；對外只露單號與業務中文名。
// 價格鏈：採購成本→公司定價（利潤率雙向換算、空值吃系統、有值凍結、凍結品成本變動提醒）。
(function () {
  'use strict';
  var DB = window.NXDB;
  if (!DB) return;

  /* ============ 系統參數 ============ */
  DB.purSettings = { defaultMargin: 30, costAlertPct: 10 }; // 全公司預設利潤率 30%、成本變動提醒門檻 10%

  /* ============ 補一筆國內供應商（驅動國內流程）============ */
  if (!DB.byId(DB.partners, 'S0003')) {
    DB.partners.push({
      id: 'S0003', code: 'S0003', type: 'S', name: '順億汽車材料', shortName: '順億', eng: 'Shun-Yi Auto Parts',
      contact: '劉副理', phone: '04-2533-7788', mobile: '0931-220-330', region: 'C', country: 'TW',
      suppGrade: 'B', payTerm: 'NET30', currency: 'TWD', defaultInWh: 'TXG-G', taxId: '78451200', active: true,
      contacts: [{ name: '劉副理', dept: '業務部', phone: '04-2533-7788', mobile: '0931-220-330', email: 'sales@shunyi.tw', note: '當日叫貨隔日到' }], addresses: []
    });
    DB.supplyMap.S0003 = [
      { partId: 'P0003', vendorPn: 'SY-DB1521', price: 690, lead: 2, moq: 4, primary: false, from: '手動', start: '2025-01-01' },
      { partId: 'P0004', vendorPn: 'SY-SC20', price: 188, lead: 1, moq: 20, primary: true, from: '手動', start: '2025-01-01' },
      { partId: 'P0006', vendorPn: 'SY-AR24', price: 118, lead: 1, moq: 30, primary: true, from: '手動', start: '2025-01-01' }
    ];
  }

  /* ============ 目前庫存（驅動缺貨簿燈號）============ */
  // 安全量在零件主檔；目前庫存掛這。低於安全量 → 自動入缺貨簿。
  var STOCK = { P0001: 8, P0002: 45, P0003: 0, P0004: 12, P0005: -3, P0006: 220, P0007: 0 };
  DB.stockOf = function (partId) { return STOCK[partId] != null ? STOCK[partId] : 0; };
  DB._stock = STOCK;

  /* ============ 價格鏈：利潤率 / 公司定價（雙向、空值吃系統、有值凍結）============ */
  // 在零件上掛採購視角欄位：purMargin（利潤率%）、companyPrice（公司定價）、costBaseline（設定價時的成本快照）
  // 兩欄皆空 → 自動（吃系統預設利潤率）；兩欄皆有值 → 凍結。
  var FROZEN = {
    // 凍結品：採購精心設定的定價；其中 P0005 成本已從 1300 漲到 1450（+11.5% 超門檻）→ 跳提醒
    P0001: { purMargin: 36, companyPrice: 354, costBaseline: 260 },           // 與系統算的 30% 不同，凍結
    P0005: { purMargin: 24, companyPrice: 1612, costBaseline: 1300 }          // 成本基準 1300，現成本 1450，+11.5%
  };
  Object.keys(FROZEN).forEach(function (pid) {
    var p = DB.byId(DB.parts, pid); if (p) { p.purMargin = FROZEN[pid].purMargin; p.companyPrice = FROZEN[pid].companyPrice; p.costBaseline = FROZEN[pid].costBaseline; }
  });
  // 計算價格鏈狀態
  DB.priceChain = function (p) {
    var cost = +p.cost || 0;
    var hasMargin = p.purMargin !== undefined && p.purMargin !== '' && p.purMargin !== null;
    var hasPrice = p.companyPrice !== undefined && p.companyPrice !== '' && p.companyPrice !== null;
    var frozen = hasMargin && hasPrice;
    var margin, price;
    if (frozen) { margin = +p.purMargin; price = +p.companyPrice; }
    else { margin = DB.purSettings.defaultMargin; price = cost ? Math.round(cost * (1 + margin / 100)) : 0; }
    // 凍結品成本變動提醒
    var changed = false, changePct = 0;
    if (frozen && p.costBaseline) {
      changePct = Math.round((cost - p.costBaseline) / p.costBaseline * 1000) / 10;
      changed = Math.abs(changePct) >= DB.purSettings.costAlertPct;
    }
    return { cost: cost, margin: margin, price: price, frozen: frozen, auto: !frozen, costChanged: changed, changePct: changePct, baseline: p.costBaseline || 0 };
  };

  /* ============ 缺貨簿（低於安全量自動列入；客訂註記）============ */
  // 客訂跨讀銷貨 NX04（此為假資料）
  var CUSTORDERS = {
    P0001: [{ so: 'SO-2026-0211', cust: '宏達汽車保養廠', qty: 6 }, { so: 'SO-2026-0205', cust: '永豐汽車修護廠', qty: 4 }],
    P0005: [{ so: 'SO-2026-0208', cust: '聯合汽材行', qty: 5 }]
  };
  DB.custOrdersOf = function (partId) { return CUSTORDERS[partId] || []; };
  // 缺貨列（衍生）：啟用零件、庫存 < 安全量。reqQty 預設＝建議數量。
  DB.shortageRows = function () {
    return DB.parts.filter(function (p) { return p.active && DB.stockOf(p.id) < (+p.safeQty || 0); })
      .map(function (p) {
        var stock = DB.stockOf(p.id), safe = +p.safeQty || 0, max = +p.maxQty || 0;
        var suggest = Math.max(0, (max || safe) - stock);
        if (!DB._reqQty) DB._reqQty = {};
        if (DB._reqQty[p.id] == null) DB._reqQty[p.id] = suggest;
        return { part: p, stock: stock, safe: safe, max: max, suggest: suggest, reqQty: DB._reqQty[p.id], custOrders: DB.custOrdersOf(p.id) };
      });
  };

  /* ============ 詢價單（v3.4 詢價作業；一張鎖單一供應商）============ */
  // status: open 待詢價 / sent 詢價中 / replied 已回覆
  DB.rfqList = [
    { id: 'RFQ-2026-0042', no: 'RFQ-2026-0042', supplierId: 'S0003', inWh: 'TXG-G', status: 'replied', date: '2026-06-12', by: 'Y0006', discount: 600,
      items: [{ partId: 'P0003', qty: 20, price: 690, currency: 'TWD', lead: 2 }, { partId: 'P0004', qty: 60, price: 188, currency: 'TWD', lead: 1 }] },
    { id: 'RFQ-2026-0043', no: 'RFQ-2026-0043', supplierId: 'S0001', inWh: 'TYC-M', status: 'sent', date: '2026-06-11', by: 'Y0006', discount: 0,
      items: [{ partId: 'P0003', qty: 20, price: '', currency: 'USD', lead: 21 }, { partId: 'P0001', qty: 40, price: '', currency: 'USD', lead: 14 }] },
    { id: 'RFQ-2026-0040', no: 'RFQ-2026-0040', supplierId: 'S0003', inWh: 'TXG-G', status: 'open', date: '2026-06-08', by: 'Y0006', discount: 0,
      items: [{ partId: 'P0006', qty: 200, price: '', currency: 'TWD', lead: 1 }] }
  ];
  DB.rfqOf = function (no) { return DB.rfqList.filter(function (r) { return r.no === no; })[0]; };
  DB.RFQ_STAGE = { open: 0, sent: 1, replied: 2 };
  DB.RFQ_STAGE_LABEL = ['待詢價', '詢價中', '已回覆'];
  DB.PO_STAGE = function (st) { return ({ draft: 0, pending: 1, approved: 2, sent: 2, confirmed: 2, partial: 2, received: 2, closed: 2, void: 2 })[st] || 0; };
  DB.PO_STAGE_LABEL = ['採購編輯', '採購審核', '採購確認'];
  // 換算台幣（外幣 × 匯率，預設 31.5）
  DB.toTwd = function (price, currency, rate) { return currency === 'TWD' ? +price || 0 : Math.round((+price || 0) * (rate || 31.5)); };
  DB.rfqSubtotal = function (rfq) { return rfq.items.reduce(function (s, li) { return s + DB.toTwd(li.price, li.currency) * (+li.qty || 0); }, 0); };
  DB.rfqTotal = function (rfq) { return Math.max(0, DB.rfqSubtotal(rfq) - (+rfq.discount || 0)); };

  /* ============ 採購單（國內外共用狀態機）============ */
  // status: draft 草稿 / pending 待核准 / approved 已核准 / sent 已寄廠商 / confirmed 廠商確認 /
  //         partial 部分驗收 / received 全部驗收 / closed 已結案 / void 作廢
  DB.poList = [
    { id: 'PO-2026-0118', no: 'PO-2026-0118', supplierId: 'S0003', status: 'draft', date: '2026-06-12', by: 'Y0006',
      payTerm: 'NET30', inWh: 'TXG-G', eta: '2026-06-15', currency: 'TWD', rate: 1,
      items: [{ partId: 'P0004', qty: 60, received: 0, cancelled: 0, price: 188, eta: '2026-06-15' },
              { partId: 'P0003', qty: 20, received: 0, cancelled: 0, price: 690, eta: '2026-06-16' }] },
    { id: 'PO-2026-0115', no: 'PO-2026-0115', supplierId: 'S0003', status: 'pending', date: '2026-06-11', by: 'Y0006',
      payTerm: 'NET30', inWh: 'TXG-G', eta: '2026-06-14', currency: 'TWD', rate: 1,
      items: [{ partId: 'P0006', qty: 200, received: 0, cancelled: 0, price: 118, eta: '2026-06-14' }] },
    { id: 'PO-2026-0112', no: 'PO-2026-0112', supplierId: 'S0001', status: 'approved', date: '2026-06-09', by: 'Y0006', approver: 'Y0005',
      payTerm: 'NET60', inWh: 'TYC-M', eta: '2026-06-28', currency: 'USD', rate: 31.5, tradeTerm: 'CIF', importPayTerm: 'TT',
      items: [{ partId: 'P0001', qty: 40, received: 0, cancelled: 0, price: 8.4, eta: '2026-06-28' }] },
    { id: 'PO-2026-0109', no: 'PO-2026-0109', supplierId: 'S0001', status: 'sent', date: '2026-06-06', by: 'Y0006', approver: 'Y0005',
      payTerm: 'NET60', inWh: 'TYC-M', eta: '2026-06-25', currency: 'USD', rate: 31.5, tradeTerm: 'CIF', importPayTerm: 'TT',
      items: [{ partId: 'P0005', qty: 12, received: 0, cancelled: 0, price: 46, eta: '2026-06-25' }] },
    { id: 'PO-2026-0105', no: 'PO-2026-0105', supplierId: 'S0003', status: 'confirmed', date: '2026-06-03', by: 'Y0006', approver: 'Y0005',
      payTerm: 'NET30', inWh: 'TXG-G', eta: '2026-06-09', currency: 'TWD', rate: 1,
      items: [{ partId: 'P0004', qty: 40, received: 0, cancelled: 0, price: 188, eta: '2026-06-09' }] },
    { id: 'PO-2026-0098', no: 'PO-2026-0098', supplierId: 'S0002', status: 'confirmed', date: '2026-05-22', by: 'Y0006', approver: 'Y0005',
      payTerm: 'NET90', inWh: 'TYC-M', eta: '2026-07-05', currency: 'USD', rate: 31.5, tradeTerm: 'FOB', importPayTerm: 'LC',
      items: [{ partId: 'P0007', qty: 300, received: 0, cancelled: 0, price: 2.7, eta: '2026-07-05' }] },
    { id: 'PO-2026-0090', no: 'PO-2026-0090', supplierId: 'S0003', status: 'partial', date: '2026-05-18', by: 'Y0006', approver: 'Y0005',
      payTerm: 'NET30', inWh: 'TXG-G', eta: '2026-05-21', currency: 'TWD', rate: 1,
      items: [{ partId: 'P0006', qty: 300, received: 180, cancelled: 0, price: 118, eta: '2026-05-21' }] },
    { id: 'PO-2026-0085', no: 'PO-2026-0085', supplierId: 'S0001', status: 'closed', date: '2026-05-10', by: 'Y0006', approver: 'Y0005',
      payTerm: 'NET60', inWh: 'TYC-M', eta: '2026-05-28', currency: 'USD', rate: 31.2, tradeTerm: 'CIF', importPayTerm: 'TT',
      items: [{ partId: 'P0001', qty: 50, received: 50, cancelled: 0, price: 8.3, eta: '2026-05-28' }] }
  ];

  /* ============ 進貨單（v3.4：驗收由庫存做、入帳由進貨做）============ */
  // 國內 status: wait 待到貨 / inspect 待驗收 / dispose 待處置 / done 已完成(入帳完成)
  // 國外 status: f_ship 待出貨 / f_pick 待提貨 / f_arr 待到貨 / f_inspect 待驗收 / f_dispose 待處置 / done
  DB.GRN_DOM_STAGE = { wait: 0, inspect: 1, dispose: 2, done: 3 };
  DB.GRN_DOM_LABEL = ['待到貨', '待驗收', '待處置', '已完成'];
  DB.GRN_FOR_STAGE = { f_ship: 0, f_pick: 1, f_arr: 2, f_inspect: 3, f_dispose: 4, done: 5 };
  DB.GRN_FOR_LABEL = ['待出貨', '待提貨', '待到貨', '待驗收', '待處置', '已完成'];
  DB.grnList = [
    { id: 'GRN-2026-0061', no: 'GRN-2026-0061', poNo: 'PO-2026-0105', supplierId: 'S0003', kind: 'domestic', status: 'wait',
      inWh: 'TXG-G', logistics: '', tracking: '', date: '2026-06-07',
      items: [{ partId: 'P0004', expectQty: 40, actualQty: 0, defectQty: 0, defectType: '', defectDesc: '', batchNo: '', inCost: 188 }] },
    { id: 'GRN-2026-0058', no: 'GRN-2026-0058', poNo: 'PO-2026-0090', supplierId: 'S0003', kind: 'domestic', status: 'inspect',
      inWh: 'TXG-G', logistics: '黑貓宅急便', tracking: 'BM-558210', date: '2026-05-20',
      items: [{ partId: 'P0006', expectQty: 120, actualQty: 0, defectQty: 0, defectType: '', defectDesc: '', batchNo: '', inCost: 118 }] },
    { id: 'GRN-2026-0055', no: 'GRN-2026-0055', poNo: 'PO-2026-0090', supplierId: 'S0003', kind: 'domestic', status: 'dispose',
      inWh: 'TXG-G', logistics: '嘉里大榮', tracking: 'KL-330712', date: '2026-05-19',
      items: [{ partId: 'P0006', expectQty: 60, actualQty: 60, defectQty: 4, defectType: '外觀損壞', defectDesc: '雨刷骨架彎折 4 支', batchNo: '202605-0006', inCost: 118 }] },
    { id: 'GRN-2026-0052', no: 'GRN-2026-0052', poNo: 'PO-2026-0090', supplierId: 'S0003', kind: 'domestic', status: 'done',
      inWh: 'TXG-G', logistics: '黑貓宅急便', tracking: 'BM-551033', date: '2026-05-19',
      items: [{ partId: 'P0006', expectQty: 180, actualQty: 180, defectQty: 0, defectType: '', defectDesc: '', batchNo: '202605-0006', inCost: 118 }] },
    { id: 'GRN-2026-0049', no: 'GRN-2026-0049', poNo: 'PO-2026-0098', supplierId: 'S0002', kind: 'foreign', status: 'f_pick',
      inWh: 'TYC-M', date: '2026-05-25', currency: 'USD', rate: 31.5,
      shipNo: 'EVERGREEN-2208W', cargoNo: 'CG-7781230', doNo: 'DO-2208W', logisticsNo: '', broker: '中總報關行',
      fees: { freight: '', duty: '', clearance: '', storage: '', other: '' },
      items: [{ partId: 'P0007', expectQty: 300, actualQty: 0, defectQty: 0, defectType: '', defectDesc: '', batchNo: '', inCost: 0 }] },
    { id: 'GRN-2026-0046', no: 'GRN-2026-0046', poNo: 'PO-2026-0098', supplierId: 'S0002', kind: 'foreign', status: 'f_ship',
      inWh: 'TYC-M', date: '2026-06-01', currency: 'USD', rate: 31.5,
      shipNo: '', cargoNo: '', doNo: '', logisticsNo: '', broker: '',
      fees: { freight: '', duty: '', clearance: '', storage: '', other: '' },
      items: [{ partId: 'P0007', expectQty: 200, actualQty: 0, defectQty: 0, defectType: '', defectDesc: '', batchNo: '', inCost: 0 }] },
    { id: 'GRN-2026-0040', no: 'GRN-2026-0040', poNo: 'PO-2026-0085', supplierId: 'S0001', kind: 'foreign', status: 'done',
      inWh: 'TYC-M', date: '2026-05-28', currency: 'USD', rate: 31.2,
      shipNo: 'MAERSK-1180E', cargoNo: 'CG-4420118', doNo: 'DO-118552', logisticsNo: 'TYC-IN-7781', broker: '中總報關行',
      fees: { freight: 18000, duty: 7800, clearance: 3500, storage: 1200, other: 800 },
      items: [{ partId: 'P0001', expectQty: 50, actualQty: 50, defectQty: 0, defectType: '', defectDesc: '', batchNo: '202605-0001', inCost: 281 }] }
  ];

  /* ============ 進貨退回單（v3.4 進貨退回作業；反向出貨）============ */
  // status: apply 申請中 / pick 待撿貨 / pack 待包貨 / take 待取貨 / done 已完成
  DB.RET_STAGE = { apply: 0, pick: 1, pack: 2, take: 3, done: 4 };
  DB.RET_STAGE_LABEL = ['申請中', '待撿貨', '待包貨', '待取貨', '已完成'];
  DB.returnList = [
    { id: 'RT-2026-0007', no: 'RT-2026-0007', grnNo: 'GRN-2026-0055', supplierId: 'S0003', status: 'apply', date: '2026-06-12', by: 'Y0006', reason: '外觀損壞，向供應商退換', disposal: 'W', items: [{ partId: 'P0006', qty: 4 }] },
    { id: 'RT-2026-0005', no: 'RT-2026-0005', grnNo: 'GRN-2026-0040', supplierId: 'S0001', status: 'pick', date: '2026-06-10', by: 'Y0006', reason: '規格不符', disposal: 'N', items: [{ partId: 'P0001', qty: 3 }] },
    { id: 'RT-2026-0003', no: 'RT-2026-0003', grnNo: 'GRN-2026-0040', supplierId: 'S0001', status: 'done', date: '2026-06-02', by: 'Y0006', reason: '功能異常', disposal: 'S', items: [{ partId: 'P0001', qty: 1 }] }
  ];
  DB.retOf = function (no) { return DB.returnList.filter(function (r) { return r.no === no; })[0]; };

  /* ============ 保固申請 ============ */
  // type: claim 客訴型 / self 自用型；status 待送審 pending / 申請中 ing / 已完成 done
  DB.WR_STAGE = { pending: 0, ing: 1, done: 2 };
  DB.WR_STAGE_LABEL = ['待送審', '申請中', '已完成'];
  DB.warrantyList = [
    { id: 'WR-2026-0015', no: 'WR-2026-0015', type: 'claim', srcSo: 'SO-2026-0188', supplierId: 'S0005', partId: 'P0005', status: 'pending', date: '2026-06-11', by: 'Y0003', result: '', refund: '' },
    { id: 'WR-2026-0012', no: 'WR-2026-0012', type: 'self', srcSo: '', supplierId: 'S0001', partId: 'P0001', status: 'pending', date: '2026-06-08', by: 'Y0007', result: '', refund: '' },
    { id: 'WR-2026-0009', no: 'WR-2026-0009', type: 'claim', srcSo: 'SO-2026-0150', supplierId: 'S0001', partId: 'P0003', status: 'ing', date: '2026-05-30', by: 'Y0004', result: '', refund: '' },
    { id: 'WR-2026-0005', no: 'WR-2026-0005', type: 'self', srcSo: '', supplierId: 'S0003', partId: 'P0006', status: 'done', date: '2026-05-12', by: 'Y0007', result: '換貨補發 2 支', refund: '換貨' }
  ];
  // 保固判定：依零件 退貨政策＋保固月數 與進貨批號保固到期日
  DB.warrantyJudge = function (part) {
    if (!part) return { ok: false, label: '—' };
    var pol = part.returnPolicy, wm = +part.warranty || 0;
    if (pol === 'N' || wm === 0) return { ok: false, label: '逾保／不保固', policy: pol };
    return { ok: true, label: '保固內（' + wm + ' 個月）', policy: pol };
  };

  /* ============ 待建檔／待更新 收件匣（採購的主檔異動收件匣）============ */
  DB.purInbox = [
    { id: 'IB-001', source: '客訂查無此料', from: '業務 王志明', date: '2026-06-12', kind: 'new',
      draft: { name: 'CR-V 5代 冷氣濾網', brandPn: '80292-TLA-A01', brand: 'DEN', group: 'OILF' }, note: '客戶宏達指定，客訂 SO-2026-0214' },
    { id: 'IB-002', source: '產品資訊待修正', from: '倉管 吳承恩', date: '2026-06-10', kind: 'update',
      draft: { code: 'AR24', name: '軟骨雨刷 24吋', field: '規格', value: '長度應為 600mm（原 24吋標示不清）' }, note: '收貨時發現包裝標示與主檔不符' }
  ];

  /* ============ 共用查詢 ============ */
  DB.poOf = function (no) { return DB.poList.filter(function (o) { return o.no === no; })[0]; };
  DB.isImportSupplier = function (sup) { return !!(sup && sup.country && sup.country !== 'TW'); };
  DB.supplierName = function (id) { var s = DB.byId(DB.partners, id); return s ? s.name : id; };
  DB.empName = function (id) { var e = DB.byId(DB.emps, id); return e ? e.name : (id || '—'); };

  /* ============ 頁面 → 作業 對照（路由與麵包屑）============ */
  DB.PUR_PAGEINDEX = {
    pur_shortage: { label: '缺貨簿', kind: '清單頁' },
    pur_rfq: { label: '詢價作業', kind: '統一套版' },
    pur_po: { label: '採購作業', kind: '統一套版' },
    pur_domestic: { label: '國內進貨作業', kind: '統一套版' },
    pur_foreign: { label: '國外進貨作業', kind: '統一套版' },
    pur_return: { label: '進貨退回作業', kind: '統一套版' },
    pur_warranty: { label: '保固申請作業', kind: '統一套版' },
    pur_product: { label: '產品管理（採購）', kind: '主檔套版' },
    pur_supplier: { label: '供應商管理（採購）', kind: '主檔套版' }
  };
})();
