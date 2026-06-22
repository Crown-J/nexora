/* NEXORA GRID — 核心主檔 · 群組批次頁　共用 mock 資料
   四個案例共用此資料底座（職務 / 據點 / 通用件群組 / 供應商供貨對應）。 */
(function () {
  'use strict';

  /* ---------- 帳號與權限 ---------- */
  // 職務（案例 1 左欄）
  const ROLES = [
    { id: 'ADMIN',     name: '系統管理員', dept: '資訊部', level: 'G1' },
    { id: 'SALESMGR',  name: '銷售主管',   dept: '銷售部', level: 'G2' },
    { id: 'SALES',     name: '業務員',     dept: '銷售部', level: 'G3' },
    { id: 'PURCHASE',  name: '採購員',     dept: '採購部', level: 'G3' },
    { id: 'WAREHOUSE', name: '倉管',       dept: '倉儲部', level: 'G3' },
    { id: 'FINANCE',   name: '會計',       dept: '財務部', level: 'G3' },
    { id: 'CS',        name: '客服',       dept: '銷售部', level: 'G3' },
    { id: 'AUDIT',     name: '稽核',       dept: '財務部', level: 'G2' },
  ];

  // 據點（案例 2 左欄，來源：據點主檔）
  const SITES = [
    { id: 'HQ',  name: '台中總部',     main: true },
    { id: 'TPE', name: '台北營業所',   main: false },
    { id: 'TYN', name: '桃園倉儲中心', main: false },
    { id: 'KHH', name: '高雄營業所',   main: false },
    { id: 'TNN', name: '台南服務站',   main: false },
  ];

  // 員工（成員池）— 員工編號 Y＋4 碼；roles=掛的職務；site=隸屬據點（單一）
  const EMPLOYEES = [
    { id: 'Y0001', name: '陳柏宏', dept: '銷售部', roles: ['SALESMGR', 'SALES'], site: 'HQ' },
    { id: 'Y0002', name: '林佳螢', dept: '銷售部', roles: ['SALES'], site: 'TPE' },
    { id: 'Y0003', name: '王志明', dept: '銷售部', roles: ['SALES'], site: 'TPE' },
    { id: 'Y0004', name: '李美玲', dept: '財務部', roles: ['FINANCE'], site: 'HQ' },
    { id: 'Y0005', name: '張俊傑', dept: '倉儲部', roles: ['WAREHOUSE'], site: 'TYN' },
    { id: 'Y0006', name: '黃淑芬', dept: '採購部', roles: ['PURCHASE'], site: 'HQ' },
    { id: 'Y0007', name: '吳建宏', dept: '銷售部', roles: ['SALES'], site: 'KHH' },
    { id: 'Y0008', name: '周雅婷', dept: '銷售部', roles: ['CS'], site: 'TPE' },
    { id: 'Y0009', name: '蔡文傑', dept: '倉儲部', roles: ['WAREHOUSE'], site: 'TYN' },
    { id: 'Y0010', name: '鄭家豪', dept: '銷售部', roles: ['SALES'], site: 'KHH' },
    { id: 'Y0011', name: '許雅文', dept: '財務部', roles: ['FINANCE', 'AUDIT'], site: 'HQ' },
    { id: 'Y0012', name: '劉冠廷', dept: '採購部', roles: ['PURCHASE'], site: 'HQ' },
    { id: 'Y0013', name: '楊承恩', dept: '資訊部', roles: ['ADMIN'], site: 'HQ' },
    { id: 'Y0014', name: '謝宜蓁', dept: '銷售部', roles: ['CS'], site: 'TNN' },
    { id: 'Y0015', name: '洪偉誠', dept: '採購部', roles: [], site: null },
    { id: 'Y0016', name: '曾子涵', dept: '銷售部', roles: [], site: null },
  ];

  /* ---------- 產品與料號 ---------- */
  const BRANDS = [
    { id: 'BSH', name: '博世 Bosch' },
    { id: 'DEN', name: '電裝 DENSO' },
    { id: 'NSB', name: '日清紡 NISSHINBO' },
    { id: 'MAN', name: '曼牌 MANN' },
    { id: 'KYB', name: 'KYB' },
  ];
  const PART_GROUPS = [
    { id: 'OILFLT', name: '機油濾芯' },
    { id: 'AIRFLT', name: '空氣濾芯' },
    { id: 'BRKPAD', name: '煞車來令片' },
    { id: 'BRKDISC', name: '煞車碟盤' },
    { id: 'SPARK', name: '火星塞' },
    { id: 'SHOCK', name: '避震器' },
  ];
  const ORIGINS = ['日本', '德國', '台灣', '中國', '泰國'];

  // 零件主檔（料號 B / 品名 / 品牌 / 群組 / 產地 / 建議售價）
  const PARTS = [
    { code: 'OF-1003', name: '機油濾芯 1.3L', brand: 'BSH', group: 'OILFLT', origin: '德國', price: 350 },
    { code: 'OF-2207', name: '機油濾芯 2.0L', brand: 'BSH', group: 'OILFLT', origin: '中國', price: 320 },
    { code: 'OF-2208', name: '機油濾芯 2.0L 改', brand: 'BSH', group: 'OILFLT', origin: '中國', price: 310 },
    { code: 'OF-3110', name: '機油濾芯 通用', brand: 'MAN', group: 'OILFLT', origin: '德國', price: 420 },
    { code: 'OF-4500', name: '機油濾芯 柴油', brand: 'MAN', group: 'OILFLT', origin: '德國', price: 560 },
    { code: 'AF-1100', name: '空氣濾芯 1.5L', brand: 'BSH', group: 'AIRFLT', origin: '德國', price: 480 },
    { code: 'AF-2250', name: '空氣濾芯 2.4L', brand: 'DEN', group: 'AIRFLT', origin: '日本', price: 520 },
    { code: 'AF-2251', name: '空氣濾芯 2.4L T', brand: 'DEN', group: 'AIRFLT', origin: '泰國', price: 470 },
    { code: 'AF-3300', name: '空氣濾芯 通用', brand: 'NSB', group: 'AIRFLT', origin: '台灣', price: 360 },
    { code: 'BP-0021', name: '前煞車來令片', brand: 'NSB', group: 'BRKPAD', origin: '日本', price: 1200 },
    { code: 'BP-0022', name: '後煞車來令片', brand: 'NSB', group: 'BRKPAD', origin: '日本', price: 980 },
    { code: 'BP-0023', name: '前煞車來令片 C', brand: 'NSB', group: 'BRKPAD', origin: '中國', price: 890 },
    { code: 'BP-0145', name: '前煞車來令片(陶瓷)', brand: 'NSB', group: 'BRKPAD', origin: '台灣', price: 1450 },
    { code: 'BP-0210', name: '前煞車來令片', brand: 'DEN', group: 'BRKPAD', origin: '日本', price: 1320 },
    { code: 'BD-5001', name: '前煞車碟盤', brand: 'BSH', group: 'BRKDISC', origin: '德國', price: 2100 },
    { code: 'BD-5002', name: '後煞車碟盤', brand: 'BSH', group: 'BRKDISC', origin: '中國', price: 1750 },
    { code: 'BD-5003', name: '前煞車碟盤 D', brand: 'BSH', group: 'BRKDISC', origin: '德國', price: 2050 },
    { code: 'BD-6010', name: '前煞車碟盤(打孔)', brand: 'KYB', group: 'BRKDISC', origin: '台灣', price: 2680 },
    { code: 'SP-7001', name: '銥合金火星塞', brand: 'DEN', group: 'SPARK', origin: '日本', price: 280 },
    { code: 'SP-7002', name: '白金火星塞', brand: 'DEN', group: 'SPARK', origin: '日本', price: 220 },
    { code: 'SP-7100', name: '一般火星塞', brand: 'BSH', group: 'SPARK', origin: '德國', price: 150 },
    { code: 'SK-8001', name: '前避震器', brand: 'KYB', group: 'SHOCK', origin: '日本', price: 2450 },
    { code: 'SK-8002', name: '後避震器', brand: 'KYB', group: 'SHOCK', origin: '日本', price: 2180 },
    { code: 'SK-8100', name: '前避震器 T', brand: 'KYB', group: 'SHOCK', origin: '泰國', price: 1980 },
  ];

  // 通用件群組（案例 3）— 可新建；members：{part, role:'main'|'alt', price, bidir, note}
  const UNIVERSAL_GROUPS = [
    { id: 'UG001', name: '機油濾芯通用組', note: '1.3〜2.0L 共用',
      members: [
        { part: 'OF-1003', role: 'main', price: null, bidir: false, note: '' },
        { part: 'OF-3110', role: 'alt', price: 400, bidir: true, note: '德國 MANN 可雙向替代' },
        { part: 'OF-2207', role: 'alt', price: null, bidir: false, note: '' },
      ] },
    { id: 'UG002', name: '前煞車來令片通用組', note: '',
      members: [
        { part: 'BP-0021', role: 'main', price: null, bidir: false, note: '' },
        { part: 'BP-0210', role: 'alt', price: 1280, bidir: true, note: '電裝同規' },
        { part: 'BP-0023', role: 'alt', price: null, bidir: false, note: '中國產便宜替代' },
      ] },
    { id: 'UG003', name: '火星塞通用組', note: '', members: [] },
  ];

  /* ---------- 往來對象 / 供貨設定 ---------- */
  // 供應商（案例 4 左欄，來源：往來對象 type=S）
  const SUPPLIERS = [
    { id: 'S0001', name: '三和機械' },
    { id: 'S0002', name: '永豐汽材' },
    { id: 'S0003', name: '日清紡 NISSHINBO' },
    { id: 'S0004', name: '電裝 DENSO' },
    { id: 'S0005', name: '亞東貿易' },
  ];
  // 供貨對應：supplierId → 列陣列。每筆 {part, vendorCode, price, lead, moq, primary, source:'手動'|'系統', start, end, note}
  const SUPPLY = {
    S0001: [
      { part: 'BP-0021', vendorCode: 'SANWA-BP21', price: 760, lead: 7, moq: 10, primary: true, source: '手動', start: '2026-01-01', end: '', note: '' },
      { part: 'BP-0022', vendorCode: 'SANWA-BP22', price: 620, lead: 7, moq: 10, primary: true, source: '手動', start: '2026-01-01', end: '', note: '' },
      { part: 'BD-5001', vendorCode: 'SANWA-BD51', price: 1380, lead: 14, moq: 4, primary: false, source: '手動', start: '2026-01-01', end: '', note: '' },
    ],
    S0002: [
      { part: 'AF-1100', vendorCode: 'YF-A1100', price: 300, lead: 5, moq: 20, primary: true, source: '系統', start: '2025-11-01', end: '', note: '進貨自動帶入' },
      { part: 'OF-1003', vendorCode: 'YF-O1003', price: 210, lead: 5, moq: 20, primary: false, source: '手動', start: '2026-02-01', end: '', note: '' },
    ],
    S0003: [],
    S0004: [
      { part: 'SP-7001', vendorCode: 'DEN-IR7001', price: 175, lead: 21, moq: 50, primary: true, source: '手動', start: '2026-01-15', end: '', note: '原廠直供' },
    ],
    S0005: [],
  };

  window.NX_CMB = {
    ROLES, SITES, EMPLOYEES,
    BRANDS, PART_GROUPS, ORIGINS, PARTS,
    UNIVERSAL_GROUPS, SUPPLIERS, SUPPLY,
    partByCode: (c) => PARTS.find((p) => p.code === c),
    brandName: (id) => (BRANDS.find((b) => b.id === id) || {}).name || id,
    groupName: (id) => (PART_GROUPS.find((g) => g.id === id) || {}).name || id,
    siteName: (id) => (SITES.find((s) => s.id === id) || {}).name || '',
  };
})();
