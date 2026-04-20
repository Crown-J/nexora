/**
 * @FUNCTION_CODE NX02-PROD-UI-001-F01
 * 採購「產品管理」DEMO 用 mock 資料、編碼規則與篩選工具
 */

export type BrandType = 'oem' | 'aftermarket';

export type PartGroup = '濾芯' | '煞車' | '燈具' | '電子' | '其他';

export type PartTypeCode = 'A' | 'B' | 'C' | 'D';

export type ReturnPolicyCode = 'F' | 'S' | 'R' | 'N' | 'W';

/** 編碼規則：segMax[i]=0 表示該段不使用（grey out） */
export type CodeRuleDef = {
  id: string;
  label: string;
  /** 各段最大字元數，0 = 未使用 */
  segMax: readonly [number, number, number, number, number];
};

export const CODE_RULES: CodeRuleDef[] = [
  { id: 'rule-vag-33310', label: 'VAG 格式 (3·3·3·1·0)', segMax: [3, 3, 3, 1, 0] },
  { id: 'rule-flat-44000', label: '平面 4 段 (4·4·0·0·0)', segMax: [4, 4, 0, 0, 0] },
  { id: 'rule-bosch-40000', label: 'BOSCH 短碼 (4·0·0·0·0)', segMax: [4, 0, 0, 0, 0] },
  { id: 'rule-am-8', label: '副廠料號 (8·0·0·0·0)', segMax: [8, 0, 0, 0, 0] },
];

export function getCodeRule(id: string): CodeRuleDef {
  return CODE_RULES.find((r) => r.id === id) ?? CODE_RULES[0]!;
}

export const COUNTRY_OPTIONS: { iso: string; label: string }[] = [
  { iso: '', label: '（未選）' },
  { iso: 'TWN', label: '台灣 (TWN)' },
  { iso: 'DEU', label: '德國 (DEU)' },
  { iso: 'JPN', label: '日本 (JPN)' },
  { iso: 'KOR', label: '韓國 (KOR)' },
  { iso: 'USA', label: '美國 (USA)' },
  { iso: 'CHN', label: '中國 (CHN)' },
];

export function countryLabel(iso: string): string {
  const h = COUNTRY_OPTIONS.find((c) => c.iso === iso);
  return h?.label ?? iso;
}

export const RETURN_POLICY_OPTIONS: { code: ReturnPolicyCode; label: string }[] = [
  { code: 'F', label: 'F — 自由退貨（貼包裝 LOGO 日期貼紙）' },
  { code: 'S', label: 'S — 標準退貨（貼包裝 LOGO 日期貼紙）' },
  { code: 'R', label: 'R — 限制退貨（貼本體 LOGO 日期貼紙）' },
  { code: 'N', label: 'N — 不可退貨' },
  { code: 'W', label: 'W — 保固處理（貼保固 QRCode 貼紙）' },
];

export const PART_TYPE_OPTIONS: { code: PartTypeCode; label: string }[] = [
  { code: 'A', label: '專用型(A)' },
  { code: 'B', label: '通用型(B)' },
  { code: 'C', label: '組合型(C)' },
  { code: 'D', label: '拆解型(D)' },
];

export type MockAltRow = {
  id: string;
  codeDisplay: string;
  brand: string;
  type: BrandType;
  stockLocal: number;
  note: string;
};

export type MockSuperRow = {
  id: string;
  oldDisplay: string;
  newDisplay: string;
  date: string;
  reason: string;
};

export type MockCompanionRow = {
  id: string;
  codeDisplay: string;
  name: string;
  note: string;
};

export type MockBundleRow = {
  id: string;
  kind: 'B' | 'F';
  codeDisplay: string;
  name: string;
  qty: number;
};

export type MockProduct = {
  id: string;
  brand: string;
  brandType: BrandType;
  codeRuleId: string;
  seg1: string;
  seg2: string;
  seg3: string;
  seg4: string;
  seg5: string;
  country: string;
  /** 內部鍵 hyphen，例：VAG-1K0-129-620-A */
  codeKey: string;
  name: string;
  secCode: string;
  partType: PartTypeCode;
  group: PartGroup;
  spec: string;
  unit: string;
  warranty: number;
  returnPolicy: ReturnPolicyCode;
  vehicles: string[];
  remark: string;
  active: boolean;
  /** 有採購／銷售／庫存時，編輯態 SEG 鎖定 */
  hasTransactionHistory: boolean;
  cost: number;
  costAtLastPrice?: number;
  prices: { a: number; b: number; c: number; d: number };
  lastPriceDate: string;
  lastPriceBy: string;
  stock: { mw1: number; bw1: number; bw2: number };
  safetyStock: { mw1: number; bw1: number; bw2: number };
  maxStock: { mw1: number; bw1: number; bw2: number };
  /** relation_type R 可替代 */
  alternatives: MockAltRow[];
  /** relation_type S 改號 */
  supersedes: MockSuperRow[];
  /** relation_type C 改版換周邊 */
  companions: MockCompanionRow[];
  /** relation_type B/F 組合拆解 */
  bundleRows: MockBundleRow[];
};

export const WAREHOUSE_ROWS = [
  { key: 'mw1' as const, label: 'MW1 主倉' },
  { key: 'bw1' as const, label: 'BW1 北倉' },
  { key: 'bw2' as const, label: 'BW2 南倉' },
];

/** 左欄搜尋 SEG 使用與 VAG 規則相同之段長（與 Q 面板一致） */
export const SEARCH_SEG_LIMITS = getCodeRule('rule-vag-33310').segMax;

export function formatPartDisplay(codeKey: string, country: string): string {
  const core = codeKey.replace(/-/g, '·');
  return country ? `${core} #${country}` : core;
}

/** 料號預覽：{廠牌}-{SEG 以 · 連接} #{產地} */
export function buildPartPreview(
  brand: string,
  seg: readonly [string, string, string, string, string],
  limits: readonly [number, number, number, number, number],
  countryIso: string,
): string {
  const chunks: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (limits[i] <= 0) continue;
    const s = (seg[i] ?? '').trim();
    if (s) chunks.push(s);
  }
  const core = chunks.join('·');
  const b = brand.trim();
  const c = countryIso.trim();
  if (!b) return core ? `${core}${c ? ` #${c}` : ''}` : c ? `#${c}` : '—';
  const mid = core ? `${b}-${core}` : `${b}-`;
  return c ? `${mid} #${c}` : mid;
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

export const DEFAULT_APPLIED_QUERY: AppliedQuery = {
  brand: 'ALL',
  seg: ['1K0', '129', '620', '', ''],
  country: 'DEU',
};

function cloneProduct(p: MockProduct): MockProduct {
  return {
    ...p,
    alternatives: p.alternatives.map((a) => ({ ...a })),
    supersedes: p.supersedes.map((s) => ({ ...s })),
    companions: p.companions.map((c) => ({ ...c })),
    bundleRows: p.bundleRows.map((b) => ({ ...b })),
  };
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'p1',
    brand: 'VAG',
    brandType: 'oem',
    codeRuleId: 'rule-vag-33310',
    seg1: '1K0',
    seg2: '129',
    seg3: '620',
    seg4: 'A',
    seg5: '',
    country: 'DEU',
    codeKey: 'VAG-1K0-129-620-A',
    name: '空氣濾芯',
    secCode: '',
    partType: 'A',
    group: '濾芯',
    spec: '含墊片，06L 適用',
    unit: 'pcs',
    warranty: 12,
    returnPolicy: 'S',
    vehicles: ['VW Golf', 'AUDI A3', 'SKODA Octavia'],
    remark: '',
    active: true,
    hasTransactionHistory: true,
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
        note: '—',
      },
      {
        id: 'a2',
        codeDisplay: 'BOSCH-E200L #DEU',
        brand: 'BOSCH',
        type: 'aftermarket',
        stockLocal: 0,
        note: '—',
      },
      {
        id: 'a3',
        codeDisplay: 'DENSO-A1339 #JPN',
        brand: 'DENSO',
        type: 'aftermarket',
        stockLocal: 15,
        note: '—',
      },
    ],
    supersedes: [
      {
        id: 's1',
        oldDisplay: 'VAG-1K0·129·620 #DEU',
        newDisplay: 'VAG-1K0·129·620·A #DEU',
        date: '2025-03-01',
        reason: '原廠升版',
      },
      {
        id: 's2',
        oldDisplay: 'VAG-1K0·129·620·A #DEU',
        newDisplay: 'VAG-1K0·129·620·B #DEU',
        date: '2026-01-15',
        reason: '原廠升版',
      },
    ],
    companions: [
      {
        id: 'c1',
        codeDisplay: 'VAG-06L·103·600·J #DEU',
        name: '機油濾芯',
        note: '建議同步更換',
      },
      {
        id: 'c2',
        codeDisplay: 'VAG-N·013·839·6 #DEU',
        name: '油底殼螺絲',
        note: '建議同步更換',
      },
    ],
    bundleRows: [
      { id: 'b1', kind: 'B', codeDisplay: 'MANN-C27519 #DEU', name: '濾芯本體', qty: 1 },
      { id: 'b2', kind: 'B', codeDisplay: 'VAG-N·013·839·6 #DEU', name: '密封墊', qty: 1 },
    ],
  },
  {
    id: 'p2',
    brand: 'MANN',
    brandType: 'aftermarket',
    codeRuleId: 'rule-am-8',
    seg1: 'C27519',
    seg2: '',
    seg3: '',
    seg4: '',
    seg5: '',
    country: 'DEU',
    codeKey: 'MANN-C27519',
    name: '空氣芯 MANN',
    secCode: '1K0129620A',
    partType: 'B',
    group: '濾芯',
    spec: '',
    unit: 'pcs',
    warranty: 12,
    returnPolicy: 'S',
    vehicles: [],
    remark: '測試：無售價（A 價為 0）',
    active: true,
    hasTransactionHistory: false,
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
    companions: [],
    bundleRows: [],
  },
  {
    id: 'p3',
    brand: 'BOSCH',
    brandType: 'aftermarket',
    codeRuleId: 'rule-flat-44000',
    seg1: 'E200',
    seg2: 'L',
    seg3: '',
    seg4: '',
    seg5: '',
    country: 'DEU',
    codeKey: 'BOSCH-E200-L',
    name: '空氣芯 BOSCH',
    secCode: '',
    partType: 'B',
    group: '濾芯',
    spec: '',
    unit: 'pcs',
    warranty: 12,
    returnPolicy: 'F',
    vehicles: ['VW Golf'],
    remark: '',
    active: true,
    hasTransactionHistory: false,
    cost: 7.1,
    prices: { a: 9.5, b: 10.5, c: 11.2, d: 12.0 },
    lastPriceDate: '2026-02-20',
    lastPriceBy: '李採購',
    stock: { mw1: 0, bw1: 6, bw2: 0 },
    safetyStock: { mw1: 10, bw1: 5, bw2: 2 },
    maxStock: { mw1: 40, bw1: 25, bw2: 15 },
    alternatives: [],
    supersedes: [],
    companions: [],
    bundleRows: [],
  },
];

export function cloneMockProducts(): MockProduct[] {
  return MOCK_PRODUCTS.map(cloneProduct);
}

/** A 價建議區間（DEMO：成本×110% ±3%） */
export function suggestedPriceBandA(cost: number): { lo: number; hi: number } {
  const mid = cost * 1.1;
  return { lo: Math.max(0, mid * 0.97), hi: mid * 1.03 };
}
