/**
 * @FUNCTION_CODE NX02-PROD-UI-001-F01
 * 採購「產品管理」DEMO 用 mock 資料與篩選工具
 */

export type BrandType = 'oem' | 'aftermarket';

export type PartGroup = '濾芯' | '煞車' | '燈具' | '電子' | '其他';

export type MockAltRow = {
  id: string;
  codeDisplay: string;
  brand: string;
  type: BrandType;
  stockLocal: number;
  relation: 'replace' | 'similar';
};

export type MockSuperRow = {
  id: string;
  direction: 'up' | 'down';
  oldDisplay: string;
  newDisplay: string;
  date: string;
  reason: string;
};

export type MockProduct = {
  id: string;
  brand: string;
  brandType: BrandType;
  seg1: string;
  seg2: string;
  seg3: string;
  seg4: string;
  seg5: string;
  country: string;
  /** 內部鍵，含廠牌前綴與 hyphen，例：VAG-1K0-129-620-A */
  codeKey: string;
  name: string;
  group: PartGroup;
  warranty: number;
  vehicles: string[];
  remark: string;
  active: boolean;
  cost: number;
  /** 上次定價時成本；與 cost 差異 >5% 時顯示提醒 */
  costAtLastPrice?: number;
  prices: { a: number; b: number; c: number; d: number };
  lastPriceDate: string;
  lastPriceBy: string;
  stock: { mw1: number; bw1: number; bw2: number };
  safetyStock: { mw1: number; bw1: number; bw2: number };
  maxStock: { mw1: number; bw1: number; bw2: number };
  alternatives: MockAltRow[];
  supersedes: MockSuperRow[];
};

export const WAREHOUSE_ROWS = [
  { key: 'mw1' as const, label: 'MW1 主倉' },
  { key: 'bw1' as const, label: 'BW1 北倉' },
  { key: 'bw2' as const, label: 'BW2 南倉' },
];

/** 左欄／詳細區 SEG 輸入上限（填滿自動跳下一格，對齊零件主檔 Q 面板行為） */
export const PRODUCT_SEG_MAX = [3, 3, 3, 1, 3] as const;

export function formatPartDisplay(codeKey: string, country: string): string {
  const core = codeKey.replace(/-/g, '·');
  return `${core} #${country}`;
}

export function totalLocalStock(p: MockProduct): number {
  return p.stock.mw1;
}

export function totalOtherStock(p: MockProduct): number {
  return p.stock.bw1 + p.stock.bw2;
}

export function hasNoPrice(p: MockProduct): boolean {
  const { a, b, c, d } = p.prices;
  return a === 0 || b === 0 || c === 0 || d === 0;
}

export function hasNoSafety(p: MockProduct): boolean {
  const s = p.safetyStock;
  return s.mw1 + s.bw1 + s.bw2 === 0;
}

export type QuickFilter = 'all' | 'inStock' | 'noPrice' | 'noSafety';

export type AppliedQuery = {
  brand: string;
  seg: [string, string, string, string, string];
  country: string;
};

export function matchesAppliedQuery(p: MockProduct, q: AppliedQuery): boolean {
  if (q.brand && q.brand !== 'ALL' && p.brand !== q.brand) return false;
  const segs = [p.seg1, p.seg2, p.seg3, p.seg4, p.seg5];
  for (let i = 0; i < 5; i++) {
    const want = q.seg[i]?.trim().toLowerCase();
    if (!want) continue;
    if (!segs[i]?.toLowerCase().includes(want)) return false;
  }
  if (q.country.trim()) {
    if (p.country.toLowerCase() !== q.country.trim().toLowerCase()) return false;
  }
  return true;
}

export function filterProducts(
  list: MockProduct[],
  q: AppliedQuery,
  quick: QuickFilter,
): MockProduct[] {
  let out = list.filter((p) => matchesAppliedQuery(p, q));
  if (quick === 'inStock') {
    out = out.filter((p) => p.stock.mw1 + p.stock.bw1 + p.stock.bw2 > 0);
  } else if (quick === 'noPrice') {
    out = out.filter(hasNoPrice);
  } else if (quick === 'noSafety') {
    out = out.filter(hasNoSafety);
  }
  return out;
}

/** 預設搜尋條件：SEG2=129、SEG3=620（規格書） */
export const DEFAULT_APPLIED_QUERY: AppliedQuery = {
  brand: 'ALL',
  seg: ['1K0', '129', '620', '', ''],
  country: 'DEU',
};

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'p1',
    brand: 'VAG',
    brandType: 'oem',
    seg1: '1K0',
    seg2: '129',
    seg3: '620',
    seg4: 'A',
    seg5: '',
    country: 'DEU',
    codeKey: 'VAG-1K0-129-620-A',
    name: '空氣濾芯',
    group: '濾芯',
    warranty: 12,
    vehicles: ['VW Golf', 'AUDI A3', 'SKODA Octavia'],
    remark: '',
    active: true,
    cost: 8.5,
    costAtLastPrice: 8.0,
    prices: { a: 10.5, b: 11.8, c: 12.5, d: 13.0 },
    lastPriceDate: '2026-04-10',
    lastPriceBy: '王採購組長',
    stock: { mw1: 12, bw1: 35, bw2: 0 },
    safetyStock: { mw1: 30, bw1: 15, bw2: 5 },
    maxStock: { mw1: 90, bw1: 50, bw2: 20 },
    alternatives: [
      {
        id: 'a1',
        codeDisplay: 'MANN-C27519 #DEU',
        brand: 'MANN',
        type: 'aftermarket',
        stockLocal: 28,
        relation: 'replace',
      },
      {
        id: 'a2',
        codeDisplay: 'BOSCH-E200L #DEU',
        brand: 'BOSCH',
        type: 'aftermarket',
        stockLocal: 0,
        relation: 'replace',
      },
      {
        id: 'a3',
        codeDisplay: 'DENSO-A1339 #JPN',
        brand: 'DENSO',
        type: 'aftermarket',
        stockLocal: 15,
        relation: 'replace',
      },
    ],
    supersedes: [
      {
        id: 's1',
        direction: 'up',
        oldDisplay: 'VAG-1K0·129·620 #DEU',
        newDisplay: 'VAG-1K0·129·620·A #DEU',
        date: '2025-03-01',
        reason: '原廠升版',
      },
      {
        id: 's2',
        direction: 'up',
        oldDisplay: 'VAG-1K0·129·620·A #DEU',
        newDisplay: 'VAG-1K0·129·620·B #DEU',
        date: '2026-01-15',
        reason: '原廠升版',
      },
    ],
  },
  {
    id: 'p2',
    brand: 'MANN',
    brandType: 'aftermarket',
    seg1: 'C27',
    seg2: '519',
    seg3: '',
    seg4: '',
    seg5: '',
    country: 'DEU',
    codeKey: 'MANN-C27519',
    name: '空氣芯 MANN',
    group: '濾芯',
    warranty: 12,
    vehicles: [],
    remark: '測試：無售價（A 價為 0）',
    active: true,
    cost: 6.2,
    costAtLastPrice: 6.2,
    prices: { a: 0, b: 9.2, c: 10.0, d: 10.5 },
    lastPriceDate: '2026-03-01',
    lastPriceBy: '王採購組長',
    stock: { mw1: 28, bw1: 23, bw2: 4 },
    safetyStock: { mw1: 0, bw1: 0, bw2: 0 },
    maxStock: { mw1: 80, bw1: 60, bw2: 30 },
    alternatives: [],
    supersedes: [],
  },
  {
    id: 'p3',
    brand: 'BOSCH',
    brandType: 'aftermarket',
    seg1: 'E20',
    seg2: '0L',
    seg3: '',
    seg4: '',
    seg5: '',
    country: 'DEU',
    codeKey: 'BOSCH-E200L',
    name: '空氣芯 BOSCH',
    group: '濾芯',
    warranty: 12,
    vehicles: ['VW Golf'],
    remark: '',
    active: true,
    cost: 7.1,
    prices: { a: 9.5, b: 10.5, c: 11.2, d: 12.0 },
    lastPriceDate: '2026-02-20',
    lastPriceBy: '李採購',
    stock: { mw1: 0, bw1: 6, bw2: 0 },
    safetyStock: { mw1: 10, bw1: 5, bw2: 2 },
    maxStock: { mw1: 40, bw1: 25, bw2: 15 },
    alternatives: [],
    supersedes: [],
  },
];
